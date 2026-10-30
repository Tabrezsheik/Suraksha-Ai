/**
 * Socket.IO Handler (Phase 5 — Live GPS & Real-Time Emergency Dashboard)
 *
 * Provides stateless JWT authentication handshake, room management (`emergency:<id>`, `user:<id>`, `dashboard:alerts`),
 * and secure real-time broadcasting.
 */

const jwt = require('jsonwebtoken');
const EmergencyEvent = require('../models/EmergencyEvent');

const initializeSockets = (io) => {
  // Socket.IO Authentication Middleware
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization
          ? socket.handshake.headers.authorization.replace('Bearer ', '')
          : null);

      if (!token) {
        const err = new Error('Authentication required');
        err.data = { code: 'AUTH_REQUIRED' };
        return next(err);
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id: userId, ... }
      next();
    } catch (err) {
      const authErr = new Error('Authentication failed: Invalid or expired token');
      authErr.data = { code: 'INVALID_TOKEN' };
      return next(authErr);
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    if (userId) {
      // Automatically join user personal channel
      socket.join(`user:${userId}`);
    }

    /**
     * Client event: join_emergency
     * Verifies room access authorization before joining emergency:<emergencyId>
     */
    socket.on('join_emergency', async (data, callback) => {
      try {
        const { emergencyId } = data || {};
        if (!emergencyId) {
          if (typeof callback === 'function') callback({ success: false, message: 'emergencyId is required' });
          return;
        }

        const emergency = await EmergencyEvent.findById(emergencyId);
        if (!emergency) {
          if (typeof callback === 'function') callback({ success: false, message: 'Emergency event not found' });
          return;
        }

        // Strict ownership check: only emergency owner can join room
        if (emergency.user.toString() !== userId.toString()) {
          socket.emit('error', { code: 'FORBIDDEN', message: 'Access denied to this emergency room' });
          if (typeof callback === 'function') callback({ success: false, message: 'Access denied' });
          return;
        }

        const roomName = `emergency:${emergencyId}`;
        socket.join(roomName);

        if (typeof callback === 'function') {
          callback({ success: true, message: `Joined room ${roomName}`, room: roomName });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    /**
     * Client event: leave_emergency
     */
    /**
     * Client event: guardian_status
     */
    socket.on('guardian_status', (data, callback) => {
      const { sessionId, status } = data || {};
      if (sessionId && userId) {
        io.to(`user:${userId}`).emit('guardian_status_changed', { sessionId, status });
      }
      if (typeof callback === 'function') callback({ success: true, sessionId, status });
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });
};

module.exports = initializeSockets;
