import { io, Socket } from 'socket.io-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    socket = io(API_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

// ─── Passenger / Admin: ride status room ─────────────────────────────────────

export function joinRide(rideId: string): void {
  getSocket().emit('join_ride', rideId);
}

export function leaveRide(rideId: string): void {
  getSocket().emit('leave_ride', rideId);
}

export function onRideUpdate(callback: (data: Record<string, unknown>) => void): () => void {
  const s = getSocket();
  s.on('ride_update', callback);
  return () => s.off('ride_update', callback);
}

// ─── Driver: personal room for incoming offers and account events ─────────────

export function joinDriverRoom(driverId: string): void {
  getSocket().emit('join_driver', driverId);
}

export function leaveDriverRoom(driverId: string): void {
  getSocket().emit('leave_driver', driverId);
}

export type RideOfferPayload = {
  rideId: string;
  pickupLabel: string;
  destinationLabel: string;
  estimatedFare: number;
  distanceKm: number;
  expiresIn: number; // seconds
};

export function onRideOffer(callback: (data: RideOfferPayload) => void): () => void {
  const s = getSocket();
  s.on('ride:offer', callback);
  return () => s.off('ride:offer', callback);
}

export function onRideTaken(callback: (data: { rideId: string }) => void): () => void {
  const s = getSocket();
  s.on('ride:taken', callback);
  return () => s.off('ride:taken', callback);
}

export type SuspensionPayload = {
  suspendedUntil: string;
  hours: number;
  deducted: boolean;
  deductedAmount: number;
};

export function onDriverSuspended(callback: (data: SuspensionPayload) => void): () => void {
  const s = getSocket();
  s.on('driver:suspended', callback);
  return () => s.off('driver:suspended', callback);
}

// Driver sends live GPS to server for nearest-driver dispatch sorting
export function emitDriverLocation(driverId: string, lat: number, lng: number): void {
  getSocket().emit('driver:location', { driverId, lat, lng });
}

// Passenger receives this when all dispatch retries are exhausted
export function onNoDrivers(callback: (data: { rideId: string }) => void): () => void {
  const s = getSocket();
  s.on('ride:no_drivers', callback);
  return () => s.off('ride:no_drivers', callback);
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
