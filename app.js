/**
 * TRACKLY — High-Performance Application Controller
 * Modern Frontend Architecture for Software Engineering Resume Showcase
 */

let applications = [];
let activeFilter = 'all'; // 'all', 'high-match', 'interview-stage'
let currentChartDays = 7;
let lastDeletedApp = null;
const stages = ['Applied', 'Interview', 'Offer'];

// DOM Element References
const board = document.querySelector('#board');
const modal = document.querySelector('#application-modal');
const modalForm = document.querySelector('#application-form');
const toast = document.querySelector('#toast');
const searchInput = document.querySelector('#search');
const searchClearBtn = document.querySelector('#search-clear');
const commandPalette = document.querySelector('#command-palette');
const paletteInput = document.querySelector('#palette-search-input');
const paletteResults = document.querySelector('#palette-results');
const detailsDrawer = document.querySelector('#details-drawer');
const confettiCanvas = document.querySelector('#confetti-canvas');
const sidebar = document.querySelector('#sidebar');

// -----------------------------------------------------------------------------
// Utilities & Helpers
// -----------------------------------------------------------------------------
const initials = name => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

async function request(path, options) {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Server request failed.');
  return body;
}

function formatDate(value) {
  if (!value) return 'Recently';
  const date = new Date(value);
  const today = new Date();
  const delta = Math.round((new Date(date).setHours(0, 0, 0, 0) - new Date(today).setHours(0, 0, 0, 0)) / 86400000);
  if (delta === 0) return 'Today';
  if (delta === -1) return 'Yesterday';
  if (delta === 1) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// -----------------------------------------------------------------------------
// Theme Management (Dark / Light Mode)
// -----------------------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('trackly-theme') || 'dark';
  setTheme(savedTheme);

  const toggleSidebar = document.querySelector('#sidebar-theme-toggle');
  const toggleTopbar = document.querySelector('#topbar-theme-toggle');

  const handleToggle = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    showToast(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} theme`);
  };

  if (toggleSidebar) toggleSidebar.addEventListener('click', handleToggle);
  if (toggleTopbar) toggleTopbar.addEventListener('click', handleToggle);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('trackly-theme', theme);
}

// -----------------------------------------------------------------------------
// Toast Notifications
// -----------------------------------------------------------------------------
let toastTimer = null;
function showToast(message, allowUndo = false, onUndo = null) {
  const messageEl = toast.querySelector('.toast-message');
  const undoBtn = document.querySelector('#toast-undo');

  if (messageEl) messageEl.textContent = message;

  if (allowUndo && onUndo) {
    undoBtn.style.display = 'block';
    undoBtn.onclick = () => {
      onUndo();
      toast.classList.remove('show');
    };
  } else {
    undoBtn.style.display = 'none';
  }

  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// -----------------------------------------------------------------------------
// Metrics Calculation & Display
// -----------------------------------------------------------------------------
function updateMetrics(metrics) {
  const appsCount = document.querySelector('#applications-count');
  const interviewCount = document.querySelector('#interview-count');
  const offerCount = document.querySelector('#offer-count');
  const responseRate = document.querySelector('#response-rate');
  const responseRing = document.querySelector('#response-ring');

  if (appsCount) appsCount.textContent = metrics.total;
  if (interviewCount) interviewCount.textContent = metrics.interviews;
  if (offerCount) offerCount.textContent = metrics.offers;
  if (responseRate) responseRate.textContent = `${metrics.responseRate}%`;

  if (responseRing) {
    responseRing.style.background = `conic-gradient(#38bdf8 ${metrics.responseRate}%, var(--bg-surface-elevated) 0)`;
    const pctSpan = responseRing.querySelector('.ring-pct');
    if (pctSpan) pctSpan.textContent = `${metrics.responseRate}%`;
  }
}

// -----------------------------------------------------------------------------
// Dashboard Data Fetching
// -----------------------------------------------------------------------------
async function loadDashboard(query = '') {
  try {
    const [appsData, metricsData] = await Promise.all([
      request(`/api/applications?q=${encodeURIComponent(query)}`),
      request('/api/metrics')
    ]);

    applications = appsData.applications || [];
    updateMetrics(metricsData);
    renderBoard();
  } catch (error) {
    showToast(error.message);
  }
}

