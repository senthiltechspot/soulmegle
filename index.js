import express from 'express';
import { ExpressPeerServer } from 'peer';
import https from 'https';
import fs from 'fs';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

// Load SSL certificate and private key
const privateKey = fs.readFileSync('cert.key', 'utf8');
const certificate = fs.readFileSync('cert.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

// Enable CORS
app.use(cors());

// Express server setup
const server = https.createServer(credentials, app);

server.listen(port, 
  `192.168.117.97`,
   () => {
  console.log(`Server is running on port ${port}`);
});

// Peer server setup
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.use('/peerjs', peerServer);
