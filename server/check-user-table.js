const db = require('./db');

db.query('DESCRIBE user', (err, results) => {
  if (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
  
  console.log('📋 User table structure:');
  console.table(results);
  
  // Check what columns exist
  const columns = results.map(row => row.Field);
  console.log('\n📝 Existing columns:', columns.join(', '));
  
  process.exit(0);
});
