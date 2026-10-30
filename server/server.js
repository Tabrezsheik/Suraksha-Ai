require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const contactsRoutes = require('./routes/contacts.routes');
const emergencyRoutes = require('./routes/emergency.routes');
const trackingRoutes = require('./routes/tracking.routes');
const riskRoutes = require('./routes/risk.routes');
const guardianRoutes = require('./routes/guardian.routes');
const routesRoutes = require('./routes/routes.routes');
const initializeSockets = require('./sockets/socketHandler');
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach io instance to express app for controller access
app.set('io', io);

// Initialize Phase 5 Socket.IO Handlers & JWT Auth Middleware
initializeSockets(io);

// Initialize Phase 8 Periodic Guardian Active Session Monitor
const guardianService = require('./services/guardianService');
guardianService.startActiveSessionMonitor(io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Connect to Database
connectDB();

// Basic health check endpoint (Phase 1 — preserved)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Suraksha AI backend API is running',
    timestamp: new Date()
  });
});

// Root endpoint (Phase 1 — preserved)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Suraksha AI API server'
  });
});

// Phase 2 — Authentication routes
app.use('/api/auth', authRoutes);

// Phase 3 — User Profile & Trusted Circle routes
app.use('/api/users', usersRoutes);
app.use('/api/contacts', contactsRoutes);

// Phase 4 — Silent SOS & Emergency Core routes
app.use('/api/emergency', emergencyRoutes);

// Phase 5 — Live GPS & Real-Time Tracking routes
app.use('/api/tracking', trackingRoutes);

// Phase 6 — AI Risk Detection routes
app.use('/api/risk', riskRoutes);

// Phase 7 — Guardian Mode routes
app.use('/api/guardian', guardianRoutes);

// Phase 8 — AI Safe Route routes
app.use('/api/routes', routesRoutes);

const assistantRoutes = require('./routes/assistant.routes');
const evidenceRoutes = require('./routes/evidence.routes');
const notificationRoutes = require('./routes/notification.routes');

// Phase 9 — AI Safety Assistant, Emergency Evidence & Notification routes
app.use('/api/assistant', assistantRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/notifications', notificationRoutes);

// Centralized error handler — must be registered LAST (Phase 2)
app.use(errorHandler);


// Server configuration
const PORT = process.env.PORT || 5000;

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error('==================================================');
    console.error('SURAKSHA AI SERVER — PORT CONFLICT');
    console.error('==================================================');
    console.error(`Port ${PORT} is already in use.`);
    console.error('Another SURAKSHA AI backend instance may already');
    console.error('be running.');
    console.error('The server will NOT switch to another port.');
    console.error('If you need to identify the process on Windows:');
    console.error(`  netstat -ano | findstr :${PORT}`);
    console.error('Then stop the correct process manually if necessary.');
    console.error('==================================================');
    process.exit(1);
  }
  console.error('[Server] Unexpected server error:', error);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


