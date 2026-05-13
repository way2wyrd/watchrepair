const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateSecret: totpGenerateSecret, generateSync: totpGenerate, verifySync: totpVerify, generateURI: totpURI } = require('otplib');
const QRCode = require('qrcode');

// nodemailer is optional — if SMTP isn't configured we log the link instead.
let nodemailer;
try { nodemailer = require('nodemailer'); } catch { nodemailer = null; }

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'public');
const DB_PATH = path.join(DATA_DIR, 'WatchRepair.db3');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── JWT Secret ───
const JWT_SECRET_PATH = path.join(DATA_DIR, '.jwt_secret');
let JWT_SECRET;
if (process.env.JWT_SECRET) {
  JWT_SECRET = process.env.JWT_SECRET;
} else if (fs.existsSync(JWT_SECRET_PATH)) {
  JWT_SECRET = fs.readFileSync(JWT_SECRET_PATH, 'utf8').trim();
} else {
  JWT_SECRET = crypto.randomBytes(64).toString('hex');
  fs.writeFileSync(JWT_SECRET_PATH, JWT_SECRET, { mode: 0o600 });
  console.log('Generated new JWT secret');
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

const MANUALS_DIR = process.env.MANUALS_DIR || path.join(__dirname, 'manuals');
if (!fs.existsSync(MANUALS_DIR)) fs.mkdirSync(MANUALS_DIR, { recursive: true });
app.use('/manual-files', express.static(MANUALS_DIR));

const MOVEMENT_PHOTOS_DIR = process.env.MOVEMENT_PHOTOS_DIR || path.join(DATA_DIR, 'movement-photos');
const LEGACY_MOVEMENT_PHOTOS_DIR = path.join(__dirname, 'movement-photos');
if (!fs.existsSync(MOVEMENT_PHOTOS_DIR)) fs.mkdirSync(MOVEMENT_PHOTOS_DIR, { recursive: true });
if (LEGACY_MOVEMENT_PHOTOS_DIR !== MOVEMENT_PHOTOS_DIR && fs.existsSync(LEGACY_MOVEMENT_PHOTOS_DIR)) {
  for (const filename of fs.readdirSync(LEGACY_MOVEMENT_PHOTOS_DIR)) {
    const legacyPath = path.join(LEGACY_MOVEMENT_PHOTOS_DIR, filename);
    const currentPath = path.join(MOVEMENT_PHOTOS_DIR, filename);
    if (fs.statSync(legacyPath).isFile() && !fs.existsSync(currentPath)) {
      fs.copyFileSync(legacyPath, currentPath);
    }
  }
}
app.use('/movement-photos', express.static(MOVEMENT_PHOTOS_DIR));

const PARTS_REF_DIR = path.join(__dirname, 'public', 'parts-ref');
if (!fs.existsSync(PARTS_REF_DIR)) fs.mkdirSync(PARTS_REF_DIR, { recursive: true });
app.use('/parts-ref', express.static(PARTS_REF_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `watch-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype.replace('image/', ''))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const manualStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MANUALS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `manual-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const manualUpload = multer({
  storage: manualStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
});

const movementPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MOVEMENT_PHOTOS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `movement-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const movementPhotoUpload = multer({
  storage: movementPhotoStorage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

let db;

async function initDB() {
  const SQL = await initSqlJs();
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    console.log(`No database found, creating new one at ${DB_PATH}`);
    db = new SQL.Database();
  }
  // sql.js disables FK enforcement by default — turn it on so ON DELETE CASCADE works.
  db.run('PRAGMA foreign_keys = ON');

  // ─── Base tables (created on first run) ───
  db.run(`CREATE TABLE IF NOT EXISTS movementType (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS position (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL
  )`);

  const existingPositions = db.exec('SELECT COUNT(*) FROM position');
  if (existingPositions[0]?.values[0][0] === 0) {
    ['Dial Up', 'Dial Down', 'Crown Up', 'Crown Down', 'Crown Left', 'Crown Right'].forEach(desc => {
      db.run('INSERT INTO position (description) VALUES (?)', [desc]);
    });
  }

  db.run(`CREATE TABLE IF NOT EXISTS movement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    manufacturer TEXT,
    jewels INTEGER,
    movementType INTEGER REFERENCES movementType(id),
    caliber TEXT,
    frequency INTEGER,
    liftAngle INTEGER,
    launchYear INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS watch (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    yearMade INTEGER,
    serialNumber TEXT,
    dialColor TEXT,
    notes TEXT,
    movement INTEGER REFERENCES movement(id),
    status TEXT DEFAULT 'Received',
    customerName TEXT DEFAULT '',
    brand TEXT DEFAULT '',
    model TEXT DEFAULT '',
    estimatedCompletion DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add photos table if it doesn't exist
  db.run(`CREATE TABLE IF NOT EXISTS photo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watchId INTEGER NOT NULL REFERENCES watch(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    caption TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add parts table if it doesn't exist
  db.run(`CREATE TABLE IF NOT EXISTS part (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watchId INTEGER NOT NULL REFERENCES watch(id) ON DELETE CASCADE,
    partNumber TEXT,
    description TEXT,
    vendor TEXT,
    dateOrdered DATETIME,
    received INTEGER DEFAULT 0,
    cost DECIMAL,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add category and description columns to photo if missing
  try { db.run('ALTER TABLE photo ADD COLUMN category TEXT DEFAULT ""'); } catch(e) {}
  try { db.run('ALTER TABLE photo ADD COLUMN description TEXT DEFAULT ""'); } catch(e) {}

  // Timing sessions and readings (hierarchical timing system)
  db.run(`CREATE TABLE IF NOT EXISTS timing_session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watchId INTEGER NOT NULL REFERENCES watch(id) ON DELETE CASCADE,
    liftAngle INTEGER,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS timing_reading (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessionId INTEGER NOT NULL REFERENCES timing_session(id) ON DELETE CASCADE,
    position INTEGER REFERENCES position(id),
    rate DECIMAL,
    beatError DECIMAL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add manual_category table
  db.run(`CREATE TABLE IF NOT EXISTS manual_category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed default manual categories
  const existingCats = db.exec('SELECT COUNT(*) FROM manual_category');
  if (existingCats[0]?.values[0][0] === 0) {
    const defaultCats = ['Service Manual', 'Technical Bulletin', 'Parts Catalog', 'Specification Sheet', 'Training Material', 'Reference Guide'];
    defaultCats.forEach(name => {
      db.run('INSERT OR IGNORE INTO manual_category (name) VALUES (?)', [name]);
    });
  }

  // Add manual table
  db.run(`CREATE TABLE IF NOT EXISTS manual (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    originalName TEXT,
    fileType TEXT,
    fileSize INTEGER,
    category TEXT,
    subcategories TEXT,
    manufacturer TEXT,
    caliber TEXT,
    date TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  try { db.run('ALTER TABLE manual ADD COLUMN subcategories TEXT'); } catch(e) {}

  // Add status and customerName columns to watch if missing
  try { db.run('ALTER TABLE watch ADD COLUMN status TEXT DEFAULT "Received"'); } catch(e) {}
  try { db.run('ALTER TABLE watch ADD COLUMN customerName TEXT DEFAULT ""'); } catch(e) {}
  try { db.run('ALTER TABLE watch ADD COLUMN brand TEXT DEFAULT ""'); } catch(e) {}
  try { db.run('ALTER TABLE watch ADD COLUMN model TEXT DEFAULT ""'); } catch(e) {}
  try { db.run('ALTER TABLE watch ADD COLUMN estimatedCompletion DATETIME'); } catch(e) {}
  try { db.run('ALTER TABLE watch ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch(e) {}

  // Add frequency, liftAngle, launchYear columns to movement if missing
  try { db.run('ALTER TABLE movement ADD COLUMN frequency INTEGER'); } catch(e) {}
  try { db.run('ALTER TABLE movement ADD COLUMN liftAngle INTEGER'); } catch(e) {}
  try { db.run('ALTER TABLE movement ADD COLUMN launchYear INTEGER'); } catch(e) {}

  // Movement photos (not included in watch gallery)
  db.run(`CREATE TABLE IF NOT EXISTS movement_photo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movementId INTEGER NOT NULL REFERENCES movement(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    category TEXT DEFAULT 'Front',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Ebauche code lookup table
  db.run(`CREATE TABLE IF NOT EXISTS ebauche_code (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    brand TEXT NOT NULL
  )`);

  // Seed ebauche codes if empty
  const existingEbauche = db.exec('SELECT COUNT(*) FROM ebauche_code');
  if (existingEbauche[0]?.values[0][0] === 0) {
    const codes = [
      ['AOC','Roamer'],['AOL','Adolph Schwarcz&Son'],['AOX','Alstate W,Co.'],
      ['AXA','Wittnauer'],['AXZ','Benrus(1)'],['AYP','Audemars Piguet'],
      ['BOL','Lemania'],['BXC','Avia'],['BXJ','Midland'],['BXN','Benrus(2)'],
      ['BXP','Imperial,Pretzfelder&Mills'],['BXW','Bulova'],['COC','Crawford'],
      ['COW','Croton'],['CXC','Concord'],['CXD','Cypres'],['CXH','Clinton'],
      ['CXV','Cort'],['CXW','Central, Benrus(3)'],['DOB','Dreffa W.Co.'],
      ['DOW','Deauville'],['EOE','Elrex'],['EON','Avalon'],['EOP','Harvel'],
      ['EOT','Lavina'],['EXC','Everbrite'],['FXE','Provis'],
      ['FXU','Louis Aisenstein&Bros.'],['FXW','Louis(1)'],['GXC','Gruen'],
      ['GXI','Gotham(Ollendorff)'],['GXM','Girard-Perregaux'],['GXR','Grant'],
      ['GXW','Gothic'],['HOM','Homis'],['HON','Tissot(1);A.Hirsch'],
      ['HOR','Lanco;Langendorf'],['HOU','Oris'],['HXF','Harman'],
      ['HXM','R.H.Macy&Co.'],['HXN','Harvel'],['HXO','Harold K.Oleet'],
      ['HXW','Helbros'],['HYL','Hamilton'],['HYO','Hilton W Co.'],
      ['JXE','Normandie'],['JXJ','Jules Jurgensen'],['JXR','Gallet'],
      ['KOT','Landau'],['KXJ','Wm.J.Kappel'],['KXV','Louis(2)'],
      ['KXZ','Kelton;Benrus(4),Central'],['LOA','Emil Langer'],['LOD','Latham'],
      ['LOE','Packard'],['LXA','Laco,Winton,Elbon'],['LXE','Evkob'],
      ['LXJ','LeCoultre'],['LXW','Longines'],['MOG','Mead&Co.;Boulevard'],
      ['MOU','Tower;Delbana'],['MXE','Monarch'],['MXH','Seeland'],
      ['MXI','Movado'],['MXT','Mathey-Tissot'],['NOA','U.Nardin'],
      ['NOS','Heritage'],['NOU','Louvic'],['NXJ','National Jewelers Co.'],
      ['NXO','Oris'],['OXG','Omega'],['OXL','Wyler(1)'],['OYT','Shriro(Sandoz)'],
      ['POY','Camy;Copley'],['PXA','Pierce'],['PXP','Patek Philippe'],
      ['PXT','Paul Breguette'],['PXW','Parker'],['PYS','Langel'],
      ['QXO','Kelbert'],['ROC','Raleigh'],['ROL','Ribaux'],['ROP','Rodania'],
      ['ROW','Rolex'],['RXG','R.Gsell&Co.'],['RXM','Galmor'],['RXW','Rima'],
      ['RXY','Liengme'],['RYW','Ritex'],['SOA','Felca'],['SOE','Semca'],
      ['SOW','Seeland'],['SOX','Cortebert,Orvin'],['SXE','Savoy;Banner'],
      ['SXK','S.Kocher&Co.'],['SXS','Franco'],['UOA','Actua'],['UOB','Aero'],
      ['UOW','Universal'],['UXM','Medana'],['UXN','Marsh'],
      ['UYW','Stanley W.Co.'],['VOS','Sheffield'],['VXN','Vacheron&Constantin'],
      ['VXT','Kingston'],['WOA','Tower'],['WOB','Wyler(2)'],['WOG','Breitling'],
      ['WOR','Creston'],['WXC','Buren'],['WXE','Welsbro'],['WXW','Westfield'],
      ['ZFX','Zenith W.Co.'],['ZOV','Titus'],
    ];
    codes.forEach(([code, brand]) => {
      db.run('INSERT OR IGNORE INTO ebauche_code (code, brand) VALUES (?, ?)', [code, brand]);
    });
  }

  // Inventory parts table (standalone parts catalog, not tied to a watch)
  db.run(`CREATE TABLE IF NOT EXISTS inventory_part (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quantity INTEGER DEFAULT 1,
    part_number TEXT,
    type TEXT,
    manufacturer TEXT,
    caliber TEXT,
    ebauche_code TEXT,
    ligne REAL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  try { db.run('ALTER TABLE inventory_part ADD COLUMN part_number TEXT'); } catch(e) {}
  try { db.run('ALTER TABLE inventory_part ADD COLUMN ligne REAL'); } catch(e) {}
  try { db.run('ALTER TABLE inventory_part ADD COLUMN notes TEXT'); } catch(e) {}
  try { db.run('ALTER TABLE users ADD COLUMN last_mfa_at DATETIME'); } catch(e) {}

  // ─── Auth Tables ───
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  try { db.run('ALTER TABLE users ADD COLUMN email TEXT'); } catch(e) {}
  try { db.run('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0'); } catch(e) {}

  db.run(`CREATE TABLE IF NOT EXISTS mfa_secrets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Password setup / reset tokens for invited users
  db.run(`CREATE TABLE IF NOT EXISTS password_setup_token (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed default admin if no users exist
  const userCount = db.exec('SELECT COUNT(*) FROM users');
  if (userCount[0]?.values[0][0] === 0) {
    const DEFAULT_PASSWORD = 'WatchApp1!';
    const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 12);
    db.run('INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)', ['admin', hash]);
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  Default admin account created           ║');
    console.log('║  Username: admin                         ║');
    console.log(`║  Password: ${DEFAULT_PASSWORD}                   ║`);
    console.log('║  Set up MFA on first login               ║');
    console.log('╚══════════════════════════════════════════╝\n');
  } else {
    // Ensure the original 'admin' user has is_admin set (post-migration backfill)
    db.run("UPDATE users SET is_admin = 1 WHERE username = 'admin' AND (is_admin IS NULL OR is_admin = 0)");
  }

  // Clean up orphan tokens / mfa_secrets from before FK enforcement was enabled
  db.run('DELETE FROM password_setup_token WHERE user_id NOT IN (SELECT id FROM users)');
  db.run('DELETE FROM mfa_secrets WHERE user_id NOT IN (SELECT id FROM users)');

  saveDB();
  console.log('Database initialized');
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// ─── Auth Helpers ───
function dbQueryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    if (payload.purpose !== 'session') return res.status(401).json({ error: 'Unauthorized' });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

function requireAdmin(req, res, next) {
  const row = dbQueryOne('SELECT is_admin FROM users WHERE id = ?', [req.user.userId]);
  if (!row || !row.is_admin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

// ─── Email ───
let mailTransport = null;
if (nodemailer && process.env.SMTP_HOST) {
  mailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

async function sendPasswordSetupEmail({ to, username, link }) {
  const subject = 'Set up your Fricking Watch Repair account';
  const text = `Hello ${username},\n\nAn account has been created for you on Fricking Watch Repair.\n\nClick the link below to set your password (valid for 72 hours):\n${link}\n\nIf you weren't expecting this, please ignore this email.`;
  const html = `<p>Hello <strong>${username}</strong>,</p>
<p>An account has been created for you on <strong>Fricking Watch Repair</strong>.</p>
<p><a href="${link}">Click here to set your password</a> (valid for 72 hours).</p>
<p style="color:#888;font-size:12px">Or copy this URL into your browser:<br/>${link}</p>`;

  if (!mailTransport) {
    console.log('\n[email] SMTP not configured — would have sent password setup email:');
    console.log(`  To: ${to}`);
    console.log(`  Link: ${link}\n`);
    return { sent: false, link };
  }
  await mailTransport.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@frickingwatchrepair.local',
    to, subject, text, html,
  });
  return { sent: true };
}

function verifyTempToken(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    return payload.purpose === 'temp_auth' ? payload : null;
  } catch {
    return null;
  }
}

function issueSessionToken(userId, username) {
  return jwt.sign({ userId, username, purpose: 'session' }, JWT_SECRET, { expiresIn: '60d' });
}

// ─── Auth Routes (no auth required) ───
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = dbQueryOne('SELECT id, username, password_hash FROM users WHERE username = ?', [username]);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const mfa = dbQueryOne('SELECT id FROM mfa_secrets WHERE user_id = ? AND verified = 1 ORDER BY id DESC LIMIT 1', [user.id]);

  // Skip MFA prompt if user completed MFA within the last 90 days
  const fullUser = dbQueryOne('SELECT last_mfa_at FROM users WHERE id = ?', [user.id]);
  if (mfa && fullUser?.last_mfa_at) {
    const daysSinceMFA = (Date.now() - new Date(fullUser.last_mfa_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceMFA < 60) {
      const token = issueSessionToken(user.id, user.username);
      return res.json({ step: 'authenticated', token, username: user.username, userId: user.id });
    }
  }

  const tempToken = jwt.sign({ userId: user.id, username: user.username, purpose: 'temp_auth' }, JWT_SECRET, { expiresIn: '5m' });
  res.json({ step: mfa ? 'mfa_required' : 'mfa_setup', tempToken });
});

app.get('/api/auth/mfa/setup', async (req, res) => {
  const payload = verifyTempToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const secret = totpGenerateSecret();
  db.run('DELETE FROM mfa_secrets WHERE user_id = ? AND verified = 0', [payload.userId]);
  db.run('INSERT INTO mfa_secrets (user_id, secret, verified) VALUES (?, ?, 0)', [payload.userId, secret]);
  saveDB();

  const otpauth = totpURI({ secret, label: encodeURIComponent(`${payload.username}@FrickingWatchRepair`), issuer: 'Fricking Watch Repair', type: 'totp' });
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  res.json({ secret, qrDataUrl });
});

app.post('/api/auth/mfa/setup/verify', (req, res) => {
  const payload = verifyTempToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Code required' });

  const mfa = dbQueryOne('SELECT id, secret FROM mfa_secrets WHERE user_id = ? AND verified = 0 ORDER BY id DESC LIMIT 1', [payload.userId]);
  if (!mfa) return res.status(400).json({ error: 'No pending MFA setup found' });

  if (!totpVerify({ token: code.replace(/\s/g, ''), secret: mfa.secret, window: 1 }).valid) {
    return res.status(400).json({ error: 'Invalid code — check your authenticator app' });
  }

  db.run('UPDATE mfa_secrets SET verified = 1 WHERE id = ?', [mfa.id]);
  db.run('UPDATE users SET last_mfa_at = datetime(\'now\') WHERE id = ?', [payload.userId]);
  saveDB();

  const token = issueSessionToken(payload.userId, payload.username);
  res.json({ token, username: payload.username, userId: payload.userId });
});

app.post('/api/auth/mfa/verify', (req, res) => {
  const payload = verifyTempToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Code required' });

  const mfa = dbQueryOne('SELECT secret FROM mfa_secrets WHERE user_id = ? AND verified = 1 ORDER BY id DESC LIMIT 1', [payload.userId]);
  if (!mfa) return res.status(400).json({ error: 'MFA not configured' });

  if (!totpVerify({ token: code.replace(/\s/g, ''), secret: mfa.secret, window: 1 }).valid) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  db.run('UPDATE users SET last_mfa_at = datetime(\'now\') WHERE id = ?', [payload.userId]);
  saveDB();

  const token = issueSessionToken(payload.userId, payload.username);
  res.json({ token, username: payload.username, userId: payload.userId });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const row = dbQueryOne('SELECT email, is_admin FROM users WHERE id = ?', [req.user.userId]);
  res.json({
    userId: req.user.userId,
    username: req.user.username,
    email: row?.email || null,
    is_admin: !!row?.is_admin,
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

// ─── Password setup (no auth required) ───
// Look up a setup token to show the user the username it belongs to.
app.get('/api/auth/password-setup/:token', (req, res) => {
  const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const row = dbQueryOne(
    `SELECT t.id, t.user_id, t.expires_at, t.used_at, u.username, u.email
     FROM password_setup_token t JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = ?`,
    [tokenHash]
  );
  if (!row) return res.status(404).json({ error: 'Invalid or expired link' });
  if (row.used_at) return res.status(410).json({ error: 'This link has already been used' });
  if (new Date(row.expires_at) < new Date()) return res.status(410).json({ error: 'This link has expired' });
  res.json({ username: row.username, email: row.email });
});

// Consume a token + set the password.
app.post('/api/auth/password-setup/:token', async (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const row = dbQueryOne(
    `SELECT id, user_id, expires_at, used_at FROM password_setup_token WHERE token_hash = ?`,
    [tokenHash]
  );
  if (!row) return res.status(404).json({ error: 'Invalid or expired link' });
  if (row.used_at) return res.status(410).json({ error: 'This link has already been used' });
  if (new Date(row.expires_at) < new Date()) return res.status(410).json({ error: 'This link has expired' });

  const hash = await bcrypt.hash(password, 12);
  db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, row.user_id]);
  db.run("UPDATE password_setup_token SET used_at = datetime('now') WHERE id = ?", [row.id]);
  // Invalidate any other pending tokens for this user
  db.run("UPDATE password_setup_token SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL", [row.user_id]);
  saveDB();

  res.json({ success: true });
});

// All routes below this line require a valid 60-day session token
app.use('/api', requireAuth);

// ─── User Management (admin only) ───
function publicOrigin(req) {
  // In dev, the frontend runs on a separate port (Vite) and proxies /api here.
  // The browser's Origin header points at the frontend — that's what setup links must use.
  return process.env.PUBLIC_URL
    || req.get('origin')
    || `${req.protocol}://${req.get('host')}`;
}

app.get('/api/users', requireAdmin, (req, res) => {
  const results = db.exec(`
    SELECT u.id, u.username, u.email, u.is_admin, u.created_at, u.password_hash,
           (SELECT MIN(expires_at) FROM password_setup_token t
            WHERE t.user_id = u.id AND t.used_at IS NULL AND t.expires_at > datetime('now')) as pending_invite_expires
    FROM users u ORDER BY u.username
  `);
  if (!results.length) return res.json([]);
  res.json(results[0].values.map(r => ({
    id: r[0], username: r[1], email: r[2], is_admin: !!r[3], created_at: r[4],
    password_set: !!r[5] && r[5] !== 'INVITED',
    pending_invite: !!r[6],
  })));
});

app.post('/api/users', requireAdmin, async (req, res) => {
  const { username, email, is_admin } = req.body || {};
  if (!username || !username.trim()) return res.status(400).json({ error: 'Username is required' });
  if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required' });

  const existing = dbQueryOne('SELECT id FROM users WHERE username = ?', [username.trim()]);
  if (existing) return res.status(409).json({ error: 'Username already exists' });

  // Placeholder hash — user can't log in until they set a real password via the setup link.
  const placeholder = 'INVITED';
  db.run(
    'INSERT INTO users (username, password_hash, email, is_admin) VALUES (?, ?, ?, ?)',
    [username.trim(), placeholder, email.trim(), is_admin ? 1 : 0]
  );
  const insertedId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  db.run(
    'INSERT INTO password_setup_token (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [insertedId, tokenHash, expiresAt]
  );
  saveDB();

  const link = `${publicOrigin(req)}/set-password/${rawToken}`;

  let emailResult = { sent: false };
  try {
    emailResult = await sendPasswordSetupEmail({ to: email.trim(), username: username.trim(), link });
  } catch (err) {
    console.error('Failed to send password setup email:', err.message);
  }

  res.json({
    id: insertedId, username: username.trim(), email: email.trim(), is_admin: !!is_admin,
    email_sent: emailResult.sent,
    // Returned only when SMTP isn't configured, so the admin can copy the link manually.
    setup_link: emailResult.sent ? undefined : link,
  });
});

// Re-send the password setup email (generates a fresh token)
app.post('/api/users/:id/resend-invite', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const user = dbQueryOne('SELECT id, username, email FROM users WHERE id = ?', [id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.email) return res.status(400).json({ error: 'User has no email address on file' });

  // Invalidate prior pending tokens
  db.run("UPDATE password_setup_token SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL", [id]);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  db.run(
    'INSERT INTO password_setup_token (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [id, tokenHash, expiresAt]
  );
  saveDB();

  const link = `${publicOrigin(req)}/set-password/${rawToken}`;
  let emailResult = { sent: false };
  try {
    emailResult = await sendPasswordSetupEmail({ to: user.email, username: user.username, link });
  } catch (err) {
    console.error('Failed to send password setup email:', err.message);
  }
  res.json({ email_sent: emailResult.sent, setup_link: emailResult.sent ? undefined : link });
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.userId) return res.status(400).json({ error: "You can't delete your own account" });
  db.run('DELETE FROM password_setup_token WHERE user_id = ?', [id]);
  db.run('DELETE FROM mfa_secrets WHERE user_id = ?', [id]);
  db.run('DELETE FROM users WHERE id = ?', [id]);
  saveDB();
  res.json({ success: true });
});

// ─── Positions ───
app.get('/api/positions', (req, res) => {
  const results = db.exec('SELECT * FROM position ORDER BY id');
  if (!results.length) return res.json([]);
  res.json(results[0].values.map(r => ({ id: r[0], description: r[1] })));
});

// ─── Movement Types ───
app.get('/api/movement-types', (req, res) => {
  const results = db.exec('SELECT * FROM movementType ORDER BY id');
  if (!results.length) return res.json([]);
  res.json(results[0].values.map(r => ({ id: r[0], description: r[1] })));
});

app.post('/api/movement-types', (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: 'description is required' });
  db.run('INSERT INTO movementType (description) VALUES (?)', [description]);
  saveDB();
  const result = db.exec('SELECT last_insert_rowid()');
  res.json({ id: result[0].values[0][0], description });
});

// ─── Movements ───
app.get('/api/movements', (req, res) => {
  const results = db.exec(`
    SELECT m.id, m.name, m.manufacturer, m.jewels, m.caliber,
           mt.description as movementType, m.movementType as movementTypeId,
           m.frequency, m.liftAngle, m.launchYear
    FROM movement m LEFT JOIN movementType mt ON m.movementType = mt.id
    ORDER BY m.name
  `);
  if (!results.length) return res.json([]);
  res.json(results[0].values.map(r => ({
    id: r[0], name: r[1], manufacturer: r[2], jewels: r[3],
    caliber: r[4], movementType: r[5], movementTypeId: r[6],
    frequency: r[7], liftAngle: r[8], launchYear: r[9],
  })));
});

app.get('/api/movements/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const results = db.exec(`
    SELECT m.id, m.name, m.manufacturer, m.jewels, m.caliber,
           mt.description as movementType, m.movementType as movementTypeId,
           m.frequency, m.liftAngle, m.launchYear
    FROM movement m LEFT JOIN movementType mt ON m.movementType = mt.id
    WHERE m.id = ${id}
  `);
  if (!results.length || !results[0].values.length) return res.status(404).json({ error: 'Not found' });
  const r = results[0].values[0];
  const movement = {
    id: r[0], name: r[1], manufacturer: r[2], jewels: r[3],
    caliber: r[4], movementType: r[5], movementTypeId: r[6],
    frequency: r[7], liftAngle: r[8], launchYear: r[9],
  };
  const photos = db.exec(`SELECT id, movementId, filename, category, createdAt FROM movement_photo WHERE movementId = ${id} ORDER BY category, createdAt DESC`);
  movement.photos = photos.length ? photos[0].values.map(p => ({
    id: p[0], movementId: p[1], filename: p[2], category: p[3], createdAt: p[4],
  })) : [];
  res.json(movement);
});

app.post('/api/movements', (req, res) => {
  const { name, manufacturer, jewels, movementType, caliber, frequency, liftAngle, launchYear } = req.body;
  db.run('INSERT INTO movement (name, manufacturer, jewels, movementType, caliber, frequency, liftAngle, launchYear) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, manufacturer || null, jewels || null, movementType || null, caliber || null, frequency || null, liftAngle || null, launchYear || null]);
  saveDB();
  const result = db.exec('SELECT last_insert_rowid()');
  res.json({ id: result[0].values[0][0] });
});

app.put('/api/movements/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, manufacturer, jewels, movementType, caliber, frequency, liftAngle, launchYear } = req.body;
  db.run('UPDATE movement SET name=?, manufacturer=?, jewels=?, movementType=?, caliber=?, frequency=?, liftAngle=?, launchYear=? WHERE id=?',
    [name, manufacturer || null, jewels || null, movementType || null, caliber || null, frequency || null, liftAngle || null, launchYear || null, id]);
  saveDB();
  res.json({ success: true });
});

app.delete('/api/movements/:id', (req, res) => {
  const id = parseInt(req.params.id);
  // Delete associated movement photos from disk
  const photos = db.exec(`SELECT filename FROM movement_photo WHERE movementId = ${id}`);
  if (photos.length) {
    photos[0].values.forEach(p => {
      const filePath = path.join(MOVEMENT_PHOTOS_DIR, p[0]);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  }
  db.run(`DELETE FROM movement_photo WHERE movementId = ${id}`);
  db.run(`DELETE FROM movement WHERE id = ${id}`);
  saveDB();
  res.json({ success: true });
});

// ─── Movement Photos ───
app.post('/api/movements/:id/photos', movementPhotoUpload.array('photos', 10), (req, res) => {
  const movementId = parseInt(req.params.id);
  const category = req.body.category || 'Front';
  const inserted = [];
  req.files.forEach(file => {
    db.run('INSERT INTO movement_photo (movementId, filename, category) VALUES (?, ?, ?)',
      [movementId, file.filename, category]);
    const result = db.exec('SELECT last_insert_rowid()');
    inserted.push({ id: result[0].values[0][0], filename: file.filename, category });
  });
  saveDB();
  res.json(inserted);
});

app.delete('/api/movement-photos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const photo = db.exec(`SELECT filename FROM movement_photo WHERE id = ${id}`);
  if (photo.length && photo[0].values.length) {
    const filePath = path.join(MOVEMENT_PHOTOS_DIR, photo[0].values[0][0]);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.run(`DELETE FROM movement_photo WHERE id = ${id}`);
  saveDB();
  res.json({ success: true });
});

// ─── Watches (Repairs) ───
app.get('/api/watches', (req, res) => {
  const { search, status } = req.query;
  let sql = `
    SELECT w.id, w.yearMade, w.serialNumber, w.dialColor, w.notes,
           w.status, w.customerName, w.brand, w.model, w.estimatedCompletion, w.createdAt,
           m.name as movementName, m.manufacturer, m.jewels, m.caliber,
           mt.description as movementType
    FROM watch w
    LEFT JOIN movement m ON w.movement = m.id
    LEFT JOIN movementType mt ON m.movementType = mt.id
  `;
  const conditions = [];
  if (search) {
    const s = search.replace(/'/g, "''");
    conditions.push(`(w.customerName LIKE '%${s}%' OR w.brand LIKE '%${s}%' OR w.model LIKE '%${s}%' OR w.serialNumber LIKE '%${s}%' OR w.notes LIKE '%${s}%')`);
  }
  if (status && status !== 'All') {
    conditions.push(`w.status = '${status.replace(/'/g, "''")}'`);
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY w.id DESC';

  const results = db.exec(sql);
  if (!results.length) return res.json([]);
  res.json(results[0].values.map(r => ({
    id: r[0], yearMade: r[1], serialNumber: r[2], dialColor: r[3], notes: r[4],
    status: r[5], customerName: r[6], brand: r[7], model: r[8],
    estimatedCompletion: r[9], createdAt: r[10],
    movementName: r[11], manufacturer: r[12], jewels: r[13],
    caliber: r[14], movementType: r[15],
  })));
});

app.get('/api/watches/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const results = db.exec(`
    SELECT w.*, m.name as movementName, m.manufacturer, m.jewels, m.caliber, m.movementType as movementTypeId,
           mt.description as movementType
    FROM watch w
    LEFT JOIN movement m ON w.movement = m.id
    LEFT JOIN movementType mt ON m.movementType = mt.id
    WHERE w.id = ${id}
  `);
  if (!results.length || !results[0].values.length) return res.status(404).json({ error: 'Not found' });
  const cols = results[0].columns;
  const vals = results[0].values[0];
  const watch = {};
  cols.forEach((c, i) => watch[c] = vals[i]);

  // Get photos
  const photos = db.exec(`SELECT id, watchId, filename, caption, createdAt, category, description FROM photo WHERE watchId = ${id} ORDER BY category, createdAt DESC`);
  watch.photos = photos.length ? photos[0].values.map(p => ({
    id: p[0], watchId: p[1], filename: p[2], caption: p[3], createdAt: p[4], category: p[5], description: p[6],
  })) : [];

  // Get timing sessions with readings
  const sessions = db.exec(`
    SELECT id, liftAngle, notes, createdAt
    FROM timing_session WHERE watchId = ${id} ORDER BY createdAt DESC
  `);
  watch.timingSessions = sessions.length ? sessions[0].values.map(s => {
    const readings = db.exec(`
      SELECT r.id, r.rate, r.beatError, p.description as position, p.id as positionId
      FROM timing_reading r LEFT JOIN position p ON r.position = p.id
      WHERE r.sessionId = ${s[0]} ORDER BY p.id
    `);
    return {
      id: s[0], liftAngle: s[1], notes: s[2], createdAt: s[3],
      readings: readings.length ? readings[0].values.map(r => ({
        id: r[0], rate: r[1], beatError: r[2], position: r[3], positionId: r[4],
      })) : [],
    };
  }) : [];

  // Get parts
  const parts = db.exec(`SELECT id, watchId, partNumber, description, vendor, dateOrdered, received, cost, notes, createdAt FROM part WHERE watchId = ${id} ORDER BY createdAt DESC`);
  watch.parts = parts.length ? parts[0].values.map(p => ({
    id: p[0], watchId: p[1], partNumber: p[2], description: p[3], vendor: p[4],
    dateOrdered: p[5], received: p[6], cost: p[7], notes: p[8], createdAt: p[9],
  })) : [];

  res.json(watch);
});

app.post('/api/watches', (req, res) => {
  const { yearMade, serialNumber, dialColor, notes, movement, status, customerName, brand, model, estimatedCompletion } = req.body;
  db.run(
    `INSERT INTO watch (yearMade, serialNumber, dialColor, notes, movement, status, customerName, brand, model, estimatedCompletion, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [yearMade || null, serialNumber || null, dialColor || null, notes || null,
     movement, status || 'Received', customerName || '', brand || '', model || '', estimatedCompletion || null]
  );
  const result = db.exec('SELECT last_insert_rowid()');
  const newId = result[0].values[0][0];
  saveDB();
  res.json({ id: newId });
});

app.put('/api/watches/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { yearMade, serialNumber, dialColor, notes, movement, status, customerName, brand, model, estimatedCompletion } = req.body;
  db.run(
    `UPDATE watch SET yearMade=?, serialNumber=?, dialColor=?, notes=?, movement=?, status=?, customerName=?, brand=?, model=?, estimatedCompletion=? WHERE id=?`,
    [yearMade || null, serialNumber || null, dialColor || null, notes || null,
     movement, status || 'Received', customerName || '', brand || '', model || '', estimatedCompletion || null, id]
  );
  saveDB();
  res.json({ success: true });
});

app.delete('/api/watches/:id', (req, res) => {
  const id = parseInt(req.params.id);
  // Delete associated photos from disk
  const photos = db.exec(`SELECT filename FROM photo WHERE watchId = ${id}`);
  if (photos.length) {
    photos[0].values.forEach(p => {
      const filePath = path.join(UPLOADS_DIR, p[0]);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  }
  db.run(`DELETE FROM photo WHERE watchId = ${id}`);
  db.run(`DELETE FROM timing WHERE watchId = ${id}`);
  db.run(`DELETE FROM timing_reading WHERE sessionId IN (SELECT id FROM timing_session WHERE watchId = ${id})`);
  db.run(`DELETE FROM timing_session WHERE watchId = ${id}`);
  db.run(`DELETE FROM watch WHERE id = ${id}`);
  saveDB();
  res.json({ success: true });
});

// ─── Timing Sessions ───
app.post('/api/watches/:id/timing-sessions', (req, res) => {
  const watchId = parseInt(req.params.id);
  const { liftAngle, notes } = req.body;
  db.run('INSERT INTO timing_session (watchId, liftAngle, notes) VALUES (?, ?, ?)',
    [watchId, liftAngle || null, notes || '']);
  saveDB();
  const result = db.exec('SELECT last_insert_rowid()');
  res.json({ id: result[0].values[0][0] });
});

app.put('/api/timing-sessions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { liftAngle, notes } = req.body;
  db.run('UPDATE timing_session SET liftAngle=?, notes=? WHERE id=?',
    [liftAngle || null, notes || '', id]);
  saveDB();
  res.json({ success: true });
});

app.delete('/api/timing-sessions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.run(`DELETE FROM timing_reading WHERE sessionId = ${id}`);
  db.run(`DELETE FROM timing_session WHERE id = ${id}`);
  saveDB();
  res.json({ success: true });
});

// ─── Timing Readings ───
app.delete('/api/timing-sessions/:id/readings', (req, res) => {
  db.run(`DELETE FROM timing_reading WHERE sessionId = ${parseInt(req.params.id)}`);
  saveDB();
  res.json({ success: true });
});

app.post('/api/timing-sessions/:id/readings', (req, res) => {
  const sessionId = parseInt(req.params.id);
  const { position, rate, beatError } = req.body;
  db.run('INSERT INTO timing_reading (sessionId, position, rate, beatError) VALUES (?, ?, ?, ?)',
    [sessionId, position || null, rate !== undefined && rate !== '' ? rate : null,
     beatError !== undefined && beatError !== '' ? beatError : null]);
  saveDB();
  const result = db.exec('SELECT last_insert_rowid()');
  res.json({ id: result[0].values[0][0] });
});

app.delete('/api/timing-readings/:id', (req, res) => {
  db.run(`DELETE FROM timing_reading WHERE id = ${parseInt(req.params.id)}`);
  saveDB();
  res.json({ success: true });
});

// ─── Parts ───
app.post('/api/watches/:id/parts', (req, res) => {
  const watchId = parseInt(req.params.id);
  const { partNumber, description, vendor, dateOrdered, cost, notes } = req.body;
  db.run(
    'INSERT INTO part (watchId, partNumber, description, vendor, dateOrdered, cost, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [watchId, partNumber || '', description || '', vendor || '', dateOrdered || null, cost || null, notes || '']
  );
  saveDB();
  const result = db.exec('SELECT last_insert_rowid()');
  res.json({ id: result[0].values[0][0] });
});

app.put('/api/parts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { partNumber, description, vendor, dateOrdered, received, cost, notes } = req.body;
  db.run(
    'UPDATE part SET partNumber=?, description=?, vendor=?, dateOrdered=?, received=?, cost=?, notes=? WHERE id=?',
    [partNumber || '', description || '', vendor || '', dateOrdered || null, received ? 1 : 0, cost || null, notes || '', id]
  );
  saveDB();
  res.json({ success: true });
});

