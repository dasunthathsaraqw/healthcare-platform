// src/utils/rabbitmq.js
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

    // Use the same queue name the notification-service is consuming from
    await channel.assertQueue("notification_queue", { 
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'notification_dlx',
        'x-dead-letter-routing-key': 'notification_dead_letter_queue',
      }
    });

    console.log("✅ Appointment Service: Connected to RabbitMQ");

    // Gracefully handle unexpected connection drops
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
    console.error("❌ Appointment Service: RabbitMQ Connection Error:", error.message);
    // Retry after 5 seconds if RabbitMQ is still booting up
    setTimeout(connectRabbitMQ, 5000);
  }
};

/**
 * Publish an event message to the notification_queue.
 *
 * @param {string} eventType  - e.g. "APPOINTMENT_BOOKED"
 * @param {object} data       - arbitrary payload consumed by notification-service
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
      data: data,
      timestamp: new Date().toISOString(),
    };

    channel.sendToQueue(
      "notification_queue",
      Buffer.from(JSON.stringify(payload)),
      { persistent: true } // Message survives RabbitMQ restarts
    );

    console.log(`📤 Published Event to RabbitMQ: [${eventType}]`);
  } catch (error) {
    console.error("Error publishing to RabbitMQ:", error.message);
    // Non-blocking: appointment is already saved — notification failure is not critical
  }
};

module.exports = { connectRabbitMQ, publishNotificationEvent };
