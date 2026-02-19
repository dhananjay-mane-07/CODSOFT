// ─────────────────────────────────────────────────────────────
// QuizCraft Frontend App
// ─────────────────────────────────────────────────────────────

let currentUser = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let timerInterval = null;
let timeRemaining = 0;
let browseFilters = { category: 'All', difficulty: 'All', search: '' };
let searchTimeout = null;
let currentResults = null;

// ── API Helper ──
async function api(method, path, body = null) {
  const token = localStorage.getItem('qc_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch('/api' + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Toast ──
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(100%)'; el.style.transition = 'all 0.3s'; setTimeout(() => el.remove(), 300); }, 3500);
}

// ── Page Navigation ──
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name)?.classList.add('active');
  window.scrollTo(0, 0);
  closeDropdown();

  if (name === 'home') loadHomeQuizzes();
  if (name === 'browse') loadBrowseQuizzes();
  if (name === 'my-quizzes') loadMyQuizzes();
  if (name === 'create') initCreatePage();
}

// ── Auth ──
function openModal(tab = 'login') {
  document.getElementById('auth-modal').classList.add('open');
  switchTab(tab);
}

function closeModal() {
  document.getElementById('auth-modal').classList.remove('open');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('auth-modal')) closeModal();
}

function switchTab(tab) {
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return toast('Please fill in all fields', 'error');
  try {
    const data = await api('POST', '/auth/login', { email, password });
    localStorage.setItem('qc_token', data.token);
    currentUser = data.user;
    updateNavForAuth();
    closeModal();
    toast(`Welcome back, ${currentUser.username}!`, 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function register() {
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!username || !email || !password) return toast('Please fill in all fields', 'error');
  try {
    const data = await api('POST', '/auth/register', { username, email, password });
    localStorage.setItem('qc_token', data.token);
    currentUser = data.user;
    updateNavForAuth();
    closeModal();
    toast(`Account created! Welcome, ${currentUser.username} 🎉`, 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function logout() {
  try {
    await api('POST', '/auth/logout');
  } catch (_) {}
  localStorage.removeItem('qc_token');
  currentUser = null;
  updateNavForAuth();
  showPage('home');
  toast('Logged out successfully', 'info');
}

function updateNavForAuth() {
  const authBtns = document.getElementById('nav-auth-buttons');
  const userMenu = document.getElementById('nav-user-menu');
  if (currentUser) {
    authBtns.style.display = 'none';
    userMenu.style.display = 'flex';
    userMenu.style.alignItems = 'center';
    document.getElementById('user-avatar').textContent = currentUser.username[0].toUpperCase();
  } else {
    authBtns.style.display = 'flex';
    userMenu.style.display = 'none';
  }
}

function toggleDropdown() {
  document.getElementById('user-dropdown').classList.toggle('open');
}

function closeDropdown() {
  document.getElementById('user-dropdown').classList.remove('open');
}

document.addEventListener('click', (e) => {
  if (!document.getElementById('nav-user-menu')?.contains(e.target)) closeDropdown();
});

function requireAuthThen(fn) {
  if (currentUser) fn();
  else openModal('login');
}

// ── Load Quizzes ──
async function loadHomeQuizzes() {
  const container = document.getElementById('home-quizzes');
  container.innerHTML = '<div class="spinner"></div>';
  try {
    const data = await api('GET', '/quizzes?limit=6');
    renderQuizGrid(container, data.quizzes);
    updateStats(data);
  } catch (e) { container.innerHTML = '<p style="color:var(--gray);text-align:center">Failed to load quizzes</p>'; }
}

async function loadBrowseQuizzes() {
  const container = document.getElementById('browse-quizzes');
  container.innerHTML = '<div class="spinner"></div>';
  const { category, difficulty, search } = browseFilters;
  const params = new URLSearchParams({ limit: 50 });
  if (category !== 'All') params.set('category', category);
  if (difficulty !== 'All') params.set('difficulty', difficulty);
  if (search) params.set('search', search);
  try {
    const data = await api('GET', '/quizzes?' + params.toString());
    console.log('Browse quizzes response:', data);
    renderQuizGrid(container, data.quizzes);
  } catch (e) {
    console.error('Browse load error:', e);
    container.innerHTML = '<p style="color:#ef4444;text-align:center;padding:2rem">Error: ' + e.message + '</p>';
  }
}

async function loadMyQuizzes() {
  if (!currentUser) { showPage('home'); openModal('login'); return; }
  const container = document.getElementById('my-quizzes-grid');
  container.innerHTML = '<div class="spinner"></div>';
  try {
    const data = await api('GET', '/quizzes/my');
    renderQuizGrid(container, data.quizzes, true);
  } catch (e) { container.innerHTML = '<p style="color:var(--gray);text-align:center">Failed to load your quizzes</p>'; }
}

function renderQuizGrid(container, quizzes, showActions = false) {
  if (!quizzes || quizzes.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🎯</div>
        <h3>No quizzes here yet</h3>
        <p>Be the first to create one!</p>
      </div>`;
    return;
  }
  container.innerHTML = quizzes.map(q => `
    <div class="quiz-card" onclick="${showActions ? '' : `startQuiz('${q._id}')`}">
      <div class="quiz-card-header">
        <span class="quiz-category">${q.category}</span>
        <span class="difficulty-badge ${q.difficulty}">${q.difficulty}</span>
      </div>
      <h3>${escHtml(q.title)}</h3>
      <p>${escHtml(q.description || 'No description provided.')}</p>
      <div class="quiz-card-meta">
        <span>❓ ${q.questions?.length || 0} questions</span>
        <span>👤 ${q.creator?.username || 'Unknown'}</span>
        ${q.timeLimitMinutes ? `<span>⏱ ${q.timeLimitMinutes}m</span>` : ''}
      </div>
      ${showActions ? `
      <div style="display:flex;gap:0.75rem;margin-top:1.2rem">
        <button class="btn btn-primary" style="flex:1;padding:0.6rem;font-size:0.85rem" onclick="event.stopPropagation();startQuiz('${q._id}')">▶ Play</button>
        <button class="btn btn-secondary" style="padding:0.6rem 1rem;font-size:0.85rem" onclick="event.stopPropagation();deleteQuiz('${q._id}',this)">🗑</button>
      </div>` : ''}
    </div>
  `).join('');
}

function updateStats(data) {
  if (!data) return;
  const total = data.total || 0;
  animateNumber('stat-quizzes', total);
  animateNumber('stat-questions', total * 7);
  animateNumber('stat-plays', total * 23);
}

function animateNumber(id, target) {
  let start = 0;
  const el = document.getElementById(id);
  const step = target / 30;
  const interval = setInterval(() => {
    start = Math.min(start + step, target);
    el.textContent = Math.round(start).toLocaleString();
    if (start >= target) clearInterval(interval);
  }, 30);
}

// ── Filters ──
function filterCategory(btn, cat) {
  document.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  browseFilters.category = cat;
  loadBrowseQuizzes();
}

function filterDifficulty(btn, diff) {
  document.querySelectorAll('[data-diff]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  browseFilters.difficulty = diff;
  loadBrowseQuizzes();
}

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    browseFilters.search = document.getElementById('search-input').value;
    loadBrowseQuizzes();
  }, 400);
}

// ── Create Quiz ──
let questionCount = 0;

function initCreatePage() {
  if (!currentUser) { showPage('home'); openModal('login'); return; }
  questionCount = 0;
  document.getElementById('questions-container').innerHTML = '';
  document.getElementById('quiz-title').value = '';
  document.getElementById('quiz-desc').value = '';
  document.getElementById('quiz-time').value = '0';
  addQuestion();
}

function addQuestion() {
  questionCount++;
  const id = questionCount;
  const container = document.getElementById('questions-container');

  const block = document.createElement('div');
  block.className = 'form-card';
  block.id = 'q-block-' + id;

  // Header
  const header = document.createElement('div');
  header.className = 'question-block-header';
  header.innerHTML = '<span class="question-num">Question ' + id + '</span>';
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-btn';
  removeBtn.textContent = 'Remove';
  removeBtn.onclick = function() { block.remove(); };
  header.appendChild(removeBtn);
  block.appendChild(header);

  // Question text
  const qGroup = document.createElement('div');
  qGroup.className = 'form-group';
  qGroup.innerHTML = '<label>Question Text *</label>';
  const qInput = document.createElement('input');
  qInput.type = 'text';
  qInput.className = 'form-control q-text';
  qInput.placeholder = 'Type your question here...';
  qGroup.appendChild(qInput);
  block.appendChild(qGroup);

  // Options
  const optGroup = document.createElement('div');
  optGroup.className = 'form-group';
  optGroup.innerHTML = '<label>Answer Options (click ✓ to mark correct)</label>';
  const optContainer = document.createElement('div');
  optContainer.className = 'options-container';
  optGroup.appendChild(optContainer);
  block.appendChild(optGroup);

  // Add 4 default options
  for (let i = 0; i < 4; i++) {
    addOptionToBlock(optContainer, i);
  }

  // Add option button
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'add-option-btn';
  addBtn.textContent = '+ Add Option';
  addBtn.style.marginTop = '8px';
  addBtn.onclick = function() {
    const rows = optContainer.querySelectorAll('.option-row');
    if (rows.length >= 6) return toast('Maximum 6 options allowed', 'info');
    addOptionToBlock(optContainer, rows.length);
  };
  optGroup.appendChild(addBtn);

  // Explanation
  const expGroup = document.createElement('div');
  expGroup.className = 'form-group';
  expGroup.innerHTML = '<label>Explanation (optional)</label>';
  const expInput = document.createElement('input');
  expInput.type = 'text';
  expInput.className = 'form-control q-explanation';
  expInput.placeholder = 'Why is the answer correct?';
  expGroup.appendChild(expInput);
  block.appendChild(expGroup);

  container.appendChild(block);
}

function addOptionToBlock(container, idx) {
  const row = document.createElement('div');
  row.className = 'option-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-control opt-text';
  input.placeholder = 'Option ' + String.fromCharCode(65 + idx);

  const checkBtn = document.createElement('button');
  checkBtn.type = 'button';
  checkBtn.className = 'correct-toggle';
  checkBtn.textContent = '✓';
  checkBtn.title = 'Mark as correct answer';
  checkBtn.onclick = function() {
    container.querySelectorAll('.correct-toggle').forEach(b => b.classList.remove('selected'));
    checkBtn.classList.add('selected');
  };

  row.appendChild(input);
  row.appendChild(checkBtn);

  if (idx >= 2) {
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'remove-btn';
    delBtn.style.padding = '6px 10px';
    delBtn.textContent = '×';
    delBtn.onclick = function() { row.remove(); };
    row.appendChild(delBtn);
  }

  container.appendChild(row);
}

async function submitQuiz() {
  const title = document.getElementById('quiz-title').value.trim();
  if (!title) return toast('Quiz title is required', 'error');

  const blocks = document.querySelectorAll('[id^="q-block-"]');
  if (blocks.length === 0) return toast('Add at least one question', 'error');

  const questions = [];
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    const qInput = block.querySelector('.q-text');
    const text = qInput ? qInput.value.trim() : '';
    if (!text) return toast('Question ' + (b + 1) + ' needs text', 'error');

    const optRows = block.querySelectorAll('.option-row');
    const options = [];
    let hasCorrect = false;

    for (let r = 0; r < optRows.length; r++) {
      const row = optRows[r];
      const txtInput = row.querySelector('.opt-text');
      const correctBtn = row.querySelector('.correct-toggle');
      const val = txtInput ? txtInput.value.trim() : '';
      if (!val) continue;
      const isCorrect = correctBtn ? correctBtn.classList.contains('selected') : false;
      if (isCorrect) hasCorrect = true;
      options.push({ text: val, isCorrect: isCorrect });
    }

    if (options.length < 2) return toast('Question ' + (b + 1) + ' needs at least 2 options', 'error');
    if (!hasCorrect) return toast('Question ' + (b + 1) + ': mark one correct answer', 'error');

    const expInput = block.querySelector('.q-explanation');
    const explanation = expInput ? expInput.value.trim() : '';
    questions.push({ text: text, options: options, explanation: explanation });
  }

  const body = {
    title: title,
    description: document.getElementById('quiz-desc').value.trim(),
    category: document.getElementById('quiz-category').value,
    difficulty: document.getElementById('quiz-difficulty').value,
    timeLimitMinutes: parseInt(document.getElementById('quiz-time').value) || 0,
    questions: questions
  };

  console.log('Submitting quiz:', JSON.stringify(body, null, 2));

  try {
    const result = await api('POST', '/quizzes', body);
    console.log('Quiz created:', result);
    toast('Quiz published successfully!', 'success');
    showPage('my-quizzes');
  } catch (e) {
    console.error('Quiz creation failed:', e);
    toast(e.message, 'error');
  }
}

async function deleteQuiz(id, btn) {
  if (!confirm('Delete this quiz? This cannot be undone.')) return;
  try {
    await api('DELETE', `/quizzes/${id}`);
    btn.closest('.quiz-card').remove();
    toast('Quiz deleted', 'info');
  } catch (e) { toast(e.message, 'error'); }
}

// ── Take Quiz ──
async function startQuiz(id) {
  try {
    const data = await api('GET', `/quizzes/${id}`);
    currentQuiz = data.quiz;
    currentQuestionIndex = 0;
    userAnswers = new Array(currentQuiz.questions.length).fill(null);
    currentResults = null;

    document.getElementById('take-quiz-title').textContent = currentQuiz.title;
    showPage('take');
    renderQuestion();

    if (currentQuiz.timeLimitMinutes > 0) {
      startTimer(currentQuiz.timeLimitMinutes * 60);
    } else {
      document.getElementById('timer').style.display = 'none';
    }
  } catch (e) { toast('Failed to load quiz: ' + e.message, 'error'); }
}

function renderQuestion() {
  const q = currentQuiz.questions[currentQuestionIndex];
  const total = currentQuiz.questions.length;
  const isLast = currentQuestionIndex === total - 1;

  document.getElementById('question-counter').textContent = `${currentQuestionIndex + 1} / ${total}`;
  document.getElementById('progress-fill').style.width = `${((currentQuestionIndex + 1) / total) * 100}%`;
  document.getElementById('prev-btn').style.display = currentQuestionIndex > 0 ? 'block' : 'none';
  document.getElementById('next-btn').textContent = isLast ? 'Submit Quiz ✓' : 'Next →';

  const selected = userAnswers[currentQuestionIndex];
  document.getElementById('question-card').innerHTML = `
    <div class="question-text">${escHtml(q.text)}</div>
    <div class="options-list">
      ${q.options.map((opt, i) => `
        <button class="option-btn ${selected === i ? 'selected' : ''}" onclick="selectAnswer(${i})">
          <div class="option-letter">${String.fromCharCode(65+i)}</div>
          <span>${escHtml(opt.text)}</span>
        </button>`).join('')}
    </div>`;
}

function selectAnswer(optIdx) {
  userAnswers[currentQuestionIndex] = optIdx;
  renderQuestion();
}

function nextQuestion() {
  if (userAnswers[currentQuestionIndex] === null) {
    return toast('Please select an answer before continuing', 'error');
  }
  if (currentQuestionIndex < currentQuiz.questions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    submitQuizAnswers();
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) { currentQuestionIndex--; renderQuestion(); }
}

async function submitQuizAnswers() {
  stopTimer();
  const answers = userAnswers.map((sel, i) => ({ questionIndex: i, selectedOption: sel ?? -1 }));
  try {
    const data = await api('POST', `/quizzes/${currentQuiz._id}/submit`, { answers });
    showResults(data);
  } catch (e) { toast('Failed to submit: ' + e.message, 'error'); }
}

// ── Results ──
function showResults(data) {
  const { score, total, percentage, results } = data;
  currentResults = { data, quizId: currentQuiz._id };

  // Score circle
  const circle = document.getElementById('score-circle');
  circle.style.setProperty('--pct', `${percentage * 3.6}deg`);
  document.getElementById('score-pct').textContent = percentage + '%';
  document.getElementById('score-raw').textContent = `${score} / ${total} points`;

  const msg = percentage >= 90 ? '🏆 Outstanding!' : percentage >= 70 ? '🎉 Great Job!' : percentage >= 50 ? '👍 Not Bad!' : '💪 Keep Practicing!';
  const sub = percentage >= 90 ? 'You aced this quiz!' : percentage >= 70 ? 'Well done!' : percentage >= 50 ? 'Room to improve!' : 'Review the answers and try again.';
  document.getElementById('score-message').textContent = msg;
  document.getElementById('score-sub').textContent = sub;

  // Breakdown
  const breakdown = results.map((r, i) => {
    const selectedText = r.selectedOption >= 0 ? r.options[r.selectedOption] : 'No answer';
    const correctText = r.options[r.correctOption];
    return `
      <div class="breakdown-item">
        <div class="breakdown-q">
          <span>${r.isCorrect ? '✅' : '❌'}</span>
          <span>${escHtml(r.questionText)}</span>
        </div>
        <div class="breakdown-answer">
          Your answer: <span class="${r.isCorrect ? 'correct-text' : 'incorrect-text'}">${escHtml(selectedText)}</span>
          ${!r.isCorrect ? ` | Correct: <span class="correct-text">${escHtml(correctText)}</span>` : ''}
          ${r.explanation ? `<br><em style="color:var(--gray)">💡 ${escHtml(r.explanation)}</em>` : ''}
        </div>
      </div>`;
  }).join('');
  document.getElementById('result-breakdown').innerHTML = breakdown;

  document.getElementById('retake-btn').onclick = () => startQuiz(currentResults.quizId);
  showPage('results');
}

// ── Timer ──
function startTimer(seconds) {
  timeRemaining = seconds;
  const timerEl = document.getElementById('timer');
  const display = document.getElementById('timer-display');
  timerEl.style.display = 'flex';

  timerInterval = setInterval(() => {
    timeRemaining--;
    const m = Math.floor(timeRemaining / 60);
    const s = timeRemaining % 60;
    display.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    if (timeRemaining <= 30) timerEl.classList.add('warning');
    if (timeRemaining <= 0) { stopTimer(); submitQuizAnswers(); }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// ── Utilities ──
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ──
async function init() {
  const token = localStorage.getItem('qc_token');
  if (token) {
    try {
      const data = await api('GET', '/auth/me');
      currentUser = data.user;
      updateNavForAuth();
    } catch (_) {
      // Token expired or invalid — clear it
      localStorage.removeItem('qc_token');
    }
  }
  loadHomeQuizzes();
}

// Handle keyboard enter on login/register
document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    if (document.getElementById('login-form').style.display !== 'none') login();
    else if (document.getElementById('register-form').style.display !== 'none') register();
  }
});

init();