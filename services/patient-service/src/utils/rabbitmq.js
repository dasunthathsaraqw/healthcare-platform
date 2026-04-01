// src/utils/rabbitmq.js
const amqp = require('amqplib');

let channel;

const connectRabbitMQ = async () => {
  try {
    // Connect to the RabbitMQ server using the Docker network URL
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    channel = await connection.createChannel();
    
    // We create a queue specifically for notifications. 
    // durable: true means the queue survives if RabbitMQ restarts!
    await channel.assertQueue('notification_queue', { durable: true });
    
    console.log('✅ Patient Service: Connected to RabbitMQ');
  } catch (error) {
    console.error('❌ Patient Service: RabbitMQ Connection Error:', error.message);
    // Retry connection after 5 seconds if RabbitMQ is still booting up
    setTimeout(connectRabbitMQ, 5000);
  }
};

const publishNotificationEvent = async (eventType, data) => {
  try {
    if (!channel) {
      console.error('RabbitMQ channel not established yet');
      return;
    }

    const payload = {
      event: eventType,
      data: data,
      timestamp: new Date().toISOString()
    };

    // Send the message to the queue as a Buffer
    channel.sendToQueue(
      'notification_queue', 
      Buffer.from(JSON.stringify(payload)),
      { persistent: true } // Ensures message is saved to disk until processed
    );

    console.log(`📤 Published Event to RabbitMQ: ${eventType}`);
  } catch (error) {
    console.error('Error publishing to RabbitMQ:', error);
  }
};

module.exports = {
  connectRabbitMQ,
  publishNotificationEvent
};