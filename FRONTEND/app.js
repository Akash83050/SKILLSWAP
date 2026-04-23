// ========== STATE ==========
let currentUser = null;
let profileSkillsHave = [];
let profileSkillsWant = [];
let requestTarget = null;
let currentChat = null;
let allProjects = [];
let pollingInterval = null;
let lastSeenNotifIds = new Set();
let notifPanelOpen = false;

// ========== INIT ==========
window.onload = () => {
  const token = getToken();
  if (token) {
    initApp();
  } else {
    document.getElementById('auth-page').classList.add('active');
  }
};

async function initApp() {
  try {
    currentUser = await api.users.me();
    document.getElementById('auth-page').classList.remove('active');
    document.getElementById('app-page').style.display = 'flex';
    document.getElementById('nav-username').textContent = currentUser.name;

    profileSkillsHave = currentUser.skills_have || [];
    profileSkillsWant = currentUser.skills_want || [];

    // seed known IDs so we don't toast old notifs on first load
    const initial = await api.notifications.all();
    initial.forEach(n => lastSeenNotifIds.add(String(n._id)));
    updateNotifBadge(initial.filter(n => !n.read).length);

    startPolling();
    loadDashboard();
  } catch {
    logout();
  }
}

// ========== POLLING ENGINE ==========
function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(pollNotifications, 15000); // every 15 s
}

async function pollNotifications() {
  if (!getToken()) return;
  try {
    const { count, latest } = await api.notifications.unreadCount();
    updateNotifBadge(count);

    // find truly new ones (not seen before)
    const newOnes = latest.filter(n => !lastSeenNotifIds.has(String(n._id)));
    newOnes.forEach(n => {
      lastSeenNotifIds.add(String(n._id));
      showToast(n);
    });

    // if panel is open, refresh it live
    if (notifPanelOpen) renderNotifPanel();
  } catch { /* silent fail */ }
}

// ========== AUTH ==========
function toggleAuth() {
  document.getElementById('login-form').classList.toggle('active');
  document.getElementById('register-form').classList.toggle('active');
}

async function login() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  try {
    const data = await api.auth.login({ email, password });
    localStorage.setItem('ss_token', data.token);
    localStorage.setItem('ss_user', JSON.stringify(data.user));
    initApp();
  } catch (e) {
    errEl.textContent = e.message;
  }
}

async function register() {
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const errEl = document.getElementById('reg-error');
  errEl.textContent = '';
  try {
    const data = await api.auth.register({ name, email, password });
    localStorage.setItem('ss_token', data.token);
    localStorage.setItem('ss_user', JSON.stringify(data.user));
    initApp();
  } catch (e) {
    errEl.textContent = e.message;
  }
}

function logout() {
  if (pollingInterval) clearInterval(pollingInterval);
  localStorage.removeItem('ss_token');
  localStorage.removeItem('ss_user');
  document.getElementById('app-page').style.display = 'none';
  document.getElementById('auth-page').classList.add('active');
  currentUser = null;
  lastSeenNotifIds = new Set();
}

// ========== NAVIGATION ==========
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  document.getElementById(`nav-${name}`).classList.add('active');

  if (name === 'discover') loadUsers();
  if (name === 'projects') loadProjects();
  if (name === 'requests') loadRequests('received');
  if (name === 'messages') loadConversations();
  if (name === 'profile') loadProfile();
}

// ========== DASHBOARD ==========
async function loadDashboard() {
  try {
    const [matches, projects, me] = await Promise.all([
      api.users.matches(),
      api.projects.all('?status=open'),
      api.users.me()
    ]);
    currentUser = me;
    
    // Stats
    document.getElementById('dashboard-stats').innerHTML = `
      <div class="stat-card"><div class="stat-value">${me.skills_have.length}</div><div class="stat-label">Skills Offered</div></div>
      <div class="stat-card"><div class="stat-value">${me.skills_want.length}</div><div class="stat-label">Skills Wanted</div></div>
      <div class="stat-card"><div class="stat-value">${me.completed_projects}</div><div class="stat-label">Projects Done</div></div>
      <div class="stat-card"><div class="stat-value">${me.rating || '—'}</div><div class="stat-label">Rating</div></div>
    `;

    // Matches
    const matchesEl = document.getElementById('matches-list');
    if (!matches.length) {
      matchesEl.innerHTML = `<div class="empty-state"><div class="empty-icon">◎</div><p>Add skills you want to see your matches</p></div>`;
    } else {
      matchesEl.innerHTML = matches.slice(0,5).map(u => userCardHTML(u, true)).join('');
    }

    // Recent projects
    const recentEl = document.getElementById('recent-projects');
    recentEl.innerHTML = projects.slice(0,4).map(p => miniProjectCard(p)).join('');
  } catch (e) {
    console.error(e);
  }
}

