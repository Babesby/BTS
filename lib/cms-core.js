const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const COOKIE = 'bts_cms_session';
const SESSION_SECONDS = 60 * 60 * 12;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function send(res, status, payload, headers = {}) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  Object.entries(headers).forEach(([name, value]) => res.setHeader(name, value));
  res.end(JSON.stringify(payload));
}

function fail(res, status, message) {
  return send(res, status, { ok: false, error: message });
}

async function body(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 9 * 1024 * 1024) throw new Error('Request is too large.');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function cookieMap(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(value => value.trim()).filter(Boolean).map(value => {
    const index = value.indexOf('=');
    return [decodeURIComponent(value.slice(0, index)), decodeURIComponent(value.slice(index + 1))];
  }));
}

function secret() {
  return process.env.CMS_SESSION_SECRET || process.env.CMS_PASSWORD || '7776';
}

function signature(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createSession() {
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return `${expires}.${signature(expires)}`;
}

function authenticated(req) {
  const value = cookieMap(req)[COOKIE];
  if (!value) return false;
  const [expires, supplied] = value.split('.');
  if (!expires || !supplied || Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(supplied, signature(expires));
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  return origin === `${protocol}://${host}`;
}

function text(value, max, label) {
  const cleaned = String(value || '').trim();
  if (!cleaned) throw new Error(`${label} is required.`);
  if (cleaned.length > max) throw new Error(`${label} is too long.`);
  return cleaned;
}

function imageFromPayload(image) {
  if (!image || !image.data || !String(image.type || '').startsWith('image/')) throw new Error('Choose a valid image.');
  const buffer = Buffer.from(String(image.data).replace(/^data:[^,]+,/, ''), 'base64');
  if (!buffer.length) throw new Error('The image is empty.');
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error('The prepared image must be 3 MB or smaller.');
  const extension = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : 'jpg';
  return { buffer, extension };
}

function githubConfig() {
  const values = {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH || 'main',
    directory: String(process.env.GITHUB_SITE_DIR || 'dist').replace(/^\/+|\/+$/g, ''),
  };
  return values.token && values.owner && values.repo ? values : null;
}

async function github(config, endpoint, options = {}) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${config.token}`,
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
      ...options.headers,
    },
  });
  if (response.status === 404 && options.allowMissing) return null;
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(result?.message || `GitHub returned ${response.status}.`);
  return result;
}

function repositoryPath(config, relativePath) {
  return [config.directory, relativePath].filter(Boolean).join('/');
}

async function readJson(relativePath, fallback) {
  const config = githubConfig();
  if (config) {
    const target = repositoryPath(config, relativePath).split('/').map(encodeURIComponent).join('/');
    const result = await github(config, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${target}?ref=${encodeURIComponent(config.branch)}`, { allowMissing: true });
    return result ? JSON.parse(Buffer.from(result.content, 'base64').toString('utf8')) : fallback;
  }
  if (process.env.VERCEL) throw new Error('GitHub publishing variables are not configured.');
  try { return JSON.parse(await fs.readFile(path.join(process.cwd(), 'dist', relativePath), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

async function commitChanges(changes, message) {
  const config = githubConfig();
  if (!config) {
    if (process.env.VERCEL) throw new Error('GitHub publishing variables are not configured.');
    for (const change of changes) {
      const target = path.join(process.cwd(), 'dist', change.path);
      if (change.delete) { await fs.rm(target, { force: true }); continue; }
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, change.content);
    }
    return;
  }
  const repo = `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
  const ref = await github(config, `${repo}/git/ref/heads/${config.branch.split('/').map(encodeURIComponent).join('/')}`);
  const baseCommit = await github(config, `${repo}/git/commits/${ref.object.sha}`);
  const treeItems = [];
  for (const change of changes) {
    const itemPath = repositoryPath(config, change.path);
    if (change.delete) { treeItems.push({ path: itemPath, mode: '100644', type: 'blob', sha: null }); continue; }
    const buffer = Buffer.isBuffer(change.content) ? change.content : Buffer.from(String(change.content));
    const blob = await github(config, `${repo}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: buffer.toString('base64'), encoding: 'base64' }) });
    treeItems.push({ path: itemPath, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const tree = await github(config, `${repo}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: treeItems }) });
  const commit = await github(config, `${repo}/git/commits`, { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }) });
  await github(config, `${repo}/git/refs/heads/${config.branch.split('/').map(encodeURIComponent).join('/')}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
}

function publicRecord(record) {
  return { ...record, image_url: record.image };
}

async function listContent() {
  const [posts, gallery] = await Promise.all([readJson('content/posts.json', []), readJson('content/gallery.json', [])]);
  return { posts: posts.map(publicRecord), gallery: gallery.map(publicRecord) };
}

async function publishPost(input) {
  const title = text(input.title, 180, 'Story title');
  const heading = text(input.heading, 320, 'Heading');
  const publishedDate = text(input.date, 10, 'Publication date');
  const storyBody = text(input.body, 60000, 'Story body');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedDate)) throw new Error('Use a valid publication date.');
  const prepared = imageFromPayload(input.image);
  const id = crypto.randomUUID();
  const image = `uploads/posts/${id}.${prepared.extension}`;
  const posts = await readJson('content/posts.json', []);
  const post = { id, title, heading, published_date: publishedDate, image, body: storyBody, created_at: new Date().toISOString() };
  posts.unshift(post);
  await commitChanges([
    { path: image, content: prepared.buffer },
    { path: 'content/posts.json', content: `${JSON.stringify(posts, null, 2)}\n` },
  ], `Publish BTS story: ${title}`);
  return publicRecord(post);
}

