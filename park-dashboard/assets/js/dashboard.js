/* ═══════════════════════════════════════════════════════════════════════════
   Sirehpark Tree CSR Dashboard  |  dashboard.js
   Uses Leaflet.js + OpenStreetMap for all maps.
═══════════════════════════════════════════════════════════════════════════ */

var API_BASE = './api';

var STATUS_COLORS = {
  'Alive':        '#00E676',
  'At Risk':      '#FFB300',
  'Dead':         '#F85149',
  'New Planting': '#58A6FF'
};
var STATUS_BADGE = {
  'Alive':        'badge-live',
  'At Risk':      'badge-risk',
  'Dead':         'badge-dead',
  'New Planting': 'badge-new'
};
var STATUS_BG = {
  'Alive':        'rgba(0,230,118,0.12)',
  'At Risk':      'rgba(255,179,0,0.12)',
  'Dead':         'rgba(248,81,73,0.12)',
  'New Planting': 'rgba(88,166,255,0.12)'
};
var STATUS_TC = {
  'Alive':        '#00E676',
  'At Risk':      '#FFB300',
  'Dead':         '#F85149',
  'New Planting': '#58A6FF'
};
var SPECIES_COLORS = ['#00E676','#58A6FF','#FFB300','#D2A8FF','#F85149','#39D353'];

/* ── State ──────────────────────────────────────────────────────────────── */
var allTrees     = [];
var activeFilter = 'all';
var donutChart   = null;
var dbhChart     = null;
var editingId    = null;
var deleteTarget = null;

/* Leaflet map instances */
var dashMap     = null;
var fullMap     = null;
var formMap     = null;
var formMarker  = null;

/* ── Boot ───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  initNav();
  initFilters();
  document.getElementById('btn-refresh').addEventListener('click', loadAll);
  document.getElementById('btn-submit').addEventListener('click', submitTree);
  document.getElementById('btn-clear').addEventListener('click', clearForm);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-confirm').addEventListener('click', confirmDelete);
  document.getElementById('record-search').addEventListener('input', filterRecords);
  loadAll();
});

/* ── Navigation ─────────────────────────────────────────────────────────── */
function initNav() {
  var items = document.querySelectorAll('.nav-item');
  for (var i = 0; i < items.length; i++) {
    items[i].addEventListener('click', function(e) {
      e.preventDefault();
      var v = this.dataset.view;
      document.querySelectorAll('.nav-item').forEach(function(x){ x.classList.remove('active'); });
      document.querySelectorAll('.view').forEach(function(x){ x.classList.remove('active'); });
      this.classList.add('active');
      document.getElementById('view-' + v).classList.add('active');

      var titles = { dashboard:'Dashboard Overview', map:'Map View', records:'All Records', add:'Add / Edit Tree' };
      document.getElementById('page-title').textContent = titles[v] || v;

      if (v === 'map')     { initFullMap(); }
      if (v === 'records') { renderRecords(allTrees); }
      if (v === 'add')     { initFormMap(); }
    });
  }
}

/* ── Filters ────────────────────────────────────────────────────────────── */
function initFilters() {
  var pills = document.querySelectorAll('.pill');
  for (var i = 0; i < pills.length; i++) {
    pills[i].addEventListener('click', function() {
      document.querySelectorAll('.pill').forEach(function(b){ b.classList.remove('active'); });
      this.classList.add('active');
      activeFilter = this.dataset.status;
      applyFilter();
    });
  }
}

function applyFilter() {
  var data = activeFilter === 'all'
    ? allTrees
    : allTrees.filter(function(t){ return t.tree_status === activeFilter; });
  refreshDashMap(data);
  renderTable(data);
}

/* ── Data Loading ───────────────────────────────────────────────────────── */
function loadAll() {
  document.getElementById('last-sync').textContent = 'Loading…';

  var p1 = apiFetch(API_BASE + '/trees.php?action=list');
  var p2 = apiFetch(API_BASE + '/trees.php?action=stats');
  var p3 = apiFetch(API_BASE + '/trees.php?action=species');

  Promise.all([p1, p2, p3]).then(function(results) {
    allTrees = results[0];
    var stats   = results[1];
    var species = results[2];

    updateKPIs(stats.totals);
    applyFilter();
    updateDonut(stats.totals);
    updateSpecies(species);
    updateDBHChart(stats.dbh_dist);

    document.getElementById('last-sync').textContent = new Date().toLocaleTimeString();
    document.getElementById('table-count').textContent = allTrees.length + ' records';
  }).catch(function(err) {
    console.error('API error:', err);
    document.getElementById('last-sync').textContent = 'Demo mode';
    loadDemoData();
    toast('Could not reach API — showing demo data.', true);
  });
}