app.delete('/api/parts/:id', (req, res) => {
  db.run(`DELETE FROM part WHERE id = ${parseInt(req.params.id)}`);
  saveDB();
  res.json({ success: true });
});

// ─── Photos ───
app.post('/api/watches/:id/photos', upload.array('photos', 10), (req, res) => {
  const watchId = parseInt(req.params.id);
  const caption = req.body.caption || '';
  const category = req.body.category || '';
  const description = req.body.description || '';
  const inserted = [];
  req.files.forEach(file => {
    db.run('INSERT INTO photo (watchId, filename, caption, category, description) VALUES (?, ?, ?, ?, ?)',
      [watchId, file.filename, caption, category, description]);
    const result = db.exec('SELECT last_insert_rowid()');
    inserted.push({ id: result[0].values[0][0], filename: file.filename, caption, category, description });
  });
  saveDB();
  res.json(inserted);
});

app.put('/api/photos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { caption, category, description } = req.body;
  db.run('UPDATE photo SET caption=?, category=?, description=? WHERE id=?',
    [caption || '', category || '', description || '', id]);
  saveDB();
  res.json({ success: true });
});

app.delete('/api/photos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const photo = db.exec(`SELECT filename FROM photo WHERE id = ${id}`);
  if (photo.length && photo[0].values.length) {
    const filePath = path.join(UPLOADS_DIR, photo[0].values[0][0]);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.run(`DELETE FROM photo WHERE id = ${id}`);
  saveDB();
  res.json({ success: true });
});

