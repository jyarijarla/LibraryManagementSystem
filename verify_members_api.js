const http = require('http');

function login() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            username: 'librarian1',
            password: 'Librarian@123'
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.token) {
                        resolve(json.token);
                    } else {
                        reject('Login failed: ' + JSON.stringify(json));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

async function verifyMembers() {
    try {
        console.log('Logging in...');
        const token = await login();
        console.log('Login successful, token received.');

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/reports/librarian/35/members',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log('Response:', JSON.stringify(json, null, 2).substring(0, 500) + '...');
                    if (Array.isArray(json) && json.length > 0 && json[0].member_name && json[0].User_ID) {
                        console.log('✅ Structure is correct');
                    } else {
                        console.error('❌ Structure is incorrect or empty');
                        console.log('First item keys:', json.length > 0 ? Object.keys(json[0]) : 'No items');
                    }
                } catch (e) {
                    console.error('Error parsing JSON:', e);
                }
            });
        });

        req.on('error', (e) => console.error(`Problem with request: ${e.message}`));
        req.end();

    } catch (error) {
        console.error('Verification failed:', error);
    }
}

verifyMembers();