function userCardHTML(user, showScore = false) {
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  const skills = (user.skills_have || []).slice(0,3).map(s => `<span class="skill-tag">${s.name}</span>`).join('');
  const score = showScore && user.matchScore ? `<span class="match-score">⚡ ${user.matchScore} match</span>` : '';
  return `<div class="user-card" onclick="viewUser('${user._id}')">
    <div class="avatar">${initials}</div>
    <div class="user-card-info">
      <div class="name">${user.name}</div>
      <div class="skill-tags" style="margin:0">${skills}</div>
    </div>
    ${score}
  </div>`;
}

function miniProjectCard(p) {
  return `<div class="user-card" onclick="viewProject('${p._id}')">
    <div>
      <div class="name">${p.title}</div>
      <div class="bio">${p.description}</div>
    </div>
  </div>`;
}

// ========== DISCOVER ==========
let searchTimeout;
async function loadUsers(params = '') {
  try {
    const users = await api.users.all(params);
    const grid = document.getElementById('users-grid');
    if (!users.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">◎</div><p>No users found</p></div>`;
      return;
    }
    grid.innerHTML = users.map(u => bigUserCard(u)).join('');
  } catch (e) { console.error(e); }
}

function searchUsers() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const q = document.getElementById('discover-search').value;
    const skill = document.getElementById('skill-filter').value;
    let params = [];
    if (q) params.push(`search=${encodeURIComponent(q)}`);
    if (skill) params.push(`skill=${encodeURIComponent(skill)}`);
    loadUsers(params.length ? '?' + params.join('&') : '');
  }, 400);
}

function bigUserCard(user) {
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  const skills = (user.skills_have || []).slice(0,4).map(s => 
    `<span class="skill-tag ${s.level === 'Expert' ? 'expert' : ''}">${s.name} · ${s.level}</span>`
  ).join('');
  const stars = user.rating ? '⭐'.repeat(Math.round(user.rating)) + ` ${user.rating}` : 'No rating';
  return `<div class="user-big-card">
    <div class="card-top">
      <div class="avatar">${initials}</div>
      <div>
        <div class="user-name">${user.name}</div>
        <div class="stars">${stars}</div>
      </div>
    </div>
    <div class="user-bio">${user.bio || 'No bio yet.'}</div>
    <div class="skill-tags">${skills}</div>
    <div class="card-actions">
      <button class="btn-secondary" onclick="event.stopPropagation(); viewUser('${user._id}')">View Profile</button>
      <button class="btn-primary sm" onclick="event.stopPropagation(); openRequestModal('${user._id}', '${user.name}')">Connect</button>
    </div>
  </div>`;
}

// ========== PROJECTS ==========
async function loadProjects(status = 'open') {
  try {
    let params = status === 'mine' ? '' : `?status=${status}`;
    const projects = await api.projects.all(params);
    allProjects = projects;
    
    let filtered = projects;
    if (status === 'mine') filtered = projects.filter(p => 
      p.owner._id === currentUser._id || p.members.some(m => m._id === currentUser._id)
    );
    
    renderProjects(filtered);
  } catch (e) { console.error(e); }
}

function filterProjects(status, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  loadProjects(status);
}

function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  if (!projects.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">◧</div><p>No projects found</p></div>`;
    return;
  }
  grid.innerHTML = projects.map(p => projectCardHTML(p)).join('');
}

function projectCardHTML(p) {
  const skills = (p.required_skills || []).slice(0,4).map(s => `<span class="skill-tag">${s}</span>`).join('');
  const statusClass = `status-${p.status}`;
  const memberCount = p.members?.length || 0;
  return `<div class="project-card" onclick="viewProject('${p._id}')">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.5rem;">
      <span class="category-badge">${p.category || 'General'}</span>
      <span class="status-badge ${statusClass}">${p.status}</span>
    </div>
    <div class="proj-title">${p.title}</div>
    <div class="proj-desc">${p.description}</div>
    <div class="skill-tags">${skills}</div>
    <div class="proj-meta">
      <span class="proj-members">👥 ${memberCount} member${memberCount !== 1 ? 's' : ''}</span>
      <span style="font-size:0.8rem;color:var(--text2)">by ${p.owner?.name || 'Unknown'}</span>
    </div>
  </div>`;
}

