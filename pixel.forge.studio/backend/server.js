const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { initDatabase } = require('./database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5555;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  if (req.method !== 'OPTIONS' && !req.url.startsWith('/api/analytics/events')) {
    console.log(`[API] ${req.method} ${req.url}`);
  }
  next();
});

// Import Routes
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const analyticsRoutes = require('./routes/analytics');
const abTestRoutes = require('./routes/abTest');
const visitorRoutes = require('./routes/visitor');
const pilotRoutes = require('./routes/pilot');

// API Mounts
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ab', abTestRoutes);
app.use('/api/visitor', visitorRoutes);
app.use('/api/pilot', pilotRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Pixel Forge Studio Core API & Tracking Engine',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint: Return rich status page and direct link to frontend app
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Pixel Forge Studio — Backend API & Engine</title>
      <style>
        body {
          background: #07090e;
          color: #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
          margin: 0;
          padding: 40px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
        }
        .card {
          background: #0e111a;
          border: 1px solid rgba(0, 240, 255, 0.4);
          border-radius: 12px;
          max-width: 650px;
          width: 100%;
          padding: 32px;
          box-shadow: 0 0 35px rgba(0, 240, 255, 0.15);
        }
        h1 { color: #00f0ff; margin-top: 0; font-size: 24px; }
        .badge {
          display: inline-block;
          background: rgba(0, 255, 136, 0.15);
          color: #00ff88;
          border: 1px solid rgba(0, 255, 136, 0.4);
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 16px;
        }
        .btn {
          display: inline-block;
          background: #00f0ff;
          color: #000;
          font-weight: bold;
          padding: 12px 24px;
          border-radius: 6px;
          text-decoration: none;
          margin-top: 20px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .btn:hover { background: #5cffff; }
        ul { padding-left: 20px; color: #94a3b8; font-size: 14px; line-height: 1.8; }
        a.link { color: #ff007f; text-decoration: none; }
        a.link:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">● BACKEND ENGINE ONLINE</div>
        <h1>🎮 Pixel Forge Studio — Core API</h1>
        <p style="color: #94a3b8;">
          The Node.js/Express backend server and SQLite Telemetry/A-B Testing Engine are active and listening on port <strong>5555</strong>.
        </p>
        
        <p><strong>Available API Routes:</strong></p>
        <ul>
          <li><a class="link" href="/api/health">/api/health</a> &mdash; Server status and uptime</li>
          <li><a class="link" href="/api/content/games">/api/content/games</a> &mdash; Game portfolio data</li>
          <li><a class="link" href="/api/content/team">/api/content/team</a> &mdash; Studio team roster</li>
          <li><a class="link" href="/api/content/jobs">/api/content/jobs</a> &mdash; Active job openings</li>
          <li><a class="link" href="/api/analytics/overview">/api/analytics/overview</a> &mdash; Telemetry summary (Auth)</li>
          <li><a class="link" href="/api/ab/experiments">/api/ab/experiments</a> &mdash; A/B testing & Z-test statistics (Auth)</li>
        </ul>

        <div style="text-align: center; margin-top: 24px;">
          <a class="btn" href="http://localhost:3333/" target="_blank">Open Frontend Website (Port 3333) &rarr;</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Start Server after DB init
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n==================================================`);
      console.log(`🎮 Pixel Forge Studio Backend Engine`);
      console.log(`📡 Listening on: http://localhost:${PORT}`);
      console.log(`📊 Analytics & A/B Engine: ONLINE`);
      console.log(`==================================================\n`);
    });
  })
  .catch(err => {
    console.error('Fatal Database Initialization Error:', err);
    process.exit(1);
  });
