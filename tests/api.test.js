const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable, Writable } = require('node:stream');
const server = require('../server');
const db = require('../db');

function apiRequest(method, url, payload) {
  return new Promise(resolve => {
    const request = Readable.from([payload ? JSON.stringify(payload) : '']);
    request.method = method; request.url = url; request.headers = { host: 'localhost' };
    let status = 200, data = '';
    const response = new Writable({ write(chunk, encoding, done) { data += chunk.toString(); done(); } });
    response.writeHead = code => { status = code; };
    response.on('finish', () => resolve({ status, body: JSON.parse(data) }));
    server.emit('request', request, response);
  });
}
test('applications endpoint returns seeded records', async () => {
  const response = await apiRequest('GET', '/api/applications');
  assert.equal(response.status, 200); assert.ok(response.body.applications.length >= 8);
});
test('creates, moves, and deletes an application through the pipeline', async () => {
  const create = await apiRequest('POST', '/api/applications', { company: 'Test Studio', role: 'Frontend Engineer', stage: 'Applied', accentColor: '#123456' });
  assert.equal(create.status, 201);
  const move = await apiRequest('PATCH', `/api/applications/${create.body.application.id}/stage`, { stage: 'Interview' });
  assert.equal(move.status, 200); assert.equal(move.body.application.stage, 'Interview');
  const remove = await apiRequest('DELETE', `/api/applications/${create.body.application.id}`);
  assert.equal(remove.status, 200); assert.equal(remove.body.success, true);
  const check = db.prepare('SELECT * FROM applications WHERE id = ?').get(create.body.application.id);
  assert.equal(check, undefined);
});