async function createProject() {
  const title = document.getElementById('proj-title').value;
  const description = document.getElementById('proj-desc').value;
  const skillsStr = document.getElementById('proj-skills').value;
  const category = document.getElementById('proj-category').value;
  if (!title || !description) return alert('Title and description required');
  
  const required_skills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
  try {
    await api.projects.create({ title, description, required_skills, category });
    closeAllModals();
    loadProjects();
    showSection('projects');
  } catch (e) { alert(e.message); }
}

// ========== REQUESTS ==========
async function loadRequests(type = 'received') {
  try {
    const requests = type === 'received' ? await api.requests.received() : await api.requests.sent();
    const list = document.getElementById('requests-list');
    if (!requests.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">◑</div><p>No ${type} requests</p></div>`;
      return;
    }
    list.innerHTML = requests.map(r => requestCardHTML(r, type)).join('');
  } catch (e) { console.error(e); }
}

function showRequests(type, btn) {
  document.querySelectorAll('#section-requests .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  loadRequests(type);
}

function requestCardHTML(r, type) {
  const user = type === 'received' ? r.from : r.to;
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  const skills = (user.skills_have || []).slice(0,3).map(s => `<span class="skill-tag">${s.name}</span>`).join('');
  const badgeClass = r.status === 'pending' ? 'pending-badge' : r.status === 'accepted' ? 'accepted-badge' : 'rejected-badge';
  
  let actions = '';
  if (type === 'received' && r.status === 'pending') {
    actions = `<div class="req-actions">
      <button class="btn-success" onclick="respondRequest('${r._id}', 'accepted')">Accept</button>
      <button class="btn-danger" onclick="respondRequest('${r._id}', 'rejected')">Decline</button>
      <button class="btn-secondary" onclick="startChat('${user._id}', '${user.name}')">Message</button>
    </div>`;
  } else if (r.status === 'accepted') {
    actions = `<div class="req-actions">
      <button class="btn-secondary" onclick="startChat('${user._id}', '${user.name}')">Message</button>
    </div>`;
  }
  
  return `<div class="request-card">
    <div style="display:flex;align-items:center;gap:0.75rem;">
      <div class="avatar">${initials}</div>
      <div>
        <strong>${user.name}</strong>
        <span class="${badgeClass}" style="margin-left:0.5rem">${r.status}</span>
      </div>
    </div>
    <div class="skill-tags" style="margin-top:0.5rem">${skills}</div>
    <div class="req-msg">"${r.message}"</div>
    ${actions}
  </div>`;
}

async function respondRequest(id, status) {
  try {
    await api.requests.update(id, status);
    loadRequests('received');
  } catch (e) { alert(e.message); }
}

// ========== MESSAGES ==========
async function loadConversations() {
  try {
    const convs = await api.messages.conversations();
    const list = document.getElementById('conv-list');
    if (!convs.length) {
      list.innerHTML = `<div class="empty-state" style="padding:2rem"><p>No conversations yet</p></div>`;
      return;
    }
    list.innerHTML = convs.map(c => {
      const initials = c.other.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
      return `<div class="conv-item ${currentChat === c.other._id ? 'active' : ''}" onclick="openChat('${c.other._id}', '${c.other.name}')">
        <div class="avatar" style="width:36px;height:36px;font-size:0.8rem">${initials}</div>
        <div class="conv-info">
          <div class="conv-name">${c.other.name}${c.unread ? ` <span class="badge" style="position:static;margin-left:4px">${c.unread}</span>` : ''}</div>
          <div class="conv-preview">${c.lastMessage}</div>
        </div>
      </div>`;
    }).join('');
  } catch (e) { console.error(e); }
}

async function openChat(userId, userName) {
  currentChat = userId;
  const chatArea = document.getElementById('chat-area');
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  
  chatArea.innerHTML = `
    <div class="chat-header">
      <div class="avatar" style="width:36px;height:36px;font-size:0.8rem">${initials}</div>
      <strong>${userName}</strong>
    </div>
    <div class="chat-messages" id="chat-messages"></div>
    <div class="chat-input-row">
      <input type="text" id="chat-input" placeholder="Type a message..." onkeydown="if(event.key==='Enter') sendMessage()" />
      <button class="chat-send" onclick="sendMessage()">Send</button>
    </div>
  `;
  
  try {
    const messages = await api.messages.get(userId);
    const msgsEl = document.getElementById('chat-messages');
    if (!messages.length) {
      msgsEl.innerHTML = `<div class="empty-state"><p>Start the conversation!</p></div>`;
    } else {
      msgsEl.innerHTML = messages.map(m => {
        const isMine = m.sender._id === currentUser._id;
        return `<div class="message-bubble ${isMine ? 'sent' : 'received'}">${m.text}</div>`;
      }).join('');
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }
  } catch (e) { console.error(e); }
  
  loadConversations();
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || !currentChat) return;
  input.value = '';
  
  try {
    await api.messages.send(currentChat, text);
    const msgsEl = document.getElementById('chat-messages');
    msgsEl.innerHTML += `<div class="message-bubble sent">${text}</div>`;
    msgsEl.scrollTop = msgsEl.scrollHeight;
    loadConversations();
  } catch (e) { alert(e.message); }
}

