const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3456;

// ─── Auth config ──────────────────────────────────────
const AUTH_USER = process.env.MEMOALE_USER || 'admin';
const AUTH_PASS = process.env.MEMOALE_PASS || 'admin';
const JWT_SECRET = process.env.MEMOALE_SECRET || require('crypto').randomBytes(32).toString('hex');
const PASS_HASH = bcrypt.hashSync(AUTH_PASS, 10);

// ─── Middleware ───────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Database ─────────────────────────────────────────
const dbDir = (process.env.RENDER_DISK_PATH || '').trim()
  ? '/opt/render/project/src/data'
  : path.join(__dirname, '..', 'data');
fs.mkdirSync(dbDir, { recursive: true });
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

// ─── Auth helpers ─────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticazione richiesta' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = decoded;
    next();
  } catch(e) {
    res.status(401).json({ error: 'Sessione scaduta o non valida' });
  }
}

// ─── Auth routes ──────────────────────────────────────
app.get('/api/auth/check', (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.json({ authenticated: false });
  try {
    jwt.verify(header.slice(7), JWT_SECRET);
    res.json({ authenticated: true });
  } catch(e) {
    res.json({ authenticated: false });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Inserisci username e password' });
  if (username !== AUTH_USER) return res.status(401).json({ error: 'Credenziali non valide' });
  if (!bcrypt.compareSync(password, PASS_HASH)) return res.status(401).json({ error: 'Credenziali non valide' });

  const token = jwt.sign({ user: username, ts: Date.now() }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

// ─── API routes (protected) ───────────────────────────
app.use('/api/clients', authMiddleware);
app.use('/api/projects', authMiddleware);

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
});