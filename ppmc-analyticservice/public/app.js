const state = {
  networks: [],
  networkId: null,
  advertisers: [],
  campaignsByAdvertiser: new Map(),
  selectedAdvertiserId: null,
  zones: [],
};

const els = {
  networkSelect: document.getElementById('network-select'),
  tokenStatus: document.getElementById('token-status'),
  statAdvertisers: document.getElementById('stat-advertisers'),
  statCampaigns: document.getElementById('stat-campaigns'),
  statActiveCampaigns: document.getElementById('stat-active-campaigns'),
  statZones: document.getElementById('stat-zones'),
  advertisersBody: document.getElementById('advertisers-body'),
  campaignsBody: document.getElementById('campaigns-body'),
  campaignsTitle: document.getElementById('campaigns-title'),
  zonesBody: document.getElementById('zones-body'),
  advertiserSearch: document.getElementById('advertiser-search'),
  zoneSearch: document.getElementById('zone-search'),
  errorToast: document.getElementById('error-toast'),
};

async function api(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.upstream?.error || body.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

function showError(msg) {
  els.errorToast.textContent = msg;
  els.errorToast.classList.remove('hidden');
  clearTimeout(showError._t);
  showError._t = setTimeout(() => els.errorToast.classList.add('hidden'), 6000);
}

function fmt(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString();
}

function pct(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${(Number(n) * 100).toFixed(2)}%`;
}

function campaignStatus(c) {
  if (c.archived) return { label: 'Archived', cls: 'archived' };
  if (c.paused || c.active === false) return { label: 'Paused', cls: 'paused' };
  return { label: 'Active', cls: 'active' };
}

async function init() {
  try {
    const health = await api('/api/health');
    if (health.hasToken) {
      els.tokenStatus.textContent = 'Token OK';
      els.tokenStatus.classList.add('ok');
    } else {
      els.tokenStatus.textContent = 'No token';
      els.tokenStatus.classList.add('bad');
      showError(
        'BROADSTREET_ACCESS_TOKEN is not set on the server. Copy .env.example to .env and restart.'
      );
      return;
    }
    await loadNetworks();
  } catch (e) {
    showError(e.message);
  }
}

async function loadNetworks() {
  const data = await api('/api/networks');
  state.networks = data.networks || data || [];
  els.networkSelect.innerHTML = '';
  if (!state.networks.length) {
    const opt = document.createElement('option');
    opt.textContent = 'No networks found';
    els.networkSelect.appendChild(opt);
    return;
  }
  for (const n of state.networks) {
    const opt = document.createElement('option');
    opt.value = n.id;
    opt.textContent = n.name || `Network ${n.id}`;
    els.networkSelect.appendChild(opt);
  }
  state.networkId = state.networks[0].id;
  els.networkSelect.value = state.networkId;
  els.networkSelect.addEventListener('change', () => {
    state.networkId = Number(els.networkSelect.value);
    loadNetworkData();
  });
  await loadNetworkData();
}

async function loadNetworkData() {
  state.advertisers = [];
  state.campaignsByAdvertiser = new Map();
  state.zones = [];
  state.selectedAdvertiserId = null;

  renderAdvertisers();
  renderCampaigns([]);
  renderZones();
  setStat('stat-advertisers', '…');
  setStat('stat-campaigns', '…');
  setStat('stat-active-campaigns', '…');
  setStat('stat-zones', '…');

  try {
    const [advertisersRes, zonesRes] = await Promise.all([
      api(`/api/advertisers?network_id=${state.networkId}`),
      api(`/api/zones?network_id=${state.networkId}`),
    ]);
    state.advertisers = advertisersRes.advertisers || advertisersRes || [];
    state.zones = zonesRes.zones || zonesRes || [];
    setStat('stat-advertisers', fmt(state.advertisers.length));
    setStat('stat-zones', fmt(state.zones.length));
    renderAdvertisers();
    renderZones();
    await loadAllCampaigns();
  } catch (e) {
    showError(e.message);
  }
}

async function loadAllCampaigns() {
  const results = await Promise.all(
    state.advertisers.map(async (a) => {
      try {
        const r = await api(`/api/advertisers/${a.id}/campaigns`);
        return [a.id, r.campaigns || r || []];
      } catch {
        return [a.id, []];
      }
    })
  );
  state.campaignsByAdvertiser = new Map(results);

  let total = 0;
  let active = 0;
  for (const cs of state.campaignsByAdvertiser.values()) {
    total += cs.length;
    for (const c of cs) {
      const s = campaignStatus(c);
      if (s.cls === 'active') active += 1;
    }
  }
  setStat('stat-campaigns', fmt(total));
  setStat('stat-active-campaigns', fmt(active));
  renderAdvertisers();
}

function setStat(id, v) {
  document.getElementById(id).textContent = v;
}

function renderAdvertisers() {
  const q = els.advertiserSearch.value.trim().toLowerCase();
  const rows = state.advertisers.filter(
    (a) => !q || (a.name || '').toLowerCase().includes(q)
  );
  if (!rows.length) {
    els.advertisersBody.innerHTML = `<tr class="empty"><td colspan="2">${
      state.advertisers.length ? 'No matches.' : 'No advertisers found.'
    }</td></tr>`;
    return;
  }
  els.advertisersBody.innerHTML = rows
    .map((a) => {
      const count = state.campaignsByAdvertiser.get(a.id)?.length;
      const sel = a.id === state.selectedAdvertiserId ? ' selected' : '';
      return `<tr class="row${sel}" data-id="${a.id}">
        <td>${escapeHtml(a.name || `Advertiser ${a.id}`)}</td>
        <td class="num">${count == null ? '…' : fmt(count)}</td>
      </tr>`;
    })
    .join('');
  for (const tr of els.advertisersBody.querySelectorAll('tr.row')) {
    tr.addEventListener('click', () => {
      state.selectedAdvertiserId = Number(tr.dataset.id);
      renderAdvertisers();
      const cs = state.campaignsByAdvertiser.get(state.selectedAdvertiserId) || [];
      const adv = state.advertisers.find((a) => a.id === state.selectedAdvertiserId);
      els.campaignsTitle.textContent = `Campaigns — ${adv?.name || ''}`;
      renderCampaigns(cs);
    });
  }
}

function renderCampaigns(campaigns) {
  if (!campaigns.length) {
    els.campaignsBody.innerHTML = `<tr class="empty"><td colspan="5">${
      state.selectedAdvertiserId ? 'No campaigns for this advertiser.' : 'Pick an advertiser to see campaigns.'
    }</td></tr>`;
    return;
  }
  els.campaignsBody.innerHTML = campaigns
    .map((c) => {
      const s = campaignStatus(c);
      const imps = c.impression_count ?? c.impressions;
      const clicks = c.click_count ?? c.clicks;
      const ctr =
        imps && imps > 0 && clicks != null ? clicks / imps : null;
      return `<tr>
        <td>${escapeHtml(c.name || `Campaign ${c.id}`)}</td>
        <td><span class="status-badge ${s.cls}">${s.label}</span></td>
        <td class="num">${fmt(imps)}</td>
        <td class="num">${fmt(clicks)}</td>
        <td class="num">${pct(ctr)}</td>
      </tr>`;
    })
    .join('');
}

function renderZones() {
  const q = els.zoneSearch.value.trim().toLowerCase();
  const rows = state.zones.filter(
    (z) =>
      !q ||
      (z.name || '').toLowerCase().includes(q) ||
      (z.alias || '').toLowerCase().includes(q)
  );
  if (!rows.length) {
    els.zonesBody.innerHTML = `<tr class="empty"><td colspan="5">${
      state.zones.length ? 'No matches.' : 'No zones found.'
    }</td></tr>`;
    return;
  }
  els.zonesBody.innerHTML = rows
    .map(
      (z) => `<tr>
      <td>${escapeHtml(z.name || `Zone ${z.id}`)}</td>
      <td><code>${escapeHtml(z.alias || '')}</code></td>
      <td class="num">${fmt(z.width)}</td>
      <td class="num">${fmt(z.height)}</td>
      <td>${z.self_serve ? 'Yes' : 'No'}</td>
    </tr>`
    )
    .join('');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

els.advertiserSearch.addEventListener('input', renderAdvertisers);
els.zoneSearch.addEventListener('input', renderZones);

init();
