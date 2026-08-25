const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3456;

// ─── Auth config ──────────────────────────────────────
const AUTH_USER = process.env.MEMOALE_USER || 'admin';
const AUTH_PASS = process.env.MEMOALE_PASS || 'admin';
const SESSION_SECRET = process.env.MEMOALE_SECRET || crypto.randomBytes(32).toString('hex');

// ─── Middleware ───────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(cookieParser(SESSION_SECRET));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Database ─────────────────────────────────────────
const dbDir = path.join(__dirname, '..', 'data');
require('fs').mkdirSync(dbDir, { recursive: true });
const db = new Database(path.join(dbDir, 'memoale.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      web_url TEXT DEFAULT '',
      repo_url TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      UNIQUE(client_id, name)
    );
  `);
console.log('✓ Database ready');

// ─── API Routes ───────────────────────────────────────

// Auth check
app.get('/api/auth/check', (req, res) => {
  res.json({ authenticated: !!req.signedCookies.auth });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === AUTH_USER && password === AUTH_PASS) {
    res.cookie('auth', '1', { signed: true, httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Credenziali non valide' });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth');
  res.json({ success: true });
});

// Auth middleware
function requireAuth(req, res, next) {
  if (req.signedCookies.auth === '1') return next();
  if (req.path.startsWith('/api/auth/')) return next();
  res.status(401).json({ error: 'Autenticazione richiesta' });
}
app.use('/api', requireAuth);

// GET all clients with their projects
app.get('/api/clients', (req, res) => {
  try {
    const clients = db.prepare('SELECT * FROM clients ORDER BY name').all();
    const getProjects = db.prepare('SELECT * FROM projects WHERE client_id = ? ORDER BY name');
    const result = clients.map(c => ({ ...c, projects: getProjects.all(c.id) }));
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nome cliente obbligatorio' });
  try {
    const stmt = db.prepare('INSERT INTO clients (name) VALUES (?)');
    const info = stmt.run(name.trim());
    res.json({ id: info.lastInsertRowid, name: name.trim() });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Cliente già esistente' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/clients/:id', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nome cliente obbligatorio' });
  try {
    db.prepare('UPDATE clients SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
    res.json({ success: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Nome già esistente' });
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/clients/:id', (req, res) => {
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/clients/:clientId/projects', (req, res) => {
  const { name, web_url, repo_url } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nome progetto obbligatorio' });
  try {
    const stmt = db.prepare('INSERT INTO projects (client_id, name, web_url, repo_url) VALUES (?, ?, ?, ?)');
    const info = stmt.run(req.params.clientId, name.trim(), web_url || '', repo_url || '');
    res.json({ id: info.lastInsertRowid, name: name.trim(), web_url: web_url || '', repo_url: repo_url || '' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Progetto già esistente per questo cliente' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/projects/:id', (req, res) => {
  const { name, web_url, repo_url } = req.body;
  try {
    db.prepare('UPDATE projects SET name = ?, web_url = ?, repo_url = ? WHERE id = ?')
      .run(name?.trim() || '', web_url || '', repo_url || '', req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/projects/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Serve SPA fallback ──────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`📋 MemoAle running on http://localhost:${PORT}`);
  console.log(`   Open http://localhost:${PORT} in your browser`);
});