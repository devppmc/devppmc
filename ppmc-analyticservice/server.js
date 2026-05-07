require('dotenv').config();
const path = require('path');
const express = require('express');

const PORT = process.env.PORT || 3000;
const ACCESS_TOKEN = process.env.BROADSTREET_ACCESS_TOKEN;
const BROADSTREET_BASE = 'https://api.broadstreetads.com/api/1';

if (!ACCESS_TOKEN) {
  console.warn(
    '[broadstreet-dashboard] BROADSTREET_ACCESS_TOKEN is not set. ' +
      'Copy .env.example to .env and fill it in.'
  );
}

async function broadstreetGet(endpoint, query = {}) {
  const url = new URL(BROADSTREET_BASE + endpoint);
  url.searchParams.set('access_token', ACCESS_TOKEN || '');
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`Broadstreet API ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasToken: Boolean(ACCESS_TOKEN) });
});

app.get('/api/networks', async (_req, res, next) => {
  try {
    res.json(await broadstreetGet('/networks'));
  } catch (e) {
    next(e);
  }
});

app.get('/api/networks/:id', async (req, res, next) => {
  try {
    res.json(await broadstreetGet(`/networks/${req.params.id}`));
  } catch (e) {
    next(e);
  }
});

app.get('/api/advertisers', async (req, res, next) => {
  try {
    res.json(await broadstreetGet('/advertisers', { network_id: req.query.network_id }));
  } catch (e) {
    next(e);
  }
});

app.get('/api/advertisers/:id', async (req, res, next) => {
  try {
    res.json(await broadstreetGet(`/advertisers/${req.params.id}`));
  } catch (e) {
    next(e);
  }
});

app.get('/api/advertisers/:id/campaigns', async (req, res, next) => {
  try {
    res.json(await broadstreetGet(`/advertisers/${req.params.id}/campaigns`));
  } catch (e) {
    next(e);
  }
});

app.get('/api/campaigns/:id', async (req, res, next) => {
  try {
    res.json(await broadstreetGet(`/campaigns/${req.params.id}`));
  } catch (e) {
    next(e);
  }
});

app.get('/api/zones', async (req, res, next) => {
  try {
    res.json(await broadstreetGet('/zones', { network_id: req.query.network_id }));
  } catch (e) {
    next(e);
  }
});

app.get('/api/zones/:id', async (req, res, next) => {
  try {
    res.json(await broadstreetGet(`/zones/${req.params.id}`));
  } catch (e) {
    next(e);
  }
});

app.use((err, _req, res, _next) => {
  console.error('[broadstreet-dashboard]', err.status || 500, err.message, err.body || '');
  res.status(err.status || 500).json({
    error: err.message,
    upstream: err.body || null,
  });
});

app.listen(PORT, () => {
  console.log(`Broadstreet dashboard running at http://localhost:${PORT}`);
});
