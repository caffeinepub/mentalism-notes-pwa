/* ============================================================
   Mentalism Notes PWA — app.js
   ============================================================ */

// ── Storage ──────────────────────────────────────────────────
const STORAGE_KEY = 'mentalism_data';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {
    note: '',
    activeCategory: 'Animals',
    categories: {
      Animals: ['Horse', 'Eagle', 'Tiger', 'Dolphin', 'Wolf', 'Bear', 'Fox', 'Hawk'],
      Colors:  ['Red', 'Blue', 'Green', 'Gold', 'Silver', 'Black', 'White', 'Purple'],
      Countries: ['France', 'Japan', 'Brazil', 'Egypt', 'Canada', 'India', 'Italy', 'Mexico'],
    }
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── State ─────────────────────────────────────────────────────
const state = loadData();

// ── DOM refs ──────────────────────────────────────────────────
const noteArea      = document.getElementById('note-area');
const wordOverlay   = document.getElementById('word-overlay');
const wordListEl    = document.getElementById('word-list');
const settingsOverlay = document.getElementById('settings-overlay');
const menuBtn       = document.getElementById('menu-btn');
const settingsBack  = document.getElementById('settings-back');
const settingsClose = document.getElementById('settings-close');
const settingsTitle = document.getElementById('settings-title');
const settingsBody  = document.getElementById('settings-body');

// ── Note persistence ─────────────────────────────────────────
noteArea.value = state.note;
noteArea.addEventListener('input', () => {
  state.note = noteArea.value;
  saveData();
});

// ── Selection mode state ──────────────────────────────────────
let selectionActive = false;
let selectedIndex   = 0;
let autoTimer       = null;
let lastPointerTime = 0;

// ── Double-tap detection (screen) ────────────────────────────
let lastTapTime = 0;

document.addEventListener('pointerdown', onScreenPointer, { passive: true });

function onScreenPointer(e) {
  // Ignore taps inside settings panel
  if (settingsOverlay.contains(e.target)) return;

  const now = Date.now();

  if (!selectionActive) {
    // Double-tap detection
    if (now - lastTapTime < 320) {
      lastTapTime = 0;
      activateSelection();
    } else {
      lastTapTime = now;
    }
    return;
  }

  // In selection mode — debounce 250ms
  if (now - lastPointerTime < 250) return;
  lastPointerTime = now;

  advanceSelection();
}

function activateSelection() {
  const words = getActiveWords();
  if (!words.length) return;

  selectionActive = true;
  selectedIndex   = 0;
  renderWordList(words);
  wordOverlay.classList.remove('hidden');
  resetAutoTimer();
}

function advanceSelection() {
  const words = getActiveWords();
  selectedIndex = (selectedIndex + 1) % words.length;
  renderWordList(words);
  resetAutoTimer();
}

function resetAutoTimer() {
  clearTimeout(autoTimer);
  autoTimer = setTimeout(commitSelection, 3000);
}

function commitSelection() {
  const words = getActiveWords();
  const chosen = words[selectedIndex] || '';

  // Replace first quoted region in note
  const current = noteArea.value;
  const replaced = current.replace(/"([^"]*)"/,  '"' + chosen + '"');
  noteArea.value = replaced;
  state.note = replaced;
  saveData();

  // Exit selection mode
  selectionActive = false;
  wordOverlay.classList.add('hidden');
  wordListEl.innerHTML = '';
  clearTimeout(autoTimer);
}

function renderWordList(words) {
  wordListEl.innerHTML = '';
  words.forEach((w, i) => {
    const span = document.createElement('span');
    span.className = 'word-item' + (i === selectedIndex ? ' active' : '');
    span.textContent = w;
    wordListEl.appendChild(span);
  });
}

function getActiveWords() {
  return (state.categories[state.activeCategory] || []).slice();
}

// ── Long-press on menu btn ────────────────────────────────────
let longPressTimer = null;

menuBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  longPressTimer = setTimeout(() => {
    openSettings();
  }, 1500);
});

menuBtn.addEventListener('pointerup',    cancelLongPress);
menuBtn.addEventListener('pointerleave', cancelLongPress);
menuBtn.addEventListener('pointercancel',cancelLongPress);

function cancelLongPress() {
  clearTimeout(longPressTimer);
}

// ── Settings panel ───────────────────────────────────────────
let settingsView = 'categories'; // 'categories' | 'words'
let settingsCategory = null;

function openSettings() {
  settingsView = 'categories';
  settingsCategory = null;
  renderCategoriesView();
  settingsOverlay.classList.remove('hidden');
}

settingsClose.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  settingsOverlay.classList.add('hidden');
});

settingsBack.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  settingsView = 'categories';
  settingsCategory = null;
  renderCategoriesView();
});

// Tap outside panel to close
settingsOverlay.addEventListener('pointerdown', (e) => {
  if (e.target === settingsOverlay) {
    settingsOverlay.classList.add('hidden');
  }
});

