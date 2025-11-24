const db = require('../db');

const query = `
  SELECT
    User_ID,
    Student_ID,
    Username,
    First_Name,
    Last_Name,
    User_Email,
    User_Phone,
    Role
  FROM user
  ORDER BY User_ID DESC
  LIMIT 200
`;

db.query(query, (err, results) => {
  if (err) {
    console.error('Error querying users:', err);
    process.exit(1);
  }
  console.log('Retrieved users:', results.length);
  // Print first 20 rows with selected fields
  results.slice(0, 20).forEach(u => {
    console.log({
      id: u.User_ID,
      studentId: u.Student_ID,
      username: u.Username,
      firstName: u.First_Name,
      lastName: u.Last_Name,
      email: u.User_Email,
      phone: u.User_Phone,
      role: u.Role
    });
  });
  process.exit(0);
});
