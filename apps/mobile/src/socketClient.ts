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

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
