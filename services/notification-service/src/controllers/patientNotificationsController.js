const AdminNotificationLog = require("../models/AdminNotificationLog");
const NotificationLog = require("../models/NotificationLog");

const EVENT_METADATA = {
  REPORT_UPLOADED: {
    subject: "Medical Report Uploaded",
    message: "Your report upload was processed successfully.",
  },
  APPOINTMENT_BOOKED: {
    subject: "Appointment Booked",
    message: "Your appointment booking was confirmed.",
  },
};

const parseLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return null;
  return Math.min(Math.max(parsed, 1), 100);
};

const inferChannel = (deliveryMethods = [], fallbackType = "EMAIL") => {
  if (deliveryMethods.includes("EMAIL") && deliveryMethods.includes("SMS")) return "BOTH";
  if (deliveryMethods.includes("SMS")) return "SMS";
  if (deliveryMethods.includes("EMAIL")) return "EMAIL";
  return fallbackType;
};

exports.getPatientNotifications = async (req, res) => {
  try {
    const patientId = req.query.patientId || req.user?.userId;
    const email = (req.query.email || "").trim().toLowerCase();
    const limit = parseLimit(req.query.limit);

    if (!patientId && !email) {
      return res.status(400).json({
        success: false,
        message: "patientId or email is required.",
      });
    }

    const notificationQuery = {
      eventTrigger: { $ne: "ADMIN_NOTIFICATION" },
      ...(patientId || email
        ? {
            $or: [
              ...(patientId ? [{ recipientId: patientId }] : []),
              ...(email ? [{ recipientEmail: email }] : []),
            ],
          }
        : {}),
    };

    const [adminLogs, notificationLogs] = await Promise.all([
      patientId
        ? AdminNotificationLog.find({ recipientId: patientId })
            .sort({ sentAt: -1, createdAt: -1 })
            .lean()
        : Promise.resolve([]),
      NotificationLog.find(notificationQuery).sort({ createdAt: -1 }).lean(),
    ]);

    const adminItems = adminLogs.map((log) => ({
      id: `admin-${log._id}`,
      source: "ADMIN",
      subject: log.subject,
      message: log.message,
      preview: log.message,
      status: log.status,
      channel: inferChannel(log.deliveryMethods, "EMAIL"),
      createdAt: log.sentAt || log.createdAt,
      read: false,
    }));

    const eventItems = notificationLogs.map((log) => {
      const metadata = EVENT_METADATA[log.eventTrigger] || {};
      const subject = metadata.subject || log.eventTrigger.replace(/_/g, " ");
      const message =
        metadata.message ||
        log.errorMessage ||
        "A notification event was processed for your account.";

      return {
        id: `event-${log._id}`,
        source: "SYSTEM",
        subject,
        message,
        preview: message,
        status: log.status,
        channel: log.type || "EMAIL",
        createdAt: log.createdAt,
        read: false,
      };
    });

    const notifications = [...adminItems, ...eventItems]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit || adminItems.length + eventItems.length);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Failed to fetch patient notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch patient notifications.",
    });
  }
};
