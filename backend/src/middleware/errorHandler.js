import { db } from '../db/index.js';

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // Audit error if needed
  try {
    const insertLog = db.prepare(`
      INSERT INTO audit_logs (action, actor_role, actor_id, ip_address, details)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertLog.run(
      'SERVER_ERROR',
      req.user?.role || 'anonymous',
      req.user?.id ? String(req.user.id) : null,
      req.ip || req.connection?.remoteAddress,
      `${err.message} at ${req.method} ${req.originalUrl}`
    );
  } catch {
    // silent fail for logging
  }

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    success: false,
    error: isProd && statusCode === 500 ? 'Internal Server Error' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
}
