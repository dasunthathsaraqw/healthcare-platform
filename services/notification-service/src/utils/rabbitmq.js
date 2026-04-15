// src/utils/rabbitmq.js
const amqp = require('amqplib');
const emailService = require('../services/emailService');
const NotificationLog = require('../models/NotificationLog');

// ─── Module-level references for graceful shutdown ────────────────────────────
let connection = null;
let channel = null;

// ─── Queue / Exchange names ───────────────────────────────────────────────────
const MAIN_QUEUE = 'notification_queue';
const DLQ_QUEUE  = 'notification_dead_letter_queue';
const DLX_EXCHANGE = 'notification_dlx'; // Dead Letter Exchange

/**
 * Get the currently open channel (used by server.js for graceful shutdown).
 */
const getChannel = () => channel;
const getConnection = () => connection;

// ─────────────────────────────────────────────────────────────────────────────
// CONSUME NOTIFICATIONS
// Connects to RabbitMQ, asserts the main queue with a Dead Letter Exchange,
// asserts the DLQ that catches failed messages, and starts consuming.
// ─────────────────────────────────────────────────────────────────────────────

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
      try {
        log = await NotificationLog.create({
          recipientId: payload.data?.patientId || 'unknown',
          recipientEmail: payload.data?.patientEmail || '',
          recipientPhone: payload.data?.patientPhone || '',
          type: 'EMAIL',
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
            await emailService.sendReportUploadEmail(payload.data);
            break;

          case 'APPOINTMENT_BOOKED':
            await emailService.sendAppointmentBookedEmail(payload.data);
            break;

          default:
            console.warn(`⚠️  Unknown event received: [${payload.event}] — routing to DLQ`);
            if (log) await log.updateOne({ status: 'FAILED', errorMessage: `Unknown event: ${payload.event}` });
            channel.nack(msg, false, false);
            return;
        }

        // ── 6. Success: update log and ack ────────────────────────────────
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