async function addGallery(input) {
  const title = text(input.title, 180, 'Image title');
  const prepared = imageFromPayload(input.image);
  const id = crypto.randomUUID();
  const image = `uploads/gallery/${id}.${prepared.extension}`;
  const gallery = await readJson('content/gallery.json', []);
  const item = { id, title, image, created_at: new Date().toISOString() };
  gallery.unshift(item);
  await commitChanges([
    { path: image, content: prepared.buffer },
    { path: 'content/gallery.json', content: `${JSON.stringify(gallery, null, 2)}\n` },
  ], `Add BTS gallery image: ${title}`);
  return publicRecord(item);
}

async function removeItem(type, id) {
  const isPost = type === 'post';
  const file = isPost ? 'content/posts.json' : 'content/gallery.json';
  const items = await readJson(file, []);
  const target = items.find(item => item.id === id);
  if (!target) throw new Error(isPost ? 'Story not found.' : 'Gallery image not found.');
  await commitChanges([
    { path: file, content: `${JSON.stringify(items.filter(item => item.id !== id), null, 2)}\n` },
    { path: target.image, delete: true },
  ], isPost ? `Remove BTS story: ${target.title}` : `Remove BTS gallery image: ${target.title}`);
}

async function handleCms(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const action = url.searchParams.get('action') || '';
    if (action === 'session' && req.method === 'GET') return send(res, 200, { ok: true, authenticated: authenticated(req) });
    if (action === 'login' && req.method === 'POST') {
      if (!sameOrigin(req)) return fail(res, 403, 'Request origin was rejected.');
      const input = await body(req);
      if (!safeEqual(input.password || '', process.env.CMS_PASSWORD || '7776')) return fail(res, 401, 'Incorrect password.');
      const secure = (req.headers['x-forwarded-proto'] || '').includes('https') ? '; Secure' : '';
      return send(res, 200, { ok: true }, { 'set-cookie': `${COOKIE}=${encodeURIComponent(createSession())}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}` });
    }
    if (action === 'logout' && req.method === 'POST') return send(res, 200, { ok: true }, { 'set-cookie': `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` });
    if (!authenticated(req)) return fail(res, 401, 'Publishing access required.');
    if (action === 'list' && req.method === 'GET') return send(res, 200, { ok: true, ...(await listContent()) });
    if (!sameOrigin(req)) return fail(res, 403, 'Request origin was rejected.');
    const input = await body(req);
    if (action === 'publish-post' && req.method === 'POST') return send(res, 201, { ok: true, post: await publishPost(input) });
    if (action === 'add-gallery' && req.method === 'POST') return send(res, 201, { ok: true, item: await addGallery(input) });
    if (action === 'delete-post' && req.method === 'POST') { await removeItem('post', text(input.id, 80, 'Story ID')); return send(res, 200, { ok: true }); }
    if (action === 'delete-gallery' && req.method === 'POST') { await removeItem('gallery', text(input.id, 80, 'Image ID')); return send(res, 200, { ok: true }); }
    return fail(res, 404, 'Publishing route not found.');
  } catch (error) {
    console.error(error);
    return fail(res, 400, error.message || 'The publishing request could not be completed.');
  }
}

module.exports = { handleCms };
