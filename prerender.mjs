import puppeteer from 'puppeteer-core';
import { createServer } from 'http';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, 'dist');

const ROUTES = ['/', '/pricing', '/docs', '/terms'];
const PORT = 45678;

function startStaticServer() {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
  };
  return createServer((req, res) => {
    let filePath = join(distDir, req.url === '/' ? 'index.html' : req.url);
    if (!existsSync(filePath) || extname(filePath) === '') {
      filePath = join(distDir, 'index.html');
    }
    const ext = extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    try {
      const content = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
}

async function prerender() {
  console.log('Starting prerender...');
  const server = startStaticServer();
  await new Promise((resolve) => server.listen(PORT, resolve));

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(30000);

  for (const route of ROUTES) {
    const url = `http://localhost:${PORT}${route}`;
    console.log(`Prerendering ${route}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 2000));
      const html = await page.content();

      const outputName = route === '/' ? 'index.html' : `${route.slice(1)}.html`;
      const outputPath = join(distDir, outputName);
      writeFileSync(outputPath, html, 'utf-8');
      console.log(`  ✓ ${outputName} (${(html.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`  ✗ ${route}: ${err.message}`);
    }
  }

  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  console.log('Prerender complete!');
}

prerender().catch((err) => { console.error(err); process.exit(1); });
