// Simple in-memory slot lock (for development)
// In production, use Redis with TTL
const slotLocks = new Map();

// Lock a slot for 10 minutes
const lockSlot = (doctorId, dateTime, lockId) => {
  const key = `${doctorId}_${new Date(dateTime).toISOString()}`;
  if (slotLocks.has(key)) {
    const existing = slotLocks.get(key);
    if (Date.now() < existing.expiresAt) {
      return false; // Slot is still locked
    }
  }
  
  slotLocks.set(key, {
    lockId,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  });
  
  // Auto-cleanup after expiry
  setTimeout(() => {
    if (slotLocks.get(key)?.lockId === lockId) {
      slotLocks.delete(key);
    }
  }, 10 * 60 * 1000);
  
  return true;
};

// Release a lock
const unlockSlot = (doctorId, dateTime, lockId) => {
  const key = `${doctorId}_${new Date(dateTime).toISOString()}`;
  const lock = slotLocks.get(key);
  if (lock && lock.lockId === lockId) {
    slotLocks.delete(key);
    return true;
  }
  return false;
};

// Check if slot is locked
const isSlotLocked = (doctorId, dateTime) => {
  const key = `${doctorId}_${new Date(dateTime).toISOString()}`;
  const lock = slotLocks.get(key);
  if (lock && Date.now() < lock.expiresAt) {
    return true;
  }
  return false;
};

module.exports = { lockSlot, unlockSlot, isSlotLocked };