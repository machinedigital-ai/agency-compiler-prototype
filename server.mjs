import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import compileHandler from './api/compile.js';
import agentHandler from './api/agents.js';
import artifactHandler from './api/artifacts.js';

// Explicit public file list prevents serving local secrets or source/test files.
const assets = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/styles.css': ['styles.css', 'text/css'], '/app.js': ['app.js', 'text/javascript'], '/logic.js': ['logic.js', 'text/javascript'], '/dashboard': ['dashboard.html', 'text/html'], '/dashboard.html': ['dashboard.html', 'text/html'], '/dashboard.css': ['dashboard.css', 'text/css'], '/dashboard.js': ['dashboard.js', 'text/javascript'], '/artifact.html': ['artifact.html', 'text/html'], '/artifact.css': ['artifact.css', 'text/css'], '/artifact.js': ['artifact.js', 'text/javascript'], '/review-reel.html': ['review-reel.html', 'text/html'] };
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4174);
createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/healthz') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', runtime: 'vultr-container', bandConfigured: Boolean(process.env.BAND_API_KEY), crusoeConfigured: Boolean(process.env.CRUSOE_API_KEY) }));
    return;
  }
  if (path === '/api/compile' || path === '/api/agents' || path === '/api/artifacts') {
    let size = 0; const chunks = [];
    for await (const chunk of req) { size += chunk.length; if (size > 16000) { res.writeHead(413); res.end('Request too large'); return; } chunks.push(chunk); }
    req.body = Buffer.concat(chunks).toString();
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
    await (path === '/api/compile' ? compileHandler : path === '/api/agents' ? agentHandler : artifactHandler)(req, res); return;
  }
  const asset = assets[path];
  if (!asset) { res.writeHead(404); res.end('Not found'); return; }
  try { res.setHeader('Content-Type', asset[1]); res.end(await readFile(new URL(asset[0], import.meta.url))); }
  catch { res.writeHead(500); res.end('Could not load page'); }
}).listen(port, host, () => console.log(`Agency Compiler: http://${host}:${port}`));
