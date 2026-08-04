const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const { initDatabase } = require('./initDb');

const app = express();

app.use(cors());
app.use(express.json());

// Serve React build (production)
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
const clientSrcPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientBuildPath));
app.use(express.static(clientSrcPath));

app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);

// Admin routes → admin.html
app.get('/admin', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'admin.html'));
});
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'admin.html'));
});

// SPA fallback - serve index.html for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  }
});

async function start() {
  console.log('Initializing database...');
  await initDatabase();

  app.listen(config.port, () => {
    console.log(`Server chạy tại http://localhost:${config.port}`);
    console.log(`API: GET /api/search?q=keyword`);
  });
}

start().catch(err => {
  console.error('Server start error:', err);
  process.exit(1);
});
