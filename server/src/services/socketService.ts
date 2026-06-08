import { Server as IOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from './logger.js';

let io: IOServer | null = null;

export function initSocket(httpServer: HttpServer, allowedOrigins: string[]): IOServer {
  io = new IOServer(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    logger.info('Socket connected', { id: socket.id });

    // Client joins a ride room to receive live updates
    socket.on('join_ride', (rideId: string) => {
      socket.join(`ride:${rideId}`);
    });

    socket.on('leave_ride', (rideId: string) => {
      socket.leave(`ride:${rideId}`);
    });

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { id: socket.id });
    });
  });

  return io;
}

export function emitRideUpdate(rideId: string, data: Record<string, unknown>): void {
  io?.to(`ride:${rideId}`).emit('ride_update', data);
}

export function getIo(): IOServer | null {
  return io;
}
