/**
 * Utility to log admin actions into the `audit_log` table.
 * Uses the existing MySQL pool from `server/db.js` and async/await.
 */
const db = require('../db');

/**
 * Insert an admin action record into `audit_log`.
 * @param {number} userId - User_ID of the admin performing the action
 * @param {string} action - Action type (e.g., "CREATE", "UPDATE", "DELETE", "LOGIN")
 * @param {string} tableName - Affected table name (e.g., "user", "book")
 * @param {number|null} recordId - ID of the affected record, or null
 * @param {string} description - Human readable description
 * @returns {Promise<void>} Resolves when the insert completes or logs an error on failure
 */
async function logAdminAction(userId, action, tableName, recordId = null, description = null) {
  if (!userId || !action || !tableName) {
    console.error('logAdminAction: missing required parameters');
    return;
  }

  const sql = `
    INSERT INTO audit_log (User_ID, Action, Table_Name, Record_ID, Description)
    VALUES (?, ?, ?, ?, ?)
  `;

  // Normalize null/undefined to SQL NULL
  const recordIdValue = recordId == null ? null : recordId;
  const descriptionValue = description == null ? null : description;

  try {
    // Use promise() API from mysql2 pool for async/await
    await db.promise().execute(sql, [userId, action, tableName, recordIdValue, descriptionValue]);
  } catch (err) {
    // Do not crash the app — log the error for debugging
    console.error('Failed to insert audit_log record:', err && err.message ? err.message : err);
  }
}

/**
 * Helper to conditionally log if the current request user is an admin.
 * @param {object} req - HTTP request (expects `req.user` populated by auth middleware)
 * @param {string} action - Action type
 * @param {string} tableName - Affected table name
 * @param {number|null} recordId - Record ID
 * @param {string|null} description - Description text
 */
async function auditIfAdmin(req, action, tableName, recordId = null, description = null) {
  try {
    if (!req || !req.user) return;
    if (String(req.user.role).toLowerCase() !== 'admin') return;
    const adminId = req.user.id;
    // fire-and-forget; do not await in controllers unless desired
    logAdminAction(adminId, action, tableName, recordId, description).catch(err => {
      console.error('auditIfAdmin: failed to log action:', err && err.message ? err.message : err);
    });
  } catch (err) {
    console.error('auditIfAdmin error:', err && err.message ? err.message : err);
  }
}

module.exports = { logAdminAction, auditIfAdmin };
