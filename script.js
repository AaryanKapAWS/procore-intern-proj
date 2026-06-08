/* =============================================
   PROCORE UPLOAD PROJECT — DMAIC DASHBOARD
   script.js
   ============================================= */

'use strict';

/* =============================================
   THEME TOGGLE
   ============================================= */
function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  document.getElementById('themeToggle').textContent = isLight ? '☀️' : '🌙';
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light') {
    document.body.classList.add('light');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = '☀️';
  }
}

/* =============================================
   STORAGE HELPERS
   ============================================= */
const STORAGE_KEY = 'procoreUploadDMAIC_v1';

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getData(key, fallback = '') {
  return loadData()[key] ?? fallback;
}

function setData(key, value) {
  const d = loadData();
  d[key] = value;
  saveData(d);
}

/* =============================================
   NAVIGATION
   ============================================= */
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const section = item.dataset.section;
      switchSection(section);
      // Close mobile sidebar
      if (window.innerWidth <= 768) closeMobileSidebar();
    });
  });
}

function switchSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target section
  const target = document.getElementById('section-' + sectionId);
  if (target) {
    target.classList.add('active');
    // Force reflow for animation
    void target.offsetWidth;
  }

  const navItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
  if (navItem) navItem.classList.add('active');

  // Special initializations
  if (sectionId === 'dmaic') {
    // New HTML flowchart — no render needed
  }
}

/* =============================================
   MOBILE SIDEBAR
   ============================================= */
function initMobileSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebarOverlay';
  document.body.appendChild(overlay);

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  });

  overlay.addEventListener('click', closeMobileSidebar);
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

/* =============================================
   EDITABLE FIELDS — AUTO SAVE
   ============================================= */
function initEditableFields() {
  // Contenteditable divs/spans with data-key
  document.querySelectorAll('[contenteditable][data-key]').forEach(el => {
    // Load saved value
    const saved = getData(el.dataset.key);
    if (saved) el.textContent = saved;

    el.addEventListener('input', () => {
      setData(el.dataset.key, el.textContent);
      // Special: 5 whys root cause sync
      if (el.dataset.key === 'why5') syncRootCause();
    });
  });

  // Selects with data-key
  document.querySelectorAll('select[data-key]').forEach(el => {
    const saved = getData(el.dataset.key);
    if (saved) el.value = saved;
    el.addEventListener('change', () => {
      setData(el.dataset.key, el.value);
      if (el.id === 'overviewStatus' || el.id === 'globalStatus') updateTopbar();
    });
  });
}

function syncRootCause() {
  const why5 = document.getElementById('why5Input');
  const display = document.getElementById('rootCauseDisplay');
  if (why5 && display) display.textContent = why5.textContent || '—';
}

/* =============================================
   TOPBAR STATUS
   ============================================= */
function updateTopbar() {
  const phaseData = JSON.parse(getData('phaseStatus', '[]'));
  const phases = ['Define', 'Measure', 'Analyse', 'Improve', 'Control'];
  
  let currentPhase = 'Define';
  if (phaseData.length) {
    // Find last "In Progress" or first "Not Started"
    let found = false;
    phaseData.forEach((p, i) => {
      if (p === 'In Progress' && !found) { currentPhase = phases[i]; found = true; }
    });
    if (!found) {
      phaseData.forEach((p, i) => {
        if (p !== 'Complete' && !found) { currentPhase = phases[i]; found = true; }
      });
    }
  }

  const topbarPhase = document.getElementById('topbarPhase');
  if (topbarPhase) topbarPhase.textContent = currentPhase;

  // Action progress
  updateActionProgress();
}

/* =============================================
   PHASE PILLS
   ============================================= */
function initPhasePills() {
  const pills = document.querySelectorAll('.phase-pill');
  const statuses = ['Not Started', 'In Progress', 'Complete'];
  
  // Load saved statuses
  const saved = JSON.parse(getData('phaseStatus', '[]'));
  if (saved.length === 5) {
    pills.forEach((pill, i) => {
      pill.dataset.status = saved[i];
      pill.querySelector('.pill-status').textContent = saved[i];
    });
  }

  pills.forEach((pill, i) => {
    pill.addEventListener('click', () => {
      const currentStatus = pill.dataset.status;
      const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
      pill.dataset.status = nextStatus;
      pill.querySelector('.pill-status').textContent = nextStatus;
      savePhasePills();
      updateTopbar();
    });
  });
}

