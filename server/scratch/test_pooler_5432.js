const net = require('net');
const client = new net.Socket();
const host = 'aws-1-ap-southeast-1.pooler.supabase.com';
const port = 5432;

client.setTimeout(5000);
client.on('connect', () => {
    console.log('Connected to port ' + port);
    client.destroy();
}).on('error', (err) => {
    console.error('Error connecting to port ' + port + ':', err.message);
}).on('timeout', () => {
    console.error('Timeout connecting to port ' + port);
    client.destroy();
});

client.connect(port, host);
