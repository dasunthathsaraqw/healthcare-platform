// services/payment-service/src/utils/payhereHelper.js

const crypto = require("crypto");

/**
 * Generate MD5 hash - uppercase hex
 */
const md5 = (str) => {
  return crypto.createHash("md5").update(str).digest("hex").toUpperCase();
};

/**
 * Generate payment initiation hash
 * 
 * IMPORTANT: PayHere expects EXACTLY this format:
 * MD5(merchant_id + order_id + amount + currency + MD5(secret))
 * 
 * No extra spaces, no decimal padding issues
 */
const generateInitiateHash = (merchantId, orderId, amount, currency) => {
  const secret = process.env.PAYHERE_MERCHANT_SECRET;
  if (!secret) throw new Error("PAYHERE_MERCHANT_SECRET not set");

  // Convert to string and trim
  const merchantIdStr = String(merchantId).trim();
  const orderIdStr = String(orderId).trim();
  // Format amount: remove trailing zeros after decimal, keep 2 decimals max
  const amountNum = parseFloat(amount);
  const amountStr = amountNum.toFixed(2);
  const currencyStr = String(currency).trim();
  
  // Step 1: Hash the secret
  const hashedSecret = md5(secret);
  
  // Step 2: Concatenate in EXACT order
  const data = merchantIdStr + orderIdStr + amountStr + currencyStr + hashedSecret;
  
  // Step 3: Final hash
  const hash = md5(data);
  
  console.log("🔐 Hash generation details:", {
    merchantId: merchantIdStr,
    orderId: orderIdStr,
    amount: amountStr,
    currency: currencyStr,
    hashedSecret: hashedSecret.substring(0, 8) + "...",
    dataString: merchantIdStr + "+" + orderIdStr + "+" + amountStr + "+" + currencyStr + "+[HASHED_SECRET]",
    hash
  });
  
  return hash;
};

/**
 * Verify webhook signature from PayHere notify callback
 */
const verifyNotifyHash = (body) => {
  const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = body;
  const secret = process.env.PAYHERE_MERCHANT_SECRET;
  if (!secret) return false;

  const hashedSecret = md5(secret);
  const data = String(merchant_id) + String(order_id) + String(payhere_amount) + String(payhere_currency) + String(status_code) + hashedSecret;
  const localHash = md5(data);

  console.log("🔐 Webhook verification:", { 
    received: md5sig, 
    computed: localHash, 
    match: localHash === md5sig,
    dataParts: { merchant_id, order_id, payhere_amount, payhere_currency, status_code }
  });
  
  return localHash === md5sig;
};

/**
 * Get PayHere checkout URL based on sandbox mode
 */
const getCheckoutUrl = () => {
  return process.env.PAYHERE_SANDBOX === "true"
    ? "https://sandbox.payhere.lk/pay/checkout"
    : "https://www.payhere.lk/pay/checkout";
};

module.exports = { generateInitiateHash, verifyNotifyHash, getCheckoutUrl };