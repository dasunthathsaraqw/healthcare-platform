// src/utils/rabbitmq.js
// RabbitMQ utility for the telemedicine-service.
// Mirrors the appointment-service pattern exactly:
//   • connectRabbitMQ() — called once at startup (or can be skipped).
//   • publishNotificationEvent() — fire-and-forget to notification_queue.

const amqp = require("amqplib");

let channel;
let connection;

/**
 * Establish connection to RabbitMQ and assert the shared notification queue.
 * Retries every 5 seconds if RabbitMQ is still booting (common in Docker Compose).
 */
const connectRabbitMQ = async () => {
  try {
    const url = process.env.RABBITMQ_URL || "amqp://localhost:5672";
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    // Assert same queue the notification-service consumes from
    await channel.assertQueue("notification_queue", { durable: true });

    console.log("✅ Telemedicine Service: Connected to RabbitMQ");

    connection.on("error", (err) => {
      console.error("❌ RabbitMQ connection error:", err.message);
      channel = null;
      setTimeout(connectRabbitMQ, 5000);
    });

    connection.on("close", () => {
      console.warn("⚠️  RabbitMQ connection closed — reconnecting...");
      channel = null;
      setTimeout(connectRabbitMQ, 5000);
    });
  } catch (error) {
    console.error(
      "❌ Telemedicine Service: RabbitMQ Connection Error:",
      error.message
    );
    // Retry after 5 seconds if RabbitMQ is still booting up
    setTimeout(connectRabbitMQ, 5000);
  }
};

/**
 * Publish an event to the notification_queue.
 *
 * @param {string} eventType  - e.g. "SESSION_STARTED", "SESSION_ENDED"
 * @param {object} data       - arbitrary payload
 */
const publishNotificationEvent = async (eventType, data) => {
  try {
    if (!channel) {
      console.warn(
        `⚠️  RabbitMQ channel not ready — skipping event: ${eventType}`
      );
      return;
    }

    const payload = {
      event: eventType,
      data,
      timestamp: new Date().toISOString(),
    };

    channel.sendToQueue(
      "notification_queue",
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );

    console.log(`📤 Published Event to RabbitMQ: [${eventType}]`);
  } catch (error) {
    console.error("Error publishing to RabbitMQ:", error.message);
  }
};

module.exports = { connectRabbitMQ, publishNotificationEvent };