// ─── Gallery ───
app.get('/api/gallery', (req, res) => {
  const { search, sort, category } = req.query;
  let sql = `
    SELECT p.id, p.filename, p.caption, p.createdAt, p.category, p.description,
           w.id as watchId, w.brand, w.model, w.serialNumber, w.customerName, w.dialColor, w.yearMade,
           m.caliber, m.name as movementName, m.manufacturer,
           mt.description as movementType
    FROM photo p
    JOIN watch w ON p.watchId = w.id
    LEFT JOIN movement m ON w.movement = m.id
    LEFT JOIN movementType mt ON m.movementType = mt.id
  `;
  const conditions = [];
  if (search) {
    const s = search.replace(/'/g, "''");
    conditions.push(`(m.caliber LIKE '%${s}%' OR w.brand LIKE '%${s}%' OR w.model LIKE '%${s}%' OR w.customerName LIKE '%${s}%' OR m.name LIKE '%${s}%' OR m.manufacturer LIKE '%${s}%' OR p.category LIKE '%${s}%')`);
  }
  if (category && category !== 'All') {
    conditions.push(`p.category = '${category.replace(/'/g, "''")}'`);
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  const sortMap = {
    'caliber-asc': 'm.caliber ASC, p.createdAt DESC',
    'caliber-desc': 'm.caliber DESC, p.createdAt DESC',
    'brand-asc': 'w.brand ASC, w.model ASC, p.createdAt DESC',
    'brand-desc': 'w.brand DESC, w.model DESC, p.createdAt DESC',
    'newest': 'p.createdAt DESC',
    'oldest': 'p.createdAt ASC',
  };
  sql += ` ORDER BY ${sortMap[sort] || sortMap['caliber-asc']}`;

  const results = db.exec(sql);
  if (!results.length) return res.json([]);
  res.json(results[0].values.map(r => ({
    id: r[0], filename: r[1], caption: r[2], createdAt: r[3], category: r[4], description: r[5],
    watchId: r[6], brand: r[7], model: r[8], serialNumber: r[9],
    customerName: r[10], dialColor: r[11], yearMade: r[12],
    caliber: r[13], movementName: r[14], manufacturer: r[15], movementType: r[16],
  })));
});

// ─── Manual Categories ───
app.get('/api/manual-categories', (req, res) => {
  const results = db.exec('SELECT id, name FROM manual_category ORDER BY name');
  if (!results.length) return res.json([]);
  res.json(results[0].values.map(r => ({ id: r[0], name: r[1] })));
});

app.post('/api/manual-categories', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    db.run('INSERT INTO manual_category (name) VALUES (?)', [name.trim()]);
    saveDB();
    const result = db.exec('SELECT last_insert_rowid()');
    res.json({ id: result[0].values[0][0], name: name.trim() });
  } catch (e) {
    res.status(409).json({ error: 'Category already exists' });
  }
});

