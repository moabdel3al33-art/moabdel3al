'use strict';
const path = require('path');
const http = require('http');
const express = require('express');
const multer = require('multer');
const { Server } = require('socket.io');
const config = require('./config');
const db = require('./db');
const settings = require('./settings');
const auth = require('./auth');
const chat = require('./chat');
const shop = require('./shop');
const admin = require('./admin');
const pages = require('./pages');
const social = require('./social');
const seed = require('./seed');
const comments = require('./comments');
const storage = require('./storage');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
// Railway checks this address to know the site is up.
app.get('/health', (req, res) => res.json({ ok: true }));
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e6 });

// ---- Static files ----
app.use(express.static(path.join(config.root, 'public'), { maxAge: config.prod ? '7d' : 0, index: false }));
// Uploaded files live in MongoDB Atlas (see storage.js), so they survive every deploy.
app.get('/uploads/:name', async (req, res, next) => {
  try { if (!(await storage.send(req, res, req.params.name))) res.status(404).end(); } catch (e) { next(e); }
});

app.use(express.json({ limit: '2mb' }));
app.use(auth.attach);

// Basic CSRF protection: every state-changing API call must come from our own scripts.
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'fetch') return res.status(403).json({ error: 'Bad request' });
  next();
});

// ---- Chat uploads (images, voice notes, files) ----
const fixName = (n) => {
  if (/[^\x00-\xff]/.test(n)) return n;
  const d = Buffer.from(n, 'latin1').toString('utf8');
  return d.includes('�') ? n : d;
};
const upload = multer({
  storage: storage.multerStorage(),
  limits: { fileSize: config.maxUploadMb * 1048576 },
});
app.post('/api/upload', auth.requireUser, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: req.t('No file received') });
  res.json({ url: `/uploads/${req.file.filename}`, name: fixName(req.file.originalname).slice(0, 200), size: req.file.size, mime: req.file.mimetype });
});

// ---- API ----
app.use('/api/auth', auth.router);
app.use('/api/chat', chat.router);
app.use('/api/shop', shop.router);
app.use('/api/pay', require('./payments').router);
app.use('/api/comments', comments.router);
app.use('/api/admin/comments', comments.admin);
app.use('/api/admin', admin.router);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ---- Pages ----
app.use(pages.router);
app.use(pages.notFound);

app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `File is too large (max ${config.maxUploadMb} MB)` });
  console.error(err);
  if (req.path.startsWith('/api')) return res.status(500).json({ error: 'Server error' });
  res.status(500).send('Server error');
});

chat.setup(io);

(async () => {
  try {
    const c = await db.init();
    console.log(`  Database    : MongoDB ${c.host} / ${c.database}`);
  } catch (e) {
    console.error('\n  Could not connect to MongoDB:', e.message);
    console.error('  -> Check MONGODB_URI in the .env file, and that your IP is allowed in MongoDB Atlas (Network Access).\n');
    process.exit(1);
  }
  await storage.init();
  await storage.importLocalFiles();
  await settings.load();
  await settings.migrate();
  await auth.seedAdmin();
  await seed.demo();
  await seed.plans();
  social.scheduleSync();
  server.listen(config.port, () => {
    console.log(`\n  Website     : ${config.siteUrl}/`);
    console.log(`  Admin panel : ${config.siteUrl}/admin`);
    console.log(`  Email       : ${config.mailEnabled ? `sending from ${config.smtp.user}` : 'NOT set up - codes are printed here and shown on the page'}\n`);
  });
})();