function loadDemoData() {
  allTrees = DEMO_TREES;
  var totals = { total:3, live:2, at_risk:0, dead:0, new_planting:1, avg_dbh:0.55, avg_height:1.0 };
  var dbh_dist = { lt10:3, b10_20:0, b20_30:0, b30_40:0, gt40:0 };
  var species = [{ species:'Bintagor Laut', count:2 }, { species:'Cengkih', count:1 }];
  updateKPIs(totals);
  applyFilter();
  updateDonut(totals);
  updateSpecies(species);
  updateDBHChart(dbh_dist);
  document.getElementById('table-count').textContent = allTrees.length + ' records (demo)';
}

function apiFetch(url) {
  return fetch(url).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

/* ── KPIs ───────────────────────────────────────────────────────────────── */
function updateKPIs(t) {
  setText('k-total', t.total);
  setText('k-live',  t.live);
  setText('k-live-pct', Math.round(t.live / t.total * 100) + '% of total');
  setText('k-risk',  t.at_risk);
  setText('k-dead',  t.dead);
  setText('k-new',   t.new_planting);
  setText('k-dbh',   t.avg_dbh + ' cm');
}
function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ══════════════════════════════════════════════════════════════════════════
   LEAFLET MAPS
══════════════════════════════════════════════════════════════════════════ */

var OSM_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
var OSM_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>';
var DEFAULT_CENTER = [1.4654, 103.6454]; // Iskandar Puteri area
var DEFAULT_ZOOM   = 17;

/* ── Dashboard map (panel) ──────────────────────────────────────────────── */
function initDashMap() {
  if (dashMap) return; // already initialised
  dashMap = L.map('dashboard-map', { zoomControl: true, scrollWheelZoom: true });
  L.tileLayer(OSM_TILE, { attribution: OSM_ATTR, maxZoom: 20 }).addTo(dashMap);
  dashMap.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
}

function refreshDashMap(data) {
  if (!dashMap) initDashMap();

  // Remove old markers layer if it exists
  if (dashMap._treeLayer) {
    dashMap.removeLayer(dashMap._treeLayer);
  }

  var layer = L.layerGroup();

  for (var i = 0; i < data.length; i++) {
    var t   = data[i];
    var lat = parseFloat(t.latitude);
    var lng = parseFloat(t.longitude);
    if (isNaN(lat) || isNaN(lng)) continue;

    var clr = STATUS_COLORS[t.tree_status] || '#888';
    var dbhVal = parseFloat(t.dbh) || 0.5;
    var r = dbhVal < 5 ? Math.max(7, Math.min(14, dbhVal * 8 + 6)) : Math.max(7, Math.min(18, dbhVal * 0.4 + 6));

    var circle = L.circleMarker([lat, lng], {
      radius:      r,
      fillColor:   clr,
      color:       '#fff',
      weight:      2,
      opacity:     1,
      fillOpacity: 0.88
    });

    circle.bindPopup(makePopup(t));
    circle.addTo(layer);
  }

  layer.addTo(dashMap);
  dashMap._treeLayer = layer;

  // Fit map to markers if we have data
  if (data.length > 0) {
    var lats = data.map(function(t){ return parseFloat(t.latitude); }).filter(function(v){ return !isNaN(v); });
    var lngs = data.map(function(t){ return parseFloat(t.longitude); }).filter(function(v){ return !isNaN(v); });
    if (lats.length) {
      var bounds = L.latLngBounds(
        [Math.min.apply(null,lats), Math.min.apply(null,lngs)],
        [Math.max.apply(null,lats), Math.max.apply(null,lngs)]
      );
      dashMap.fitBounds(bounds.pad(0.3));
    }
  }
}

/* ── Full map view ──────────────────────────────────────────────────────── */
function initFullMap() {
  if (fullMap) {
    fullMap.invalidateSize();
    refreshFullMap(allTrees);
    return;
  }
  fullMap = L.map('fullmap', { zoomControl: true, scrollWheelZoom: true });
  L.tileLayer(OSM_TILE, { attribution: OSM_ATTR, maxZoom: 20 }).addTo(fullMap);
  fullMap.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  refreshFullMap(allTrees);
}

function refreshFullMap(data) {
  if (!fullMap) return;
  if (fullMap._treeLayer) fullMap.removeLayer(fullMap._treeLayer);

  var layer = L.layerGroup();
  for (var i = 0; i < data.length; i++) {
    var t   = data[i];
    var lat = parseFloat(t.latitude);
    var lng = parseFloat(t.longitude);
    if (isNaN(lat) || isNaN(lng)) continue;

    var clr = STATUS_COLORS[t.tree_status] || '#888';
    var dbhVal2 = parseFloat(t.dbh) || 0.5;
    var r = dbhVal2 < 5 ? Math.max(8, Math.min(16, dbhVal2 * 8 + 7)) : Math.max(8, Math.min(20, dbhVal2 * 0.4 + 7));

    var circle = L.circleMarker([lat, lng], {
      radius:      r,
      fillColor:   clr,
      color:       '#fff',
      weight:      2,
      opacity:     1,
      fillOpacity: 0.9
    });
    circle.bindPopup(makePopup(t));
    circle.addTo(layer);
  }
  layer.addTo(fullMap);
  fullMap._treeLayer = layer;

  if (data.length > 0) {
    var lats = data.filter(function(t){ return !isNaN(parseFloat(t.latitude)); }).map(function(t){ return parseFloat(t.latitude); });
    var lngs = data.filter(function(t){ return !isNaN(parseFloat(t.longitude)); }).map(function(t){ return parseFloat(t.longitude); });
    if (lats.length) {
      fullMap.fitBounds(L.latLngBounds(
        [Math.min.apply(null,lats), Math.min.apply(null,lngs)],
        [Math.max.apply(null,lats), Math.max.apply(null,lngs)]
      ).pad(0.25));
    }
  }

  setTimeout(function(){ fullMap.invalidateSize(); }, 200);
}

/* ── Form pick-location map ─────────────────────────────────────────────── */
function initFormMap() {
  if (formMap) {
    formMap.invalidateSize();
    return;
  }
  formMap = L.map('form-map', { zoomControl: true, scrollWheelZoom: true });
  L.tileLayer(OSM_TILE, { attribution: OSM_ATTR, maxZoom: 20 }).addTo(formMap);
  formMap.setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  // Draw existing trees faintly for context
  for (var i = 0; i < allTrees.length; i++) {
    var t   = allTrees[i];
    var lat = parseFloat(t.latitude);
    var lng = parseFloat(t.longitude);
    if (isNaN(lat) || isNaN(lng)) continue;
    L.circleMarker([lat, lng], {
      radius: 8, fillColor: STATUS_COLORS[t.tree_status] || '#888',
      color: '#fff', weight: 1, fillOpacity: 0.5
    }).addTo(formMap);
  }

  // Click to place marker and fill lat/lng fields
  formMap.on('click', function(e) {
    var lat = e.latlng.lat.toFixed(7);
    var lng = e.latlng.lng.toFixed(7);
    document.getElementById('f-lat').value = lat;
    document.getElementById('f-lng').value = lng;
    document.getElementById('preview-lat').textContent = lat;
    document.getElementById('preview-lng').textContent = lng;

    if (formMarker) formMap.removeLayer(formMarker);
    formMarker = L.marker(e.latlng).addTo(formMap)
      .bindPopup('New tree location').openPopup();
  });

  setTimeout(function(){ formMap.invalidateSize(); }, 200);
}

/* ── Popup HTML ─────────────────────────────────────────────────────────── */
function makePopup(t) {
  var clr = STATUS_COLORS[t.tree_status] || '#888';
  var bg  = STATUS_BG[t.tree_status]     || '#eee';
  var tc  = STATUS_TC[t.tree_status]     || '#333';
  return '<span class="popup-id">' + t.tree_id + '</span>'
    + '<span class="popup-row"><b>Species:</b> ' + t.tree_species + '</span>'
    + '<span class="popup-row"><b>Height:</b> ' + (t.tree_height || '—') + ' m &nbsp;|&nbsp; <b>DBH:</b> ' + (t.dbh || '—') + ' cm</span>'
    + '<span class="popup-row"><b>Input:</b> ' + t.input_type + '</span>'
    + (t.entry_date ? '<span class="popup-row"><b>Date:</b> ' + t.entry_date + '</span>' : '')
    + (t.remarks ? '<span class="popup-row" style="color:#888;">' + t.remarks + '</span>' : '')
    + '<span class="popup-badge" style="background:' + bg + ';color:' + tc + ';">' + t.tree_status + '</span>';
}

/* ══════════════════════════════════════════════════════════════════════════
   CHARTS
══════════════════════════════════════════════════════════════════════════ */

function updateDonut(t) {
  var labels = ['Alive','At Risk','Dead','New Planting'];
  var values = [+t.live, +t.at_risk, +t.dead, +t.new_planting];
  var colors = ['#00E676','#FFB300','#F85149','#58A6FF'];

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(document.getElementById('donut-chart'), {
    type: 'doughnut',
    data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 3, borderColor: '#fff', hoverOffset: 5 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: function(ctx){ return ' ' + ctx.label + ': ' + ctx.raw; } } }
      }
    }
  });

  setText('donut-total', t.total);

  var legendEl = document.getElementById('donut-legend');
  legendEl.innerHTML = labels.map(function(l, i) {
    return '<span class="donut-legend-item">'
      + '<span class="donut-legend-sq" style="background:' + colors[i] + '"></span>'
      + l + ' <b style="margin-left:3px;color:#1C2B1C">' + values[i] + '</b>'
      + '</span>';
  }).join('');
}

