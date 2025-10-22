const db = require("./db");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'db> '
});

//connection test function
function testConnection() {
    db.query('SELECT 1', (err, results) => {
    if (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    }
    else {
        console.log('Connection successful:', results);
        process.exit(0);
    }
    });
};

//mysql query from node
function mysqlCLI() {
    console.log("MySQL CLI. Type 'exit' to quit.");
    rl.prompt();
    rl.on('line', (line) => {
        if(line.trim().toLowerCase() === 'exit') {
            console.log('Exiting CLI.');
            rl.close();
            process.exit(0);
            return;
        }
        db.query(line, (err, results) => {
            if(err) {
                console.error('Query error:', err.message);
            }
            else {
                console.log('Query results:', results);
            }
            rl.prompt();
        });
    });
}

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
    case 'mysql-cli':
        mysqlCLI();
        break;
}
//most likely will not be used outside directly running this file
module.exports = {
    testConnection,
    mysqlCLI
};