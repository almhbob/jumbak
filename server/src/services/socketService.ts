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

    // Passenger / admin joins a ride room to receive live status updates
    socket.on('join_ride', (rideId: string) => {
      socket.join(`ride:${rideId}`);
    });

    socket.on('leave_ride', (rideId: string) => {
      socket.leave(`ride:${rideId}`);
    });

    // Driver joins their personal room to receive ride:offer and driver:suspended events
    socket.on('join_driver', (driverId: string) => {
      if (typeof driverId === 'string' && driverId.length < 64) {
        socket.join(`driver:${driverId}`);
      }
    });

    socket.on('leave_driver', (driverId: string) => {
      if (typeof driverId === 'string') {
        socket.leave(`driver:${driverId}`);
      }
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