function savePhasePills() {
  const pills = document.querySelectorAll('.phase-pill');
  const statuses = Array.from(pills).map(p => p.dataset.status);
  setData('phaseStatus', JSON.stringify(statuses));
}

/* =============================================
   TEAM TABLE
   ============================================= */
function initTeamTable() {
  const saved = getData('teamRows', '');
  if (saved) {
    try {
      const rows = JSON.parse(saved);
      const tbody = document.getElementById('teamTableBody');
      if (tbody && rows.length) {
        tbody.innerHTML = '';
        rows.forEach(row => {
          tbody.appendChild(buildTeamRow(row));
        });
        attachTableSave('teamTableBody', 'teamRows', 4);
      }
    } catch {}
  } else {
    attachTableSave('teamTableBody', 'teamRows', 4);
  }
}

function buildTeamRow(cells) {
  const tr = document.createElement('tr');
  cells.forEach(text => {
    const td = document.createElement('td');
    td.contentEditable = 'true';
    td.className = 'editable';
    td.textContent = text;
    tr.appendChild(td);
  });
  return tr;
}

function addTeamRow() {
  const tbody = document.getElementById('teamTableBody');
  const tr = buildTeamRow(['', '', '', '']);
  tbody.appendChild(tr);
  attachTableSave('teamTableBody', 'teamRows', 4);
  tr.querySelector('td').focus();
}

/* =============================================
   GENERIC TABLE SAVE
   ============================================= */
function attachTableSave(tbodyId, storageKey, colCount) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.querySelectorAll('td[contenteditable]').forEach(td => {
    td.addEventListener('input', () => saveTableData(tbodyId, storageKey, colCount));
    td.addEventListener('blur', () => saveTableData(tbodyId, storageKey, colCount));
  });
}

function saveTableData(tbodyId, storageKey, colCount) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const rows = [];
  tbody.querySelectorAll('tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td[contenteditable]')).map(td => td.textContent);
    if (cells.length > 0) rows.push(cells);
  });
  setData(storageKey, JSON.stringify(rows));
}

/* =============================================
   DATA COLLECTION PLAN
   ============================================= */
function initDCP() {
  const saved = getData('dcpRows', '');
  if (saved) {
    try {
      const rows = JSON.parse(saved);
      const tbody = document.getElementById('dcpTableBody');
      if (tbody && rows.length) {
        tbody.innerHTML = '';
        rows.forEach(r => tbody.appendChild(buildDCPRow(r)));
      }
    } catch {}
  }
  attachTableSaveWithDelete('dcpTableBody', 'dcpRows', 4);
}

function buildDCPRow(cells) {
  const tr = document.createElement('tr');
  cells.slice(0, 4).forEach(text => {
    const td = document.createElement('td');
    td.contentEditable = 'true';
    td.className = 'editable';
    td.textContent = text;
    tr.appendChild(td);
  });
  const tdDel = document.createElement('td');
  tdDel.innerHTML = `<button class="btn-delete" onclick="deleteRow(this)">✕</button>`;
  tr.appendChild(tdDel);
  return tr;
}

function addDCPRow() {
  const tbody = document.getElementById('dcpTableBody');
  const tr = buildDCPRow(['', '', '', '']);
  tbody.appendChild(tr);
  attachTableSaveWithDelete('dcpTableBody', 'dcpRows', 4);
  tr.querySelector('td').focus();
}

function attachTableSaveWithDelete(tbodyId, storageKey, colCount) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.querySelectorAll('td[contenteditable]').forEach(td => {
    td.addEventListener('input', () => saveTableDataWithDelete(tbodyId, storageKey, colCount));
  });
}

function saveTableDataWithDelete(tbodyId, storageKey, colCount) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const rows = [];
  tbody.querySelectorAll('tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td[contenteditable]')).map(td => td.textContent);
    if (cells.length >= colCount) rows.push(cells);
  });
  setData(storageKey, JSON.stringify(rows));
}

function deleteRow(btn) {
  const tr = btn.closest('tr');
  const tbody = tr.parentElement;
  const tbodyId = tbody.id;
  tr.remove();
  // Save after delete
  if (tbodyId === 'dcpTableBody') saveTableDataWithDelete('dcpTableBody', 'dcpRows', 4);
  if (tbodyId === 'stakeholderBody') saveTableDataWithDelete('stakeholderBody', 'stakeholderRows', 8);
}

/* =============================================
   STAKEHOLDER REGISTER
   ============================================= */
