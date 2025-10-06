'use strict';

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

function createServer() {
  const server = http.createServer(async (req, res) => {
    function checkValidation(obj) {
      if (typeof obj.date !== 'string' || !obj.date.trim()) {
        throw new Error(`Field of date not correct: ${obj.date}`);
      }

      if (typeof obj.title !== 'string' || !obj.title.trim()) {
        throw new Error(`Field of title not correct: ${obj.title}`);
      }

      const number = +obj.amount;

      if (!Number.isFinite(number) || number <= 0) {
        throw new Error(`Field of amount not correct: ${number}`);
      }

      const date = new Date(obj.date);

      if (isNaN(date.getTime())) {
        throw new Error(`Field of date not correct: ${obj.date}`);
      }

      return true;
    }

    if (req.method === 'POST') {
      let rawBody = '';

      const contentType = req.headers['content-type'];

      req.on('data', (chunk) => {
        rawBody = rawBody + chunk;
      });

      req.on('end', () => {
        let data = null;

        if (contentType === 'application/json') {
          data = JSON.parse(rawBody);
        }

        if (contentType === 'application/x-www-form-urlencoded') {
          data = Object.fromEntries(new URLSearchParams(rawBody));
        }

        if (data === null) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid JSON');

          return;
        }

        try {
          checkValidation(data);
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'text/html' });

          res.end(
            `<pre>${err.message}</pre> <pre>${JSON.stringify(
              {
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

        res.writeHead(200, { 'Content-Type': 'application/json' });

        res.end(JSON.stringify(data, null, 2));
      });
    }

    if (req.method === 'GET') {
      const normalizedUrl = new url.URL(
        req.url || '',
        `http://${req.headers.host}` || 'http://localhost:5701',
      );
      const origin =
        path.basename(normalizedUrl.pathname.slice(1)) || 'index.html';

      const originPathName = path.join(__dirname, origin);

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
