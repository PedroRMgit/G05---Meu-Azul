const API_BASE = '/api';
const agent = new AIAgent();

let projects = [];
let marketingTeam = [];
let notificationTimeout = null;
let currentUser = null;
let selectedRole = null;
let editingProjectId = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 6;

/* ─── Toast Notifications ─── */
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ─── Login ─── */
function showLogin() {
  currentUser = null;
  selectedRole = null;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.getElementById('mainNav').style.display = 'flex';
  document.getElementById('appNav').style.display = 'none';
  document.getElementById('appNav').innerHTML = '';
  document.getElementById('sidebarFooter').style.display = 'none';
  document.getElementById('sidebarProfile').style.display = 'none';
  document.getElementById('devToggleArea').style.display = 'none';
  document.getElementById('navSectionTitle').style.display = 'none';
  document.getElementById('page-login').classList.add('active');
  document.getElementById('loginStepRole').style.display = 'block';
  document.getElementById('loginStepAuth').style.display = 'none';
}

function selectRole(role) {
  selectedRole = role;
  const roleNames = {
    'diretor': 'Diretor',
    'gerente-marketing': 'Gerente de Marketing',
    'analista': 'Analista',
    'desenvolvedor': 'Desenvolvedor'
  };
  document.getElementById('loginStepRole').style.display = 'none';
  document.getElementById('loginStepAuth').style.display = 'block';
  document.getElementById('authSubtitle').textContent = `Acessar como ${roleNames[role]}`;
  document.getElementById('loginFormArea').style.display = 'none';
  document.getElementById('registerFormArea').style.display = 'none';
  document.getElementById('testFormArea').style.display = 'none';
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('registerError').style.display = 'none';
  document.getElementById('testError').style.display = 'none';
}

function backToRoleSelection() {
  selectedRole = null;
  document.getElementById('loginStepRole').style.display = 'block';
  document.getElementById('loginStepAuth').style.display = 'none';
}

function showLoginForm() {
  document.getElementById('loginFormArea').style.display = 'block';
  document.getElementById('registerFormArea').style.display = 'none';
  document.getElementById('testFormArea').style.display = 'none';
  document.getElementById('loginError').style.display = 'none';
  setTimeout(() => {
    document.getElementById('loginEmail').focus();
    document.getElementById('loginEmail').addEventListener('keydown', loginEnterHandler);
    document.getElementById('loginSenha').addEventListener('keydown', loginEnterHandler);
  }, 100);
}

function loginEnterHandler(e) {
  if (e.key === 'Enter') doLogin();
}

function showRegisterForm() {
  document.getElementById('loginFormArea').style.display = 'none';
  document.getElementById('registerFormArea').style.display = 'block';
  document.getElementById('testFormArea').style.display = 'none';
  document.getElementById('registerError').style.display = 'none';
  setTimeout(() => {
    document.getElementById('registerNome').focus();
    document.getElementById('registerNome').addEventListener('keydown', registerEnterHandler);
    document.getElementById('registerEmail').addEventListener('keydown', registerEnterHandler);
    document.getElementById('registerSenha').addEventListener('keydown', registerEnterHandler);
  }, 100);
}

function registerEnterHandler(e) {
  if (e.key === 'Enter') doRegister();
}

function showTestForm() {
  document.getElementById('loginFormArea').style.display = 'none';
  document.getElementById('registerFormArea').style.display = 'none';
  document.getElementById('testFormArea').style.display = 'block';
  document.getElementById('testError').style.display = 'none';
  setTimeout(() => {
    document.getElementById('testKey').focus();
    document.getElementById('testKey').addEventListener('keydown', testEnterHandler);
  }, 100);
}

function testEnterHandler(e) {
  if (e.key === 'Enter') doTest();
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value.trim();
  const errorEl = document.getElementById('loginError');
  if (!email || !senha) {
    errorEl.textContent = 'Preencha email e senha.';
    errorEl.style.display = 'block';
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha, role: selectedRole })
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Erro ao fazer login';
      errorEl.style.display = 'block';
      return;
    }
    currentUser = data;
    enterApp();
  } catch (err) {
    errorEl.textContent = 'Erro de conexão: ' + err.message;
    errorEl.style.display = 'block';
  }
}

async function doRegister() {
  const nome = document.getElementById('registerNome').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const senha = document.getElementById('registerSenha').value.trim();
  const errorEl = document.getElementById('registerError');
  if (!nome || !email || !senha) {
    errorEl.textContent = 'Preencha todos os campos.';
    errorEl.style.display = 'block';
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, role: selectedRole })
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Erro ao criar conta';
      errorEl.style.display = 'block';
      return;
    }
    currentUser = data;
    enterApp();
  } catch (err) {
    errorEl.textContent = 'Erro de conexão: ' + err.message;
    errorEl.style.display = 'block';
  }
}

async function doTest() {
  const key = document.getElementById('testKey').value.trim();
  const errorEl = document.getElementById('testError');
  if (!key) {
    errorEl.textContent = 'Digite a chave de teste.';
    errorEl.style.display = 'block';
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, role: selectedRole })
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Chave inválida';
      errorEl.style.display = 'block';
      return;
    }
    currentUser = data;
    enterApp();
  } catch (err) {
    errorEl.textContent = 'Erro de conexão: ' + err.message;
    errorEl.style.display = 'block';
  }
}

function enterApp() {
  const role = currentUser.role;
  const roleNames = {
    'diretor': 'Diretor',
    'gerente-marketing': 'Gerente de Marketing',
    'analista': 'Analista',
    'desenvolvedor': 'Desenvolvedor'
  };
  document.getElementById('mainNav').style.display = 'none';
  document.getElementById('sidebarFooter').style.display = 'block';
  document.getElementById('sidebarProfile').style.display = 'flex';
  document.getElementById('profileName').textContent = currentUser.nome;
  document.getElementById('profileRole').textContent = roleNames[role] || role;
  document.getElementById('devToggleArea').style.display = role === 'desenvolvedor' ? 'flex' : 'none';

  const nav = document.getElementById('appNav');
  nav.style.display = 'flex';
  const navItems = [];

  if (role === 'diretor' || role === 'desenvolvedor') {
    navItems.push({ page: 'dashboard', icon: '📊', label: 'Dashboard' });
  }
  if (role === 'gerente-marketing' || role === 'desenvolvedor') {
    navItems.push({ page: 'projetos', icon: '📋', label: 'Projetos' });
  }
  if (role === 'analista' || role === 'desenvolvedor') {
    navItems.push({ page: 'cadastrar-projeto', icon: '➕', label: 'Cadastrar' });
  }
  if (role === 'analista' || role === 'desenvolvedor') {
    navItems.push({ page: 'editar-projetos', icon: '✏️', label: 'Editar' });
  }

  nav.innerHTML = navItems.map((item, i) =>
    `<button class="nav-item ${i === 0 ? 'active' : ''}" data-page="${item.page}" onclick="navegar('${item.page}')">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    </button>`
  ).join('');

  document.getElementById('navSectionTitle').style.display = 'block';

  if (navItems.length > 0) {
    navegar(navItems[0].page);
  }
  loadProjects();
  loadMarketingTeam();
}

function logout() {
  currentUser = null;
  selectedRole = null;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.getElementById('mainNav').style.display = 'flex';
  document.getElementById('appNav').style.display = 'none';
  document.getElementById('appNav').innerHTML = '';
  document.getElementById('sidebarFooter').style.display = 'none';
  document.getElementById('sidebarProfile').style.display = 'none';
  document.getElementById('navSectionTitle').style.display = 'none';
  document.getElementById('loginStepRole').style.display = 'block';
  document.getElementById('loginStepAuth').style.display = 'none';
  document.getElementById('loginFormArea').style.display = 'none';
  document.getElementById('registerFormArea').style.display = 'none';
  document.getElementById('testFormArea').style.display = 'none';
  document.getElementById('page-login').classList.add('active');
  document.getElementById('loginCard').querySelectorAll('input').forEach(i => i.value = '');
}