function initStakeholder() {
  const saved = getData('stakeholderRows', '');
  if (saved) {
    try {
      const rows = JSON.parse(saved);
      const tbody = document.getElementById('stakeholderBody');
      if (tbody && rows.length) {
        tbody.innerHTML = '';
        rows.forEach(r => tbody.appendChild(buildStakeholderRow(r)));
      }
    } catch {}
  }
  attachTableSaveWithDelete('stakeholderBody', 'stakeholderRows', 8);
}

function buildStakeholderRow(cells) {
  const tr = document.createElement('tr');
  const count = 8;
  for (let i = 0; i < count; i++) {
    const td = document.createElement('td');
    td.contentEditable = 'true';
    td.className = 'editable';
    td.textContent = cells[i] || '';
    tr.appendChild(td);
  }
  const tdDel = document.createElement('td');
  tdDel.innerHTML = `<button class="btn-delete" onclick="deleteRow(this)">✕</button>`;
  tr.appendChild(tdDel);
  return tr;
}

function addStakeholderRow() {
  const tbody = document.getElementById('stakeholderBody');
  const tr = buildStakeholderRow(Array(8).fill(''));
  tbody.appendChild(tr);
  attachTableSaveWithDelete('stakeholderBody', 'stakeholderRows', 8);
  tr.querySelector('td').focus();
}

/* =============================================
   FISHBONE TABLE SAVE
   ============================================= */
function initFishboneTable() {
  document.querySelectorAll('.fishbone-table td[contenteditable]').forEach(td => {
    const key = td.dataset.key;
    if (key) {
      const saved = getData(key);
      if (saved) td.textContent = saved;
      td.addEventListener('input', () => setData(key, td.textContent));
    }
  });
}

/* =============================================
   5 WHYS
   ============================================= */
function init5Whys() {
  syncRootCause();
}

/* =============================================
   ACTION TRACKER
   ============================================= */
let actions = [];
let currentFilter = 'All';

function initActions() {
  actions = JSON.parse(getData('actions', '[]'));
  renderActions();
  updateActionProgress();

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderActions();
    });
  });
}