function updateSpecies(data) {
  var max = data.length ? data[0].count : 1;
  document.getElementById('species-bars').innerHTML = data.slice(0,6).map(function(s, i) {
    return '<div class="sp-row">'
      + '<div class="sp-head"><span class="sp-name">' + s.species + '</span><span class="sp-count">' + s.count + '</span></div>'
      + '<div class="sp-bg"><div class="sp-fill" style="width:' + Math.round(s.count/max*100) + '%;background:' + SPECIES_COLORS[i] + '"></div></div>'
      + '</div>';
  }).join('');
}

function updateDBHChart(d) {
  var vals = [+d.lt10, +d.b10_20, +d.b20_30, +d.b30_40, +d.gt40];
  if (dbhChart) dbhChart.destroy();
  dbhChart = new Chart(document.getElementById('dbh-chart'), {
    type: 'bar',
    data: {
      labels: ['<10','10–20','20–30','30–40','40+'],
      datasets: [{ data: vals, backgroundColor: ['rgba(0,230,118,0.2)','rgba(0,230,118,0.35)','rgba(0,230,118,0.55)','rgba(0,230,118,0.75)','#00E676'], borderRadius: 5, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#484F58' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { stepSize: 1, font: { size: 11 }, color: '#484F58' } }
      }
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   TABLES
══════════════════════════════════════════════════════════════════════════ */

function renderTable(data) {
  var tbody  = document.getElementById('table-body');
  var recent = data.slice().sort(function(a,b){ return new Date(b.entry_date) - new Date(a.entry_date); }).slice(0, 10);
  tbody.innerHTML = recent.length
    ? recent.map(rowHTML).join('')
    : '<tr><td colspan="10" class="loading-row">No records found.</td></tr>';
}

function renderRecords(data) {
  var tbody = document.getElementById('records-body');
  tbody.innerHTML = data.length
    ? data.map(function(t) {
        return '<tr>'
          + '<td>' + t.tree_no + '</td>'
          + '<td style="font-weight:600;color:#1A5C9E">' + t.tree_id + '</td>'
          + '<td>' + t.input_type + '</td>'
          + '<td>' + t.tree_species + '</td>'
          + '<td style="font-family:\'DM Mono\',monospace">' + parseFloat(t.latitude).toFixed(7) + '</td>'
          + '<td style="font-family:\'DM Mono\',monospace">' + parseFloat(t.longitude).toFixed(7) + '</td>'
          + '<td>' + (t.tree_height || '—') + '</td>'
          + '<td>' + (t.dbh || '—') + '</td>'
          + '<td><span class="badge ' + (STATUS_BADGE[t.tree_status] || '') + '">' + t.tree_status + '</span></td>'
          + '<td>' + (t.entry_date || '—') + '</td>'
          + '<td style="color:#888">' + (t.email || '—') + '</td>'
          + '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">' + (t.remarks || '—') + '</td>'
          + '<td><button class="btn-action btn-edit" onclick="editTree(\'' + t.tree_id + '\')">Edit</button> '
          + '<button class="btn-action btn-delete" onclick="askDelete(\'' + t.tree_id + '\')">Delete</button></td>'
          + '</tr>';
      }).join('')
    : '<tr><td colspan="13" class="loading-row">No records found.</td></tr>';
}

function filterRecords() {
  var q = document.getElementById('record-search').value.toLowerCase();
  var filtered = allTrees.filter(function(t) {
    return t.tree_id.toLowerCase().indexOf(q) > -1
      || t.tree_species.toLowerCase().indexOf(q) > -1
      || t.tree_status.toLowerCase().indexOf(q) > -1
      || (t.remarks || '').toLowerCase().indexOf(q) > -1;
  });
  renderRecords(filtered);
}

function rowHTML(t) {
  return '<tr>'
    + '<td>' + t.tree_no + '</td>'
    + '<td style="font-weight:600;color:#1A5C9E">' + t.tree_id + '</td>'
    + '<td>' + t.input_type + '</td>'
    + '<td>' + t.tree_species + '</td>'
    + '<td>' + (t.tree_height || '—') + '</td>'
    + '<td>' + (t.dbh || '—') + '</td>'
    + '<td><span class="badge ' + (STATUS_BADGE[t.tree_status] || '') + '">' + t.tree_status + '</span></td>'
    + '<td>' + (t.entry_date || '—') + '</td>'
    + '<td style="color:#888">' + (t.email || '—') + '</td>'
    + '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;color:#888">' + (t.remarks || '—') + '</td>'
    + '</tr>';
}

/* ══════════════════════════════════════════════════════════════════════════
   FORM (Add / Edit)
══════════════════════════════════════════════════════════════════════════ */

function clearForm() {
  var ids = ['f-tree-no','f-tree-id','f-species','f-lat','f-lng','f-height','f-dbh','f-email','f-remarks'];
  ids.forEach(function(id){ document.getElementById(id).value = ''; });
  document.getElementById('f-input-type').value = 'RegisterTree';
  document.getElementById('f-status').value     = 'Alive';
  document.getElementById('f-date').value        = '';
  document.getElementById('form-msg').textContent = '';
  document.getElementById('btn-submit').textContent = 'Save Tree Record';
  document.getElementById('preview-lat').textContent = '—';
  document.getElementById('preview-lng').textContent = '—';
  if (formMarker && formMap) { formMap.removeLayer(formMarker); formMarker = null; }
  editingId = null;
}

function editTree(treeId) {
  var t = null;
  for (var i = 0; i < allTrees.length; i++) {
    if (allTrees[i].tree_id === treeId) { t = allTrees[i]; break; }
  }
  if (!t) return;

  // Navigate to add view
  document.querySelectorAll('.nav-item').forEach(function(x){ x.classList.remove('active'); });
  document.querySelectorAll('.view').forEach(function(x){ x.classList.remove('active'); });
  document.querySelector('[data-view="add"]').classList.add('active');
  document.getElementById('view-add').classList.add('active');
  document.getElementById('page-title').textContent = 'Add / Edit Tree';

  editingId = treeId;
  document.getElementById('f-tree-no').value    = t.tree_no;
  document.getElementById('f-tree-id').value    = t.tree_id;
  document.getElementById('f-input-type').value = t.input_type;
  document.getElementById('f-species').value    = t.tree_species;
  document.getElementById('f-lat').value        = t.latitude;
  document.getElementById('f-lng').value        = t.longitude;
  document.getElementById('f-height').value     = t.tree_height || '';
  document.getElementById('f-dbh').value        = t.dbh || '';
  document.getElementById('f-status').value     = t.tree_status;
  document.getElementById('f-date').value       = t.entry_date ? t.entry_date.split(' ')[0] : '';
  document.getElementById('f-email').value      = t.email || '';
  document.getElementById('f-remarks').value    = t.remarks || '';
  document.getElementById('btn-submit').textContent = 'Update Tree Record';

  document.getElementById('preview-lat').textContent = t.latitude;
  document.getElementById('preview-lng').textContent = t.longitude;

  // Pan form map to this tree after a short delay
  setTimeout(function() {
    initFormMap();
    var lat = parseFloat(t.latitude), lng = parseFloat(t.longitude);
    if (!isNaN(lat)) {
      formMap.setView([lat, lng], 18);
      if (formMarker) formMap.removeLayer(formMarker);
      formMarker = L.marker([lat, lng]).addTo(formMap).bindPopup(t.tree_id).openPopup();
    }
  }, 300);
}

function submitTree() {
  var payload = {
    Tree_No:      document.getElementById('f-tree-no').value,
    Input_Type:   document.getElementById('f-input-type').value,
    Tree_ID:      document.getElementById('f-tree-id').value,
    Tree_Species: document.getElementById('f-species').value,
    Latitude:     document.getElementById('f-lat').value,
    Longitude:    document.getElementById('f-lng').value,
    Tree_Height:  document.getElementById('f-height').value || null,
    DBH:          document.getElementById('f-dbh').value || null,
    Tree_Status:  document.getElementById('f-status').value,
    Date:         document.getElementById('f-date').value,
    Email:        document.getElementById('f-email').value || null,
    Remarks:      document.getElementById('f-remarks').value || null
  };

  var required = ['Tree_No','Tree_ID','Tree_Species','Latitude','Longitude','Tree_Status','Date'];
  for (var i = 0; i < required.length; i++) {
    if (!payload[required[i]]) {
      showMsg('Please fill in: ' + required[i].replace('_',' '), true);
      return;
    }
  }

  var method = editingId ? 'PUT' : 'POST';
  fetch(API_BASE + '/tree_write.php', {
    method:  method,
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  }).then(function(r){ return r.json(); }).then(function(json) {
    if (json.success) {
      toast(editingId ? 'Tree updated successfully.' : 'Tree added successfully.');
      clearForm();
      loadAll();
    } else {
      showMsg(json.error || 'Save failed.', true);
    }
  }).catch(function() {
    toast(editingId ? 'Updated (demo mode).' : 'Added (demo mode).');
    clearForm();
  });
}

function showMsg(msg, isErr) {
  var el = document.getElementById('form-msg');
  el.textContent = msg;
  el.className = 'form-msg ' + (isErr ? 'err' : 'ok');
}

/* ── Delete ─────────────────────────────────────────────────────────────── */
function askDelete(treeId) {
  deleteTarget = treeId;
  document.getElementById('modal-tree-id').textContent = treeId;
  document.getElementById('modal').style.display = 'flex';
}
function closeModal() {
  document.getElementById('modal').style.display = 'none';
  deleteTarget = null;
}
function confirmDelete() {
  if (!deleteTarget) return;
  fetch(API_BASE + '/tree_write.php', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Tree_ID: deleteTarget })
  }).then(function(r){ return r.json(); }).then(function(json) {
    if (json.success) { toast('Tree deleted.'); loadAll(); }
  }).catch(function(){ toast('Deleted (demo mode).'); });
  closeModal();
}

/* ── Toast ──────────────────────────────────────────────────────────────── */
function toast(msg, isErr) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' error' : '');
  setTimeout(function(){ t.classList.remove('show'); }, 3200);
}

