const db = require("./db");

//connection test function
function testConnection() {
    db.query('SELECT 1', (err, results) => {
    if (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    } else {
        console.log('Connection successful:', results);
        process.exit(0);
    }
    })
};

const command = process.argv[2];//get command name
const params = process.argv.slice(3);//get command arguments

if(!command) {
    console.error("No command provided.");
    process.exit(1);
}
switch (command) {
    case 'test-connection':
        testConnection();
        break;
}

module.exports = {
    testConnection
};