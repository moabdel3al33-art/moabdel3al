'use strict';
// Google Drive for book PDFs. After "Connect Google Drive" in Admin > Google Drive, every book PDF uploaded in the
// admin goes into a folder in YOUR Google Drive (your storage, not the website's). Readers see the pages in the
// on-site reader; the file stays private in Drive (it is never shared publicly).
// Setup: a Google Cloud OAuth client (GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET), see README.
const fs = require('fs');
const { col } = require('./db');
const { now } = require('./util');

const SCOPE = 'https://www.googleapis.com/auth/drive.file openid email';
const clientId = () => process.env.GOOGLE_CLIENT_ID || '';
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET || '';
const configured = () => !!(clientId() && clientSecret());
const FOLDER_NAME = 'Website books (do not delete)';

// The refresh token is kept in its own collection, never sent to the browser.
const secrets = () => col('secrets');
const account = () => secrets().findOne({ k: 'gdrive' }, { projection: { _id: 0 } });
const connected = async () => configured() && !!(await account());

const authUrl = (redirectUri, state) => `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
  client_id: clientId(), redirect_uri: redirectUri, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent', state,
})}`;

async function tokenCall(params) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), ...params }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google: ${data.error_description || data.error || res.status}`);
  return data;
}

let access = { token: '', until: 0 };
async function accessToken() {
  if (access.token && access.until > now()) return access.token;
  const acc = await account();
  if (!acc) throw new Error('Google Drive is not connected');
  const t = await tokenCall({ grant_type: 'refresh_token', refresh_token: acc.refresh_token });
  access = { token: t.access_token, until: now() + (Number(t.expires_in) - 120) * 1000 };
  return access.token;
}
async function api(method, url, { body, headers = {} } = {}) {
  const res = await fetch(url, { method, headers: { Authorization: `Bearer ${await accessToken()}`, ...headers }, body });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`Google Drive: ${(e.error && e.error.message) || res.status}`);
  }
  return res;
}

// Called after the owner allows access on Google's page.
async function finishConnect(code, redirectUri) {
  const t = await tokenCall({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
  if (!t.refresh_token) throw new Error('Google did not give offline access. Please try again.');
  let email = '';
  try { email = JSON.parse(Buffer.from(String(t.id_token).split('.')[1], 'base64url').toString()).email || ''; } catch (e) { /* no email */ }
  access = { token: t.access_token, until: now() + (Number(t.expires_in) - 120) * 1000 };
  const old = await account();
  let folderId = old && old.email === email ? old.folder_id : null;
  if (!folderId) {
    const r = await api('POST', 'https://www.googleapis.com/drive/v3/files?fields=id', {
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
    });
    folderId = (await r.json()).id;
  }
  await secrets().updateOne({ k: 'gdrive' }, { $set: { k: 'gdrive', refresh_token: t.refresh_token, email, folder_id: folderId, connected_at: now() } }, { upsert: true });
  return { email };
}
async function disconnect() {
  const acc = await account();
  await secrets().deleteOne({ k: 'gdrive' });
  access = { token: '', until: 0 };
  if (acc) fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(acc.refresh_token)}`, { method: 'POST' }).catch(() => {});
}
async function status() {
  const acc = configured() ? await account() : null;
  return { configured: configured(), connected: !!acc, email: acc ? acc.email : null, folder: acc ? `https://drive.google.com/drive/folders/${acc.folder_id}` : null };
}

// Uploads a file from the temporary disk into the Drive folder. Returns the Drive file id.
async function upload(filePath, name, mime) {
  const acc = await account();
  const size = fs.statSync(filePath).size;
  const init = await api('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id', {
    headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mime || 'application/pdf', 'X-Upload-Content-Length': String(size) },
    body: JSON.stringify({ name, parents: [acc.folder_id] }),
  });
  const location = init.headers.get('location');
  const res = await fetch(location, {
    method: 'PUT', headers: { 'Content-Length': String(size), 'Content-Type': mime || 'application/pdf' }, body: fs.createReadStream(filePath), duplex: 'half',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) throw new Error(`Google Drive upload failed (${res.status})`);
  return data.id;
}

// Streams a Drive file to the reader (supports Range requests).
async function send(req, res, fileId) {
  const headers = {};
  if (req.headers.range) headers.Range = req.headers.range;
  const r = await api('GET', `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, { headers });
  res.status(r.status);
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) if (r.headers.get(h)) res.setHeader(h, r.headers.get(h));
  res.setHeader('Content-Type', 'application/pdf');
  const { Readable } = require('stream');
  Readable.fromWeb(r.body).on('error', () => res.destroy()).pipe(res);
}
const remove = async (fileId) => { try { await api('DELETE', `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`); } catch (e) { /* already gone */ } };

module.exports = { configured, connected, authUrl, finishConnect, disconnect, status, upload, send, remove };