function startChat(userId, userName) {
  showSection('messages');
  setTimeout(() => openChat(userId, userName), 100);
}

// ========== PROFILE ==========
async function loadProfile() {
  const me = await api.users.me();
  currentUser = me;
  profileSkillsHave = me.skills_have || [];
  profileSkillsWant = me.skills_want || [];
  
  document.getElementById('profile-name').value = me.name;
  document.getElementById('profile-bio').value = me.bio || '';
  document.getElementById('profile-avatar').textContent = me.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  
  renderSkillsHave();
  renderSkillsWant();
}

function renderSkillsHave() {
  document.getElementById('skills-have-list').innerHTML = profileSkillsHave.map((s, i) =>
    `<span class="skill-tag ${s.level === 'Expert' ? 'expert' : ''}">${s.name} · ${s.level} <span class="remove-skill" onclick="removeSkillHave(${i})">×</span></span>`
  ).join('');
}

function renderSkillsWant() {
  document.getElementById('skills-want-list').innerHTML = profileSkillsWant.map((s, i) =>
    `<span class="skill-tag want">${s.name} <span class="remove-skill" onclick="removeSkillWant(${i})">×</span></span>`
  ).join('');
}

function addSkillHave() {
  const val = document.getElementById('skill-have-input').value.trim();
  const level = document.getElementById('skill-have-level').value;
  if (!val) return;
  profileSkillsHave.push({ name: val, level });
  document.getElementById('skill-have-input').value = '';
  renderSkillsHave();
}

function addSkillWant() {
  const val = document.getElementById('skill-want-input').value.trim();
  if (!val) return;
  profileSkillsWant.push({ name: val });
  document.getElementById('skill-want-input').value = '';
  renderSkillsWant();
}

function removeSkillHave(i) { profileSkillsHave.splice(i, 1); renderSkillsHave(); }
function removeSkillWant(i) { profileSkillsWant.splice(i, 1); renderSkillsWant(); }

async function saveProfile() {
  const name = document.getElementById('profile-name').value;
  const bio = document.getElementById('profile-bio').value;
  const msgEl = document.getElementById('profile-msg');
  try {
    currentUser = await api.users.update({ name, bio, skills_have: profileSkillsHave, skills_want: profileSkillsWant });
    document.getElementById('nav-username').textContent = currentUser.name;
    msgEl.textContent = '✓ Profile saved!';
    setTimeout(() => msgEl.textContent = '', 3000);
  } catch (e) { msgEl.textContent = e.message; msgEl.style.color = 'var(--error)'; }
}

