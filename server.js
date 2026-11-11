const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleCms } = require('./lib/cms-core');

const root = path.join(__dirname, 'dist');
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.pdf': 'application/pdf',
};

http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/cms')) return handleCms(req, res);
  const url = new URL(req.url, 'http://localhost');
  let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
  if (relative.endsWith('/')) relative += 'index.html';
  let target = path.normalize(path.join(root, relative));
  if (!target.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(target, (error, stat) => {
    if ((error || !stat.isFile()) && !path.extname(target)) target += '.html';
    fs.stat(target, (finalError, finalStat) => {
    if (finalError || !finalStat.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': mime[path.extname(target).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(target).pipe(res);
    });
  });
}).listen(Number(process.env.PORT || 3000), () => console.log('BTS website running at http://localhost:3000'));
