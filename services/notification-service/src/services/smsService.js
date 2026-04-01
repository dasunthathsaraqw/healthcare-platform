// src/services/smsService.js
const twilio = require('twilio');

// Initialize Twilio (it will gracefully fail if no keys are provided, which is good for our Mock setup)
let client;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

exports.sendSMS = async (toPhone, message) => {
  try {
    // 1. Check if we have a phone number
    if (!toPhone) {
      console.log('⚠️ No phone number provided. Skipping SMS.');
      return false;
    }

    // 2. MOCK MODE: If you don't want to set up a real Twilio account for the University Demo
    if (!client) {
      console.log('\n📱 --- MOCK SMS GENERATED ---');
      console.log(`To: ${toPhone}`);
      console.log(`Message: ${message}`);
      console.log('------------------------------\n');
      return true; // Return true so the database logs it as "SENT"
    }

    // 3. REAL MODE: Send actual SMS
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhone
    });

    console.log(`📱 Real SMS sent successfully to ${toPhone}: ${result.sid}`);
    return true;

  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
    return false;
  }
};