app.delete('/api/manual-categories/:id', (req, res) => {
  db.run(`DELETE FROM manual_category WHERE id = ${parseInt(req.params.id)}`);
  saveDB();
  res.json({ success: true });
});

// ─── Service Manuals ───
app.get('/api/manuals', (req, res) => {
  const { search, category, subcategory, manufacturer, caliber, sort } = req.query;
  let sql = 'SELECT id, title, filename, originalName, fileType, fileSize, category, subcategories, manufacturer, caliber, date, createdAt FROM manual';
  const conditions = [];
  if (search) {
    const s = search.replace(/'/g, "''");
    conditions.push(`(title LIKE '%${s}%' OR manufacturer LIKE '%${s}%' OR caliber LIKE '%${s}%' OR category LIKE '%${s}%' OR originalName LIKE '%${s}%')`);
  }
  if (category) conditions.push(`category = '${category.replace(/'/g, "''")}'`);
  if (subcategory) {
    const pathParts = subcategory.split('/').filter(Boolean);
    if (pathParts.length) {
      // Match manuals whose subcategory array starts with this ordered path
      const prefix = JSON.stringify(pathParts).slice(0, -1); // e.g. ["A","B"
      conditions.push(`subcategories LIKE '${prefix.replace(/'/g, "''")}%'`);
    }
  }
  if (manufacturer) conditions.push(`manufacturer LIKE '%${manufacturer.replace(/'/g, "''")}%'`);
  if (caliber) conditions.push(`caliber LIKE '%${caliber.replace(/'/g, "''")}%'`);
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  const sortMap = {
    'newest': 'createdAt DESC',
    'oldest': 'createdAt ASC',
    'title-asc': 'title ASC',
    'title-desc': 'title DESC',
    'manufacturer-asc': 'manufacturer ASC, title ASC',
    'manufacturer-desc': 'manufacturer DESC, title ASC',
    'caliber-asc': 'caliber ASC, title ASC',
    'caliber-desc': 'caliber DESC, title ASC',
    'date-newest': 'date DESC, createdAt DESC',
    'date-oldest': 'date ASC, createdAt ASC',
    'category-asc': 'category ASC, title ASC',
    'category-desc': 'category DESC, title ASC',
  };
  sql += ` ORDER BY ${sortMap[sort] || sortMap['newest']}`;

  const results = db.exec(sql);
  if (!results.length) return res.json([]);
  res.json(results[0].values.map(r => ({
    id: r[0], title: r[1], filename: r[2], originalName: r[3], fileType: r[4],
    fileSize: r[5], category: r[6], subcategories: r[7], manufacturer: r[8],
    caliber: r[9], date: r[10], createdAt: r[11],
  })));
});

app.get('/api/manual-subcategories', (req, res) => {
  const results = db.exec("SELECT category, subcategories FROM manual WHERE subcategories IS NOT NULL AND subcategories != '' AND category IS NOT NULL AND category != ''");
  if (!results.length) return res.json([]);
  const catMap = {};
  results[0].values.forEach(r => {
    const cat = r[0];
    let path = [];
    try { path = (JSON.parse(r[1]) || []).filter(s => s && s.trim()); } catch(e) {}
    if (!path.length) return;
    if (!catMap[cat]) catMap[cat] = {};
    let node = catMap[cat];
    path.forEach(segment => {
      if (!node[segment]) node[segment] = {};
      node = node[segment];
    });
  });
  res.json(Object.entries(catMap).map(([category, tree]) => ({ category, tree })));
});

app.post('/api/manuals', (req, res, next) => {
  manualUpload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 500MB.' });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File is required' });
  const { title, category, subcategories, manufacturer, caliber, date } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

  const ext = path.extname(req.file.originalname).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const pdfExts = ['.pdf'];
  let fileType = 'other';
  if (imageExts.includes(ext)) fileType = 'image';
  else if (pdfExts.includes(ext)) fileType = 'pdf';

  db.run(
    'INSERT INTO manual (title, filename, originalName, fileType, fileSize, category, subcategories, manufacturer, caliber, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [title.trim(), req.file.filename, req.file.originalname, fileType, req.file.size,
     category || null, subcategories || null, manufacturer || null, caliber || null, date || null]
  );
  saveDB();
  const result = db.exec('SELECT last_insert_rowid()');
  res.json({
    id: result[0].values[0][0], title: title.trim(), filename: req.file.filename,
    originalName: req.file.originalname, fileType, fileSize: req.file.size,
    category: category || null, subcategories: subcategories || null,
    manufacturer: manufacturer || null, caliber: caliber || null, date: date || null,
  });
});

