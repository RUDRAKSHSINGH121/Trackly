const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');

const PORT = Number(process.env.PORT || 3000);
const files = { '/': 'index.html', '/index.html': 'index.html', '/styles.css': 'styles.css', '/responsive.css': 'responsive.css', '/app.js': 'app.js' };
const stages = new Set(['Applied', 'Interview', 'Offer']);
const sendJson = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
};
const serialize = row => ({ id: row.id, company: row.company, role: row.role, stage: row.stage, appliedAt: row.applied_at, matchScore: row.match_score, accentColor: row.accent_color });
function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => { body += chunk; if (body.length > 100000) request.destroy(); });
    request.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON body.')); } });
    request.on('error', reject);
  });
}
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === 'GET' && url.pathname === '/api/applications') {
      const q = (url.searchParams.get('q') || '').trim();
      const rows = q ? db.prepare('SELECT * FROM applications WHERE company LIKE ? OR role LIKE ? ORDER BY datetime(created_at) DESC').all(`%${q}%`, `%${q}%`) : db.prepare('SELECT * FROM applications ORDER BY datetime(created_at) DESC').all();
      return sendJson(response, 200, { applications: rows.map(serialize) });
    }
    if (request.method === 'GET' && url.pathname === '/api/metrics') {
      const total = db.prepare('SELECT COUNT(*) AS total FROM applications').get().total;
      const interviews = db.prepare("SELECT COUNT(*) AS total FROM applications WHERE stage = 'Interview'").get().total;
      const offers = db.prepare("SELECT COUNT(*) AS total FROM applications WHERE stage = 'Offer'").get().total;
      return sendJson(response, 200, { total, interviews, offers, responseRate: total ? Math.round(((interviews + offers) / total) * 100) : 0 });
    }
    if (request.method === 'POST' && url.pathname === '/api/applications') {
      const body = await readBody(request);
      const company = String(body.company || '').trim(), role = String(body.role || '').trim(), stage = String(body.stage || 'Applied');
      const color = /^#[0-9a-fA-F]{6}$/.test(body.accentColor || '') ? body.accentColor : '#7765eb';
      if (!company || !role || company.length > 100 || role.length > 120 || !stages.has(stage)) return sendJson(response, 400, { error: 'Provide a company, role, and valid stage.' });
      const result = db.prepare('INSERT INTO applications (company, role, stage, match_score, accent_color) VALUES (?, ?, ?, ?, ?)').run(company, role, stage, Math.floor(Math.random() * 18) + 80, color);
      return sendJson(response, 201, { application: serialize(db.prepare('SELECT * FROM applications WHERE id = ?').get(result.lastInsertRowid)) });
    }
    const update = url.pathname.match(/^\/api\/applications\/(\d+)\/stage$/);
    if (request.method === 'PATCH' && update) {
      const body = await readBody(request);
      if (!stages.has(body.stage)) return sendJson(response, 400, { error: 'Invalid stage.' });
      const result = db.prepare('UPDATE applications SET stage = ? WHERE id = ?').run(body.stage, Number(update[1]));
      if (!result.changes) return sendJson(response, 404, { error: 'Application not found.' });
      return sendJson(response, 200, { application: serialize(db.prepare('SELECT * FROM applications WHERE id = ?').get(Number(update[1]))) });
    }
    const del = url.pathname.match(/^\/api\/applications\/(\d+)$/);
    if (request.method === 'DELETE' && del) {
      const result = db.prepare('DELETE FROM applications WHERE id = ?').run(Number(del[1]));
      if (!result.changes) return sendJson(response, 404, { error: 'Application not found.' });
      return sendJson(response, 200, { success: true, id: Number(del[1]) });
    }
    if (request.method === 'GET' && files[url.pathname]) {
      const file = path.join(__dirname, files[url.pathname]);
      response.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }[path.extname(file)] + '; charset=utf-8' });
      return fs.createReadStream(file).pipe(response);
    }
    return sendJson(response, 404, { error: 'Not found.' });
  } catch (error) { console.error(error); return sendJson(response, 500, { error: 'Unexpected server error.' }); }
});
if (require.main === module) server.listen(PORT, () => console.log(`Trackly running at http://localhost:${PORT}`));
module.exports = server;
