'use client';

import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

/**
 * Custom hook for managing Socket.IO connection and emergency rooms
 */
export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    // Connect to Socket.IO server with JWT authentication handshake
    const socketInstance = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
    });

    socketInstance.on('error', (err) => {
      console.warn('Socket.IO auth/server error:', err);
    });

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, []);

  const joinEmergencyRoom = useCallback((emergencyId) => {
    if (socket && emergencyId) {
      socket.emit('join_emergency', { emergencyId }, (response) => {
        if (!response?.success) {
          console.warn('Could not join emergency room:', response?.message);
        }
      });
    }
  }, [socket]);

  const leaveEmergencyRoom = useCallback((emergencyId) => {
    if (socket && emergencyId) {
      socket.emit('leave_emergency', { emergencyId });
    }
  }, [socket]);

  return {
    socket,
    connected,
    joinEmergencyRoom,
    leaveEmergencyRoom
  };
}