app.put('/api/manuals/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { title, category, subcategories, manufacturer, caliber, date } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  db.run(
    'UPDATE manual SET title=?, category=?, subcategories=?, manufacturer=?, caliber=?, date=? WHERE id=?',
    [title.trim(), category || null, subcategories || null, manufacturer || null, caliber || null, date || null, id]
  );
  saveDB();
  res.json({ success: true });
});

app.delete('/api/manuals/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const manual = db.exec(`SELECT filename FROM manual WHERE id = ${id}`);
  if (manual.length && manual[0].values.length) {
    const filePath = path.join(MANUALS_DIR, manual[0].values[0][0]);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.run(`DELETE FROM manual WHERE id = ${id}`);
  saveDB();
  res.json({ success: true });
});

// ─── Ebauche Codes ───
app.get('/api/ebauche-codes', (req, res) => {
  const results = db.exec('SELECT id, code, brand FROM ebauche_code ORDER BY code');
  if (!results.length) return res.json([]);
  res.json(results[0].values.map(r => ({ id: r[0], code: r[1], brand: r[2] })));
});

app.post('/api/ebauche-codes', (req, res) => {
  const { code, brand } = req.body;
  if (!code || !brand) return res.status(400).json({ error: 'code and brand are required' });
  try {
    db.run('INSERT INTO ebauche_code (code, brand) VALUES (?, ?)', [code.trim().toUpperCase(), brand.trim()]);
    saveDB();
    const result = db.exec('SELECT last_insert_rowid()');
    res.json({ id: result[0].values[0][0], code: code.trim().toUpperCase(), brand: brand.trim() });
  } catch (e) {
    res.status(409).json({ error: 'Code already exists' });
  }
});

