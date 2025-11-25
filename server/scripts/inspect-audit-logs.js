const db = require('../db');

async function inspect() {
  try {
    const [countRes] = await db.promise().query('SELECT COUNT(*) as cnt FROM audit_log');
    const total = countRes && countRes[0] ? countRes[0].cnt : 0;
    console.log('audit_log total rows:', total);

    const [rows] = await db.promise().query(
      `SELECT al.*, u.Username as UserName FROM audit_log al LEFT JOIN user u ON al.User_ID = u.User_ID ORDER BY al.Created_At DESC LIMIT 20`
    );

    if (!rows || rows.length === 0) {
      console.log('No audit_log rows found.');
    } else {
      console.log('Recent audit_log rows:');
      rows.forEach(r => {
        console.log({
          id: r.Log_ID,
          createdAt: r.Created_At,
          userId: r.User_ID,
          username: r.UserName,
          action: r.Action,
          table: r.Table_Name,
          recordId: r.Record_ID,
          description: r.Description
        });
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('Error inspecting audit_log:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

inspect();
