/**
 * Local Development Server
 * Запускает все API endpoints и статические файлы локально
 */

// Load environment variables from .env.local (PRODUCTION DATABASE - TEMPORARY!)
// TODO: Create new staging database and switch back to .env.development
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3000;
const HOST = '0.0.0.0';

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

async function handleApiRequest(url, request, response) {
  // Extract API endpoint name
  const apiPath = url.pathname.replace('/api/', '');
  let apiFile = join(__dirname, 'api', `${apiPath}.js`);

  console.log(`📡 API Request: ${url.pathname}`);

  // Check if file exists, if not try dynamic route [id].js pattern
  if (!existsSync(apiFile)) {
    const pathParts = apiPath.split('/');
    if (pathParts.length === 2) {
      // Try pattern like /players/[id].js
      const dynamicFile = join(__dirname, 'api', pathParts[0], '[id].js');
      if (existsSync(dynamicFile)) {
        apiFile = dynamicFile;
        // Add the ID to request.query
        request.query = request.query || {};
        request.query.id = pathParts[1];
      }
    }
  }

  if (!existsSync(apiFile)) {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'API endpoint not found' }));
    return;
  }

  try {
    // Import API handler dynamically
    const module = await import(`file://${apiFile}?t=${Date.now()}`);
    const handler = module.default;

    // Parse query parameters from URL (merge with existing from dynamic route)
    request.query = request.query || {};
    url.searchParams.forEach((value, key) => {
      request.query[key] = value;
    });

    // Parse request body for POST requests
    let body = '';
    if (request.method === 'POST') {
      for await (const chunk of request) {
        body += chunk.toString();
      }
      try {
        request.body = JSON.parse(body || '{}');
      } catch {
        request.body = {};
      }
    }

    // Create response object compatible with Vercel
    const res = {
      statusCode: 200,
      headers: {},
      _headersSent: false,
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(key, value) {
        this.headers[key] = value;
        return this;
      },
      json(data) {
        if (this._headersSent) return;
        this._headersSent = true;
        this.headers['Content-Type'] = 'application/json';
        response.writeHead(this.statusCode, this.headers);
        response.end(JSON.stringify(data));
      },
      send(data) {
        if (this._headersSent) return;
        this._headersSent = true;
        response.writeHead(this.statusCode, this.headers);
        response.end(data);
      }
    };

    // Call handler
    await handler(request, res);

  } catch (error) {
    console.error(`❌ API Error (${apiPath}):`, error);
    if (!response.headersSent) {
      response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }));
    }
  }
}

async function handleStaticFile(filePath, response) {
  try {
    const content = await readFile(filePath);
    const ext = extname(filePath);
    const mimeType = mimeTypes[ext] || 'text/plain';

    response.writeHead(200, { 'Content-Type': mimeType });
    response.end(content);
  } catch (error) {
    console.error(`❌ File not found: ${filePath}`);
    response.writeHead(404);
    response.end('404 Not Found');
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  console.log(`${request.method} ${url.pathname}`);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    await handleApiRequest(url, request, response);
    return;
  }

  // Handle static files
  let filePath = join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));

  // If directory, try index.html
  if (!existsSync(filePath) || !extname(filePath)) {
    filePath = join(filePath, 'index.html');
  }

  await handleStaticFile(filePath, response);
});

server.listen(PORT, HOST, () => {
  console.log(`
🚀 Local Dev Server running!

📍 URLs:
   Local:    http://localhost:${PORT}
   Network:  http://${HOST}:${PORT}
   External: http://80.90.181.137:${PORT}

📄 Pages:
   Game Input:  http://80.90.181.137:${PORT}/game-input.html
   Rating:      http://80.90.181.137:${PORT}/rating.html
   Day Stats:   http://80.90.181.137:${PORT}/day-stats.html

🔧 Environment: Using .env.local (⚠️  PRODUCTION DB - ОСТОРОЖНО!)
  `);
});

// Handle errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});
