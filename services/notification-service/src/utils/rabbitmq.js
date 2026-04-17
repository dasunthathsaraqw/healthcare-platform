// src/utils/rabbitmq.js
const amqp = require('amqplib');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const NotificationLog = require('../models/NotificationLog');
const AdminNotificationLog = require('../models/AdminNotificationLog');
const NotificationPreference = require('../models/NotificationPreference');

// ─── Module-level references for graceful shutdown ────────────────────────────
let connection = null;
let channel = null;

// ─── Queue / Exchange names ───────────────────────────────────────────────────
const MAIN_QUEUE = 'notification_queue';
const DLQ_QUEUE  = 'notification_dead_letter_queue';
const DLX_EXCHANGE = 'notification_dlx'; // Dead Letter Exchange
const EVENT_PREFERENCE_MAP = {
  REPORT_UPLOADED: 'REPORT_UPLOADED',
  APPOINTMENT_BOOKED: 'APPOINTMENT_BOOKED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  PRESCRIPTION_ISSUED: 'PRESCRIPTION_ISSUED',
  SYSTEM_ALERT: 'SYSTEM_ALERT',
  ADMIN_NOTIFICATION: 'SYSTEM_ALERT',
};

/**
 * Get the currently open channel (used by server.js for graceful shutdown).
 */
const getChannel = () => channel;
const getConnection = () => connection;