// -----------------------------------------------------------------------------
// Kanban Board Rendering
// -----------------------------------------------------------------------------
function getFilteredApplications() {
  if (activeFilter === 'high-match') {
    return applications.filter(app => app.matchScore >= 90);
  }
  if (activeFilter === 'interview-stage') {
    return applications.filter(app => app.stage === 'Interview');
  }
  return applications;
}

function renderBoard() {
  const filteredApps = getFilteredApplications();

  board.innerHTML = stages.map(stage => {
    const apps = filteredApps.filter(app => app.stage === stage);
    const stageClass = `stage-${stage.toLowerCase()}`;

    return `
      <section class="kanban-column ${stageClass}" data-stage="${stage}">
        <div class="column-heading">
          <div class="column-title-wrap">
            <span class="column-color-indicator"></span>
            <span>${stage}</span>
          </div>
          <b>${apps.length}</b>
        </div>

        <div class="column-cards" data-stage="${stage}">
          ${apps.length === 0 ? `
            <div class="column-empty">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18M15 3v18"/>
              </svg>
              <span>No applications in ${stage}</span>
            </div>
          ` : apps.map(app => `
            <article class="application-card" draggable="true" data-app="${app.id}" style="border-left-color: ${app.accentColor || '#6366f1'}">
              <div class="app-card-top">
                <span class="company-dot" style="background: ${app.accentColor || '#6366f1'}">${initials(app.company)}</span>
                <div class="app-card-title-group">
                  <h3>${escapeHtml(app.company)}</h3>
                  <p>${escapeHtml(app.role)}</p>
                </div>
                <div class="card-actions">
                  <button class="card-action-btn view-btn" data-id="${app.id}" title="Inspect Details">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button class="card-action-btn delete-btn" data-id="${app.id}" title="Delete Application">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                  </button>
                </div>
              </div>

              <div class="card-tags">
                <span class="card-tag">Full-time</span>
                <span class="card-tag">Remote</span>
              </div>

              <div class="card-footer">
                <span class="card-date">${formatDate(app.appliedAt)}</span>
                <b class="match ${app.matchScore < 88 ? 'med' : ''}">${app.matchScore}% match</b>
              </div>
            </article>
          `).join('')}
        </div>

        <button class="add-card" data-stage="${stage}" type="button">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          <span>Add application</span>
        </button>
      </section>
    `;
  }).join('');

  const navCount = document.querySelector('#nav-count');
  if (navCount) navCount.textContent = applications.length;

  enableDragDrop();
  bindCardActions();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// -----------------------------------------------------------------------------
// Drag & Drop Interactions
// -----------------------------------------------------------------------------
function enableDragDrop() {
  document.querySelectorAll('.application-card').forEach(card => {
    card.addEventListener('dragstart', event => {
      event.dataTransfer.setData('text/plain', card.dataset.app);
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
  });

  document.querySelectorAll('.kanban-column').forEach(column => {
    column.addEventListener('dragover', event => {
      event.preventDefault();
      column.classList.add('drop-target');
    });

    column.addEventListener('dragleave', () => {
      column.classList.remove('drop-target');
    });

    column.addEventListener('drop', async event => {
      event.preventDefault();
      column.classList.remove('drop-target');
      const appId = event.dataTransfer.getData('text/plain');
      const targetStage = column.dataset.stage;

      if (!appId || !targetStage) return;

      const app = applications.find(a => a.id === Number(appId));
      if (app && app.stage === targetStage) return;

      try {
        await request(`/api/applications/${appId}/stage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: targetStage })
        });

        if (targetStage === 'Offer') {
          launchConfetti();
          showToast(`🎉 Congratulations! Offer stage reached!`);
        } else {
          showToast(`Moved to ${targetStage}`);
        }

        await loadDashboard(searchInput.value);
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  document.querySelectorAll('.add-card').forEach(button => {
    button.addEventListener('click', () => {
      modal.dataset.stage = button.dataset.stage;
      const stageSelect = document.querySelector('#select-stage');
      if (stageSelect) stageSelect.value = button.dataset.stage;
      modal.showModal();
    });
  });
}

// -----------------------------------------------------------------------------
// Card Actions & Slide-over Drawer
// -----------------------------------------------------------------------------
function bindCardActions() {
  // View Details
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openDetailsDrawer(Number(btn.dataset.id));
    });
  });

  // Clicking directly on card opens details
  document.querySelectorAll('.application-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.card-action-btn')) return;
      openDetailsDrawer(Number(card.dataset.app));
    });
  });

  // Delete card directly
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      deleteApplication(id);
    });
  });
}

async function deleteApplication(id) {
  const targetApp = applications.find(a => a.id === id);
  if (!targetApp) return;

  try {
    await request(`/api/applications/${id}`, { method: 'DELETE' });
    lastDeletedApp = targetApp;

    showToast(`Deleted ${targetApp.company}`, true, async () => {
      // Undo delete: recreate the application
      try {
        await request('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: targetApp.company,
            role: targetApp.role,
            stage: targetApp.stage,
            accentColor: targetApp.accentColor
          })
        });
        showToast(`Restored ${targetApp.company}`);
        loadDashboard(searchInput.value);
      } catch (err) {
        showToast(err.message);
      }
    });

    closeDetailsDrawer();
    loadDashboard(searchInput.value);
  } catch (error) {
    showToast(error.message);
  }
}

// -----------------------------------------------------------------------------
// Slide-Over Drawer
// -----------------------------------------------------------------------------
function openDetailsDrawer(id) {
  const app = applications.find(a => a.id === id);
  if (!app) return;

  detailsDrawer.dataset.currentId = id;
  const nameEl = document.querySelector('#drawer-company-name');
  const roleEl = document.querySelector('#drawer-role-name');
  const dotEl = document.querySelector('#drawer-company-dot');
  const dateEl = document.querySelector('#drawer-applied-date');
  const matchEl = document.querySelector('#drawer-match-score');

  if (nameEl) nameEl.textContent = app.company;
  if (roleEl) roleEl.textContent = app.role;
  if (dotEl) {
    dotEl.textContent = initials(app.company);
    dotEl.style.background = app.accentColor || '#6366f1';
  }
  if (dateEl) dateEl.textContent = formatDate(app.appliedAt);
  if (matchEl) matchEl.textContent = `${app.matchScore}% Match Score`;

  // Update Stepper buttons
  document.querySelectorAll('#drawer-stage-stepper .stepper-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.stage === app.stage);
  });

  detailsDrawer.classList.add('open');
  detailsDrawer.setAttribute('aria-hidden', 'false');
}

function closeDetailsDrawer() {
  detailsDrawer.classList.remove('open');
  detailsDrawer.setAttribute('aria-hidden', 'true');
}

// Stepper stage change inside Drawer
document.querySelectorAll('#drawer-stage-stepper .stepper-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const id = Number(detailsDrawer.dataset.currentId);
    const newStage = btn.dataset.stage;
    if (!id || !newStage) return;

    try {
      await request(`/api/applications/${id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      });

      document.querySelectorAll('#drawer-stage-stepper .stepper-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.stage === newStage);
      });

      if (newStage === 'Offer') launchConfetti();
      showToast(`Updated stage to ${newStage}`);
      loadDashboard(searchInput.value);
    } catch (err) {
      showToast(err.message);
    }
  });
});

document.querySelector('#drawer-close').addEventListener('click', closeDetailsDrawer);
document.querySelector('#drawer-backdrop').addEventListener('click', closeDetailsDrawer);
document.querySelector('#drawer-delete-btn').addEventListener('click', () => {
  const id = Number(detailsDrawer.dataset.currentId);
  if (id) deleteApplication(id);
});

// -----------------------------------------------------------------------------
// Interactive SVG Activity Chart
// -----------------------------------------------------------------------------
const chartData7D = [
  { day: 'Mon', count: 2, label: 'Mon, Oct 19' },
  { day: 'Tue', count: 3, label: 'Tue, Oct 20' },
  { day: 'Wed', count: 4, label: 'Wed, Oct 21' },
  { day: 'Thu', count: 6, label: 'Thu, Oct 22' },
  { day: 'Fri', count: 3, label: 'Fri, Oct 23' },
  { day: 'Sat', count: 7, label: 'Sat, Oct 24' },
  { day: 'Sun', count: 8, label: 'Sun, Oct 25' }
];

const chartData30D = [
  { day: 'W1', count: 12, label: 'Week 1' },
  { day: 'W2', count: 18, label: 'Week 2' },
  { day: 'W3', count: 14, label: 'Week 3' },
  { day: 'W4', count: 24, label: 'Week 4' }
];

function initInteractiveChart() {
  const chartArea = document.querySelector('#chart-area');
  const tooltip = document.querySelector('#chart-tooltip');
  const dot = document.querySelector('#chart-active-dot');
  const crosshair = document.querySelector('#chart-crosshair');
  const countEl = document.querySelector('#tooltip-count');
  const dateEl = document.querySelector('#tooltip-date');

  if (!chartArea) return;

  chartArea.addEventListener('mousemove', e => {
    const rect = chartArea.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = x / rect.width;

    const data = currentChartDays === 7 ? chartData7D : chartData30D;
    const index = Math.min(Math.floor(pct * data.length), data.length - 1);
    const item = data[index];

    // Compute Y along path roughly
    const yPct = 1 - (item.count / (currentChartDays === 7 ? 8 : 28));
    const yPx = yPct * (rect.height - 30) + 15;

    dot.style.left = `${x}px`;
    dot.style.top = `${yPx}px`;
    crosshair.style.left = `${x}px`;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${yPx}px`;

    countEl.textContent = `${item.count} applications`;
    dateEl.textContent = item.label;
  });

  // Timeframe switch buttons
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentChartDays = Number(btn.dataset.days);

      const labelsWrap = document.querySelector('#chart-labels');
      if (currentChartDays === 30) {
        labelsWrap.innerHTML = '<span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span>';
        document.querySelector('#chart-line-path').setAttribute('d', 'M0 120 C80 90 120 110 200 60 S350 80 450 40 S550 30 600 20');
        document.querySelector('#chart-area-path').setAttribute('d', 'M0 120 C80 90 120 110 200 60 S350 80 450 40 S550 30 600 20 L600 180 L0 180Z');
      } else {
        labelsWrap.innerHTML = '<span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>';
        document.querySelector('#chart-line-path').setAttribute('d', 'M0 142 C45 125 55 134 86 110 S140 132 172 100 S225 85 257 104 S318 123 343 70 S403 69 428 90 S481 121 514 44 S565 73 600 30');
        document.querySelector('#chart-area-path').setAttribute('d', 'M0 142 C45 125 55 134 86 110 S140 132 172 100 S225 85 257 104 S318 123 343 70 S403 69 428 90 S481 121 514 44 S565 73 600 30 L600 180 L0 180Z');
      }
    });
  });
}

// -----------------------------------------------------------------------------
// Command Palette (⌘K / Ctrl+K)
// -----------------------------------------------------------------------------
function initCommandPalette() {
  const triggerBtn = document.querySelector('#command-btn');

  const openPalette = () => {
    commandPalette.classList.add('open');
    commandPalette.setAttribute('aria-hidden', 'false');
    paletteInput.value = '';
    renderPaletteItems('');
    paletteInput.focus();
  };

  const closePalette = () => {
    commandPalette.classList.remove('open');
    commandPalette.setAttribute('aria-hidden', 'true');
  };

  if (triggerBtn) triggerBtn.addEventListener('click', openPalette);

  window.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (commandPalette.classList.contains('open')) {
        closePalette();
      } else {
        openPalette();
      }
    }
    if (e.key === 'Escape') {
      closePalette();
      closeDetailsDrawer();
    }
  });

  commandPalette.addEventListener('click', e => {
    if (e.target === commandPalette) closePalette();
  });

  paletteInput.addEventListener('input', e => {
    renderPaletteItems(e.target.value.trim());
  });
}

function renderPaletteItems(query) {
  const lowerQ = query.toLowerCase();
  const matchedApps = applications.filter(a =>
    a.company.toLowerCase().includes(lowerQ) || a.role.toLowerCase().includes(lowerQ)
  );

  let html = '';

  if (matchedApps.length > 0) {
    html += `<div class="palette-category">APPLICATIONS</div>`;
    matchedApps.slice(0, 5).forEach(app => {
      html += `
        <div class="palette-item" data-action="view-app" data-id="${app.id}">
          <span class="palette-item-icon" style="background:${app.accentColor}">${initials(app.company)}</span>
          <div class="palette-item-text">
            <strong>${escapeHtml(app.company)} · ${escapeHtml(app.role)}</strong>
            <small>${app.stage} · ${app.matchScore}% Match</small>
          </div>
          <kbd class="esc-kbd">↵</kbd>
        </div>
      `;
    });
  }

  html += `<div class="palette-category">QUICK ACTIONS</div>`;
  const actions = [
    { label: 'Add New Application', sub: 'Create a new opportunity card', icon: '+', action: 'add-new' },
    { label: 'Toggle Dark / Light Theme', sub: 'Switch interface color scheme', icon: '✦', action: 'toggle-theme' },
    { label: 'Filter: High Match Only (≥90%)', sub: 'View strongest match positions', icon: '★', action: 'filter-high' },
    { label: 'Export All Applications (CSV)', sub: 'Download dataset to file', icon: '↓', action: 'export-csv' }
  ];

  actions.filter(a => a.label.toLowerCase().includes(lowerQ)).forEach(act => {
    html += `
      <div class="palette-item" data-action="${act.action}">
        <span class="palette-item-icon" style="background:var(--primary)">${act.icon}</span>
        <div class="palette-item-text">
          <strong>${act.label}</strong>
          <small>${act.sub}</small>
        </div>
      </div>
    `;
  });

  paletteResults.innerHTML = html;

  // Bind click handlers to results
  paletteResults.querySelectorAll('.palette-item').forEach(item => {
    item.addEventListener('click', () => {
      const act = item.dataset.action;
      commandPalette.classList.remove('open');

      if (act === 'view-app') {
        openDetailsDrawer(Number(item.dataset.id));
      } else if (act === 'add-new') {
        delete modal.dataset.stage;
        modal.showModal();
      } else if (act === 'toggle-theme') {
        const cur = document.documentElement.getAttribute('data-theme') || 'dark';
        setTheme(cur === 'dark' ? 'light' : 'dark');
      } else if (act === 'filter-high') {
        setQuickFilter('high-match');
      } else if (act === 'export-csv') {
        exportApplicationsCSV();
      }
    });
  });
}

// -----------------------------------------------------------------------------
// Quick Filter Pills (All / High Match / Interview)
// -----------------------------------------------------------------------------
function setQuickFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll('.filter-tag-btn, .filter-pill-nav').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderBoard();
  showToast(`Showing: ${filter === 'all' ? 'All Applications' : filter.replace('-', ' ')}`);
}

document.querySelectorAll('.filter-tag-btn, .filter-pill-nav').forEach(btn => {
  btn.addEventListener('click', () => {
    setQuickFilter(btn.dataset.filter);
  });
});

// -----------------------------------------------------------------------------
// Search Inputs & Reset
// -----------------------------------------------------------------------------
searchInput.addEventListener('input', e => {
  const query = e.target.value;
  searchClearBtn.classList.toggle('visible', query.length > 0);
  loadDashboard(query);
});

searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchClearBtn.classList.remove('visible');
  loadDashboard('');
});

document.querySelector('#filter-button').addEventListener('click', () => {
  searchInput.value = '';
  searchClearBtn.classList.remove('visible');
  setQuickFilter('all');
  loadDashboard('');
  showToast('Filters reset');
});

// -----------------------------------------------------------------------------
// Add Application Modal & Preset Chips
// -----------------------------------------------------------------------------
document.querySelector('#open-modal').addEventListener('click', () => {
  delete modal.dataset.stage;
  modal.showModal();
});

document.querySelector('#modal-cancel-btn').addEventListener('click', () => {
  modal.close();
});

// Presets (OpenAI, Stripe, Linear, etc.)
document.querySelectorAll('.preset-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelector('#input-company').value = chip.dataset.company;
    document.querySelector('#input-role').value = chip.dataset.role;
    document.querySelector('#input-color').value = chip.dataset.color;
    document.querySelector('#color-hex-label').textContent = chip.dataset.color;
  });
});

document.querySelector('#input-color').addEventListener('input', e => {
  document.querySelector('#color-hex-label').textContent = e.target.value;
});

modalForm.addEventListener('submit', async event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const app = {
    company: data.get('company'),
    role: data.get('role'),
    stage: modal.dataset.stage || data.get('stage') || 'Applied',
    accentColor: data.get('color') || '#6366f1'
  };

  try {
    await request('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(app)
    });

    await loadDashboard(searchInput.value);
    modal.close();
    event.currentTarget.reset();
    document.querySelector('#color-hex-label').textContent = '#6366f1';
    showToast(`${app.company} added to ${app.stage}`);
  } catch (error) {
    showToast(error.message);
  }
});

// -----------------------------------------------------------------------------
// Notifications Popover Toggle
// -----------------------------------------------------------------------------
const notifBtn = document.querySelector('#notification-btn');
const notifDropdown = document.querySelector('#notif-dropdown');

if (notifBtn && notifDropdown) {
  notifBtn.addEventListener('click', e => {
    e.stopPropagation();
    notifDropdown.classList.toggle('show');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.notification-wrap')) {
      notifDropdown.classList.remove('show');
    }
  });
}

// -----------------------------------------------------------------------------
// Mobile Menu Navigation Drawer
// -----------------------------------------------------------------------------
const mobileMenuBtn = document.querySelector('#mobile-menu-btn');
const sidebarCloseBtn = document.querySelector('#sidebar-close');

if (mobileMenuBtn && sidebar) {
  mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.add('mobile-open');
  });
}

if (sidebarCloseBtn && sidebar) {
  sidebarCloseBtn.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
  });
}

// -----------------------------------------------------------------------------
// Export to CSV Feature
// -----------------------------------------------------------------------------
function exportApplicationsCSV() {
  if (!applications || applications.length === 0) {
    showToast('No applications to export');
    return;
  }

  const headers = ['ID', 'Company', 'Role', 'Stage', 'Match Score', 'Applied Date'];
  const rows = applications.map(app => [
    app.id,
    `"${app.company.replace(/"/g, '""')}"`,
    `"${app.role.replace(/"/g, '""')}"`,
    app.stage,
    `${app.matchScore}%`,
    app.appliedAt
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `trackly_job_applications_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Applications exported as CSV');
}

document.querySelector('#export-btn').addEventListener('click', exportApplicationsCSV);

// -----------------------------------------------------------------------------
// Confetti Celebration Engine (Zero-Dependency Vanilla JS)
// -----------------------------------------------------------------------------
function launchConfetti() {
  if (!confettiCanvas) return;
  const ctx = confettiCanvas.getContext('2d');
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#38bdf8', '#8b5cf6'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 200,
      y: window.innerHeight * 0.4,
      vx: (Math.random() - 0.5) * 16,
      vy: Math.random() * -14 - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
      alpha: 1
    });
  }

  let animationFrame;
  function update() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let alive = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // gravity
      p.rotation += p.vRot;
      p.alpha -= 0.012;

      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        ctx.restore();
      }
    });

    if (alive) {
      animationFrame = requestAnimationFrame(update);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  update();
}

// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initCommandPalette();
  initInteractiveChart();
  loadDashboard();
});
