/**
 * src/sockets/duelSocket.js
 *
 * Event contract:
 *
 * Flutter → server:  duel:join     { duelId, userId }
 * Server  → room:    duel:joined   { userId }
 *
 * Flutter → server:  duel:ready    { duelId, userId }
 * Server  → room:    duel:start    { duelId, startTime, durationSeconds }
 *                    (only emitted when BOTH players have sent duel:ready)
 *
 * Flutter → server:  duel:update   { duelId, userId, reps, formScore }
 * Server  → opponent: duel:opponent_update  { reps, formScore }
 *
 * Server  → room:    duel:result   { winnerId, challengerReps, opponentReps, exercise }
 *                    (emitted by duelService after resolveDuel completes)
 *
 * Flutter → server:  duel:leave    { duelId, userId }
 */

// Track ready state per duel: { duelId: Set<userId> }
const readyPlayers = new Map();

// Track connected sockets per duel room for relay
// { duelId: { userId: socketId } }
const duelRooms = new Map();

const DUEL_DURATION_SECONDS = 60; // default duel duration — make this configurable later

function registerDuelSocket(io) {
  io.on('connection', (socket) => {
    // socket.onAny((event, ...args) => {
    //   console.log(`[socket] received event: ${event}`, args);
    // });
    console.log(`Socket connected: ${socket.id}`);

    // ==================== duel:join ====================
    socket.on('duel:join', (payload) => {
      const { duelId, userId } = typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (!duelId || !userId) return;

      const room = `duel:${duelId}`;
      socket.join(room);

      // Track userId → socketId mapping for this duel
      if (!duelRooms.has(duelId)) duelRooms.set(duelId, {});
      duelRooms.get(duelId)[userId] = socket.id;

      // Store on socket for cleanup on disconnect
      socket.data.duelId = duelId;
      socket.data.userId = userId;

      console.log(`User ${userId} joined duel room ${room}`);

      // Notify others in room
      socket.to(room).emit('duel:joined', { userId });
    });

    // ==================== duel:ready ====================
    socket.on('duel:ready', (payload) => {
      const { duelId, userId } = typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (!duelId || !userId) return;

      if (!readyPlayers.has(duelId)) readyPlayers.set(duelId, new Set());
      readyPlayers.get(duelId).add(userId);

      console.log(`User ${userId} ready for duel ${duelId}. Ready count: ${readyPlayers.get(duelId).size}`);

      // Start when both players are ready
      if (readyPlayers.get(duelId).size >= 2) {
        const startTime = new Date().toISOString();
        io.to(`duel:${duelId}`).emit('duel:start', {
          duelId,
          startTime,
          durationSeconds: DUEL_DURATION_SECONDS
        });

        console.log(`Duel ${duelId} started at ${startTime}`);

        // Clean up ready state — no longer needed
        readyPlayers.delete(duelId);
      }
    });

    // ==================== duel:update ====================
    // Relay live progress to the opponent only
    socket.on('duel:update', (payload) => {
      const { duelId, userId, reps, formScore } = typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (!duelId || !userId) return;

      const room = duelRooms.get(duelId);
      if (!room) return;

      // Find opponent's socket id
      const opponentSocketId = Object.entries(room)
        .find(([uid]) => uid !== userId)
        ?.[1];

      if (opponentSocketId) {
        io.to(opponentSocketId).emit('duel:opponent_update', { reps, formScore });
      }
    });

    // ==================== duel:leave ====================
    socket.on('duel:leave', (payload) => {
      const { duelId, userId } = typeof payload === 'string' ? JSON.parse(payload) : payload;
      cleanup(socket, duelId, userId, io);
    });

    // ==================== disconnect ====================
    socket.on('disconnect', () => {
      const { duelId, userId } = socket.data;
      if (duelId && userId) {
        cleanup(socket, duelId, userId, io);
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

function cleanup(socket, duelId, userId, io) {
  const room = `duel:${duelId}`;
  socket.leave(room);

  // Remove from room tracking
  if (duelRooms.has(duelId)) {
    delete duelRooms.get(duelId)[userId];
    if (Object.keys(duelRooms.get(duelId)).length === 0) {
      duelRooms.delete(duelId);
    }
  }

  // Remove from ready tracking
  if (readyPlayers.has(duelId)) {
    readyPlayers.get(duelId).delete(userId);
  }

  // Notify room that user left
  io.to(room).emit('duel:left', { userId });
  console.log(`User ${userId} left duel room ${room}`);
}

module.exports = registerDuelSocket;