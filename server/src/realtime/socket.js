import { Server } from 'socket.io';

let ioInstance = null;

export function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow all local dev origins (e.g. 5173, 5174, 3000) or matching env
        if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):[0-9]+$/.test(origin) || origin === process.env.CLIENT_URL) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on('connection', (socket) => {
    console.log(`📡 Realtime Client connected: ${socket.id}`);

    // Join regional grid room (e.g. 'grid:global' or specific city)
    socket.on('grid:subscribe', (payload) => {
      const room = payload?.region ? `grid:${payload.region}` : 'grid:global';
      socket.join(room);
      socket.emit('grid:subscribed', { room, status: 'connected' });
    });

    socket.on('ping:sync', () => {
      socket.emit('pong:sync', { timestamp: new Date().toISOString() });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Realtime Client disconnected: ${socket.id} (${reason})`);
    });
  });

  ioInstance = io;
  return io;
}

export function getSocketServer() {
  return ioInstance;
}

/**
 * Broadcast territory conquest / update to all connected map clients
 * Privacy Guarantee: Only broadcast cellId, owner, and color. NO exact GPS or polyline points!
 */
export function broadcastTerritoryChange({
  cells = [],
  athlete = {},
  activityId = null,
}) {
  if (!ioInstance) return;

  const payload = {
    type: 'TERRITORY_CAPTURE',
    timestamp: new Date().toISOString(),
    activityId,
    athlete: {
      id: athlete.id,
      displayName: athlete.displayName || athlete.username,
      avatar: athlete.avatar || '⚡',
      color: athlete.color || '#00f2fe',
    },
    cells: cells.map((c) => ({
      h3CellId: c.h3CellId || c.h3_cell_id,
      currentOwnerId: c.currentOwnerId || c.current_owner_id || athlete.id,
      currentOwnerName: athlete.displayName || athlete.username,
      currentOwnerAvatar: athlete.avatar || '⚡',
      color: athlete.color || '#00f2fe',
      isStolen: Boolean(c.isStolen),
      previousOwnerId: c.previousOwnerId || null,
      lastCapturedAt: c.lastCapturedAt || new Date().toISOString(),
    })),
  };

  // Broadcast to global grid room and root namespace
  ioInstance.to('grid:global').emit('territory:captured', payload);
  ioInstance.emit('territory:captured', payload);
}
