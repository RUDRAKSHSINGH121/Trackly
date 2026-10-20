const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const db = new DatabaseSync(path.join(__dirname, 'trackly.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL CHECK(length(company) BETWEEN 1 AND 100),
    role TEXT NOT NULL CHECK(length(role) BETWEEN 1 AND 120),
    stage TEXT NOT NULL CHECK(stage IN ('Applied', 'Interview', 'Offer')) DEFAULT 'Applied',
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    match_score INTEGER NOT NULL DEFAULT 80 CHECK(match_score BETWEEN 0 AND 100),
    accent_color TEXT NOT NULL DEFAULT '#7765eb',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
const count = db.prepare('SELECT COUNT(*) AS total FROM applications').get().total;
if (count === 0) {
  const insert = db.prepare('INSERT INTO applications (company, role, stage, applied_at, match_score, accent_color) VALUES (?, ?, ?, ?, ?, ?)');
  const seed = [
    ['Notion', 'Product Designer', 'Applied', '2026-10-20T09:00:00.000Z', 94, '#111111'],
    ['Vercel', 'Product Designer', 'Applied', '2026-10-19T09:00:00.000Z', 88, '#111827'],
    ['Loom', 'Senior Product Designer', 'Applied', '2026-10-17T09:00:00.000Z', 82, '#625df5'],
    ['Figma', 'Product Designer', 'Interview', '2026-10-21T09:00:00.000Z', 96, '#e96a5e'],
    ['Linear', 'UI Engineer', 'Interview', '2026-10-23T09:00:00.000Z', 91, '#292633'],
    ['Webflow', 'Visual Designer', 'Interview', '2026-10-25T09:00:00.000Z', 79, '#3b6eff'],
    ['Arc', 'Product Designer', 'Offer', '2026-10-18T09:00:00.000Z', 93, '#fa7268'],
    ['Raycast', 'Product Designer', 'Offer', '2026-10-16T09:00:00.000Z', 86, '#ff6565']
  ];
  db.exec('BEGIN');
  try { seed.forEach(row => insert.run(...row)); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; }
}
module.exports = db;
