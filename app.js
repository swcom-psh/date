/* =========================================
   전우 모임 — Application Logic
   ========================================= */

// ---- Data Store ----
const STORE_KEY = 'jeonwoo_moim_data';

const DEFAULT_MEMBERS = [
  { id: 'm1',  name: '상현', color: 'hsl(85, 35%, 55%)'  },
  { id: 'm2',  name: '창민', color: 'hsl(210, 40%, 55%)' },
  { id: 'm3',  name: '진오', color: 'hsl(42, 50%, 55%)'  },
  { id: 'm4',  name: '병선', color: 'hsl(0, 40%, 55%)'   },
  { id: 'm5',  name: '영제', color: 'hsl(170, 40%, 50%)' },
  { id: 'm6',  name: '대덕', color: 'hsl(280, 35%, 55%)' },
  { id: 'm7',  name: '영민', color: 'hsl(30, 50%, 55%)'  },
  { id: 'm8',  name: '지훈', color: 'hsl(330, 40%, 55%)' },
  { id: 'm9',  name: '영훈', color: 'hsl(55, 45%, 50%)'  },
  { id: 'm10', name: '재영', color: 'hsl(195, 45%, 50%)' },
  { id: 'm11', name: '진철', color: 'hsl(140, 35%, 50%)' },
  { id: 'm12', name: '종훈', color: 'hsl(15, 50%, 55%)'  },
];

const AVATAR_COLORS = [
  'hsl(85, 35%, 55%)',
  'hsl(210, 40%, 55%)',
  'hsl(42, 50%, 55%)',
  'hsl(0, 40%, 55%)',
  'hsl(170, 40%, 50%)',
  'hsl(280, 35%, 55%)',
  'hsl(30, 50%, 55%)',
  'hsl(330, 40%, 55%)',
];

// State
let state = {
  members: [],
  currentUser: null,
  currentMonth: 6, // 0-indexed: 6 = July
  availability: {}, // { 'YYYY-MM-DD': { memberId: 'available'|'maybe'|'unavailable' } }
};

// ---- Persistence ----
function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save state', e);
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
    } else {
      state.members = [...DEFAULT_MEMBERS];
    }
  } catch (e) {
    state.members = [...DEFAULT_MEMBERS];
  }
}

// ---- Calendar Helpers ----
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isToday(year, month, day) {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
}