function defaultPage() {
  if (!currentUser) return 'login';
  const role = currentUser.role;
  if (role === 'diretor' || role === 'desenvolvedor') return 'dashboard';
  if (role === 'gerente-marketing') return 'projetos';
  if (role === 'analista') return 'cadastrar-projeto';
  return 'login';
}

function navegar(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  const btn = document.querySelector(`[data-page="${page}"]`);
  if (btn) btn.classList.add('active');
  if (page === 'editar-projetos') renderEditProjectsList();
  if (page === 'projetos') renderProjects();
  if (page === 'dashboard') {
    renderProjects();
    renderVerticalChart();
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T23:59:59');
  return d.toLocaleDateString('pt-BR');
}

function formatMoney(value) {
  return `R$ ${(value || 0).toFixed(2)}`;
}

/* ─── Status & Progress Helpers ─── */
function getStatusInfo(p) {
  const hoje = new Date();
  const prazoDate = new Date(p.prazo + 'T23:59:59');
  const diff = Math.ceil((prazoDate - hoje) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: 'Atrasado', class: 'badge-danger', dot: 'red', diff };
  if (diff <= 7) return { label: 'Urgente', class: 'badge-warning', dot: 'yellow', diff };
  if (diff <= 30) return { label: 'Próximo', class: 'badge-info', dot: 'yellow', diff };
  return { label: 'OK', class: 'badge-success', dot: 'green', diff };
}

function getProgressInfo(p) {
  const criado = p.criadoEm ? new Date(p.criadoEm) : new Date();
  const prazo = new Date(p.prazo + 'T23:59:59');
  const hoje = new Date();
  const total = prazo - criado;
  const passado = hoje - criado;
  if (total <= 0) return 100;
  const pct = Math.min(100, Math.max(0, Math.round((passado / total) * 100)));
  return pct;
}

/* ─── Show Notification (legacy) ─── */
function showNotification(message, type = 'info') {
  const area = document.getElementById('notificationArea');
  if (!area) return;
  area.textContent = message;
  area.className = `notification notification-${type}`;
  area.style.display = 'block';
  if (notificationTimeout) clearTimeout(notificationTimeout);
  notificationTimeout = setTimeout(() => {
    area.style.display = 'none';
  }, 6000);
}

/* ─── Load Data ─── */
async function loadMarketingTeam() {
  try {
    const res = await fetch(`${API_BASE}/marketing-team`);
    marketingTeam = await res.json();
  } catch (err) {
    console.error('Erro ao carregar equipe de marketing:', err);
  }
}

async function loadProjects() {
  try {
    const res = await fetch(`${API_BASE}/projects`);
    projects = await res.json();
    renderProjects();
    updateDashboardStats();
    renderVerticalChart();
    agent.setProjects(projects);
  } catch (err) {
    console.error('Erro ao carregar projetos:', err);
  }
}

async function addProject(data) {
  try {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Erro ao cadastrar');
    const project = await res.json();
    projects.push(project);
    renderProjects();
    updateDashboardStats();
    renderVerticalChart();
    agent.setProjects(projects);
    if (project.precisaMarketing) {
      const team = marketingTeam.filter(m => m.vertical === project.vertical);
      if (team.length > 0) {
        const emails = team.map(m => m.email).join(', ');
        showNotification(`IA detectou que "${project.nome}" precisa de marketing. Notificar: ${emails}`, 'marketing');
        showToast(`📢 "${project.nome}" precisa de marketing!`, 'warning');
      } else {
        showNotification(`IA detectou que "${project.nome}" precisa de marketing. Nenhum membro cadastrado nessa vertical.`, 'warning');
        showToast(`📢 "${project.nome}" precisa de marketing, mas não há membros na vertical.`, 'warning');
      }
    } else {
      showNotification(`Projeto "${project.nome}" cadastrado com sucesso!`, 'info');
      showToast(`✅ Projeto "${project.nome}" cadastrado!`, 'success');
    }
    navegar(defaultPage());
  } catch (err) {
    alert('Erro ao cadastrar projeto: ' + err.message);
  }
}

async function deleteProject(id) {
  if (!confirm('Tem certeza que deseja remover este projeto?')) return;
  try {
    await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    projects = projects.filter(p => p.id !== id);
    renderProjects();
    updateDashboardStats();
    renderVerticalChart();
    agent.setProjects(projects);
    showToast('🗑️ Projeto removido com sucesso.', 'info');
  } catch (err) {
    alert('Erro ao remover projeto');
  }
}

/* ─── Render Projects (with filters, search, sort, pagination) ─── */
function renderProjects() {
  const list = document.getElementById('projectsList');
  if (!list) return;

  if (projects.length === 0) {
    list.innerHTML = '<p class="empty-state">Nenhum projeto cadastrado.</p>';
    document.getElementById('pagination').style.display = 'none';
    document.getElementById('projectCountInfo').textContent = '0 projetos';
    return;
  }

  const searchTerm = (document.getElementById('projectSearch')?.value || '').toLowerCase();
  const filterV = document.getElementById('filterVertical')?.value || '';
  const filterS = document.getElementById('filterStatus')?.value || '';
  const sortBy = document.getElementById('sortProjects')?.value || 'nome';

  let filtered = projects.filter(p => {
    if (searchTerm && !p.nome.toLowerCase().includes(searchTerm) &&
        !(p.responsavel || '').toLowerCase().includes(searchTerm) &&
        !(p.vertical || '').toLowerCase().includes(searchTerm)) return false;
    if (filterV && p.vertical !== filterV) return false;
    if (filterS) {
      const status = getStatusInfo(p);
      if (filterS === 'urgente' && status.label !== 'Urgente') return false;
      if (filterS === 'proximo' && status.label !== 'Próximo') return false;
      if (filterS === 'prazo' && status.label !== 'OK') return false;
      if (filterS === 'atrasado' && status.label !== 'Atrasado') return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'prazo') return a.prazo.localeCompare(b.prazo);
    if (sortBy === 'custo') return (b.custo || 0) - (a.custo || 0);
    if (sortBy === 'lucro') return (b.lucro || 0) - (a.lucro || 0);
    return a.nome.localeCompare(b.nome);
  });

  document.getElementById('projectCountInfo').textContent = `${filtered.length} de ${projects.length} projetos`;

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages || 1;
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-state">Nenhum projeto encontrado com os filtros atuais.</p>';
    document.getElementById('pagination').style.display = 'none';
    return;
  }

  list.innerHTML = pageItems.map(p => {
    const status = getStatusInfo(p);
    const progress = getProgressInfo(p);
    const lucroLiquido = (p.lucro || 0) - (p.custo || 0);
    const marketingScore = (p.cViability || 3) + (p.cImpact || 3) + (p.cAreas || 3) + (p.cAlignment || 3) + (p.cInnovation || 3);
    const barColor = status.dot === 'red' ? 'red' : status.dot === 'yellow' ? 'yellow' : 'green';
    const isProfit = lucroLiquido >= 0;

    return `
      <div class="project-card">
        <div class="project-card-header">
          <div class="project-card-header-left">
            <h3 title="${p.nome.replace(/"/g, '&quot;')}">${p.nome}</h3>
            <div class="project-card-responsavel">👤 ${p.responsavel || 'Sem responsável'}</div>
          </div>
          <span class="badge ${status.class}"><span class="status-dot ${status.dot}"></span> ${status.label}</span>
        </div>
        <div class="project-card-body">
          <div class="info-item">
            <span class="label">Vertical</span>
            <span class="value"><span class="tag">${p.vertical}</span></span>
          </div>
          <div class="info-item">
            <span class="label">Prazo</span>
            <span class="value">${formatDate(p.prazo)}${status.diff !== undefined ? ` (${status.diff}d)` : ''}</span>
          </div>
          <div class="info-item">
            <span class="label">Custo</span>
            <span class="value money">${p.custo ? formatMoney(p.custo) : '-'}</span>
          </div>
          <div class="info-item">
            <span class="label">Lucro</span>
            <span class="value money ${isProfit ? 'positive' : 'negative'}">${p.lucro ? formatMoney(p.lucro) : '-'}</span>
          </div>
          <div class="info-item">
            <span class="label">Equipe</span>
            <span class="value">${p.equipe} pessoa(s)</span>
          </div>
          <div class="info-item">
            <span class="label">Mkt Score</span>
            <span class="value">${marketingScore}/25</span>
          </div>
        </div>
        ${p.descricao ? `<div style="font-size:0.75rem;color:var(--text-muted);line-height:1.4;margin-top:-0.25rem;">${p.descricao.substring(0, 80)}${p.descricao.length > 80 ? '...' : ''}</div>` : ''}
        <div class="project-card-progress">
          <div class="progress-bar">
            <div class="progress-bar-fill ${barColor}" style="width:${progress}%"></div>
          </div>
          <div class="progress-labels">
            <span>Progresso</span>
            <span>${progress}%</span>
          </div>
        </div>
        <div class="project-card-footer">
          <div class="project-card-tags">
            ${p.precisaMarketing ? '<span class="tag tag-warning">📢 Marketing</span>' : ''}
            ${p.custo > 0 ? '<span class="tag tag-info">💰 ' + formatMoney(p.custo) + '</span>' : ''}
          </div>
          <div class="project-card-actions">
            ${currentUser && (currentUser.role === 'desenvolvedor' || currentUser.role === 'analista') ? `<button class="btn btn-ghost btn-xs" onclick="openEditModal(${p.id})">✏️</button>` : ''}
            ${currentUser && (currentUser.role === 'desenvolvedor' || currentUser.role === 'analista') ? `<button class="btn btn-ghost btn-xs" onclick="deleteProject(${p.id})" style="color:var(--danger)">🗑️</button>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');

  renderPagination(totalPages);
  updateFilterVerticalOptions();
}

function renderPagination(totalPages) {
  const pag = document.getElementById('pagination');
  if (!pag) return;
  if (totalPages <= 1) {
    pag.style.display = 'none';
    return;
  }
  pag.style.display = 'flex';
  let html = `<button onclick="goToPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
      html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (Math.abs(i - currentPage) === 2) {
      html += `<span class="page-info">…</span>`;
    }
  }
  html += `<button onclick="goToPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>›</button>`;
  pag.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  renderProjects();
}

function updateFilterVerticalOptions() {
  const sel = document.getElementById('filterVertical');
  if (!sel) return;
  const current = sel.value;
  const verts = [...new Set(projects.map(p => p.vertical))].sort();
  sel.innerHTML = `<option value="">Todas Verticais</option>` + verts.map(v => `<option value="${v}" ${v === current ? 'selected' : ''}>${v}</option>`).join('');
}

function filterAndRenderProjects() {
  currentPage = 1;
  renderProjects();
}

/* ─── Edit Projects List ─── */
function renderEditProjectsList() {
  const list = document.getElementById('editProjectsList');
  if (!list) return;
  const searchTerm = (document.getElementById('editProjectSearch')?.value || '').toLowerCase();
  let filtered = projects;
  if (searchTerm) {
    filtered = projects.filter(p =>
      p.nome.toLowerCase().includes(searchTerm) ||
      (p.responsavel || '').toLowerCase().includes(searchTerm) ||
      (p.vertical || '').toLowerCase().includes(searchTerm)
    );
  }
  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-state">Nenhum projeto encontrado.</p>';
    return;
  }
  list.innerHTML = filtered.map(p => {
    const hoje = new Date();
    const prazoDate = new Date(p.prazo + 'T23:59:59');
    const diff = Math.ceil((prazoDate - hoje) / (1000 * 60 * 60 * 24));
    const urgente = diff <= 7;
    return `
      <div class="project-card" style="margin-bottom:0.5rem;">
        <div class="project-card-header">
          <div class="project-card-header-left">
            <h3>${p.nome}</h3>
            <div class="project-card-responsavel">👤 ${p.responsavel || 'Sem responsável'}</div>
          </div>
          <div class="project-card-actions" style="display:flex;gap:0.35rem;">
            <button class="btn btn-secondary btn-xs" onclick="openEditModal(${p.id})">✏️ Editar</button>
            <button class="btn btn-danger btn-xs" onclick="deleteProject(${p.id})">🗑️</button>
          </div>
        </div>
        <div class="project-card-tags" style="margin-top:0.35rem;">
          <span class="tag">${p.vertical}</span>
          <span class="tag ${urgente ? 'tag-warning' : ''}">Prazo: ${formatDate(p.prazo)}</span>
          <span class="tag">Equipe: ${p.equipe}</span>
          ${p.custo > 0 ? `<span class="tag tag-info">Custo: ${formatMoney(p.custo)}</span>` : ''}
          ${p.lucro > 0 ? `<span class="tag tag-success">Lucro: ${formatMoney(p.lucro)}</span>` : ''}
        </div>
      </div>`;
  }).join('');
}

/* ─── Dashboard Stats ─── */
function updateDashboardStats() {
  const totalEl = document.getElementById('totalProjetos');
  const verticaisEl = document.getElementById('totalVerticais');
  const marketingEl = document.getElementById('totalMarketing');
  const custoEl = document.getElementById('totalCusto');
  const lucroEl = document.getElementById('totalLucro');
  const riscoEl = document.getElementById('totalRisco');
  const riscoTrend = document.getElementById('riscoTrend');

  if (totalEl) totalEl.textContent = projects.length;
  const verticais = new Set(projects.map(p => p.vertical));
  if (verticaisEl) verticaisEl.textContent = verticais.size;
  if (marketingEl) marketingEl.textContent = projects.filter(p => p.precisaMarketing).length;
  const custoTotal = projects.reduce((s, p) => s + (p.custo || 0), 0);
  const lucroTotal = projects.reduce((s, p) => s + (p.lucro || 0), 0);
  if (custoEl) custoEl.textContent = formatMoney(custoTotal);
  if (lucroEl) lucroEl.textContent = formatMoney(lucroTotal);

  const atrasados = projects.filter(p => {
    const d = new Date(p.prazo + 'T23:59:59');
    return d < new Date();
  });
  const urgentes = projects.filter(p => {
    const d = new Date(p.prazo + 'T23:59:59');
    const diff = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  });
  if (riscoEl) riscoEl.textContent = atrasados.length + urgentes.length;
  if (riscoTrend) {
    riscoTrend.textContent = `${atrasados.length} atrasado(s) · ${urgentes.length} urgente(s)`;
  }

  /* Vertical Breakdown */
  const breakdown = document.getElementById('verticalBreakdown');
  if (breakdown) {
    if (projects.length === 0) {
      breakdown.innerHTML = '<p class="empty-state">Nenhum projeto cadastrado.</p>';
    } else {
      const counts = {};
      projects.forEach(p => { counts[p.vertical] = (counts[p.vertical] || 0) + 1; });
      const total = projects.length;
      const colors = ['blue', 'green', 'yellow', 'red', 'purple'];
      let ci = 0;
      breakdown.innerHTML = `<div class="vertical-breakdown">${
        Object.entries(counts).map(([v, c]) => {
          const pct = (c / total * 100).toFixed(0);
          const color = colors[ci++ % colors.length];
          return `
            <div class="vertical-bar-item">
              <span class="vertical-bar-label">${v}</span>
              <div class="vertical-bar-track">
                <div class="vertical-bar-fill ${color}" style="width:${pct}%"></div>
              </div>
              <span class="vertical-bar-count">${c} (${pct}%)</span>
            </div>`;
        }).join('')
      }</div>`;
    }
  }

  /* Projects near deadline */
  updateProximosProjetos();

  /* Overdue projects */
  updateProjetosAtrasados();
}

function updateProximosProjetos() {
  const el = document.getElementById('proximosProjetos');
  const countEl = document.getElementById('proximosCount');
  if (!el) return;
  const hoje = new Date();
  const proximos = projects.filter(p => {
    const d = new Date(p.prazo + 'T23:59:59');
    const diff = Math.ceil((d - hoje) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  }).sort((a, b) => a.prazo.localeCompare(b.prazo));

  if (countEl) countEl.textContent = proximos.length;

  if (proximos.length === 0) {
    el.innerHTML = '<p class="empty-state">Nenhum projeto próximo do vencimento.</p>';
    return;
  }

  el.innerHTML = `<div class="mini-project-list">${proximos.slice(0, 5).map(p => {
    const d = new Date(p.prazo + 'T23:59:59');
    const diff = Math.ceil((d - hoje) / (1000 * 60 * 60 * 24));
    const urgente = diff <= 7;
    return `
      <div class="mini-project-card">
        <div class="mini-project-info">
          <div class="mini-project-name">${p.nome}</div>
          <div class="mini-project-meta">
            <span>${p.vertical}</span>
            <span class="badge ${urgente ? 'badge-warning' : 'badge-info'}">${diff}d</span>
          </div>
        </div>
        <div class="mini-project-actions">
          <button class="btn btn-ghost btn-xs" onclick="navegar('projetos')">Ver</button>
        </div>
      </div>`;
  }).join('')}${proximos.length > 5 ? `<p style="text-align:center;font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem;">+${proximos.length - 5} mais</p>` : ''}</div>`;
}

function updateProjetosAtrasados() {
  const el = document.getElementById('projetosAtrasados');
  const countEl = document.getElementById('atrasadosCount');
  if (!el) return;
  const hoje = new Date();
  const atrasados = projects.filter(p => {
    const d = new Date(p.prazo + 'T23:59:59');
    return d < hoje;
  }).sort((a, b) => a.prazo.localeCompare(b.prazo));

  if (countEl) countEl.textContent = atrasados.length;

  if (atrasados.length === 0) {
    el.innerHTML = '<p class="empty-state">Nenhum projeto atrasado. 🎉</p>';
    return;
  }

  el.innerHTML = `<div class="mini-project-list">${atrasados.slice(0, 5).map(p => {
    const d = new Date(p.prazo + 'T23:59:59');
    const diff = Math.ceil((hoje - d) / (1000 * 60 * 60 * 24));
    return `
      <div class="mini-project-card">
        <div class="mini-project-info">
          <div class="mini-project-name" style="color:var(--danger)">${p.nome}</div>
          <div class="mini-project-meta">
            <span>${p.vertical}</span>
            <span class="badge badge-danger">${diff}d atrasado</span>
          </div>
        </div>
        <div class="mini-project-actions">
          <button class="btn btn-ghost btn-xs" onclick="navegar('projetos')">Ver</button>
        </div>
      </div>`;
  }).join('')}${atrasados.length > 5 ? `<p style="text-align:center;font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem;">+${atrasados.length - 5} mais</p>` : ''}</div>`;
}

/* ─── Chart ─── */
function renderVerticalChart() {
  const canvas = document.getElementById('verticalChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = rect.width || 600;
  const h = 220;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);

  const counts = {};
  projects.forEach(p => { counts[p.vertical] = (counts[p.vertical] || 0) + 1; });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  ctx.clearRect(0, 0, w, h);

  if (entries.length === 0) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Nenhum projeto cadastrado', w / 2, h / 2);
    return;
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const barColors = ['#003399', '#3366ff', '#6088ff', '#8aa8ff', '#b3c7ff', '#dbe4ff'];
  const maxVal = Math.max(...entries.map(e => e[1]));
  const padding = { top: 20, bottom: 40, left: 20, right: 20 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const barWidth = Math.min(80, (chartW - (entries.length - 1) * 12) / entries.length);

  const totalWidth = entries.length * barWidth + (entries.length - 1) * 12;
  const startX = padding.left + (chartW - totalWidth) / 2;

  entries.forEach(([v, c], i) => {
    const x = startX + i * (barWidth + 12);
    const barH = (c / maxVal) * chartH;
    const y = padding.top + chartH - barH;

    const grad = ctx.createLinearGradient(x, y, x, padding.top + chartH);
    grad.addColorStop(0, barColors[i % barColors.length]);
    grad.addColorStop(1, barColors[(i + 1) % barColors.length] + '80');

    ctx.fillStyle = grad;
    ctx.beginPath();
    const r = 4;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + barWidth - r, y);
    ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
    ctx.lineTo(x + barWidth, padding.top + chartH);
    ctx.lineTo(x, padding.top + chartH);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c, x + barWidth / 2, y - 6);

    ctx.fillStyle = textColor;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    const label = v.length > 12 ? v.substring(0, 12) + '…' : v;
    ctx.fillText(label, x + barWidth / 2, padding.top + chartH + 16);
  });
}

/* ─── AI Analysis ─── */
function runAIAnalysis() {
  if (projects.length === 0) {
    showToast('📋 Cadastre pelo menos um projeto antes de executar a análise.', 'warning');
    return;
  }
  const loadingEl = document.getElementById('analysisLoading');
  const resultsEl = document.getElementById('aiResults');
  if (loadingEl) loadingEl.style.display = 'flex';
  if (resultsEl) resultsEl.style.display = 'none';

  setTimeout(() => {
    const analysis = agent.analyze();
    renderAnalysis(analysis);
    renderAIDashboardCards(analysis);
    if (loadingEl) loadingEl.style.display = 'none';
    if (resultsEl) resultsEl.style.display = 'grid';
    showToast('🤖 Análise concluída com sucesso!', 'success');
  }, 600);
}

function renderAIDashboardCards(analysis) {
  const container = document.getElementById('aiDashboardCards');
  if (!container) return;

  if (!analysis || projects.length === 0) {
    container.innerHTML = '<p class="empty-state">Faça a análise para ver recomendações inteligentes.</p>';
    return;
  }

  const conflitos = analysis.conflitos || [];
  const oportunidades = analysis.oportunidades || [];
  const marketingReqs = analysis.marketingRequests || [];
  const prioridades = analysis.prioridades || [];
  const topP = prioridades.filter(p => p.score >= 5).length;

  container.innerHTML = `
    <div class="ai-cards">
      <div class="ai-card">
        <div class="ai-card-header">
          <div class="ai-card-icon blue">⚡</div>
          <div>
            <div class="ai-card-title">Conflitos</div>
            <div class="ai-card-count">${conflitos.length} detectado(s)</div>
          </div>
        </div>
        <p style="font-size:0.8rem;color:var(--text-secondary);">${conflitos.length === 0 ? 'Nenhum conflito entre projetos.' : conflitos.map(c => c.mensagem).join('<br>')}</p>
      </div>
      <div class="ai-card">
        <div class="ai-card-header">
          <div class="ai-card-icon green">💰</div>
          <div>
            <div class="ai-card-title">Oportunidades</div>
            <div class="ai-card-count">${oportunidades.length} encontrada(s)</div>
          </div>
        </div>
        <p style="font-size:0.8rem;color:var(--text-secondary);">${oportunidades.length === 0 ? 'Nenhuma oportunidade identificada.' : oportunidades.map(o => o.mensagem).join('<br>')}</p>
      </div>
      <div class="ai-card">
        <div class="ai-card-header">
          <div class="ai-card-icon yellow">📢</div>
          <div>
            <div class="ai-card-title">Marketing</div>
            <div class="ai-card-count">${marketingReqs.length} solicitação(ões)</div>
          </div>
        </div>
        <p style="font-size:0.8rem;color:var(--text-secondary);">${marketingReqs.length === 0 ? 'Nenhum projeto requer marketing no momento.' : marketingReqs.map(m => m.mensagem).join('<br>')}</p>
      </div>
      <div class="ai-card">
        <div class="ai-card-header">
          <div class="ai-card-icon red">🏆</div>
          <div>
            <div class="ai-card-title">Prioridades</div>
            <div class="ai-card-count">${topP} projeto(s) crítico(s)/alto(s)</div>
          </div>
        </div>
        <p style="font-size:0.8rem;color:var(--text-secondary);">
          ${prioridades.length === 0 ? 'Nenhum projeto para avaliar.' : 
            prioridades.sort((a,b) => b.score - a.score).slice(0, 3).map((p, i) => 
              `${['🥇','🥈','🥉'][i]} ${p.nome} - ${p.nivel} (${p.score}/10)`
            ).join('<br>')}
        </p>
      </div>
    </div>`;
}

/* ─── AI Criteria Preview ─── */
function updateAICriteriaPreview() {
  const nome = document.getElementById('nome').value.trim();
  const descricao = document.getElementById('descricao').value.trim();
  const previewEl = document.getElementById('aiCriteriaPreview');
  if (!nome && !descricao) {
    previewEl.innerHTML = '<span style="font-size:0.82rem;color:var(--primary);">💡 Preencha o nome e a descrição para a IA calcular os critérios automaticamente.</span>';
    return;
  }
  const project = { nome, descricao };
  const criteria = agent.avaliarCriteriosMarketing(project);
  const total = criteria.cViability + criteria.cImpact + criteria.cAreas + criteria.cAlignment + criteria.cInnovation;
  previewEl.innerHTML = `
    <span style="font-size:0.82rem;color:var(--primary);font-weight:600;">🤖 IA calculou:</span>
    <span class="tag tag-success">${criteria.cViability}/5 Viab</span>
    <span class="tag tag-success">${criteria.cImpact}/5 Impacto</span>
    <span class="tag tag-success">${criteria.cAreas}/5 Áreas</span>
    <span class="tag tag-success">${criteria.cAlignment}/5 Estratégia</span>
    <span class="tag tag-success">${criteria.cInnovation}/5 Inovação</span>
    <span class="tag ${total >= 22 ? 'tag-warning' : total >= 18 ? 'tag-info' : 'tag-success'}">Total: ${total}/25</span>
  `;
}

document.getElementById('nome')?.addEventListener('input', updateAICriteriaPreview);
document.getElementById('descricao')?.addEventListener('input', updateAICriteriaPreview);

document.getElementById('projectForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('nome').value;
  const descricao = document.getElementById('descricao').value;
  const projectForAI = { nome, descricao };
  const criteria = agent.avaliarCriteriosMarketing(projectForAI);
  const data = {
    nome,
    vertical: document.getElementById('vertical').value,
    responsavel: document.getElementById('responsavel').value,
    descricao,
    prazo: document.getElementById('prazo').value,
    custo: parseFloat(document.getElementById('custo').value) || 0,
    lucro: parseFloat(document.getElementById('lucro').value) || 0,
    equipe: parseInt(document.getElementById('equipe').value) || 1,
    precisaMarketing: agent.detectarNecessidadeMarketing(projectForAI),
    cViability: criteria.cViability,
    cImpact: criteria.cImpact,
    cAreas: criteria.cAreas,
    cAlignment: criteria.cAlignment,
    cInnovation: criteria.cInnovation
  };
  await addProject(data);
  e.target.reset();
});