app.put('/api/ebauche-codes/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { code, brand } = req.body;
  if (!code || !brand) return res.status(400).json({ error: 'code and brand are required' });
  db.run('UPDATE ebauche_code SET code=?, brand=? WHERE id=?', [code.trim().toUpperCase(), brand.trim(), id]);
  saveDB();
  res.json({ success: true });
});

app.delete('/api/ebauche-codes/:id', (req, res) => {
  db.run(`DELETE FROM ebauche_code WHERE id = ${parseInt(req.params.id)}`);
  saveDB();
  res.json({ success: true });
});

// ─── Inventory Parts ───
function mapInventoryPart(r) {
  return { id: r[0], quantity: r[1], part_number: r[2], type: r[3], manufacturer: r[4],
           caliber: r[5], ebauche_code: r[6], ligne: r[7], notes: r[8], createdAt: r[9] };
}

app.get('/api/inventory-parts', (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT id, quantity, part_number, type, manufacturer, caliber, ebauche_code, ligne, notes, createdAt FROM inventory_part';
  if (search) {
    const s = search.replace(/'/g, "''");
    sql += ` WHERE (part_number LIKE '%${s}%' OR type LIKE '%${s}%' OR manufacturer LIKE '%${s}%' OR caliber LIKE '%${s}%' OR ebauche_code LIKE '%${s}%' OR notes LIKE '%${s}%')`;
  }
  sql += ' ORDER BY createdAt DESC';
  const results = db.exec(sql);
  if (!results.length) return res.json([]);
  res.json(results[0].values.map(mapInventoryPart));
});

app.get('/api/inventory-parts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const results = db.exec(`SELECT id, quantity, part_number, type, manufacturer, caliber, ebauche_code, ligne, notes, createdAt FROM inventory_part WHERE id = ${id}`);
  if (!results.length || !results[0].values.length) return res.status(404).json({ error: 'Not found' });
  res.json(mapInventoryPart(results[0].values[0]));
});

