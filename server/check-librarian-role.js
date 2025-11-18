const db = require('./db');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const queries = [
  "SELECT Username, Role FROM user WHERE Username = 'librarian1';",
  "SELECT * FROM role_type WHERE role_name = 'librarian';"
];

function runQueries() {
  let idx = 0;
  function next() {
    if (idx >= queries.length) {
      rl.close();
      process.exit(0);
      return;
    }
    const query = queries[idx];
    db.query(query, (err, results) => {
      if (err) {
        console.error('Query error:', err.message);
      } else {
        console.log(`Results for: ${query}`);
        console.table(results);
      }
      idx++;
      next();
    });
  }
  next();
}

runQueries();
