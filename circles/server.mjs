import { createServer } from 'node:http';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const DAY = 86_400_000;
const MAX_PHOTO = 10 * 1024 * 1024;
const uid = () => randomUUID();
const token = () => randomBytes(32).toString('base64url');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const client = readFileSync(new URL('./index.html', import.meta.url));
const script = readFileSync(new URL('./client.js', import.meta.url));
const photoChecker = fileURLToPath(new URL('./check-photo.py', import.meta.url));

function requireCondition(condition, status, message) {
  if (!condition) throw Object.assign(new Error(message), { status });
}

async function body(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) {
      req.resume();
      requireCondition(false, 413, 'Request exceeds the size limit.');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  const bytes = await body(req, 8192);
  try {
    const value = JSON.parse(bytes);
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch {}
  requireCondition(false, 400, 'Invalid request data.');
}

function checkPhoto(bytes) {
  return new Promise((resolve, reject) => {
    const decoder = spawn(process.env.CIRCLES_PYTHON || 'python3', [photoChecker], { timeout: 5000 });
    let type = '';
    decoder.stdout.setEncoding('utf8').on('data', (chunk) => { type += chunk; });
    decoder.stderr.resume();
    decoder.stdin.on('error', () => {});
    decoder.on('error', reject);
    decoder.on('close', (code) => resolve(code === 0 ? type.trim() : null));
    decoder.stdin.end(bytes);
  });
}

export function createCircleServer({ filename = ':memory:', clock = Date.now } = {}) {
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA secure_delete = ON;
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id), expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS circles (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, schedule TEXT NOT NULL, owner TEXT NOT NULL REFERENCES accounts(id)
    );
    CREATE TABLE IF NOT EXISTS members (
      circle_id TEXT REFERENCES circles(id), user_id TEXT REFERENCES accounts(id),
      PRIMARY KEY (circle_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS invites (
      token_hash TEXT PRIMARY KEY, id TEXT NOT NULL UNIQUE, circle_id TEXT NOT NULL REFERENCES circles(id),
      expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY, circle_id TEXT NOT NULL, user_id TEXT NOT NULL,
      uploaded INTEGER NOT NULL, month TEXT NOT NULL, caption TEXT NOT NULL,
      type TEXT NOT NULL, bytes BLOB NOT NULL,
      FOREIGN KEY (circle_id, user_id) REFERENCES members(circle_id, user_id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS upload_counts (
      circle_id TEXT NOT NULL REFERENCES circles(id), user_id TEXT NOT NULL REFERENCES accounts(id),
      month TEXT NOT NULL, total INTEGER NOT NULL, PRIMARY KEY (circle_id, user_id, month)
    );
    CREATE INDEX IF NOT EXISTS photos_timeline ON photos(circle_id, month, uploaded);
  `);
  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const transaction = (action) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const value = action();
      db.exec('COMMIT');
      return value;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };
  const membership = (circle, user) => {
    const row = get(`SELECT c.* FROM circles c JOIN members m ON m.circle_id = c.id
                     WHERE c.id = ? AND m.user_id = ?`, circle, user);
    requireCondition(row, 403, 'You do not have access to this circle.');
    return row;
  };
  const ownership = (circle, user) => {
    requireCondition(membership(circle, user).owner === user, 403, 'Only the circle owner can do that.');
  };
  const cookie = (value, age) => `mc_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}`;
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
    const send = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(value));
    };

    try {
      requireCondition(/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host ?? ''),
        403, 'Use the localhost address printed by the server.');
      const url = new URL(req.url, 'http://localhost');
      const { pathname } = url;
      if (req.method === 'GET' && (pathname === '/' || pathname === '/client.js')) {
        const page = pathname === '/';
        res.writeHead(200, { 'Content-Type': page ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8' });
        return res.end(page ? client : script);
      }
      requireCondition(pathname.startsWith('/api/'), 404, 'Page not found.');
      const write = req.method === 'POST';
      requireCondition(write || req.method === 'GET', 405, 'Method not supported.');
      if (write) requireCondition(req.headers['x-memorycircle'] === '1', 403, 'Missing request header.');
      const rawSession = req.headers.cookie?.match(/(?:^|; )mc_session=([\w-]+)/)?.[1] ?? '';
      const sessionKey = hash(rawSession);
      const current = () => get(`SELECT a.id, a.username FROM sessions s JOIN accounts a ON a.id = s.user_id
                                 WHERE s.token_hash = ? AND s.expires > ?`, sessionKey, clock());
      if (write && (pathname === '/api/register' || pathname === '/api/sign-in')) {
        const { username, password } = await readJson(req);
        const name = typeof username === 'string' ? username.trim().toLowerCase() : '';
        requireCondition(/^[a-z0-9_.-]{3,32}$/.test(name) && typeof password === 'string' &&
          password.length >= 8 && password.length <= 128, 400, 'Use a 3–32 character username and an 8–128 character password.');
        let account = get('SELECT * FROM accounts WHERE username = ?', name);
        if (pathname === '/api/register') {
          requireCondition(!account, 409, 'That username is already taken.');
          const id = uid();
          const salt = token();
          run('INSERT INTO accounts VALUES (?, ?, ?, ?)', id, name, salt, scryptSync(password, salt, 64).toString('hex'));
          return send(201, { username: name });
        }
        const actual = scryptSync(password, account?.salt ?? 'memorycircle-invalid-account', 64);
        requireCondition(account && timingSafeEqual(actual, Buffer.from(account.password, 'hex')), 401, 'Incorrect username or password.');
        const session = token();
        transaction(() => {
          run('DELETE FROM sessions WHERE expires <= ? OR token_hash = ?', clock(), sessionKey);
          run('INSERT INTO sessions VALUES (?, ?, ?)', hash(session), account.id, clock() + DAY);
        });
        res.setHeader('Set-Cookie', cookie(session, DAY / 1000));
        return send(200, { username: name });
      }

      const user = current();
      requireCondition(user, 401, 'Sign in to continue.');
      if (write && pathname === '/api/sign-out') {
        run('DELETE FROM sessions WHERE token_hash = ?', sessionKey);
        res.setHeader('Set-Cookie', cookie('', 0));
        return send(200, {});
      }
      if (!write && pathname === '/api/circles') {
        return send(200, { user, circles: all(`SELECT c.* FROM circles c JOIN members m ON m.circle_id = c.id
                                             WHERE m.user_id = ? ORDER BY c.name, c.id`, user.id) });
      }
      if (write && pathname === '/api/circles') {
        const { name, schedule } = await readJson(req);
        requireCondition(typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 80 &&
          ['daily', 'weekly'].includes(schedule), 400, 'Enter a circle name and choose a posting schedule.');
        const id = uid();
        transaction(() => {
          requireCondition(current(), 401, 'Sign in to continue.');
          run('INSERT INTO circles VALUES (?, ?, ?, ?)', id, name.trim(), schedule, user.id);
          run('INSERT INTO members VALUES (?, ?)', id, user.id);
        });
        return send(201, { id });
      }
      if (write && pathname === '/api/join') {
        const { invite } = await readJson(req);
        requireCondition(typeof invite === 'string' && /^[\w-]{43}$/.test(invite), 400, 'Enter a valid invitation.');
        const id = transaction(() => {
          requireCondition(current(), 401, 'Sign in to continue.');
          const row = get('SELECT circle_id FROM invites WHERE token_hash = ? AND expires > ?', hash(invite), clock());
          requireCondition(row, 404, 'This invitation has expired or been revoked.');
          if (!get('SELECT 1 FROM members WHERE circle_id = ? AND user_id = ?', row.circle_id, user.id)) {
            requireCondition(get('SELECT count(*) AS total FROM members WHERE circle_id = ?', row.circle_id).total < 8,
              409, 'This circle already has eight members.');
            run('INSERT INTO members VALUES (?, ?)', row.circle_id, user.id);
          }
          return row.circle_id;
        });
        return send(200, { id });
      }

      const [, , resource, circle, action, target] = pathname.split('/');
      requireCondition(resource === 'circles' && circle, 404, 'Page not found.');
      const selected = membership(circle, user.id);
      if (!write && !action) {
        const month = url.searchParams.get('month') ?? new Date(clock()).toISOString().slice(0, 7);
        requireCondition(/^\d{4}-(0[1-9]|1[0-2])$/.test(month), 400, 'Choose a valid month.');
        const day = new Date(clock());
        day.setUTCHours(0, 0, 0, 0);
        const periodStart = day.getTime() - (selected.schedule === 'weekly' ? (day.getUTCDay() + 6) % 7 * DAY : 0);
        const contributed = Boolean(get(
          'SELECT 1 FROM photos WHERE circle_id = ? AND user_id = ? AND uploaded >= ?', circle, user.id, periodStart));
        return send(200, {
          circle: selected, month, contributed,
          members: all(`SELECT a.id, a.username FROM accounts a JOIN members m ON m.user_id = a.id
                        WHERE m.circle_id = ? ORDER BY a.username`, circle),
          invites: selected.owner === user.id ? all('SELECT id, expires FROM invites WHERE circle_id = ? AND expires > ?', circle, clock()) : [],
          photos: all(`SELECT p.id, p.caption, p.uploaded, a.username FROM photos p JOIN accounts a ON a.id = p.user_id
                       WHERE p.circle_id = ? AND p.month = ? ORDER BY p.uploaded, p.id`, circle, month),
        });
      }
      if (write && action === 'schedule') {
        const { schedule } = await readJson(req);
        requireCondition(['daily', 'weekly'].includes(schedule), 400, 'Choose daily or weekly.');
        transaction(() => {
          requireCondition(current(), 401, 'Sign in to continue.');
          ownership(circle, user.id);
          run('UPDATE circles SET schedule = ? WHERE id = ?', schedule, circle);
        });
        return send(200, {});
      }
      if (write && action === 'invites') {
        ownership(circle, user.id);
        if (target) {
          run('DELETE FROM invites WHERE circle_id = ? AND id = ?', circle, target);
          return send(200, {});
        }
        const invite = token();
        const id = uid();
        run('INSERT INTO invites VALUES (?, ?, ?, ?)', hash(invite), id, circle, clock() + 7 * DAY);
        return send(201, { invite });
      }
      if (write && action === 'leave') {
        requireCondition(selected.owner !== user.id, 403, 'An owner cannot leave their own circle.');
        run('DELETE FROM members WHERE circle_id = ? AND user_id = ?', circle, user.id);
        return send(200, {});
      }
      if (write && action === 'remove') {
        ownership(circle, user.id);
        requireCondition(target && target !== user.id, 403, 'An owner cannot be removed.');
        run('DELETE FROM members WHERE circle_id = ? AND user_id = ?', circle, target);
        return send(200, {});
      }
      if (!write && action === 'photos' && target) {
        const photo = get('SELECT type, bytes FROM photos WHERE circle_id = ? AND id = ?', circle, target);
        requireCondition(photo, 404, 'Photo not found.');
        res.writeHead(200, { 'Content-Type': photo.type });
        return res.end(photo.bytes);
      }
      if (write && action === 'photos' && !target) {
        const caption = (url.searchParams.get('caption') ?? '').trim();
        requireCondition(caption.length <= 200, 400, 'Caption must be 200 characters or fewer.');
        const bytes = await body(req, MAX_PHOTO);
        const type = await checkPhoto(bytes);
        requireCondition(type === 'image/jpeg' || type === 'image/png', 415, 'Choose a valid JPEG or PNG of at most 20 megapixels.');
        const id = uid();
        transaction(() => {
          requireCondition(current(), 401, 'Sign in to continue.');
          membership(circle, user.id);
          const uploaded = clock();
          const month = new Date(uploaded).toISOString().slice(0, 7);
          const count = get('SELECT total FROM upload_counts WHERE circle_id = ? AND user_id = ? AND month = ?',
            circle, user.id, month)?.total ?? 0;
          requireCondition(count < 30, 409, 'You have reached 30 photos for this circle this month.');
          run('INSERT INTO photos VALUES (?, ?, ?, ?, ?, ?, ?, ?)', id, circle, user.id, uploaded, month, caption, type, bytes);
          run(`INSERT INTO upload_counts VALUES (?, ?, ?, 1)
               ON CONFLICT(circle_id, user_id, month) DO UPDATE SET total = total + 1`, circle, user.id, month);
        });
        return send(201, { id });
      }
      send(404, { error: 'Page not found.' });
    } catch (error) {
      if (!error.status) console.error(error);
      if (!res.headersSent) send(error.status ?? 500, { error: error.status ? error.message : 'The server could not finish the request.' });
    }
  });
  server.on('close', () => db.close());
  return server;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const filename = resolve('.circles-data/memorycircle.sqlite');
  mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const port = Number(process.env.PORT ?? 8787);
  createCircleServer({ filename }).listen(port, '127.0.0.1', () => {
    console.log(`MemoryCircle shared circles: http://127.0.0.1:${port}`);
  });
}
