const db = require('../db');

const updateLastActivity = (req, res, next) => {
    // Only update for authenticated users
    if (req.user && req.user.id) {
        // Fire and forget update to avoid blocking response
        db.query(
            'UPDATE user SET Last_Activity = NOW() WHERE User_ID = ?',
            [req.user.id],
            (err) => {
                if (err) {
                    console.error('Error updating Last_Activity:', err);
                }
            }
        );
    }
    next();
};

module.exports = updateLastActivity;
