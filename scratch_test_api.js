require('dotenv').config();
const { signToken } = require('./src/config/jwt');
const prisma = require('./src/config/database');

async function test() {
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log('No user found');
        return;
    }
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    console.log('Token:', token);

    const http = require('http');
    const req = http.request({
        hostname: 'localhost',
        port: 3636,
        path: '/api/ai/chat',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        }
    }, (res) => {
        console.log('Status:', res.statusCode);
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Response:', data);
        });
    });
    
    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.write(JSON.stringify({ message: '' }));
    req.end();
}

test();
