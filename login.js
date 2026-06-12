/* =========================================
   Login Screen — Logic
   Pastel + Animated Edition
   ========================================= */

(function() {
  'use strict';

  const LOGIN_KEY = 'jeonwoo_login_state';

  // Members list (same as app.js DEFAULT_MEMBERS)
  const LOGIN_MEMBERS = [
    { id: 'm1',  name: '상현' },
    { id: 'm2',  name: '창민' },
    { id: 'm3',  name: '진오' },
    { id: 'm4',  name: '병선' },
    { id: 'm5',  name: '영제' },
    { id: 'm6',  name: '대덕' },
    { id: 'm7',  name: '영민' },
    { id: 'm8',  name: '지훈' },
    { id: 'm9',  name: '영훈' },
    { id: 'm10', name: '재영' },
    { id: 'm11', name: '진철' },
    { id: 'm12', name: '종훈' },
  ];

  // --- Pastel Particles ---
  function createParticles() {
    // Disabled particle animations as requested to reduce clutter.
  }

  // --- Populate select ---
  function populateSelect() {
    const select = document.getElementById('login-name-select');
    if (!select) return;

    // Also check localStorage for any extra members added via app
    let members = [...LOGIN_MEMBERS];
    try {
      const saved = localStorage.getItem('jeonwoo_moim_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.members && Array.isArray(parsed.members)) {
          members = parsed.members;
        }
      }
    } catch(e) {}

    members.forEach(m => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.name;
      select.appendChild(option);
    });
  }

  // --- Ripple effect on button ---
  function createRipple(event, button) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }

  // --- Check if already logged in ---
  function checkLoginState() {
    try {
      const loginState = localStorage.getItem(LOGIN_KEY);
      if (loginState) {
        const parsed = JSON.parse(loginState);
        if (parsed.loggedIn && parsed.userId) {
          hideLoginInstant();
          setAppUser(parsed.userId);
          return true;
        }
      }
    } catch(e) {}
    document.body.classList.add('login-active');
    return false;
  }

  function hideLoginInstant() {
    const screen = document.getElementById('login-screen');
    if (screen) {
      screen.classList.add('hidden');
      screen.style.display = 'none';
    }
    document.body.classList.remove('login-active');
  }

  function hideLoginAnimated(callback) {
    const screen = document.getElementById('login-screen');
    if (screen) {
      screen.classList.add('exiting');
      setTimeout(() => {
        screen.style.display = 'none';
        document.body.classList.remove('login-active');
        if (callback) callback();
      }, 1000);
    }
  }

  function setAppUser(userId) {
    try {
      const saved = localStorage.getItem('jeonwoo_moim_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.currentUser = userId;
        localStorage.setItem('jeonwoo_moim_data', JSON.stringify(parsed));
      } else {
        localStorage.setItem('jeonwoo_moim_data', JSON.stringify({
          currentUser: userId,
          members: LOGIN_MEMBERS.map((m, i) => ({
            ...m,
            color: [
              'hsl(195, 80%, 45%)', 'hsl(175, 75%, 40%)', 'hsl(160, 70%, 42%)',
              'hsl(140, 60%, 45%)', 'hsl(85, 65%, 48%)', 'hsl(50, 80%, 50%)',
              'hsl(35, 85%, 52%)', 'hsl(20, 85%, 55%)', 'hsl(5, 80%, 58%)',
              'hsl(330, 75%, 55%)', 'hsl(280, 65%, 58%)', 'hsl(240, 60%, 60%)'
            ][i]
          })),
          currentMonth: 6,
          availability: {}
        }));
      }
    } catch(e) {}
  }

  // --- Init ---
  function initLogin() {
    if (checkLoginState()) return;

    createParticles();
    populateSelect();

    const select = document.getElementById('login-name-select');
    const btn = document.getElementById('login-btn');

    // Enable button when name is selected
    select.addEventListener('change', () => {
      btn.disabled = !select.value;
      if (select.value) {
        btn.style.animation = 'none';
        requestAnimationFrame(() => {
          btn.style.animation = '';
          btn.classList.add('ready');
        });
      }
    });

    // Login click with ripple
    btn.addEventListener('click', (e) => {
      const userId = select.value;
      if (!userId) return;

      createRipple(e, btn);

      localStorage.setItem(LOGIN_KEY, JSON.stringify({
        loggedIn: true,
        userId: userId
      }));

      setAppUser(userId);

      // Short delay to show ripple, then animate out
      setTimeout(() => {
        hideLoginAnimated(() => {
          location.reload();
        });
      }, 200);
    });

    // Enter key on select
    select.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && select.value) {
        btn.click();
      }
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogin);
  } else {
    initLogin();
  }
})();
