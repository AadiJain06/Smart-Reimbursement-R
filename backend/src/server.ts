import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { realtime } from './realtime.js';

const app = createApp();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: env.frontendUrl },
});

io.on('connection', (socket) => {
  socket.on('joinCompany', (companyId: string) => {
    socket.join(`company:${companyId}`);
  });
});

realtime.emitExpenseUpdate = (companyId: string, payload: unknown) => {
  io.to(`company:${companyId}`).emit('expense:update', payload);
};

httpServer.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
