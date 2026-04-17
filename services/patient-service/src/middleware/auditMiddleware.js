// src/middleware/auditMiddleware.js
const AuditLog = require('../models/AuditLog');

const auditLog = (req, res, next) => {
  // Only log if user is authenticated and it's a sensitive operation
  if (!req.user) return next();

  const sensitivePaths = ['/reports', '/metrics', '/history'];
  const isSensitive = sensitivePaths.some(path => req.path.includes(path));

  if (isSensitive && req.method !== 'GET') {
    AuditLog.create({
      userId: req.user._id,
      action: req.method,
      resource: req.path,
      resourceId: req.params.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        query: req.query,
        bodyKeys: req.body ? Object.keys(req.body) : [],
      }
    }).catch(err => console.warn('Audit log failed:', err.message));
  }

  next();
};

module.exports = auditLog;