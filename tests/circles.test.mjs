import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { createCircleServer } from '../circles/server.mjs';

const photo = readFileSync(new URL('../demo-assets/photo-1.jpg', import.meta.url));

async function fixture(t, filename) {
  let now = Date.parse('2026-11-02T10:00:00Z');
  const server = createCircleServer({ filename, clock: () => now });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = 'http://127.0.0.1:' + server.address().port;
  function client() {
    let cookie = '';
    return async (path, { value, expected = 200, anonymous = false, csrf = true } = {}) => {
      const write = value !== undefined;
      const headers = {};
      if (cookie && !anonymous) headers.cookie = cookie;
      if (write && csrf) headers['x-memorycircle'] = '1';
      if (write && !Buffer.isBuffer(value)) headers['content-type'] = 'application/json';
      const response = await fetch(origin + path, {
        method: write ? 'POST' : 'GET', headers,
        body: write && !Buffer.isBuffer(value) ? JSON.stringify(value) : value,
      });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      const result = response.headers.get('content-type')?.includes('application/json')
        ? await response.json() : Buffer.from(await response.arrayBuffer());
      assert.equal(response.status, expected, path + ': ' + (result.error ?? ''));
      return result;
    };
  }
  const signIn = (request, username) => request('/api/sign-in', {
    value: { username, password: 'example-password' },
  });
  async function account(username) {
    const request = client();
    const value = { username, password: 'example-password' };
    await request('/api/register', { value, expected: 201 });
    await signIn(request, username);
    return request;
  }
  async function circle(owner, name = 'Demo circle') {
    const { id } = await owner('/api/circles', { value: { name, schedule: 'daily' }, expected: 201 });
    return '/api/circles/' + id;
  }
  async function invite(owner, path) {
    return (await owner(path + '/invites', { value: {}, expected: 201 })).invite;
  }
  return { client, account, signIn, circle, invite, advance: (amount) => { now += amount; } };
}

test('web entry, registration, sign-in, session expiry and sign-out', async (t) => {
  const { client, account, advance } = await fixture(t);
  const guest = client();
  assert.match(String(await guest('/')), /MemoryCircle/);
  assert.match(String(await guest('/client.js')), /fetch/);
  await guest('/api/circles', { expected: 401 });
  await guest('/api/register', { value: {}, expected: 403, csrf: false });
  await guest('/api/register', { value: { username: 'bad', password: 'short' }, expected: 400 });
  const owner = await account('owner');
  await guest('/api/register', { value: { username: 'OWNER', password: 'example-password' }, expected: 409 });
  await guest('/api/sign-in', { value: { username: 'owner', password: 'wrong-password' }, expected: 401 });
  assert.equal((await owner('/api/circles')).user.username, 'owner');
  await owner('/api/sign-out', { value: {} });
  await owner('/api/circles', { expected: 401 });
  const member = await account('member');
  advance(86_400_000);
  await member('/api/circles', { expected: 401 });
});

test('private group ownership, invitation revocation/expiry and concurrent eight-member limit', async (t) => {
  const { account, signIn, circle, invite, advance } = await fixture(t);
  const owner = await account('owner');
  const path = await circle(owner);
  const state = await owner(path);
  assert.equal(state.circle.owner, state.members[0].id);
  assert.equal(state.members.length, 1);
  assert.equal(state.circle.schedule, 'daily');
  const outsider = await account('outsider');
  await outsider(path, { expected: 403 });
  await outsider(path + '/invites', { value: {}, expected: 403 });
  assert.equal((await outsider('/api/circles')).circles.length, 0);

  const revoked = await invite(owner, path);
  await owner(path + '/invites/' + (await owner(path)).invites[0].id, { value: {} });
  await outsider('/api/join', { value: { invite: revoked }, expected: 404 });
  const expired = await invite(owner, path);
  advance(7 * 86_400_000);
  await signIn(owner, 'owner');
  await signIn(outsider, 'outsider');
  await outsider('/api/join', { value: { invite: expired }, expected: 404 });

  const code = await invite(owner, path);
  const joinPath = '/api/join';
  for (let index = 0; index < 6; index++) {
    const member = await account('member' + index);
    await member(joinPath, { value: { invite: code } });
    if (index === 0) {
      await member(joinPath, { value: { invite: code } });
      await member(path + '/invites', { value: {}, expected: 403 });
    }
  }
  const finalMember = await account('final');
  const candidate = (request, firstStatus) => request(joinPath, { value: { invite: code }, expected: firstStatus });
  const results = await Promise.allSettled([candidate(finalMember, 200), candidate(outsider, 200)]);
  assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
  const rejection = results.find(({ status }) => status === 'rejected').reason;
  assert.equal(rejection.actual, 409);
  assert.equal((await owner(path)).members.length, 8);
});

