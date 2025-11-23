require("dotenv").config({ path: 'server/.env' });
const db = require('./server/db');
const bcrypt = require('bcryptjs');

const resetPassword = async () => {
    const username = 'librarian1';
    const password = 'Librarian@123';

    console.log(`Resetting password for ${username}...`);

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
        'UPDATE user SET Password = ? WHERE Username = ?',
        [hashedPassword, username],
        (err, result) => {
            if (err) {
                console.error('Error updating password:', err);
                process.exit(1);
            }
            console.log('Password updated successfully!');
            console.log('Rows affected:', result.affectedRows);
            process.exit(0);
        }
    );
};

resetPassword();