// ---- Render Calendar ----
function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const year = 2026;
  const month = state.currentMonth;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  // Previous month days
  const prevMonth = month - 1;
  const daysInPrevMonth = getDaysInMonth(year, prevMonth);

  let html = '';

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    html += `<div class="day-cell other-month">
      <span class="day-number">${day}</span>
    </div>`;
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(year, month, day);
    const dayOfWeek = new Date(year, month, day).getDay();
    const today = isToday(year, month, day);

    let classes = 'day-cell';
    if (dayOfWeek === 0) classes += ' sunday';
    if (dayOfWeek === 6) classes += ' saturday';
    if (today) classes += ' today';

    // Check availability
    const dateAvail = state.availability[dateStr] || {};
    const statuses = Object.values(dateAvail);
    const availCount = statuses.filter(s => s === 'available').length;
    const maybeCount = statuses.filter(s => s === 'maybe').length;
    const totalMembers = state.members.length;

    // Current user status
    if (state.currentUser && dateAvail[state.currentUser]) {
      classes += ` status-${dateAvail[state.currentUser]}`;
    }

    // Best date (all or most available)
    if (totalMembers > 0 && availCount >= Math.ceil(totalMembers * 0.7) && availCount >= 2) {
      classes += ' best-date';
    }

    // Stagger animation delay
    const delay = (firstDay + day - 1) * 0.02;

    html += `<div class="${classes}" data-date="${dateStr}" style="animation-delay: ${delay}s"
      onclick="handleDayClick('${dateStr}')" oncontextmenu="handleDayContext(event, '${dateStr}')">
      <span class="day-number">${day}</span>
      ${renderAvailabilityDots(dateAvail)}
      ${availCount > 0 ? `<span class="count-badge">${availCount}명</span>` : ''}
      ${renderTooltip(dateStr, dateAvail)}
    </div>`;
  }

  // Next month leading days
  const totalCells = firstDay + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="day-cell other-month">
      <span class="day-number">${i}</span>
    </div>`;
  }

  grid.innerHTML = html;
}

function renderAvailabilityDots(dateAvail) {
  const entries = Object.entries(dateAvail);
  if (entries.length === 0) return '<div class="availability-dots"></div>';

  let dots = '';
  entries.forEach(([memberId, status]) => {
    dots += `<span class="avail-dot ${status}"></span>`;
  });

  return `<div class="availability-dots">${dots}</div>`;
}

function renderTooltip(dateStr, dateAvail) {
  const entries = Object.entries(dateAvail);
  if (entries.length === 0) return '';

  const lines = entries.map(([memberId, status]) => {
    const member = state.members.find(m => m.id === memberId);
    const name = member ? member.name : memberId;
    const statusLabel = { available: '✓ 참석', maybe: '△ 미정', unavailable: '✕ 불가' }[status];
    return `${name}: ${statusLabel}`;
  }).join(' · ');

  return `<div class="day-tooltip">${lines}</div>`;
}

// ---- Day Click Handler ----
function handleDayClick(dateStr) {
  if (!state.currentUser) {
    showToast('먼저 참석자를 선택하세요!');
    openModal();
    return;
  }

  if (!state.availability[dateStr]) {
    state.availability[dateStr] = {};
  }

  const current = state.availability[dateStr][state.currentUser];

  // Cycle: none -> available -> maybe -> unavailable -> none
  const cycle = [undefined, 'available', 'maybe', 'unavailable'];
  const idx = cycle.indexOf(current);
  const next = cycle[(idx + 1) % cycle.length];

  if (next === undefined) {
    delete state.availability[dateStr][state.currentUser];
    if (Object.keys(state.availability[dateStr]).length === 0) {
      delete state.availability[dateStr];
    }
  } else {
    state.availability[dateStr][state.currentUser] = next;
  }

  saveState();
  renderCalendar();
  renderSummary();
  renderMembersList();

  const labels = { available: '참석 가능', maybe: '미정', unavailable: '불가' };
  if (next) {
    showToast(`${dateStr.slice(5)} → ${labels[next]}`);
  } else {
    showToast(`${dateStr.slice(5)} → 선택 해제`);
  }
}

// ---- Context Menu ----
let contextMenu = null;

function createContextMenu() {
  if (contextMenu) return;
  contextMenu = document.createElement('div');
  contextMenu.className = 'context-menu';
  contextMenu.innerHTML = `
    <button class="context-option" data-status="available">
      <span class="opt-dot green"></span>참석 가능
    </button>
    <button class="context-option" data-status="maybe">
      <span class="opt-dot yellow"></span>미정
    </button>
    <button class="context-option" data-status="unavailable">
      <span class="opt-dot red"></span>불가
    </button>
    <button class="context-option" data-status="clear">
      <span class="opt-dot clear"></span>선택 해제
    </button>
  `;
  document.body.appendChild(contextMenu);

  contextMenu.querySelectorAll('.context-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.status;
      applyContextStatus(status);
    });
  });

  document.addEventListener('click', () => closeContextMenu());
}

let contextDate = null;

function handleDayContext(e, dateStr) {
  e.preventDefault();
  if (!state.currentUser) {
    showToast('먼저 참석자를 선택하세요!');
    openModal();
    return;
  }

  createContextMenu();
  contextDate = dateStr;

  contextMenu.style.left = e.clientX + 'px';
  contextMenu.style.top = e.clientY + 'px';
  contextMenu.classList.add('active');
}

function closeContextMenu() {
  if (contextMenu) {
    contextMenu.classList.remove('active');
  }
}

function applyContextStatus(status) {
  if (!contextDate || !state.currentUser) return;

  if (!state.availability[contextDate]) {
    state.availability[contextDate] = {};
  }

  if (status === 'clear') {
    delete state.availability[contextDate][state.currentUser];
    if (Object.keys(state.availability[contextDate]).length === 0) {
      delete state.availability[contextDate];
    }
  } else {
    state.availability[contextDate][state.currentUser] = status;
  }

  saveState();
  renderCalendar();
  renderSummary();
  renderMembersList();
  closeContextMenu();

  const labels = { available: '참석 가능', maybe: '미정', unavailable: '불가', clear: '선택 해제' };
  showToast(`${contextDate.slice(5)} → ${labels[status]}`);
}

// ---- Month Tabs ----
function initMonthTabs() {
  const tabs = document.querySelectorAll('.month-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentMonth = parseInt(tab.dataset.month);
      renderCalendar();
      renderSummary();
    });
  });
}

// ---- User Selection Modal ----
function openModal() {
  document.getElementById('user-modal-overlay').classList.add('active');
  renderMemberGrid();
}

function closeModal() {
  document.getElementById('user-modal-overlay').classList.remove('active');
}

function renderMemberGrid() {
  const grid = document.getElementById('member-grid');
  grid.innerHTML = state.members.map(m => `
    <div class="member-card ${state.currentUser === m.id ? 'selected' : ''}"
         onclick="selectUser('${m.id}')">
      <div class="member-avatar" style="background: ${m.color}">${m.name.charAt(0)}</div>
      <span class="member-name">${m.name}</span>
    </div>
  `).join('');
}

function selectUser(memberId) {
  state.currentUser = memberId;
  const member = state.members.find(m => m.id === memberId);
  if (member) {
    document.getElementById('current-user-name').textContent = member.name;
  }
  saveState();
  closeModal();
  renderCalendar();
  renderSummary();
  renderMembersList();
  showToast(`${member.name} 선택됨`);
}

function addMember() {
  const input = document.getElementById('new-member-input');
  const name = input.value.trim();
  if (!name) return;
  if (state.members.some(m => m.name === name)) {
    showToast('이미 있는 이름입니다');
    return;
  }

  const id = 'm' + Date.now();
  const color = AVATAR_COLORS[state.members.length % AVATAR_COLORS.length];
  state.members.push({ id, name, color });
  input.value = '';
  saveState();
  renderMemberGrid();
  renderMembersList();
  showToast(`${name} 추가됨!`);
}

// ---- Members List (Bottom Card) ----
function renderMembersList() {
  const list = document.getElementById('members-list');
  list.innerHTML = state.members.map(m => {
    // Count available dates for this member
    let availCount = 0;
    Object.values(state.availability).forEach(dateAvail => {
      if (dateAvail[m.id] === 'available') availCount++;
    });

    return `
      <div class="member-list-item">
        <div class="member-list-avatar" style="background: ${m.color}">${m.name.charAt(0)}</div>
        <span class="member-list-name">${m.name}</span>
        <span class="member-list-count">${availCount}일 참석 가능</span>
      </div>
    `;
  }).join('');
}

// ---- Summary ----
function renderSummary() {
  const container = document.getElementById('summary-content');
  const year = 2026;
  const month = state.currentMonth;

  // Gather dates for current month with availability
  const datesWithAvail = [];
  const daysInMonth = getDaysInMonth(year, month);

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(year, month, day);
    const dateAvail = state.availability[dateStr];
    if (!dateAvail) continue;

    const availCount = Object.values(dateAvail).filter(s => s === 'available').length;
    const maybeCount = Object.values(dateAvail).filter(s => s === 'maybe').length;

    if (availCount > 0 || maybeCount > 0) {
      datesWithAvail.push({ dateStr, day, availCount, maybeCount });
    }
  }

  if (datesWithAvail.length === 0) {
    container.innerHTML = '<p class="summary-placeholder">날짜를 클릭하여 참석 여부를 표시하세요</p>';
    return;
  }

  // Sort by availability count (desc)
  datesWithAvail.sort((a, b) => b.availCount - a.availCount || b.maybeCount - a.maybeCount);

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  container.innerHTML = datesWithAvail.slice(0, 8).map(d => {
    const dayOfWeek = new Date(year, month, d.day).getDay();
    return `
      <div class="summary-item">
        <span class="summary-date">${monthNames[month]} ${d.day}일 (${dayNames[dayOfWeek]})</span>
        <span class="summary-count">${d.availCount}명 가능${d.maybeCount > 0 ? ` · ${d.maybeCount}명 미정` : ''}</span>
      </div>
    `;
  }).join('');
}

// ---- Toast ----
function showToast(message) {
  const toast = document.getElementById('toast');
  const msg = document.getElementById('toast-message');
  msg.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// ---- Init ----
function init() {
  loadState();

  // Restore current user display
  if (state.currentUser) {
    const member = state.members.find(m => m.id === state.currentUser);
    if (member) {
      document.getElementById('current-user-name').textContent = member.name;
    }
  }

  // Modal events
  document.getElementById('user-badge').addEventListener('click', openModal);
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('user-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Add member
  document.getElementById('add-member-btn').addEventListener('click', addMember);
  document.getElementById('new-member-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addMember();
  });

  // Init tabs
  initMonthTabs();

  // Initial render
  renderCalendar();
  renderSummary();
  renderMembersList();
}

document.addEventListener('DOMContentLoaded', init);
