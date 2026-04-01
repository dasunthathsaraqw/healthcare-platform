// src/utils/rabbitmq.js
const amqp = require('amqplib');
const emailService = require('../services/emailService');

const consumeNotifications = async () => {
  try {
    // 1. Connect to RabbitMQ
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    const channel = await connection.createChannel();
    
    // 2. Make sure the queue exists
    await channel.assertQueue('notification_queue', { durable: true });
    console.log('✅ Notification Service: Connected to RabbitMQ & Listening for events...');

    // 3. Start consuming messages from the queue
    channel.consume('notification_queue', async (msg) => {
      if (msg !== null) {
        // Parse the message sent from the Patient Service
        const payload = JSON.parse(msg.content.toString());
        console.log(`📥 Received Event Trigger: [${payload.event}]`);

        // 4. Route the event to the correct email function
        switch(payload.event) {
          case 'REPORT_UPLOADED':
            await emailService.sendReportUploadEmail(payload.data);
            break;
            
          // Future proofing: When your friends finish the Appointment service, they just send this event!
          case 'APPOINTMENT_BOOKED':
            console.log('Triggering Appointment Email...');
            break;
            
          default:
            console.log(`⚠️ Unknown event type received: ${payload.event}`);
        }
        
        // 5. Acknowledge the message (Tells RabbitMQ it can safely delete the message from the queue)
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error('❌ Notification Service: RabbitMQ Connection Error:', error.message);
    // If RabbitMQ isn't ready yet, try again in 5 seconds
    setTimeout(consumeNotifications, 5000);
  }
};

module.exports = { consumeNotifications };