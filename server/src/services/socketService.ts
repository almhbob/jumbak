import { Server as IOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from './logger.js';

let io: IOServer | null = null;

// In-memory driver GPS store — updated by driver:location socket events
const driverLocations = new Map<string, { lat: number; lng: number; ts: number }>();

export function getDriverLocation(driverId: string): { lat: number; lng: number; ts: number } | null {
  return driverLocations.get(driverId) ?? null;
}

const LOCATION_MAX_AGE_MS = 10 * 60_000; // ignore stale locations older than 10 min

export function getRecentDriverLocation(driverId: string): { lat: number; lng: number } | null {
  const loc = driverLocations.get(driverId);
  if (!loc || Date.now() - loc.ts > LOCATION_MAX_AGE_MS) return null;
  return { lat: loc.lat, lng: loc.lng };
}

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

    // Driver streams live GPS position — stored in memory for nearest-driver dispatch
    socket.on('driver:location', (data: unknown) => {
      if (
        typeof data === 'object' &&
        data !== null &&
        'driverId' in data &&
        'lat' in data &&
        'lng' in data &&
        typeof (data as Record<string, unknown>).driverId === 'string' &&
        (data as Record<string, unknown>).driverId !== '' &&
        ((data as Record<string, unknown>).driverId as string).length < 64 &&
        typeof (data as Record<string, unknown>).lat === 'number' &&
        typeof (data as Record<string, unknown>).lng === 'number' &&
        Math.abs((data as Record<string, unknown>).lat as number) <= 90 &&
        Math.abs((data as Record<string, unknown>).lng as number) <= 180
      ) {
        const { driverId, lat, lng } = data as { driverId: string; lat: number; lng: number };
        driverLocations.set(driverId, { lat, lng, ts: Date.now() });
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
