const db = require('../db');

console.log('Querying users table (including First_Name / Last_Name)...');

db.query('SELECT User_ID, Username, User_Email, Role, First_Name, Last_Name FROM user ORDER BY User_ID DESC LIMIT 500', (err, rows) => {
  if (err) {
    console.error('Error querying users:', err);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log('No users found.');
    process.exit(0);
  }

  // Print a table with name fields and a missing-name flag
  const table = rows.map(r => ({
    User_ID: r.User_ID,
    Username: r.Username,
    Email: r.User_Email,
    Role: r.Role,
    First_Name: r.First_Name || '',
    Last_Name: r.Last_Name || '',
    Missing_Name: !(r.First_Name && r.First_Name.trim()) || !(r.Last_Name && r.Last_Name.trim())
  }));

  console.table(table);

  // Role counts
  const roleCounts = table.reduce((acc, r) => {
    acc[r.Role] = (acc[r.Role] || 0) + 1;
    return acc;
  }, {});

  console.log('Role counts:', roleCounts);

  const missing = table.filter(r => r.Missing_Name).length;
  console.log('Users with missing first or last name:', missing);

  process.exit(0);
});