const parseMinutes = (time) => {
  if (!time || typeof time !== 'string' || !time.includes(':')) return null;
  const [hours, minutes] = time.split(':').map((value) => Number.parseInt(value, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
};

const isWithinQuietHours = (prefs) => {
  const start = parseMinutes(prefs?.quietHoursStart);
  const end = parseMinutes(prefs?.quietHoursEnd);

  if (start === null || end === null || start === end) return false;

  const now = new Date();
  const current = (now.getHours() * 60) + now.getMinutes();

  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
};

const getNotificationPreferences = async (recipientId) => {
  if (!recipientId) return null;

  try {
    let prefs = await NotificationPreference.findOne({ recipientId });
    if (!prefs) {
      prefs = await NotificationPreference.create({ recipientId });
    }
    return prefs;
  } catch (error) {
    console.warn('⚠️  Could not load notification preferences:', error.message);
    return null;
  }
};

const resolveAllowedChannels = ({
  prefs,
  eventName,
  patientEmail,
  patientPhone,
  requestedEmail = true,
  requestedSMS = false,
}) => {
  const preferenceKey = EVENT_PREFERENCE_MAP[eventName] || 'SYSTEM_ALERT';
  const eventEnabled = prefs?.eventPreferences?.[preferenceKey];
  const quietHoursActive = isWithinQuietHours(prefs);

  if (eventEnabled === false || quietHoursActive) {
    return {
      email: false,
      sms: false,
      reason: quietHoursActive ? 'Suppressed during quiet hours.' : `Event ${preferenceKey} disabled by user preferences.`,
    };
  }

  return {
    email: Boolean(requestedEmail && patientEmail && (prefs?.emailEnabled ?? true)),
    sms: Boolean(requestedSMS && patientPhone && (prefs?.smsEnabled ?? false)),
    reason: null,
  };
};

const inferLogType = ({ email, sms }) => {
  if (email && sms) return 'BOTH';
  if (sms) return 'SMS';
  return 'EMAIL';
};

const buildSmsMessage = (eventName, data) => {
  switch (eventName) {
    case 'REPORT_UPLOADED':
      return `Smart Healthcare: Your report "${data.reportTitle || 'medical report'}" was uploaded successfully.`;
    case 'APPOINTMENT_BOOKED':
      return `Smart Healthcare: Your appointment with ${data.doctorName || 'your doctor'} is confirmed.`;
    case 'ADMIN_NOTIFICATION':
      return `Admin Message: ${data.subject} - ${data.message}`;
    default:
      return `Smart Healthcare: You have a new ${eventName.replace(/_/g, ' ').toLowerCase()} notification.`;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSUME NOTIFICATIONS
// Connects to RabbitMQ, asserts the main queue with a Dead Letter Exchange,
// asserts the DLQ that catches failed messages, and starts consuming.
// ─────────────────────────────────────────────────────────────────────────────

const handleAdminNotification = async (data) => {
  const { patientId, patientEmail, patientPhone, patientName, subject, message, sendEmail, sendSMS, adminId } = data;
  const prefs = await getNotificationPreferences(patientId);
  const allowedChannels = resolveAllowedChannels({
    prefs,
    eventName: 'ADMIN_NOTIFICATION',
    patientEmail,
    patientPhone,
    requestedEmail: sendEmail,
    requestedSMS: sendSMS,
  });

  // Create admin notification log
  const adminLog = await AdminNotificationLog.create({
    adminId,
    recipientId: patientId,
    subject,
    message,
    deliveryMethods: [],
    status: 'PENDING'
  });

  try {
    if (allowedChannels.email) {
      await emailService.sendAdminNotificationEmail(data);
      adminLog.deliveryMethods.push('EMAIL');
    }

    if (allowedChannels.sms) {
      await smsService.sendSMS(patientPhone, buildSmsMessage('ADMIN_NOTIFICATION', data));
      adminLog.deliveryMethods.push('SMS');
    }

    if (!allowedChannels.email && !allowedChannels.sms) {
      adminLog.errorMessage = allowedChannels.reason || 'No permitted delivery channels available.';
      console.log(`ℹ️  Admin notification skipped for ${patientName}: ${adminLog.errorMessage}`);
    }

    adminLog.status = 'SENT';
    await adminLog.save();

    console.log(`✅ Admin notification sent to ${patientName} (${patientEmail})`);
  } catch (error) {
    console.error(`❌ Failed to send admin notification to ${patientName}:`, error.message);
    adminLog.status = 'FAILED';
    adminLog.errorMessage = error.message;
    await adminLog.save();
    throw error; // Re-throw to trigger DLQ
  }
};

const consumeNotifications = async () => {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    // ── 1. Assert the Dead Letter Exchange ────────────────────────────────────
    // Any message a consumer nack()s (negative-acknowledge) without re-queue
    // will be routed here instead of being discarded.
    await channel.assertExchange(DLX_EXCHANGE, 'direct', { durable: true });

    // ── 2. Assert the Dead Letter Queue and bind it to the DLX ───────────────
    const dlq = await channel.assertQueue(DLQ_QUEUE, {
      durable: true,
      arguments: {
        'x-message-ttl': 7 * 24 * 60 * 60 * 1000, // Expire DLQ messages after 7 days
      },
    });
    await channel.bindQueue(DLQ_QUEUE, DLX_EXCHANGE, DLQ_QUEUE);

    // ── 3. Assert the MAIN queue, pointing failed messages at the DLX ─────────
    await channel.assertQueue(MAIN_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DLX_EXCHANGE,
        'x-dead-letter-routing-key': DLQ_QUEUE,
      },
    });

    // Process one message at a time — prevents overloading Twilio/email
    channel.prefetch(1);

    console.log('✅ Notification Service: RabbitMQ connected. Listening on', MAIN_QUEUE);
    console.log('🪦 Dead Letter Queue:', DLQ_QUEUE);

    // ── 4. Main consumer ──────────────────────────────────────────────────────
    channel.consume(MAIN_QUEUE, async (msg) => {
      if (!msg) return; // Consumer cancelled

      let payload;
      try {
        payload = JSON.parse(msg.content.toString());
      } catch (parseErr) {
        console.error('❌ Could not parse message — routing to DLQ:', parseErr.message);
        // Malformed JSON: nack and send to DLQ immediately (no requeue)
        channel.nack(msg, false, false);
        return;
      }

      console.log(`📥 Processing event: [${payload.event}]`);

      // Create a pending log entry so failures are always tracked
      let log;
      const prefs = await getNotificationPreferences(payload.data?.patientId);
      const allowedChannels = resolveAllowedChannels({
        prefs,
        eventName: payload.event,
        patientEmail: payload.data?.patientEmail,
        patientPhone: payload.data?.patientPhone,
        requestedEmail: payload.event === 'ADMIN_NOTIFICATION' ? Boolean(payload.data?.sendEmail) : true,
        requestedSMS: payload.event === 'ADMIN_NOTIFICATION' ? Boolean(payload.data?.sendSMS) : true,
      });
      try {
        log = await NotificationLog.create({
          recipientId: payload.data?.patientId || 'unknown',
          recipientEmail: payload.data?.patientEmail || '',
          recipientPhone: payload.data?.patientPhone || '',
          type: inferLogType(allowedChannels),
          eventTrigger: payload.event,
          status: 'PENDING',
        });
      } catch (logErr) {
        console.warn('⚠️  Could not create notification log entry:', logErr.message);
      }

      try {
        // ── 5. Route the event to the correct handler ──────────────────────
        switch (payload.event) {
          case 'REPORT_UPLOADED':
            if (allowedChannels.email) {
              await emailService.sendReportUploadEmail(payload.data);
            }
            if (allowedChannels.sms) {
              await smsService.sendSMS(payload.data.patientPhone, buildSmsMessage(payload.event, payload.data));
            }
            break;

          case 'APPOINTMENT_BOOKED':
            if (allowedChannels.email) {
              await emailService.sendAppointmentBookedEmail(payload.data);
            }
            if (allowedChannels.sms) {
              await smsService.sendSMS(payload.data.patientPhone, buildSmsMessage(payload.event, payload.data));
            }
            break;

          case 'ADMIN_NOTIFICATION':
            await handleAdminNotification(payload.data);
            break;

          default:
            console.warn(`⚠️  Unknown event received: [${payload.event}] — routing to DLQ`);
            if (log) await log.updateOne({ status: 'FAILED', errorMessage: `Unknown event: ${payload.event}` });
            channel.nack(msg, false, false);
            return;
        }

        // ── 6. Success: update log and ack ────────────────────────────────
        if (!allowedChannels.email && !allowedChannels.sms && payload.event !== 'ADMIN_NOTIFICATION' && log) {
          await log.updateOne({
            errorMessage: allowedChannels.reason || 'No permitted delivery channels available.',
          });
          console.log(`â„¹ï¸  Notification [${payload.event}] skipped: ${allowedChannels.reason}`);
        }

        if (log) await log.updateOne({ status: 'SENT' });
        channel.ack(msg);
        console.log(`✅ Event [${payload.event}] processed successfully.`);

      } catch (handlerError) {
        // ── 7. Processing failed: log the error and route to DLQ ──────────
        console.error(`❌ Handler failed for [${payload.event}]:`, handlerError.message);
        if (log) {
          await log.updateOne({
            status: 'FAILED',
            errorMessage: handlerError.message,
          }).catch(() => {});
        }
        // nack with requeue=false → message goes to Dead Letter Queue, not lost
        channel.nack(msg, false, false);
      }
    });

    // ── 8. Handle unexpected connection/channel errors ────────────────────────
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err.message);
      channel = null;
      connection = null;
      setTimeout(consumeNotifications, 5000);
    });

    connection.on('close', () => {
      console.warn('⚠️  RabbitMQ connection closed — reconnecting in 5s...');
      channel = null;
      connection = null;
      setTimeout(consumeNotifications, 5000);
    });

  } catch (error) {
    console.error('❌ Notification Service: Initial RabbitMQ connection failed:', error.message);
    setTimeout(consumeNotifications, 5000);
  }
};

module.exports = { consumeNotifications, getChannel, getConnection };