document.getElementById('runAnalysisBtn')?.addEventListener('click', () => {
  if (projects.length === 0) {
    showToast('📋 Cadastre pelo menos um projeto antes de executar a análise.', 'warning');
    return;
  }
  const loadingEl = document.getElementById('analysisLoading');
  const resultsEl = document.getElementById('aiResults');
  if (loadingEl) loadingEl.style.display = 'flex';
  if (resultsEl) resultsEl.style.display = 'none';

  setTimeout(() => {
    const analysis = agent.analyze();
    renderAnalysis(analysis);
    if (loadingEl) loadingEl.style.display = 'none';
    if (resultsEl) resultsEl.style.display = 'grid';
    showToast('🤖 Análise concluída!', 'success');
  }, 600);
});

function renderAnalysis(analysis) {
  const prioridadeEl = document.getElementById('prioridadeContent');
  if ((!analysis.marketingRanking || analysis.marketingRanking.length === 0) &&
      (!analysis.prioridades || analysis.prioridades.length === 0)) {
    prioridadeEl.innerHTML = '<p class="empty-state">Nenhum projeto disponível para análise.</p>';
  } else {
    const medals = ['🥇', '🥈', '🥉'];
    const prioridadeMap = {};
    (analysis.prioridades || []).forEach(p => { prioridadeMap[p.id] = p; });
    const combined = (analysis.marketingRanking || []).map(m => {
      const prio = prioridadeMap[m.id] || {};
      const totalScore = (prio.score || 5) * 2.5 + (m.score || 0);
      return { ...m, ...prio, totalScore, marketingScore: m.score, priorityScore: prio.score };
    }).sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    prioridadeEl.innerHTML = combined.map((p, i) => {
      const isTop3 = i < 3;
      const bg = isTop3 ? 'var(--warning-bg)' : 'transparent';
      const medal = isTop3 ? medals[i] : `<span style="font-size:0.8rem;color:var(--text-muted);">#${i+1}</span>`;
      const marketingPct = ((p.marketingScore || 0) / 25) * 100;
      const marketingColor = (p.marketingScore || 0) >= 22 ? 'var(--danger)' : (p.marketingScore || 0) >= 18 ? 'var(--warning)' : (p.marketingScore || 0) >= 13 ? 'var(--info)' : 'var(--text-muted)';
      const priorityPct = ((p.priorityScore || 0) / 10) * 100;
      const priorityColor = (p.priorityScore || 0) >= 8 ? 'var(--danger)' : (p.priorityScore || 0) >= 5 ? 'var(--warning)' : (p.priorityScore || 0) >= 3 ? 'var(--info)' : 'var(--text-muted)';
      const nivel = p.nivel || 'Médio';
      const nivelClass = nivel === 'Crítica' || nivel === 'Crítico' ? 'badge-danger' : nivel === 'Alta' ? 'badge-warning' : nivel === 'Médio' || nivel === 'Media' ? 'badge-info' : 'badge-muted';
      return `
        <div class="ai-item" style="background:${bg};border-radius:6px;padding:0.65rem;${isTop3 ? 'border:1px solid var(--warning-bg);margin-bottom:0.35rem;' : 'margin-bottom:0.25rem;'}">
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <span style="font-size:1.1rem;">${medal}</span>
            <strong style="flex:1;min-width:100px;">${p.nome || 'Sem nome'}</strong>
            <span class="tag">${p.vertical || ''}</span>
            <span class="badge ${nivelClass}">${nivel}</span>
          </div>
          <div style="display:flex;gap:0.5rem;margin-top:0.35rem;flex-wrap:wrap;font-size:0.75rem;color:var(--text-secondary);">
            <span>🎯 Prioridade: <strong>${p.priorityScore || '?'}/10</strong></span>
            <span>📢 Marketing: <strong>${p.marketingScore || '?'}/25</strong></span>
            ${p.diasRestantes !== undefined ? `<span>📅 ${p.diasRestantes} dias restantes</span>` : ''}
            ${p.prazo ? `<span>⏰ Prazo: ${formatDate(p.prazo)}</span>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:0.2rem;margin-top:0.25rem;">
            <div class="priority-bar">
              <span style="font-size:0.72rem;color:var(--text-secondary);font-weight:600;min-width:110px;">Prioridade:</span>
              <div class="priority-fill"><span style="width:${priorityPct}%;background:${priorityColor}"></span></div>
              <span style="font-size:0.72rem;color:var(--text-secondary);min-width:30px;text-align:right;">${p.priorityScore || 0}/10</span>
            </div>
            <div class="priority-bar">
              <span style="font-size:0.72rem;color:var(--text-secondary);font-weight:600;min-width:110px;">Marketing:</span>
              <div class="priority-fill"><span style="width:${marketingPct}%;background:${marketingColor}"></span></div>
              <span style="font-size:0.72rem;color:var(--text-secondary);min-width:30px;text-align:right;">${p.marketingScore || 0}/25</span>
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;margin-top:0.25rem;flex-wrap:wrap;font-size:0.72rem;color:var(--text-muted);">
            <span>Viab: ${p.viabilidade || 0}/5</span>
            <span>Impacto: ${p.impacto || 0}/5</span>
            <span>Áreas: ${p.areas || 0}/5</span>
            <span>Estratégia: ${p.alinhamento || 0}/5</span>
            <span>Inovação: ${p.inovacao || 0}/5</span>
          </div>
        </div>
      `;
    }).join('');
  }

  const conflitosEl = document.getElementById('conflitosContent');
  if (analysis.conflitos.length === 0) {
    conflitosEl.innerHTML = '<p class="empty-state">Nenhum conflito detectado.</p>';
  } else {
    conflitosEl.innerHTML = analysis.conflitos.map(c => `
      <div class="ai-item">
        <span class="badge ${c.gravidade === 'alta' ? 'badge-danger' : 'badge-warning'}">${c.gravidade === 'alta' ? 'Alta' : 'Média'}</span>
        ${c.mensagem}
      </div>
    `).join('');
  }

  const oportunidadesEl = document.getElementById('oportunidadesContent');
  if (analysis.oportunidades.length === 0) {
    oportunidadesEl.innerHTML = '<p class="empty-state">Nenhuma oportunidade identificada.</p>';
  } else {
    oportunidadesEl.innerHTML = analysis.oportunidades.map(o => `
      <div class="ai-item">
        <strong>💰 ${o.economia}</strong> - ${o.mensagem}
      </div>
    `).join('');
  }

  const marketingEl = document.getElementById('marketingContent');
  if (analysis.marketingRequests.length === 0) {
    marketingEl.innerHTML = '<p class="empty-state">Nenhuma solicitação de marketing.</p>';
  } else {
    marketingEl.innerHTML = analysis.marketingRequests.map(m => {
      const team = marketingTeam.filter(t => t.vertical === m.vertical);
      const contatos = team.length > 0
        ? `<div style="margin-top:0.25rem;font-size:0.8rem;color:var(--info);">📧 Notificar: ${team.map(t => t.email).join(', ')}</div>`
        : '<div style="margin-top:0.25rem;font-size:0.8rem;color:var(--warning-text);">⚠ Nenhum membro de marketing cadastrado para esta vertical.</div>';
      return `
      <div class="ai-item">
        <span class="badge badge-warning">Marketing</span>
        ${m.mensagem}
        ${contatos}
      </div>`;
    }).join('');
  }

  const resumosEl = document.getElementById('resumosContent');
  if (analysis.resumos.length === 0) {
    resumosEl.innerHTML = '<p class="empty-state">Nenhum resumo disponível.</p>';
  } else {
    resumosEl.innerHTML = analysis.resumos.map(r => `
      <div class="resumo-card">
        <h4>${r.nome}</h4>
        <p>${r.resumo}</p>
        <div class="project-meta" style="margin-top:0.4rem;display:flex;gap:0.35rem;flex-wrap:wrap;">
          <span class="tag">${r.vertical}</span>
          <span class="tag ${r.statusPrazo === 'urgente' ? 'tag-warning' : r.statusPrazo === 'atrasado' ? 'tag-danger' : r.statusPrazo === 'próximo' ? 'tag-info' : 'tag-success'}">${r.statusPrazo}</span>
          <span class="tag">Equipe: ${r.equipe}</span>
          ${r.custo ? `<span class="tag tag-info">Custo: ${formatMoney(r.custo)}</span>` : ''}
          ${r.lucro ? `<span class="tag tag-success">Lucro: ${formatMoney(r.lucro)}</span>` : ''}
        </div>
      </div>
    `).join('');
  }
}

/* ─── Refresh Dashboard ─── */
function refreshDashboard() {
  loadProjects();
  showToast('🔄 Dashboard atualizado!', 'success');
}

/* ─── Edit Modal ─── */
function openEditModal(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  editingProjectId = id;
  document.getElementById('editNome').value = p.nome || '';
  document.getElementById('editResponsavel').value = p.responsavel || '';
  document.getElementById('editPrazo').value = p.prazo || '';
  document.getElementById('editCusto').value = p.custo || '';
  document.getElementById('editLucro').value = p.lucro || '';
  document.getElementById('editEquipe').value = p.equipe || 1;
  document.getElementById('editDescricao').value = p.descricao || '';

  const sel = document.getElementById('editVertical');
  const usedValues = [...new Set(projects.map(x => x.vertical))];
  const allValues = ['Viagens', 'Conecta', 'Azul (Marca Mae)', 'Fidelidade', 'Logistica', 'TecOps'];
  const options = [...new Set([...allValues, ...usedValues])];
  sel.innerHTML = options.map(v => `<option value="${v}" ${v === p.vertical ? 'selected' : ''}>${v}</option>`).join('');

  document.getElementById('editProjectModal').style.display = 'flex';
}

function closeEditModal() {
  editingProjectId = null;
  document.getElementById('editProjectModal').style.display = 'none';
}

async function saveEditProject() {
  if (!editingProjectId) return;
  const data = {
    nome: document.getElementById('editNome').value.trim(),
    vertical: document.getElementById('editVertical').value,
    responsavel: document.getElementById('editResponsavel').value.trim(),
    prazo: document.getElementById('editPrazo').value,
    custo: parseFloat(document.getElementById('editCusto').value) || 0,
    lucro: parseFloat(document.getElementById('editLucro').value) || 0,
    equipe: parseInt(document.getElementById('editEquipe').value) || 1,
    descricao: document.getElementById('editDescricao').value.trim()
  };
  try {
    const res = await fetch(`${API_BASE}/projects/${editingProjectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Erro ao salvar');
    const updated = await res.json();
    const idx = projects.findIndex(p => p.id === editingProjectId);
    if (idx !== -1) projects[idx] = updated;
    closeEditModal();
    renderEditProjectsList();
    renderProjects();
    updateDashboardStats();
    renderVerticalChart();
    agent.setProjects(projects);
    showNotification('Projeto atualizado com sucesso!', 'info');
    showToast('✅ Projeto atualizado com sucesso!', 'success');
  } catch (err) {
    alert('Erro ao salvar: ' + err.message);
  }
}

/* ─── Dev Edit Mode ─── */
let editModeActive = false;

const EDITABLE_SELECTORS = [
  { cat: 'nav_labels', sel: '#appNav .nav-item .nav-label', key: el => {
    const page = el.closest('.nav-item')?.dataset?.page;
    const map = { dashboard:'nav_dashboard', projetos:'nav_projetos', 'cadastrar-projeto':'nav_cadastrar', 'editar-projetos':'nav_editar' };
    return map[page] || page;
  }},
  { cat: 'ai_panels', sel: '.ai-panel h3', key: el => {
    const texts = ['Prioridade', 'Conflitos', 'Oportunidades', 'Marketing', 'Resumo'];
    for (const t of texts) { if (el.textContent.includes(t)) return 'panel_' + t.toLowerCase(); }
    return null;
  }},
  { cat: 'btn_labels', sel: '#runAnalysisBtn', key: 'btn_analisar' },
  { cat: 'btn_labels', sel: '#projectForm .btn-primary', key: 'btn_cadastrar' },
];

const REORDERABLE_SELECTORS = [
  { cat: 'nav_labels', container: '#appNav', items: '.nav-item' },
  { cat: 'verticals', container: '#vertical', items: 'option[value]' },
  { cat: 'verticals', container: '#mktVertical', items: 'option[value]' },
];

function showEditNotification(msg, type) {
  const el = document.getElementById('editModeNotification');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.background = type === 'success' ? '#dcfce7' : type === 'error' ? '#fee2e2' : '#e8f0fe';
  el.style.color = type === 'success' ? '#166534' : type === 'error' ? '#991b1b' : '#003399';
  el.style.border = `1px solid ${type === 'success' ? '#86efac' : type === 'error' ? '#fecaca' : '#b3d4ff'}`;
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

let editModeSnapshot = null;

function takeSnapshot() {
  const snap = {};
  const nav = document.getElementById('appNav');
  if (nav) snap.appNavHTML = nav.innerHTML;

  const vSel = document.getElementById('vertical');
  const mSel = document.getElementById('mktVertical');
  if (vSel) snap.verticalHTML = vSel.innerHTML;
  if (mSel) snap.mktVerticalHTML = mSel.innerHTML;

  const panels = document.querySelectorAll('.ai-results .ai-panel');
  snap.panelOrder = [...panels].map(p => p.outerHTML);

  const edits = {};
  for (const cfg of EDITABLE_SELECTORS) {
    document.querySelectorAll(cfg.sel).forEach(el => {
      const key = typeof cfg.key === 'function' ? cfg.key(el) : cfg.key;
      if (key) edits[key] = el.textContent.trim();
    });
  }
  snap.edits = edits;

  const sizes = {};
  document.querySelectorAll(RESIZABLE_SEL).forEach(el => {
    if (el.id) sizes[el.id] = { w: el.style.width, h: el.style.height };
  });
  snap.sizes = sizes;

  return snap;
}

function restoreSnapshot(snap) {
  const nav = document.getElementById('appNav');
  if (nav && snap.appNavHTML) nav.innerHTML = snap.appNavHTML;

  const vSel = document.getElementById('vertical');
  const mSel = document.getElementById('mktVertical');
  if (vSel && snap.verticalHTML) vSel.innerHTML = snap.verticalHTML;
  if (mSel && snap.mktVerticalHTML) mSel.innerHTML = snap.mktVerticalHTML;

  const cont = document.querySelector('.ai-results');
  if (cont && snap.panelOrder) cont.innerHTML = snap.panelOrder.join('');

  for (const sel of Object.keys(snap.sizes || {})) {
    const el = document.getElementById(sel);
    if (el) { el.style.width = snap.sizes[sel].w; el.style.height = snap.sizes[sel].h; }
  }

  document.querySelectorAll('.editable-select-list').forEach(el => el.remove());
  document.querySelectorAll('.resize-handle').forEach(el => el.remove());
  document.querySelectorAll('[style*="width"]').forEach(el => {
    if (el.classList.contains('ai-panel') || el.classList.contains('section-block') ||
        el.classList.contains('stat-card') || el.classList.contains('project-card')) {
      el.style.width = ''; el.style.height = '';
    }
  });
}

function toggleEditMode() {
  editModeActive = !editModeActive;
  const bar = document.getElementById('editModeBar');
  const toggle = document.getElementById('editModeToggle');
  if (editModeActive) {
    bar.style.display = 'flex';
    if (toggle) toggle.checked = true;
    enableInlineEditing();
  } else {
    bar.style.display = 'none';
    if (toggle) toggle.checked = false;
    disableInlineEditing();
  }
}

function cancelEditMode() {
  if (editModeSnapshot) restoreSnapshot(editModeSnapshot);
  editModeActive = true;
  disableInlineEditing();
  editModeActive = false;
  editModeSnapshot = null;
  const bar = document.getElementById('editModeBar');
  const toggle = document.getElementById('editModeToggle');
  bar.style.display = 'none';
  if (toggle) toggle.checked = false;
}

function enableInlineEditing() {
  editModeSnapshot = takeSnapshot();

  document.querySelectorAll('.nav-item').forEach(ni => ni.style.cursor = 'grab');

  for (const cfg of EDITABLE_SELECTORS) {
    document.querySelectorAll(cfg.sel).forEach(el => {
      el.contentEditable = 'true';
      el.classList.add('editable-highlight');
      el.dataset.devCat = cfg.cat;
      el.dataset.devKey = typeof cfg.key === 'function' ? cfg.key(el) : cfg.key;
      el.dataset.devOld = el.textContent.trim();
    });
  }

  for (const cfg of REORDERABLE_SELECTORS) {
    const container = document.querySelector(cfg.container);
    if (!container) continue;
    container.classList.add('reorderable-container');
    if (container.tagName === 'SELECT') replaceSelectWithEditableList(container, cfg.cat);
  }

  enableBoxResizing();
  enableBoxRepositioning();

  document.addEventListener('keydown', editKeyHandler);
}

function disableInlineEditing() {
  document.querySelectorAll('.nav-item').forEach(ni => ni.style.cursor = '');

  for (const cfg of EDITABLE_SELECTORS) {
    document.querySelectorAll(cfg.sel).forEach(el => {
      el.contentEditable = 'false';
      el.classList.remove('editable-highlight');
      delete el.dataset.devCat;
      delete el.dataset.devKey;
      delete el.dataset.devOld;
    });
  }

  for (const cfg of REORDERABLE_SELECTORS) {
    const container = document.querySelector(cfg.container);
    if (!container) continue;
    container.classList.remove('reorderable-container');
    if (container.dataset.editableList) {
      const list = document.querySelector(`.editable-select-list[data-for-select="${container.id}"]`);
      if (list) {
        list.querySelectorAll('.editable-option').forEach(el => {
          const input = el.querySelector('.editable-option-input');
          const opt = container.querySelector(`option[value="${el.dataset.value}"]`);
          if (opt && input) opt.textContent = input.value;
        });
      }
      delete container.dataset.editableList;
    }
  }

  document.querySelectorAll('.editable-select-list').forEach(el => {
    const sel = document.getElementById(el.dataset.forSelect);
    if (sel) sel.style.display = '';
    el.remove();
  });

  disableBoxResizing();
  disableBoxRepositioning();

  document.removeEventListener('keydown', editKeyHandler);
}

function editKeyHandler(e) {
  if (e.key === 'Escape') cancelEditMode();
}

let newItemCounter = 0;

function replaceSelectWithEditableList(select, cat) {
  const list = document.createElement('div');
  list.className = 'editable-select-list';
  list.dataset.forSelect = select.id;
  select.dataset.editableList = 'true';
  const items = [];
  [...select.querySelectorAll('option')].forEach(opt => {
    if (!opt.value) return;
    items.push({ value: opt.value, text: opt.textContent });
  });
  list.innerHTML = items.map((item, idx) => `
    <div class="editable-option" draggable="true" data-cat="${cat}" data-value="${item.value.replace(/"/g, '&quot;')}">
      <span class="drag-handle">⠿</span>
      <input type="text" class="editable-option-input" value="${item.text.replace(/"/g, '&quot;')}" data-old="${item.text.replace(/"/g, '&quot;')}">
      <span class="option-value-tag">${item.value}</span>
      <button class="dev-del-btn" onclick="deleteEditableOption(this)" title="Remover">✕</button>
    </div>
  `).join('');
  list.innerHTML += `<button class="dev-add-btn" onclick="addEditableOption(this, '${cat}')">+ Adicionar</button>`;
  select.parentNode.insertBefore(list, select.nextSibling);
  select.style.display = 'none';

  list.querySelectorAll('.editable-option').forEach(el => {
    el.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const dragged = list.querySelector('.dragging');
      if (dragged && dragged !== el) {
        if ([...list.querySelectorAll('.editable-option')].indexOf(dragged) < [...list.querySelectorAll('.editable-option')].indexOf(el))
          list.insertBefore(dragged, el.nextSibling);
        else list.insertBefore(dragged, el);
      }
    });
  });
}

function deleteEditableOption(btn) {
  const opt = btn.closest('.editable-option');
  if (opt) opt.remove();
}

function addEditableOption(btn, cat) {
  const list = btn.parentElement;
  const newKey = `__new_${newItemCounter++}`;
  const div = document.createElement('div');
  div.className = 'editable-option';
  div.draggable = true;
  div.dataset.cat = cat;
  div.dataset.value = newKey;
  div.innerHTML = `
    <span class="drag-handle">⠿</span>
    <input type="text" class="editable-option-input" value="Novo Item" data-old="">
    <span class="option-value-tag">${newKey}</span>
    <button class="dev-del-btn" onclick="deleteEditableOption(this)" title="Remover">✕</button>
  `;
  list.insertBefore(div, btn);
  div.querySelector('input').focus();
  div.querySelector('input').select();

  div.addEventListener('dragstart', e => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    div.classList.add('dragging');
  });
  div.addEventListener('dragend', () => div.classList.remove('dragging'));
  div.addEventListener('dragover', e => { e.preventDefault(); div.classList.add('drag-over'); });
  div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
  div.addEventListener('drop', e => {
    e.preventDefault();
    div.classList.remove('drag-over');
    const dragged = list.querySelector('.dragging');
    if (dragged && dragged !== div) {
      if ([...list.querySelectorAll('.editable-option')].indexOf(dragged) < [...list.querySelectorAll('.editable-option')].indexOf(div))
        list.insertBefore(dragged, div.nextSibling);
      else list.insertBefore(dragged, div);
    }
  });
}

/* ─── Box Resizing ─── */
const RESIZABLE_SEL = '.ai-panel, .section-block, .stat-card, .project-card';
let resizeObserver = null;

function enableBoxResizing() {
  document.querySelectorAll(RESIZABLE_SEL).forEach(el => {
    el.classList.add('dev-resizable');
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.innerHTML = '↘';
    el.appendChild(handle);

    let startX, startY, startW, startH;
    const onMouseDown = (e) => {
      e.preventDefault(); e.stopPropagation();
      startX = e.clientX; startY = e.clientY;
      startW = el.offsetWidth; startH = el.offsetHeight;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
    const onMouseMove = (e) => {
      const w = Math.max(120, startW + (e.clientX - startX));
      const h = Math.max(60, startH + (e.clientY - startY));
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      el.dataset.devWidth = w;
      el.dataset.devHeight = h;
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    handle.addEventListener('mousedown', onMouseDown);
  });
}

function disableBoxResizing() {
  document.querySelectorAll(RESIZABLE_SEL).forEach(el => {
    el.classList.remove('dev-resizable');
    const handle = el.querySelector('.resize-handle');
    if (handle) handle.remove();
  });
}

/* ─── Box Repositioning ─── */
const REPOSITIONABLE_CONT = '.ai-results';

function enableBoxRepositioning() {
  const cont = document.querySelector(REPOSITIONABLE_CONT);
  if (!cont) return;

  cont.querySelectorAll('.ai-panel').forEach(el => {
    el.draggable = true;
    el.classList.add('dev-draggable');
    el.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', el.dataset.devOrigIdx || '');
      el.classList.add('dragging-panel');
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging-panel'));
    el.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    el.addEventListener('drop', e => {
      e.preventDefault();
      const dragged = cont.querySelector('.dragging-panel');
      if (dragged && dragged !== el) {
        const items = [...cont.querySelectorAll('.ai-panel')];
        const fromIdx = items.indexOf(dragged);
        const toIdx = items.indexOf(el);
        if (fromIdx < toIdx) cont.insertBefore(dragged, el.nextSibling);
        else cont.insertBefore(dragged, el);
      }
    });
  });
}

function disableBoxRepositioning() {
  const cont = document.querySelector(REPOSITIONABLE_CONT);
  if (!cont) return;
  cont.querySelectorAll('.ai-panel').forEach(el => {
    el.draggable = false;
    el.classList.remove('dev-draggable');
  });
}

async function saveInlineEdits() {
  const categories = {};
  const deleted = {};

  function ensureCat(cat) { if (!categories[cat]) categories[cat] = { items: [] }; }
  function ensureDel(cat) { if (!deleted[cat]) deleted[cat] = []; }

  for (const cfg of EDITABLE_SELECTORS) {
    document.querySelectorAll(cfg.sel).forEach(el => {
      if (!el.dataset.devCat || !el.dataset.devKey) return;
      const cat = el.dataset.devCat;
      const key = el.dataset.devKey;
      const value = el.textContent.trim();
      const oldValue = el.dataset.devOld || value;
      ensureCat(cat);
      categories[cat].items.push({ key, value, oldValue });
    });
  }

  for (const cfg of REORDERABLE_SELECTORS) {
    if (cfg.cat === 'nav_labels') {
      const container = document.querySelector(cfg.container);
      if (!container) continue;
      ensureCat('nav_labels');
      container.querySelectorAll(cfg.items).forEach(el => {
        const label = el.querySelector('.nav-label');
        if (!label) return;
        const key = label.dataset.devKey || el.dataset.page;
        const value = label.textContent.trim();
        const oldValue = label.dataset.devOld || value;
        if (key && !categories.nav_labels.items.find(i => i.key === key)) {
          categories.nav_labels.items.push({ key, value, oldValue });
        }
      });
      if (editModeSnapshot && editModeSnapshot.edits) {
        const snapshotKeys = Object.keys(editModeSnapshot.edits).filter(k => k.startsWith('nav_'));
        const currentKeys = categories.nav_labels.items.map(i => i.key);
        snapshotKeys.forEach(k => {
          if (!currentKeys.includes(k)) { ensureDel('nav_labels'); deleted.nav_labels.push(k); }
        });
      }
    }
    if (cfg.cat === 'verticals' && cfg.container.includes('#')) {
      const select = document.querySelector(cfg.container);
      if (!select || select.style.display !== 'none') continue;
      const list = document.querySelector(`.editable-select-list[data-for-select="${select.id}"]`);
      if (!list) continue;
      ensureCat('verticals');
      list.querySelectorAll('.editable-option').forEach(el => {
        const input = el.querySelector('.editable-option-input');
        const key = el.dataset.value;
        const value = input ? input.value.trim() : '';
        const oldValue = input ? (input.dataset.old || value) : value;
        if (key && !categories.verticals.items.find(i => i.key === key)) {
          categories.verticals.items.push({ key, value, oldValue });
        }
      });
      if (editModeSnapshot) {
        const vSel = document.getElementById('vertical');
        if (vSel) {
          const oldVals = [...editModeSnapshot.verticalHTML.matchAll(/value="([^"]+)"/g)].map(m => m[1]);
          const currentVals = categories.verticals.items.map(i => i.key);
          oldVals.forEach(v => {
            if (!currentVals.includes(v)) { ensureDel('verticals'); deleted.verticals.push(v); }
          });
        }
      }
    }
  }

  for (const catKey of Object.keys(categories)) {
    categories[catKey].items = categories[catKey].items.filter(i => i.key);
  }

  if (Object.keys(categories).length === 0 && Object.keys(deleted).length === 0) {
    showEditNotification('Nada foi alterado.', 'info');
    toggleEditMode();
    return;
  }

  try {
    const body = { categories };
    if (Object.keys(deleted).length > 0) body.deleted = deleted;
    const res = await fetch(`${API_BASE}/dev/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao salvar');
    showEditNotification('✅ ' + result.message, 'success');
    toggleEditMode();
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    showEditNotification('❌ Erro: ' + err.message, 'error');
  }
}

async function devPushNow() {
  showEditNotification('⏳ Executando push...', 'info');
  try {
    const res = await fetch(`${API_BASE}/dev/git/push`, { method: 'POST' });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro no push');
    showEditNotification('✅ Push realizado: ' + (result.output || '').substring(0, 200), 'success');
  } catch (err) {
    showEditNotification('❌ Erro no push: ' + err.message, 'error');
  }
}

/* ─── Init ─── */
if (localStorage.getItem('meuazul-theme') === 'dark') {
  document.documentElement.removeAttribute('data-theme');
  localStorage.setItem('meuazul-theme', 'light');
}
showLogin();
