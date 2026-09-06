const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JULES_API_BASE = 'https://jules.googleapis.com/v1alpha';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to construct headers
function getHeaders(req) {
  const apiKey = req.headers['x-goog-api-key'] || process.env.JULES_API_KEY || '';
  return {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey
  };
}

// Proxy handler helper
async function proxyRequest(url, method, headers, body) {
  const options = {
    method,
    headers
  };
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return {
    status: response.status,
    data
  };
}

// Routes
// 1. Sources
app.get('/api/sources', async (req, res) => {
  try {
    const queryString = new URLSearchParams(req.query).toString();
    const url = `${JULES_API_BASE}/sources${queryString ? '?' + queryString : ''}`;
    const result = await proxyRequest(url, 'GET', getHeaders(req));
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.get('/api/source-details', async (req, res) => {
  try {
    const sourceId = req.query.name;
    const url = `${JULES_API_BASE}/${sourceId}`;
    const result = await proxyRequest(url, 'GET', getHeaders(req));
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// 2. Sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const queryString = new URLSearchParams(req.query).toString();
    const url = `${JULES_API_BASE}/sessions${queryString ? '?' + queryString : ''}`;
    const result = await proxyRequest(url, 'GET', getHeaders(req));
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const url = `${JULES_API_BASE}/sessions`;
    const result = await proxyRequest(url, 'POST', getHeaders(req), req.body);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const url = `${JULES_API_BASE}/sessions/${sessionId}`;
    const result = await proxyRequest(url, 'GET', getHeaders(req));
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.delete('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const url = `${JULES_API_BASE}/sessions/${sessionId}`;
    const result = await proxyRequest(url, 'DELETE', getHeaders(req));
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.post('/api/sessions/:sessionId/sendMessage', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const url = `${JULES_API_BASE}/sessions/${sessionId}:sendMessage`;
    const result = await proxyRequest(url, 'POST', getHeaders(req), req.body);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.post('/api/sessions/:sessionId/approvePlan', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const url = `${JULES_API_BASE}/sessions/${sessionId}:approvePlan`;
    const result = await proxyRequest(url, 'POST', getHeaders(req), req.body);
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// 3. Activities
app.get('/api/sessions/:sessionId/activities', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const queryString = new URLSearchParams(req.query).toString();
    const url = `${JULES_API_BASE}/sessions/${sessionId}/activities${queryString ? '?' + queryString : ''}`;
    const result = await proxyRequest(url, 'GET', getHeaders(req));
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

app.get('/api/sessions/:sessionId/activities/:activityId', async (req, res) => {
  try {
    const { sessionId, activityId } = req.params;
    const url = `${JULES_API_BASE}/sessions/${sessionId}/activities/${activityId}`;
    const result = await proxyRequest(url, 'GET', getHeaders(req));
    res.status(result.status).json(result.data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

// Fallback to index.html for SPA
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Jules Clone server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