app.post('/api/inventory-parts', (req, res) => {
  const { quantity, part_number, type, manufacturer, caliber, ebauche_code, ligne, notes } = req.body;
  db.run(
    'INSERT INTO inventory_part (quantity, part_number, type, manufacturer, caliber, ebauche_code, ligne, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [quantity || 1, part_number || null, type || null, manufacturer || null, caliber || null, ebauche_code || null, ligne ?? null, notes ?? null]
  );
  const result = db.exec('SELECT last_insert_rowid()');
  saveDB();
  res.json({ id: result[0].values[0][0] });
});

app.put('/api/inventory-parts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { quantity, part_number, type, manufacturer, caliber, ebauche_code, ligne, notes } = req.body;
  db.run(
    'UPDATE inventory_part SET quantity=?, part_number=?, type=?, manufacturer=?, caliber=?, ebauche_code=?, ligne=?, notes=? WHERE id=?',
    [quantity || 1, part_number ?? null, type ?? null, manufacturer ?? null, caliber ?? null, ebauche_code ?? null, ligne ?? null, notes ?? null, id]
  );
  saveDB();
  res.json({ success: true });
});

app.delete('/api/inventory-parts/:id', (req, res) => {
  db.run(`DELETE FROM inventory_part WHERE id = ${parseInt(req.params.id)}`);
  saveDB();
  res.json({ success: true });
});

// ─── Dashboard stats ───
app.get('/api/stats', (req, res) => {
  const total = db.exec('SELECT COUNT(*) FROM watch');
  const statuses = db.exec("SELECT status, COUNT(*) FROM watch GROUP BY status");
  const stats = { total: total[0]?.values[0][0] || 0, byStatus: {} };
  if (statuses.length) {
    statuses[0].values.forEach(r => { stats.byStatus[r[0] || 'Unknown'] = r[1]; });
  }
  res.json(stats);
});

// Serve built frontend in production
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));
});