function openActionForm() {
  const form = document.getElementById('actionForm');
  form.classList.remove('hidden');
  form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeActionForm() {
  document.getElementById('actionForm').classList.add('hidden');
  clearActionForm();
}

function clearActionForm() {
  document.getElementById('newActionItem').value = '';
  document.getElementById('newActionOwner').value = '';
  document.getElementById('newActionDue').value = '';
  document.getElementById('newActionPriority').value = 'Med';
  document.getElementById('newActionNotes').value = '';
}

function saveAction() {
  const item = document.getElementById('newActionItem').value.trim();
  if (!item) { alert('Please enter an action item.'); return; }

  const action = {
    id: Date.now(),
    item,
    owner: document.getElementById('newActionOwner').value.trim(),
    due: document.getElementById('newActionDue').value,
    priority: document.getElementById('newActionPriority').value,
    status: 'Open',
    notes: document.getElementById('newActionNotes').value.trim()
  };

  actions.push(action);
  persistActions();
  renderActions();
  updateActionProgress();
  closeActionForm();
}

function persistActions() {
  setData('actions', JSON.stringify(actions));
  updateTopbar();
}

function cycleActionStatus(id) {
  const statuses = ['Open', 'In Progress', 'Done'];
  const action = actions.find(a => a.id === id);
  if (!action) return;
  const idx = statuses.indexOf(action.status);
  action.status = statuses[(idx + 1) % statuses.length];
  persistActions();
  renderActions();
  updateActionProgress();
}

function deleteAction(id) {
  actions = actions.filter(a => a.id !== id);
  persistActions();
  renderActions();
  updateActionProgress();
}

function renderActions() {
  const tbody = document.getElementById('actionsBody');
  if (!tbody) return;

  const filtered = currentFilter === 'All'
    ? actions
    : actions.filter(a => a.status === currentFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">No actions found.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  filtered.forEach((action, i) => {
    const statusClass = action.status === 'Done' ? 'badge-done'
      : action.status === 'In Progress' ? 'badge-inprogress' : 'badge-open';
    const priorityClass = action.priority === 'High' ? 'badge-high'
      : action.priority === 'Low' ? 'badge-low' : 'badge-med';
    const dueStr = action.due ? new Date(action.due + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--text-muted);font-weight:700;">${i + 1}</td>
      <td style="font-weight:500;">${escHtml(action.item)}</td>
      <td>${escHtml(action.owner) || '—'}</td>
      <td style="white-space:nowrap;">${dueStr}</td>
      <td><span class="badge ${priorityClass}">${escHtml(action.priority)}</span></td>
      <td>
        <button class="status-cycle-btn" onclick="cycleActionStatus(${action.id})" title="Click to cycle status">
          <span class="badge ${statusClass}">${escHtml(action.status)}</span>
        </button>
      </td>
      <td style="color:var(--text-secondary);">${escHtml(action.notes) || '—'}</td>
      <td><button class="btn-delete" onclick="deleteAction(${action.id})">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function updateActionProgress() {
  const total = actions.length;
  const done = actions.filter(a => a.status === 'Done').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const fill = document.getElementById('actionProgressFill');
  const label = document.getElementById('actionProgressLabel');
  const topbarPct = document.getElementById('topbarActionsPct');

  if (fill) fill.style.width = pct + '%';
  if (label) label.textContent = `${pct}% Complete (${done}/${total})`;
  if (topbarPct) topbarPct.textContent = pct + '%';
}

/* =============================================
   TIMELINE
   ============================================= */
let milestones = [];

const PHASE_COLORS = {
  'Define': 'var(--define)',
  'Measure': 'var(--measure)',
  'Analyse': 'var(--analyse)',
  'Improve': 'var(--improve)',
  'Control': 'var(--control)'
};

const DEFAULT_MILESTONES = [
  { id: 1, name: 'Project Charter Signed', phase: 'Define', target: '2025-06-09', actual: '', status: 'Done' },
  { id: 2, name: 'Team Launch Meeting', phase: 'Define', target: '2025-06-13', actual: '', status: 'Done' },
  { id: 3, name: 'SIPOC Complete', phase: 'Define', target: '2025-06-20', actual: '', status: 'In Progress' },
  { id: 4, name: 'Data Collection Plan', phase: 'Measure', target: '2025-07-04', actual: '', status: 'Not Started' },
  { id: 5, name: 'Baseline Metrics', phase: 'Measure', target: '2025-07-11', actual: '', status: 'Not Started' },
  { id: 6, name: 'Root Cause Identified', phase: 'Analyse', target: '2025-07-18', actual: '', status: 'Not Started' },
  { id: 7, name: 'Pilot Solution', phase: 'Improve', target: '2025-08-01', actual: '', status: 'Not Started' },
  { id: 8, name: 'Full Rollout', phase: 'Improve', target: '2025-08-15', actual: '', status: 'Not Started' },
  { id: 9, name: 'Control Plan & Handoff', phase: 'Control', target: '2025-08-22', actual: '', status: 'Not Started' },
  { id: 10, name: 'Project Closure', phase: 'Control', target: '2025-08-29', actual: '', status: 'Not Started' }
];

function initTimeline() {
  const saved = getData('milestones', '');
  milestones = saved ? JSON.parse(saved) : [...DEFAULT_MILESTONES];
  renderTimeline();
  renderMilestonesTable();
}

function renderTimeline() {
  const container = document.getElementById('timelineVisual');
  if (!container) return;

  const phases = ['Define', 'Measure', 'Analyse', 'Improve', 'Control'];
  container.innerHTML = '';

  phases.forEach(phase => {
    const phaseMilestones = milestones.filter(m => m.phase === phase);
    if (!phaseMilestones.length) return;

    const color = PHASE_COLORS[phase] || 'var(--accent)';
    const done = phaseMilestones.filter(m => m.status === 'Done').length;
    const pct = phaseMilestones.length > 0 ? (done / phaseMilestones.length * 100) : 0;

    const track = document.createElement('div');
    track.className = 'tl-track';
    track.innerHTML = `
      <div class="tl-phase-label" style="color:${color}">${phase}</div>
      <div style="position:relative;">
        <div class="tl-line">
          <div class="tl-line-fill" style="background:${color};width:${pct}%"></div>
        </div>
        <div class="tl-milestones">
          ${phaseMilestones.map(m => {
            const dotClass = m.status === 'Done' ? 'done' : m.status === 'In Progress' ? 'in-progress' : '';
            const dateStr = m.target ? new Date(m.target + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            return `
              <div class="tl-milestone">
                <div class="tl-dot ${dotClass}" style="${dotClass ? '' : `border-color:${color}40`}"></div>
                <div class="tl-name" style="color:var(--text-secondary)">${escHtml(m.name)}</div>
                <div class="tl-date">${dateStr}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    container.appendChild(track);
  });
}

function renderMilestonesTable() {
  const tbody = document.getElementById('milestonesBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  milestones.forEach(m => {
    const tr = document.createElement('tr');
    const statusClass = m.status === 'Done' ? 'badge-done'
      : m.status === 'In Progress' ? 'badge-inprogress' : 'badge-open';
    const color = PHASE_COLORS[m.phase] || 'var(--accent)';
    tr.innerHTML = `
      <td contenteditable="true" class="editable" style="font-weight:500;">${escHtml(m.name)}</td>
      <td><span style="color:${color};font-weight:600;">${escHtml(m.phase)}</span></td>
      <td contenteditable="true" class="editable">${m.target}</td>
      <td contenteditable="true" class="editable">${m.actual}</td>
      <td>
        <button class="status-cycle-btn" onclick="cycleMilestoneStatus(${m.id})" title="Click to cycle status">
          <span class="badge ${statusClass}">${escHtml(m.status)}</span>
        </button>
      </td>
      <td><button class="btn-delete" onclick="deleteMilestone(${m.id})">✕</button></td>
    `;
    // Save on cell input
    tr.querySelectorAll('td[contenteditable]').forEach((td, i) => {
      td.addEventListener('blur', () => {
        if (i === 0) m.name = td.textContent;
        if (i === 1) m.target = td.textContent;
        if (i === 2) m.actual = td.textContent;
        persistMilestones();
        renderTimeline();
      });
    });
    tbody.appendChild(tr);
  });
}

function cycleMilestoneStatus(id) {
  const statuses = ['Not Started', 'In Progress', 'Done'];
  const m = milestones.find(x => x.id === id);
  if (!m) return;
  m.status = statuses[(statuses.indexOf(m.status) + 1) % statuses.length];
  persistMilestones();
  renderMilestonesTable();
  renderTimeline();
}

function deleteMilestone(id) {
  milestones = milestones.filter(m => m.id !== id);
  persistMilestones();
  renderMilestonesTable();
  renderTimeline();
}

function addMilestone() {
  const m = {
    id: Date.now(),
    name: 'New Milestone',
    phase: 'Define',
    target: '',
    actual: '',
    status: 'Not Started'
  };
  milestones.push(m);
  persistMilestones();
  renderMilestonesTable();
  renderTimeline();
}

function persistMilestones() {
  setData('milestones', JSON.stringify(milestones));
}

/* =============================================
   MEETING LOG
   ============================================= */
let meetings = [];

function initMeetings() {
  meetings = JSON.parse(getData('meetings', '[]'));
  renderMeetings();
}

function openMeetingForm() {
  const form = document.getElementById('meetingForm');
  form.classList.remove('hidden');
  form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeMeetingForm() {
  document.getElementById('meetingForm').classList.add('hidden');
  clearMeetingForm();
}

function clearMeetingForm() {
  ['mDate', 'mAttendees', 'mAgenda', 'mDecisions', 'mActions', 'mNext'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function saveMeeting() {
  const date = document.getElementById('mDate').value;
  if (!date) { alert('Please select a meeting date.'); return; }

  const meeting = {
    id: Date.now(),
    date,
    attendees: document.getElementById('mAttendees').value.trim(),
    agenda: document.getElementById('mAgenda').value.trim(),
    decisions: document.getElementById('mDecisions').value.trim(),
    actions: document.getElementById('mActions').value.trim(),
    next: document.getElementById('mNext').value
  };

  meetings.push(meeting);
  // Sort newest first
  meetings.sort((a, b) => new Date(b.date) - new Date(a.date));
  setData('meetings', JSON.stringify(meetings));
  renderMeetings();
  closeMeetingForm();
}

function deleteMeeting(id) {
  meetings = meetings.filter(m => m.id !== id);
  setData('meetings', JSON.stringify(meetings));
  renderMeetings();
}

function toggleMeeting(id) {
  const body = document.getElementById('meeting-body-' + id);
  const header = document.getElementById('meeting-header-' + id);
  const chevron = document.getElementById('meeting-chevron-' + id);
  if (!body) return;
  const isOpen = body.classList.toggle('open');
  header.classList.toggle('open', isOpen);
  chevron.classList.toggle('open', isOpen);
}

function renderMeetings() {
  const container = document.getElementById('meetingsList');
  if (!container) return;

  if (meetings.length === 0) {
    container.innerHTML = `<div class="card" style="text-align:center;color:var(--text-muted);padding:32px;">No meetings logged yet. Click "+ Add Meeting" to get started.</div>`;
    return;
  }

  container.innerHTML = meetings.map(m => {
    const dateStr = m.date ? new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '—';
    const nextStr = m.next ? new Date(m.next + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    return `
      <div class="meeting-card">
        <div class="meeting-card-header" id="meeting-header-${m.id}" onclick="toggleMeeting(${m.id})">
          <span class="meeting-date">${dateStr}</span>
          <span class="meeting-attendees">👥 ${escHtml(m.attendees) || 'No attendees listed'}</span>
          <button class="meeting-delete" onclick="event.stopPropagation();deleteMeeting(${m.id})">Delete</button>
          <span class="meeting-chevron" id="meeting-chevron-${m.id}">▼</span>
        </div>
        <div class="meeting-card-body" id="meeting-body-${m.id}">
          <div class="meeting-field">
            <label>Agenda</label>
            <p>${escHtml(m.agenda) || '—'}</p>
          </div>
          <div class="meeting-field">
            <label>Key Decisions</label>
            <p>${escHtml(m.decisions) || '—'}</p>
          </div>
          <div class="meeting-field">
            <label>Action Items</label>
            <p>${escHtml(m.actions) || '—'}</p>
          </div>
          <div class="meeting-field">
            <label>Next Meeting</label>
            <p>${nextStr}</p>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* =============================================
   SIPOC INIT
   ============================================= */
function initSIPOC() {
  const saved = getData('sipocRows', '');
  if (saved) {
    try {
      const rows = JSON.parse(saved);
      const tbody = document.getElementById('sipocBody');
      if (tbody && rows.length) {
        tbody.innerHTML = '';
        rows.forEach(r => {
          const tr = document.createElement('tr');
          r.slice(0, 5).forEach(text => {
            const td = document.createElement('td');
            td.contentEditable = 'true';
            td.className = 'editable';
            td.textContent = text;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
      }
    } catch {}
  }
  // Attach save
  const tbody = document.getElementById('sipocBody');
  if (tbody) {
    tbody.querySelectorAll('td[contenteditable]').forEach(td => {
      td.addEventListener('input', () => saveSIPOC());
    });
  }
}

function saveSIPOC() {
  const tbody = document.getElementById('sipocBody');
  if (!tbody) return;
  const rows = [];
  tbody.querySelectorAll('tr').forEach(tr => {
    rows.push(Array.from(tr.querySelectorAll('td')).map(td => td.textContent));
  });
  setData('sipocRows', JSON.stringify(rows));
}

/* =============================================
   UTILITY
   ============================================= */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* =============================================
   GENERIC ROW ADDER
   ============================================= */
function addGenericRow(tbodyId, colCount) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const tr = document.createElement('tr');
  for (let i = 0; i < colCount; i++) {
    const td = document.createElement('td');
    td.contentEditable = 'true';
    td.className = 'editable';
    td.textContent = '';
    tr.appendChild(td);
  }
  tbody.appendChild(tr);
  tr.querySelector('td')?.focus();
}

/* =============================================
   CLICKABLE TOOL CARDS (DMAIC flowchart)
   ============================================= */
function initDMAICTools() {
  document.querySelectorAll('.clickable-tool[data-section]').forEach(tool => {
    tool.addEventListener('click', () => {
      const section = tool.dataset.section;
      if (section) switchSection(section);
    });
  });
}

/* =============================================
   MAIN INIT
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initMobileSidebar();
  initEditableFields();
  initPhasePills();
  initTeamTable();
  initDCP();
  initStakeholder();
  initFishboneTable();
  init5Whys();
  initActions();
  initTimeline();
  initMeetings();
  initSIPOC();
  initDMAICTools();
  updateTopbar();

  // Global status select sync
  const gs = document.getElementById('globalStatus');
  if (gs) {
    const savedGs = getData('globalStatus');
    if (savedGs) gs.value = savedGs;
    gs.addEventListener('change', () => {
      setData('globalStatus', gs.value);
    });
  }

  // DMAIC tools clickable
  document.querySelector('[data-section="dmaic"]')?.addEventListener('click', () => {
    // No special init needed for new flowchart
  });

  // Sync Why 5 root cause on load
  const why5El = document.getElementById('why5Input');
  if (why5El) {
    const saved = getData('why5');
    if (saved) {
      why5El.textContent = saved;
      syncRootCause();
    }
  }

  console.log('✅ Procore DMAIC Dashboard loaded');
});
