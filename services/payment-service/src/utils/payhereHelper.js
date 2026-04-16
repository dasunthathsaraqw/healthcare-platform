const crypto = require("crypto");

/**
 * Generate MD5 hash - EXACTLY like Java's implementation
 * Java uses: to_upper_case(md5(input))
 */
const generateMD5 = (input) => {
  return crypto.createHash("md5").update(input).digest("hex").toUpperCase();
};

/**
 * Generate payment hash - EXACTLY matching Java's generatePaymentHash()
 * Formula: to_upper_case(md5(merchant_id + order_id + amount + currency + to_upper_case(md5(merchant_secret))))
 */
const generatePaymentHash = (orderId, amount, currency) => {
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
  
  if (!merchantId || !merchantSecret) {
    throw new Error("PAYHERE_MERCHANT_ID or SECRET not set");
  }

  // Format amount to 2 decimal places (same as Java's DecimalFormat("0.00"))
  const amountFormatted = Number(amount).toFixed(2);
  
  // Step 1: Hash the merchant secret (same as Java)
  const hashedSecret = generateMD5(merchantSecret);
  
  // Step 2: Concatenate in EXACT order (same as Java)
  const data = merchantId + orderId + amountFormatted + currency + hashedSecret;
  
  // Step 3: Final hash (same as Java)
  const hash = generateMD5(data);
  
  console.log("🔐 PAYHERE HASH GENERATION (Java-compatible):");
  console.log(`   - Merchant ID: ${merchantId}`);
  console.log(`   - Order ID: ${orderId}`);
  console.log(`   - Amount: ${amountFormatted}`);
  console.log(`   - Currency: ${currency}`);
  console.log(`   - Hashed Secret: ${hashedSecret}`);
  console.log(`   - Data String: ${merchantId}+${orderId}+${amountFormatted}+${currency}+[HASHED]`);
  console.log(`   - Final Hash: ${hash}`);
  
  return hash;
};

/**
 * Verify webhook signature - EXACTLY matching Java's verifyWebhookSignature()
 */
const verifyNotifyHash = (body) => {
  const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = body;
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
  
  if (!merchantSecret) return false;

  // Generate hash of merchant secret (same as Java)
  const hashedSecret = generateMD5(merchantSecret);
  
  // Generate local hash (same as Java)
  const data = merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret;
  const localHash = generateMD5(data);
  
  const isValid = localHash === md5sig;
  
  console.log("🔐 WEBHOOK VERIFICATION (Java-compatible):");
  console.log(`   - Received Hash: ${md5sig}`);
  console.log(`   - Local Hash: ${localHash}`);
  console.log(`   - Valid: ${isValid}`);
  
  return isValid;
};

/**
 * Get PayHere checkout URL based on mode
 */
const getCheckoutUrl = () => {
  return process.env.PAYHERE_SANDBOX === "true"
    ? "https://sandbox.payhere.lk/pay/checkout"
    : "https://www.payhere.lk/pay/checkout";
};

module.exports = { generatePaymentHash, verifyNotifyHash, getCheckoutUrl };