// ── Categories view ───────────────────────────────────────────
function renderCategoriesView() {
  settingsTitle.textContent = 'Categories';
  settingsBack.classList.add('hidden');
  settingsBody.innerHTML = '';

  const catNames = Object.keys(state.categories);

  // List section
  const listSection = document.createElement('div');
  listSection.className = 'settings-section';

  if (catNames.length) {
    const listEl = document.createElement('div');
    catNames.forEach((name, i) => {
      const row = document.createElement('div');
      row.className = 'settings-row';
      row.setAttribute('data-ocid', `category.item.${i + 1}`);

      const activeTag = document.createElement('span');
      activeTag.className = 'settings-row-active';
      activeTag.textContent = name === state.activeCategory ? '✓' : '';

      const label = document.createElement('span');
      label.className = 'settings-row-label';
      label.textContent = name;

      const chevron = document.createElement('span');
      chevron.className = 'settings-row-chevron';
      chevron.textContent = '›';

      row.appendChild(activeTag);
      row.appendChild(label);
      row.appendChild(chevron);

      // Tap = set active + open words
      row.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        state.activeCategory = name;
        saveData();
        settingsView = 'words';
        settingsCategory = name;
        renderWordsView(name);
      });

      listEl.appendChild(row);
    });
    listSection.appendChild(listEl);
  }

  // Add category row
  const addRow = document.createElement('div');
  addRow.className = 'settings-add-row';

  const addInput = document.createElement('input');
  addInput.type = 'text';
  addInput.placeholder = 'New category…';
  addInput.setAttribute('data-ocid', 'category.input');

  const addBtn = document.createElement('span');
  addBtn.className = 'settings-add-btn';
  addBtn.textContent = 'Add';
  addBtn.setAttribute('data-ocid', 'category.add_button');

  addBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const name = addInput.value.trim();
    if (!name || state.categories[name]) { addInput.value = ''; return; }
    state.categories[name] = [];
    state.activeCategory = name;
    saveData();
    addInput.value = '';
    settingsView = 'words';
    settingsCategory = name;
    renderWordsView(name);
  });

  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addBtn.dispatchEvent(new Event('pointerdown'));
  });

  addRow.appendChild(addInput);
  addRow.appendChild(addBtn);

  settingsBody.appendChild(listSection);
  settingsBody.appendChild(addRow);
}

// ── Words view ────────────────────────────────────────────────
function renderWordsView(catName) {
  settingsTitle.textContent = catName;
  settingsBack.classList.remove('hidden');
  settingsBody.innerHTML = '';

  const words = state.categories[catName] || [];

  const listSection = document.createElement('div');
  listSection.className = 'settings-section';

  if (words.length) {
    const listEl = document.createElement('div');
    words.forEach((word, i) => {
      const row = document.createElement('div');
      row.className = 'settings-row';
      row.setAttribute('data-ocid', `word.item.${i + 1}`);

      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'word-row-edit';
      editInput.value = word;
      editInput.setAttribute('data-ocid', `word.input.${i + 1}`);

      editInput.addEventListener('change', () => {
        const newVal = editInput.value.trim();
        if (newVal) {
          state.categories[catName][i] = newVal;
          saveData();
        } else {
          editInput.value = word;
        }
      });

      const delBtn = document.createElement('span');
      delBtn.className = 'word-delete-btn';
      delBtn.textContent = '−';
      delBtn.setAttribute('data-ocid', `word.delete_button.${i + 1}`);

      delBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        state.categories[catName].splice(i, 1);
        saveData();
        renderWordsView(catName);
      });

      row.appendChild(editInput);
      row.appendChild(delBtn);
      listEl.appendChild(row);
    });
    listSection.appendChild(listEl);
  }

  // Delete category row
  const delCatSection = document.createElement('div');
  delCatSection.className = 'settings-section';
  const delCatRow = document.createElement('div');
  delCatRow.className = 'settings-row';
  delCatRow.style.color = '#ff3b30';
  delCatRow.style.justifyContent = 'center';
  delCatRow.textContent = 'Delete Category';
  delCatRow.setAttribute('data-ocid', 'category.delete_button');
  delCatRow.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    delete state.categories[catName];
    if (state.activeCategory === catName) {
      const remaining = Object.keys(state.categories);
      state.activeCategory = remaining[0] || '';
    }
    saveData();
    settingsView = 'categories';
    settingsCategory = null;
    renderCategoriesView();
  });
  delCatSection.appendChild(delCatRow);

  // Add word row
  const addRow = document.createElement('div');
  addRow.className = 'settings-add-row';

  const addInput = document.createElement('input');
  addInput.type = 'text';
  addInput.placeholder = 'New word…';
  addInput.setAttribute('data-ocid', 'word.input');

  const addBtn = document.createElement('span');
  addBtn.className = 'settings-add-btn';
  addBtn.textContent = 'Add';
  addBtn.setAttribute('data-ocid', 'word.add_button');

  addBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const w = addInput.value.trim();
    if (!w) return;
    state.categories[catName].push(w);
    saveData();
    addInput.value = '';
    renderWordsView(catName);
  });

  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addBtn.dispatchEvent(new Event('pointerdown'));
  });

  addRow.appendChild(addInput);
  addRow.appendChild(addBtn);

  settingsBody.appendChild(listSection);
  settingsBody.appendChild(addRow);
  settingsBody.appendChild(delCatSection);
}