/* ══════════════════════════════════════════════════════════════════════════
   DEMO DATA (fallback — matches real schema)
══════════════════════════════════════════════════════════════════════════ */
var DEMO_TREES = [
  { tree_no:23020, input_type:'RegisterTree', tree_id:'SIREHPARK01202', tree_species:'Bintagor Laut', latitude:1.4654505, longitude:103.6454533, tree_height:1, dbh:0.5, tree_status:'Alive', entry_date:'2022-07-10', email:'sirehpark.iskandarputeri@gmail.com', remarks:'Planted by MCIS Life' },
  { tree_no:23021, input_type:'UpdateTree',   tree_id:'SIREHPARK01202', tree_species:'Bintagor Laut', latitude:1.4654505, longitude:103.6454533, tree_height:1, dbh:0.5, tree_status:'Alive', entry_date:'2022-07-10', email:'sirehpark.iskandarputeri@gmail.com', remarks:'' },
  { tree_no:23022, input_type:'RegisterTree', tree_id:'SIREHPARK01203', tree_species:'Cengkih',       latitude:1.3177,    longitude:101.6925,    tree_height:1, dbh:0.65,tree_status:'Alive', entry_date:'2021-11-24', email:'sirehpark.iskandarputeri@gmail.com', remarks:'' }
];