// ========== USER MODAL ==========
async function viewUser(userId) {
  try {
    const user = await api.users.get(userId);
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
    const skillsHave = (user.skills_have || []).map(s => `<span class="skill-tag">${s.name} · ${s.level}</span>`).join('');
    const skillsWant = (user.skills_want || []).map(s => `<span class="skill-tag want">${s.name}</span>`).join('');
    const stars = user.rating ? '⭐'.repeat(Math.round(user.rating)) : '';
    
    document.getElementById('user-modal-content').innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;">
        <div class="avatar-large">${initials}</div>
        <div>
          <h3 style="font-family:var(--font-display);font-size:1.4rem">${user.name}</h3>
          <div class="rating-stars">${stars} ${user.rating ? user.rating + ' (' + user.rating_count + ' ratings)' : 'No ratings'}</div>
          <div style="color:var(--text2);font-size:0.85rem;margin-top:0.25rem">🏆 ${user.completed_projects} projects completed</div>
        </div>
      </div>
      <p style="color:var(--text2);margin-bottom:1.5rem">${user.bio || 'No bio'}</p>
      <div class="divider"></div>
      <h4 style="margin-bottom:0.5rem;color:var(--text2)">Skills Offered</h4>
      <div class="skill-tags" style="margin-bottom:1rem">${skillsHave || '<span style="color:var(--text3)">None listed</span>'}</div>
      <h4 style="margin-bottom:0.5rem;color:var(--text2)">Skills Wanted</h4>
      <div class="skill-tags" style="margin-bottom:1.5rem">${skillsWant || '<span style="color:var(--text3)">None listed</span>'}</div>
      <div class="divider"></div>
      <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1rem">
        <button class="btn-primary sm" onclick="closeAllModals();openRequestModal('${user._id}', '${user.name}')">Connect</button>
        <button class="btn-secondary" onclick="closeAllModals();startChat('${user._id}', '${user.name}')">Message</button>
        <div style="margin-left:auto;display:flex;gap:0.5rem;align-items:center">
          <span style="font-size:0.85rem;color:var(--text2)">Rate:</span>
          ${[1,2,3,4,5].map(n => `<button onclick="rateUser('${user._id}',${n})" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--warning)">⭐</button>`).join('')}
        </div>
      </div>
    `;
    openModal('user-modal');
  } catch (e) { console.error(e); }
}

async function rateUser(id, rating) {
  try {
    const result = await api.users.rate(id, rating);
    alert(`Rated! New rating: ${result.rating}`);
  } catch (e) { alert(e.message); }
}

// ========== PROJECT MODAL ==========
async function viewProject(projectId) {
  try {
    const p = await api.projects.get(projectId);
    const isMember = p.members.some(m => m._id === currentUser._id);
    const isOwner = p.owner._id === currentUser._id;
    const skills = (p.required_skills || []).map(s => `<span class="skill-tag">${s}</span>`).join('');
    const members = (p.members || []).map(m => {
      const ini = m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
      return `<span title="${m.name}" style="display:inline-flex;align-items:center;gap:0.3rem;font-size:0.85rem"><div class="avatar" style="width:28px;height:28px;font-size:0.7rem;display:inline-flex">${ini}</div>${m.name}</span>`;
    }).join('');
    
    let actions = '';
    if (!isMember) {
      actions += `<button class="btn-primary sm" onclick="joinProject('${p._id}')">Join Project</button>`;
    }
    if (isOwner) {
      actions += `
        <select id="status-select" style="width:auto">
          <option value="open" ${p.status==='open'?'selected':''}>Open</option>
          <option value="in-progress" ${p.status==='in-progress'?'selected':''}>In Progress</option>
          <option value="completed" ${p.status==='completed'?'selected':''}>Completed</option>
        </select>
        <button class="btn-secondary" onclick="updateProjectStatus('${p._id}')">Update Status</button>`;
    }
    
    document.getElementById('project-modal-content').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1rem;">
        <div>
          <span class="category-badge">${p.category}</span>
          <h3 style="font-family:var(--font-display);font-size:1.4rem;margin-top:0.5rem">${p.title}</h3>
        </div>
        <span class="status-badge status-${p.status}">${p.status}</span>
      </div>
      <p style="color:var(--text2);line-height:1.6;margin-bottom:1.5rem">${p.description}</p>
      <div class="divider"></div>
      <h4 style="margin-bottom:0.5rem;color:var(--text2)">Required Skills</h4>
      <div class="skill-tags" style="margin-bottom:1rem">${skills}</div>
      <h4 style="margin-bottom:0.5rem;color:var(--text2)">Team Members</h4>
      <div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-bottom:1.5rem">${members}</div>
      <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center;margin-top:1rem">${actions}</div>
    `;
    openModal('project-modal');
  } catch (e) { console.error(e); }
}

async function joinProject(id) {
  try {
    await api.projects.join(id);
    closeAllModals();
    loadProjects();
    alert('You joined the project! 🎉');
  } catch (e) { alert(e.message); }
}

async function updateProjectStatus(id) {
  const status = document.getElementById('status-select').value;
  try {
    await api.projects.update(id, { status });
    closeAllModals();
    loadProjects();
  } catch (e) { alert(e.message); }
}

