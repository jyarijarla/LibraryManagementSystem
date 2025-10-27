require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./db');

console.log('🔍 Checking database structure...\n');
console.log('='.repeat(60));

// Get all tables
db.query('SHOW TABLES', (err, tables) => {
  if (err) {
    console.error('❌ Error fetching tables:', err);
    db.end();
    return;
  }
  
  console.log('\n📊 TABLES IN DATABASE:');
  console.log('='.repeat(60));
  
  if (tables.length === 0) {
    console.log('⚠️  No tables found in database!');
    db.end();
    return;
  }

  for (const table of tables) {
    console.log(`   ✓ ${Object.values(table)[0]}`);
  }
  console.log('='.repeat(60));
  
  let completedTables = 0;
  
  // For each table, get its structure
  tables.forEach((table, index) => {
    const tableName = Object.values(table)[0];
    
    db.query(`DESCRIBE ${tableName}`, (err, columns) => {
      if (err) {
        console.error(`❌ Error describing ${tableName}:`, err);
        completedTables++;
        checkIfComplete();
        return;
      }
      
      console.log(`\n\n📋 TABLE: ${tableName.toUpperCase()}`);
      console.log('─'.repeat(60));
      console.log('COLUMNS:');
      columns.forEach(col => {
        console.log(`   • ${col.Field} (${col.Type}) ${col.Key === 'PRI' ? '🔑 PRIMARY KEY' : ''} ${col.Null === 'NO' ? '⚠️ NOT NULL' : ''} ${col.Default !== null ? `DEFAULT: ${col.Default}` : ''}`);
      });
      
      // Get sample data
      db.query(`SELECT * FROM ${tableName} LIMIT 3`, (err, data) => {
        if (err) {
          console.error(`❌ Error fetching data from ${tableName}:`, err);
        } else {
          console.log(`\n📄 SAMPLE DATA (${data.length} rows):`);
          if (data.length > 0) {
            console.table(data);
          } else {
            console.log('   (No data in table)');
          }
        }
        
        completedTables++;
        checkIfComplete();
      });
    });
  });
  
  function checkIfComplete() {
    if (completedTables === tables.length) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ Database check complete!');
      console.log('='.repeat(60));
      db.end();
    }
  }
});