test('photo validation, ordering, UTC month filter, access checks and posting schedules', async (t) => {
  const { account, signIn, circle, invite, advance } = await fixture(t);
  const owner = await account('owner');
  const path = await circle(owner);
  const member = await account('member');
  const outsider = await account('outsider');
  await member('/api/join', { value: { invite: await invite(owner, path) } });
  assert.equal((await member(path)).contributed, false);
  await member(path + '/photos', { value: Buffer.from('not an image'), expected: 415 });
  await member(path + '/photos', { value: photo.subarray(0, 100), expected: 415 });
  await member(path + '/photos', { value: Buffer.alloc(10 * 1024 * 1024 + 1), expected: 413 });
  const wide = Buffer.from(photo);
  const frame = wide.indexOf(Buffer.from([0xff, 0xc0]));
  assert.ok(frame >= 0);
  wide.writeUInt16BE(5000, frame + 5);
  wide.writeUInt16BE(5000, frame + 7);
  await member(path + '/photos', { value: wide, expected: 415 });
  await member(path + '/photos?caption=' + 'x'.repeat(201), { value: photo, expected: 400 });
  assert.equal((await owner(path)).photos.length, 0);
  const first = await member(path + '/photos?caption=First', { value: photo, expected: 201 });
  advance(1000);
  const second = await owner(path + '/photos?caption=Second', { value: photo, expected: 201 });
  assert.deepEqual((await member(path)).photos.map(({ id, caption }) => [id, caption]), [[first.id, 'First'], [second.id, 'Second']]);
  assert.equal((await member(path + '?month=2026-10')).photos.length, 0);
  assert.deepEqual(await owner(path + '/photos/' + first.id), photo);
  await outsider(path + '/photos/' + first.id, { expected: 403 });
  await outsider(path + '/photos/' + first.id, { expected: 401, anonymous: true });
  await outsider(path + '/photos', { value: photo, expected: 403 });
  assert.equal((await member(path)).contributed, true);
  advance(86_400_000);
  await signIn(owner, 'owner');
  await signIn(member, 'member');
  assert.equal((await member(path)).contributed, false);
  await member(path + '/schedule', { value: { schedule: 'weekly' }, expected: 403 });
  await owner(path + '/schedule', { value: { schedule: 'weekly' } });
  assert.equal((await member(path)).contributed, true);
  assert.equal((await member(path)).circle.schedule, 'weekly');
});

test('leave and removal revoke group/media access and delete only the departing membership photos', async (t) => {
  const { account, circle, invite } = await fixture(t);
  const owner = await account('owner');
  const member = await account('member');
  const path = await circle(owner);
  const other = await circle(owner, 'Other circle');
  const code = await invite(owner, path);
  await member('/api/join', { value: { invite: code } });
  await member('/api/join', { value: { invite: await invite(owner, other) } });
  const memberId = (await member('/api/circles')).user.id;
  const memberPhoto = await member(path + '/photos', { value: photo, expected: 201 });
  await member(other + '/photos', { value: photo, expected: 201 });
  await owner(path + '/photos', { value: photo, expected: 201 });
  await member(path + '/remove/' + memberId, { value: {}, expected: 403 });
  await owner(path + '/leave', { value: {}, expected: 403 });
  await owner(path + '/remove/' + memberId, { value: {} });
  await member(path, { expected: 403 });
  await member(path + '/photos/' + memberPhoto.id, { expected: 403 });
  await owner(path + '/photos/' + memberPhoto.id, { expected: 404 });
  assert.equal((await owner(path)).photos.length, 1);
  assert.equal((await member(other)).photos.length, 1);
  await member('/api/join', { value: { invite: code } });
  await member(path + '/leave', { value: {} });
  await member(path, { expected: 403 });
});

test('failed writes roll back and concurrent uploads respect the per-circle monthly quota', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'mc-circles-'));
  const filename = join(dir, 'test.sqlite');
  const { account, signIn, circle, advance } = await fixture(t, filename);
  const connection = new DatabaseSync(filename);
  t.after(() => { connection.close(); rmSync(dir, { recursive: true, force: true }); });
  const owner = await account('owner');
  const path = await circle(owner);
  connection.exec("CREATE TRIGGER fail_photo BEFORE INSERT ON photos BEGIN SELECT RAISE(ABORT, 'test storage failure'); END");
  await owner(path + '/photos', { value: photo, expected: 500 });
  assert.equal((await owner(path)).photos.length, 0);
  connection.exec('DROP TRIGGER fail_photo');
  for (let index = 0; index < 29; index++) {
    await owner(path + '/photos', { value: photo, expected: 201 });
  }
  const outcomes = await Promise.allSettled([
    owner(path + '/photos', { value: photo, expected: 201 }),
    owner(path + '/photos', { value: photo, expected: 201 }),
  ]);
  assert.equal(outcomes.filter(({ status }) => status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(({ status }) => status === 'rejected').reason.actual, 409);
  assert.equal((await owner(path)).photos.length, 30);
  advance(30 * 86_400_000);
  await signIn(owner, 'owner');
  await owner(path + '/photos', { value: photo, expected: 201 });
  assert.equal((await owner(path)).photos.length, 1);
});
