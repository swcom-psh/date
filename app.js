/* =========================================
   테토남 모임 — Application Logic
   ========================================= */

// ---- Data Store ----
const STORE_KEY = 'jeonwoo_moim_data';

const DEFAULT_MEMBERS = [
  { id: 'm1',  name: '상현', color: 'hsl(195, 80%, 45%)'  }, /* Ocean Blue */
  { id: 'm2',  name: '창민', color: 'hsl(175, 75%, 40%)'  }, /* Deep Aqua */
  { id: 'm3',  name: '진오', color: 'hsl(160, 70%, 42%)'  }, /* Seafoam Green */
  { id: 'm4',  name: '병선', color: 'hsl(140, 60%, 45%)'  }, /* Bright Green */
  { id: 'm5',  name: '영제', color: 'hsl(85, 65%, 48%)'   }, /* Lime Green */
  { id: 'm6',  name: '대덕', color: 'hsl(50, 80%, 50%)'   }, /* Sunny Yellow */
  { id: 'm7',  name: '영민', color: 'hsl(35, 85%, 52%)'   }, /* Sandy Gold */
  { id: 'm8',  name: '지훈', color: 'hsl(20, 85%, 55%)'   }, /* Sunset Orange */
  { id: 'm9',  name: '영훈', color: 'hsl(5, 80%, 58%)'    }, /* Coral Red */
  { id: 'm10', name: '재영', color: 'hsl(330, 75%, 55%)'  }, /* Hot Pink */
  { id: 'm11', name: '진철', color: 'hsl(280, 65%, 58%)'  }, /* Lavender */
  { id: 'm12', name: '종훈', color: 'hsl(240, 60%, 60%)'  }, /* Royal Blue */
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
      
      // 기존에 로컬 스토리지에 저장되어 있던 멤버들의 색상도 새로운 12색 테마로 일괄 갱신합니다.
      state.members.forEach((m, idx) => {
        const defaultMember = DEFAULT_MEMBERS.find(dm => dm.name === m.name);
        if (defaultMember) {
          m.color = defaultMember.color;
        } else {
          m.color = `hsl(${(idx * 30) % 360}, 70%, 50%)`;
        }
      });
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

  // Calculate maximum availability count for this month to highlight the best date
  let maxAvailCount = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(year, month, day);
    const dateAvail = state.availability[dateStr] || {};
    const availCount = Object.values(dateAvail).filter(s => s === 'available').length;
    if (availCount > maxAvailCount) {
      maxAvailCount = availCount;
    }
  }

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
    const availCount = Object.values(dateAvail).filter(s => s === 'available').length;

    // Apply heatmap classes based on attendee count
    if (availCount > 0) {
      if (availCount >= 6) {
        classes += ' heat-3';
      } else if (availCount >= 3) {
        classes += ' heat-2';
      } else {
        classes += ' heat-1';
      }
    }

    // Highlight the best date(s) (highest attendance, must be at least 1 person)
    if (maxAvailCount > 0 && availCount === maxAvailCount) {
      classes += ' best-date';
    }

    // Current user status — simple toggle
    if (state.currentUser && dateAvail[state.currentUser] === 'available') {
      classes += ' status-available';
    }

    // Stagger animation delay
    const delay = (firstDay + day - 1) * 0.02;

    html += `<div class="${classes}" data-date="${dateStr}" style="animation-delay: ${delay}s"
      onclick="handleDayClick('${dateStr}')">
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
  const entries = Object.entries(dateAvail).filter(([, status]) => status === 'available');
  if (entries.length === 0) return '<div class="availability-indicator-wrapper"></div>';

  // Extract colors for members who are available on this date
  const colors = [];
  entries.forEach(([memberId]) => {
    const member = state.members.find(m => m.id === memberId);
    if (member) {
      colors.push(member.color);
    }
  });

  if (colors.length === 0) return '<div class="availability-indicator-wrapper"></div>';

  let backgroundStyle = '';
  let shadowStyle = '';

  if (colors.length === 1) {
    // Single attendee: flat color bar
    backgroundStyle = colors[0];
    shadowStyle = `0 0 6px ${colors[0]}`;
  } else {
    // Multiple attendees: linear gradient blending their theme colors
    backgroundStyle = `linear-gradient(90deg, ${colors.join(', ')})`;
    shadowStyle = `0 0 6px ${colors[0]}`;
  }

  return `<div class="availability-indicator-wrapper">
    <span class="avail-bar gradient-bar" style="background: ${backgroundStyle}; box-shadow: ${shadowStyle};"></span>
  </div>`;
}

function renderTooltip(dateStr, dateAvail) {
  const entries = Object.entries(dateAvail).filter(([, s]) => s === 'available');
  if (entries.length === 0) return '';

  const names = entries.map(([memberId]) => {
    const member = state.members.find(m => m.id === memberId);
    return member ? member.name : memberId;
  }).join(', ');

  return `<div class="day-tooltip">참석: ${names}</div>`;
}

// ---- Day Click Handler (Toggle: available / none) ----
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

  // Simple toggle: none -> available -> none
  if (current === 'available') {
    delete state.availability[dateStr][state.currentUser];
    if (Object.keys(state.availability[dateStr]).length === 0) {
      delete state.availability[dateStr];
    }
    showToast(`${dateStr.slice(5)} → 미참`);
    sendDataToGoogleSheet(state.currentUser, dateStr, null);
  } else {
    state.availability[dateStr][state.currentUser] = 'available';
    showToast(`${dateStr.slice(5)} → 참석 가능`);
    sendDataToGoogleSheet(state.currentUser, dateStr, 'available');
  }

  saveState();
  renderCalendar();
  renderSummary();
  renderMembersList();
}

// ---- Google Sheets Integration ----
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyDlevWg28EbfqggnFG6teQv_Qx8WyOjfMOKp4pnIxNvemuAGJWCbhyoQ-JAMPQivwE9g/exec';

function sendDataToGoogleSheet(memberId, dateStr, status) {
  if (APPS_SCRIPT_URL === 'YOUR_WEB_APP_URL_HERE') {
    console.log('Google Apps Script URL이 설정되지 않았습니다.');
    return;
  }

  const member = state.members.find(m => m.id === memberId);
  if (!member) return;

  const payload = {
    name: member.name,
    date: dateStr,
    status: status || ""
  };

  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors', // CORS 정책 우회를 위해 no-cors 사용 (웹앱 실행결과를 UI에서 꼭 읽을 필요는 없으므로)
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(() => {
    console.log(`구글 시트 전송 완료: ${member.name}, ${dateStr}, ${status}`);
  })
  .catch(error => {
    console.error('구글 시트 전송 에러:', error);
  });
}

function fetchDataFromGoogleSheet() {
  if (APPS_SCRIPT_URL === 'YOUR_WEB_APP_URL_HERE' || !APPS_SCRIPT_URL) {
    console.log('Google Apps Script URL이 설정되지 않았습니다.');
    return;
  }

  fetch(APPS_SCRIPT_URL)
    .then(response => response.json())
    .then(data => {
      if (data && data.availability) {
        // 구글 시트의 이름 기반 데이터를 프론트엔드의 memberId 기반 데이터로 매핑
        const mappedAvailability = {};
        
        Object.entries(data.availability).forEach(([dateStr, nameMap]) => {
          mappedAvailability[dateStr] = {};
          Object.entries(nameMap).forEach(([name, status]) => {
            const member = state.members.find(m => m.name === name);
            if (member) {
              mappedAvailability[dateStr][member.id] = status;
            }
          });
        });

        // 덮어씌우는 대신, 로컬 데이터와 구글 시트 데이터를 안전하게 병합합니다.
        // 현재 로그인한 사용자(state.currentUser)의 로컬 변경 사항이 구글 시트 응답의 이전 값에 의해 덮어씌워지지 않도록 보호합니다.
        const mergedAvailability = { ...state.availability };
        
        Object.entries(mappedAvailability).forEach(([dateStr, nameMap]) => {
          if (!mergedAvailability[dateStr]) {
            mergedAvailability[dateStr] = {};
          }
          
          Object.entries(nameMap).forEach(([memberId, status]) => {
            // 로그인한 사용자 본인의 데이터는 로컬의 최신 상태를 우선 보존합니다.
            if (state.currentUser && memberId === state.currentUser) {
              if (mergedAvailability[dateStr][memberId] === undefined) {
                mergedAvailability[dateStr][memberId] = status;
              }
            } else {
              // 다른 사용자 데이터는 구글 시트 최신본으로 업데이트합니다.
              mergedAvailability[dateStr][memberId] = status;
            }
          });
        });

        state.availability = mergedAvailability;
        saveState();
        renderCalendar();
        renderSummary();
        renderMembersList();
        console.log('구글 시트 일정 동기화 완료');
      }
    })
    .catch(error => {
      console.error('구글 시트 데이터 로드 에러:', error);
    });
}

// ---- Logout ----
function handleLogout() {
  localStorage.removeItem('jeonwoo_login_state');
  state.currentUser = null;
  saveState();
  location.reload();
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

    // Collect available member names
    const availMembers = [];
    Object.entries(dateAvail).forEach(([memberId, status]) => {
      if (status === 'available') {
        const member = state.members.find(m => m.id === memberId);
        availMembers.push(member ? member.name : memberId);
      }
    });

    if (availMembers.length > 0) {
      datesWithAvail.push({ dateStr, day, availMembers });
    }
  }

  if (datesWithAvail.length === 0) {
    container.innerHTML = '<p class="summary-placeholder">날짜를 클릭하여 참석 여부를 표시하세요</p>';
    return;
  }

  // Sort by availability count (desc)
  datesWithAvail.sort((a, b) => b.availMembers.length - a.availMembers.length);

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  container.innerHTML = datesWithAvail.slice(0, 8).map(d => {
    const dayOfWeek = new Date(year, month, d.day).getDay();
    const names = d.availMembers;
    let displayText;

    if (names.length === 1) {
      displayText = `${names[0]} 가능`;
    } else if (names.length === 2) {
      displayText = `${names[0]}, ${names[1]} 가능`;
    } else {
      displayText = `${names[0]} 외 ${names.length - 1}명 가능`;
    }

    // Full names list for popup (only show when 3+ people)
    const allNames = names.join(', ');

    return `
      <div class="summary-item">
        <span class="summary-date">${monthNames[month]} ${d.day}일 (${dayNames[dayOfWeek]})</span>
        <span class="summary-count summary-names-trigger" data-names="${allNames}">
          ${displayText}
          ${names.length >= 3 ? `<span class="summary-popup">${allNames}</span>` : ''}
        </span>
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

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Init tabs
  initMonthTabs();

  // Initial render
  renderCalendar();
  renderSummary();
  renderMembersList();

  // 구글 시트에서 최신 참석 현황 데이터 불러오기
  fetchDataFromGoogleSheet();
}

document.addEventListener('DOMContentLoaded', init);