// ========== REQUESTS ==========
function openRequestModal(userId, userName) {
  requestTarget = userId;
  document.getElementById('request-to-name').textContent = `To: ${userName}`;
  openModal('request-modal');
}

async function sendRequest() {
  const message = document.getElementById('request-message').value;
  try {
    await api.requests.send({ to: requestTarget, message });
    closeAllModals();
    alert('Request sent! 🤝');
  } catch (e) { alert(e.message); }
}

// ========== NOTIFICATIONS ==========
const NOTIF_ICONS = { request: '🤝', message: '💬', project: '◧', rating: '⭐', default: '🔔' };

function updateNotifBadge(count) {
  const badge = document.getElementById('notif-count');
  const navBadge = document.getElementById('req-badge'); // reuse for sidebar
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ---- TOAST ----
function showToast(notif) {
  const icon = NOTIF_ICONS[notif.type] || NOTIF_ICONS.default;
  const toast = document.createElement('div');
  toast.className = 'notif-toast';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-text">${notif.message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  document.getElementById('toast-container').appendChild(toast);
  // animate in
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  // auto-remove after 5s
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

// ---- PANEL ----
async function toggleNotifPanel() {
  notifPanelOpen = !notifPanelOpen;
  const panel = document.getElementById('notif-panel');
  if (notifPanelOpen) {
    panel.classList.remove('hidden');
    await renderNotifPanel();
  } else {
    panel.classList.add('hidden');
  }
}

async function renderNotifPanel() {
  const list = document.getElementById('notif-panel-list');
  list.innerHTML = `<div style="padding:1rem;color:var(--text3);text-align:center;font-size:0.85rem">Loading...</div>`;
  try {
    const notifs = await api.notifications.all();
    updateNotifBadge(notifs.filter(n => !n.read).length);

    if (!notifs.length) {
      list.innerHTML = `<div class="notif-empty"><div style="font-size:2rem">🔔</div><p>All caught up!</p></div>`;
      return;
    }
    list.innerHTML = notifs.map(n => {
      const icon = NOTIF_ICONS[n.type] || NOTIF_ICONS.default;
      const time = timeAgo(new Date(n.createdAt));
      return `<div class="notif-panel-item ${n.read ? '' : 'unread'}" id="ni-${n._id}">
        <span class="np-icon">${icon}</span>
        <div class="np-body">
          <p class="np-msg">${n.message}</p>
          <span class="np-time">${time}</span>
        </div>
        <div class="np-actions">
          ${!n.read ? `<button class="np-btn" title="Mark read" onclick="markOneRead('${n._id}')">✓</button>` : ''}
          <button class="np-btn danger" title="Delete" onclick="deleteNotif('${n._id}')">×</button>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    list.innerHTML = `<div style="padding:1rem;color:var(--error);font-size:0.85rem">Failed to load</div>`;
  }
}

async function markAllRead() {
  try {
    await api.notifications.readAll();
    updateNotifBadge(0);
    renderNotifPanel();
  } catch (e) { console.error(e); }
}

async function markOneRead(id) {
  try {
    await api.notifications.readOne(id);
    const el = document.getElementById(`ni-${id}`);
    if (el) el.classList.remove('unread');
    const btn = el?.querySelector('.np-btn:not(.danger)');
    if (btn) btn.remove();
    // recount
    const { count } = await api.notifications.unreadCount();
    updateNotifBadge(count);
  } catch (e) { console.error(e); }
}

async function deleteNotif(id) {
  try {
    await api.notifications.deleteOne(id);
    document.getElementById(`ni-${id}`)?.remove();
    const { count } = await api.notifications.unreadCount();
    updateNotifBadge(count);
  } catch (e) { console.error(e); }
}

async function clearAllNotifs() {
  if (!confirm('Clear all notifications?')) return;
  try {
    await api.notifications.clearAll();
    updateNotifBadge(0);
    renderNotifPanel();
  } catch (e) { console.error(e); }
}

// close panel when clicking outside
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notif-panel');
  const btn = document.getElementById('notif-bell-btn');
  if (notifPanelOpen && panel && !panel.contains(e.target) && !btn.contains(e.target)) {
    notifPanelOpen = false;
    panel.classList.add('hidden');
  }
});

// ---- HELPERS ----
function timeAgo(date) {
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// keep old compat shims so existing calls don't break
function toggleNotif() { toggleNotifPanel(); }
async function markNotifRead() { await markAllRead(); }

// ========== MODALS ==========
function openModal(id) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function closeAllModals() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}
