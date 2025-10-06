'use strict';

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

function createServer() {
  const server = http.createServer(async (req, res) => {
    function cheackValidation(obj) {
      if (typeof obj.date !== 'string' || !obj.date.trim()) {
        throw new Error(`Field of date not correct: ${obj.date}`);
      }

      if (typeof obj.title !== 'string' || !obj.title.trim()) {
        throw new Error(`Field of title not correct: ${obj.title}`);
      }

      if (!Number.isFinite(obj.amount) || obj.amount <= 0) {
        throw new Error(`Field of amount not correct: ${obj.amount}`);
      }

      const date = new Date(obj.date);

      if (isNaN(date.getTime()) || !date.toISOString().startsWith(obj.date)) {
        throw new Error(`Field of date not correct: ${obj.date}`);
      }

      return true;
    }

    if (req.method === 'POST') {
      let rawBody = '';

      req.on('data', (chunk) => {
        rawBody = rawBody + chunk;
      });

      req.on('end', () => {
        const body = new URLSearchParams(rawBody);
        const data = Object.fromEntries(body.entries());

        for (const key in data) {
          if (key === 'amount') {
            data[key] = +data[key];
          }
        }

        try {
          cheackValidation(data);
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'text/html' });

          res.end(
            `<pre>${err.message}</pre> <pre>${JSON.stringify(
              {
                error: 'Missing required fields',
                invalid: data,
              },
              null,
              2,
            )}</pre>`,
          );

          return;
        }

        const folder = path.join(__dirname, '..', 'db');
        const filePath = path.join(folder, 'expense.json');

        if (!fs.existsSync(folder)) {
          fs.mkdirSync(folder, { recursive: true });
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        if (fs.existsSync(filePath)) {
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });

        res.end(`
  <pre>
    ${JSON.stringify(data, null, 2)}
  </pre>
`);
      });
    }

    if (req.method === 'GET') {
      const normalizedUrl = new url.URL(
        req.url || '',
        `http://${req.headers.host}`,
      );
      const origin =
        path.basename(normalizedUrl.pathname.slice(1)) || 'index.html';

      const originPathName = path.join(__dirname, '..', 'public', origin);

      const fsStream = fs.createReadStream(originPathName);

      fsStream.on('error', (err) => {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`Error reading file: ${String(err)}`);
      });

      fsStream.on('open', () => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fsStream.pipe(res);
      });
    }
  });

  return server;
}

module.exports = {
  createServer,
};
