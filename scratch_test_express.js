const express = require('express');
const app = express();

const router1 = express.Router();
router1.use((req, res, next) => {
    console.log('router1 middleware');
    next();
});
router1.get('/foo', (req, res) => res.send('foo'));

const router2 = express.Router();
router2.post('/chat', (req, res) => res.send('chat ok'));

app.use('/', router1);
app.use('/ai', router2);

const server = app.listen(3000, () => {
    const http = require('http');
    const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/ai/chat',
        method: 'POST'
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Response:', data);
            server.close();
        });
    });
    req.end();
});
