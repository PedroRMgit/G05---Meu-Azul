const API_BASE = '/api';
const agent = new AIAgent();

let projects = [];
let marketingTeam = [];
let notificationTimeout = null;
let currentUser = null;
let selectedRole = null;
let editingProjectId = null;

function showLogin() {
  currentUser = null;
  selectedRole = null;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.getElementById('mainNav').style.display = 'flex';
  document.getElementById('appNav').style.display = 'none';
  document.getElementById('appNav').innerHTML = '';
  document.getElementById('sidebarProfile').style.display = 'none';
  document.getElementById('devToggleArea').style.display = 'none';
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
}

function showRegisterForm() {
  document.getElementById('loginFormArea').style.display = 'none';
  document.getElementById('registerFormArea').style.display = 'block';
  document.getElementById('testFormArea').style.display = 'none';
  document.getElementById('registerError').style.display = 'none';
}

function showTestForm() {
  document.getElementById('loginFormArea').style.display = 'none';
  document.getElementById('registerFormArea').style.display = 'none';
  document.getElementById('testFormArea').style.display = 'block';
  document.getElementById('testError').style.display = 'none';
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
    navItems.push({ page: 'editar-projetos', icon: '✏️', label: 'Editar Projetos' });
  }

  nav.innerHTML = navItems.map((item, i) =>
    `<button class="nav-item ${i === 0 ? 'active' : ''}" data-page="${item.page}" onclick="navegar('${item.page}')">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    </button>`
  ).join('');

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
  document.getElementById('sidebarProfile').style.display = 'none';
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
  if (page === 'projetos' || page === 'dashboard') renderProjects();
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T23:59:59');
  return d.toLocaleDateString('pt-BR');
}

function formatMoney(value) {
  return `R$ ${(value || 0).toFixed(2)}`;
}

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
    agent.setProjects(projects);
    if (project.precisaMarketing) {
      const team = marketingTeam.filter(m => m.vertical === project.vertical);
      if (team.length > 0) {
        const emails = team.map(m => m.email).join(', ');
        showNotification(
          `IA detectou que "${project.nome}" precisa de marketing. Notificar: ${emails}`,
          'marketing'
        );
      } else {
        showNotification(
          `IA detectou que "${project.nome}" precisa de marketing. Nenhum membro cadastrado nessa vertical.`,
          'warning'
        );
      }
    } else {
      showNotification(`Projeto "${project.nome}" cadastrado com sucesso!`, 'info');
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
    agent.setProjects(projects);
  } catch (err) {
    alert('Erro ao remover projeto');
  }
}

function renderProjects() {
  const list = document.getElementById('projectsList');
  if (!list) return;
  if (projects.length === 0) {
    list.innerHTML = '<p class="empty-state">Nenhum projeto cadastrado.</p>';
    return;
  }
  list.innerHTML = projects.map(p => {
    const hoje = new Date();
    const prazoDate = new Date(p.prazo + 'T23:59:59');
    const diff = Math.ceil((prazoDate - hoje) / (1000 * 60 * 60 * 24));
    const urgente = diff <= 7;
    const lucroLiquido = (p.lucro || 0) - (p.custo || 0);
    return `
      <div class="project-card">
        <div class="project-info">
          <h4>${p.nome}</h4>
          <div class="project-responsavel">👤 ${p.responsavel || 'Sem responsável'}</div>
          <div class="project-resumo">${(p.descricao || '').substring(0, 100)}${(p.descricao || '').length > 100 ? '...' : ''}</div>
          <div class="project-meta">
            <span class="tag">${p.vertical}</span>
            <span class="tag ${urgente ? 'tag-urgent' : ''}">Prazo: ${formatDate(p.prazo)}</span>
            <span class="tag">Equipe: ${p.equipe}</span>
            ${p.custo > 0 ? `<span class="tag tag-cost">Custo: ${formatMoney(p.custo)}</span>` : ''}
            ${p.lucro > 0 ? `<span class="tag tag-profit">Lucro: ${formatMoney(p.lucro)}</span>` : ''}
            ${lucroLiquido > 0 ? `<span class="tag tag-profit">💰 ${formatMoney(lucroLiquido)}</span>` : ''}
            ${p.precisaMarketing ? '<span class="tag tag-marketing">Requer Marketing</span>' : ''}
            ${(p.cViability || p.cImpact || p.cAreas || p.cAlignment || p.cInnovation) ? `<span class="tag tag-marketing">Mkt: ${(p.cViability||3)+(p.cImpact||3)+(p.cAreas||3)+(p.cAlignment||3)+(p.cInnovation||3)}/25</span>` : ''}
          </div>
        </div>
        <div class="project-actions">
          <button class="btn-danger" onclick="deleteProject(${p.id})">Remover</button>
        </div>
      </div>`;
  }).join('');
}

function updateDashboardStats() {
  const totalEl = document.getElementById('totalProjetos');
  const verticaisEl = document.getElementById('totalVerticais');
  const marketingEl = document.getElementById('totalMarketing');
  const custoEl = document.getElementById('totalCusto');
  const lucroEl = document.getElementById('totalLucro');
  if (totalEl) totalEl.textContent = projects.length;
  const verticais = new Set(projects.map(p => p.vertical));
  if (verticaisEl) verticaisEl.textContent = verticais.size;
  if (marketingEl) marketingEl.textContent = projects.filter(p => p.precisaMarketing).length;
  const custoTotal = projects.reduce((s, p) => s + (p.custo || 0), 0);
  const lucroTotal = projects.reduce((s, p) => s + (p.lucro || 0), 0);
  if (custoEl) custoEl.textContent = formatMoney(custoTotal);
  if (lucroEl) lucroEl.textContent = formatMoney(lucroTotal);

  const breakdown = document.getElementById('verticalBreakdown');
  if (breakdown) {
    if (projects.length === 0) {
      breakdown.innerHTML = '<p class="empty-state">Nenhum projeto cadastrado.</p>';
    } else {
      const counts = {};
      projects.forEach(p => { counts[p.vertical] = (counts[p.vertical] || 0) + 1; });
      const total = projects.length;
      breakdown.innerHTML = Object.entries(counts).map(([v, c]) => {
        const pct = (c / total * 100).toFixed(0);
        return `
          <div class="vertical-bar">
            <span class="vertical-bar-label">${v}</span>
            <div class="vertical-bar-track">
              <div class="vertical-bar-fill" style="width:${pct}%"></div>
            </div>
            <span class="vertical-bar-count">${c} (${pct}%)</span>
          </div>
        `;
      }).join('');
    }
  }
}

function updateAICriteriaPreview() {
  const nome = document.getElementById('nome').value.trim();
  const descricao = document.getElementById('descricao').value.trim();
  const previewEl = document.getElementById('aiCriteriaPreview');
  if (!nome && !descricao) {
    previewEl.innerHTML = '<span style="font-size:0.82rem;color:#003399;">💡 Preencha o nome e a descrição para a IA calcular os critérios automaticamente.</span>';
    return;
  }
  const project = { nome, descricao };
  const criteria = agent.avaliarCriteriosMarketing(project);
  const total = criteria.cViability + criteria.cImpact + criteria.cAreas + criteria.cAlignment + criteria.cInnovation;
  previewEl.innerHTML = `
    <span style="font-size:0.82rem;color:#003399;font-weight:600;">🤖 IA calculou:</span>
    <span class="tag tag-profit">${criteria.cViability}/5 Viab</span>
    <span class="tag tag-profit">${criteria.cImpact}/5 Impacto</span>
    <span class="tag tag-profit">${criteria.cAreas}/5 Áreas</span>
    <span class="tag tag-profit">${criteria.cAlignment}/5 Estratégia</span>
    <span class="tag tag-profit">${criteria.cInnovation}/5 Inovação</span>
    <span class="tag ${total >= 22 ? 'tag-urgent' : 'tag-marketing'}">Total: ${total}/25</span>
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
    alert('Cadastre pelo menos um projeto antes de executar a análise.');
    return;
  }
  const analysis = agent.analyze();
  renderAnalysis(analysis);
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
      const bg = isTop3 ? '#fffbe6' : 'transparent';
      const medal = isTop3 ? medals[i] : `<span style="font-size:0.8rem;color:#999;">#${i+1}</span>`;
      const marketingPct = ((p.marketingScore || 0) / 25) * 100;
      const marketingColor = (p.marketingScore || 0) >= 22 ? '#dc2626' : (p.marketingScore || 0) >= 18 ? '#d97706' : (p.marketingScore || 0) >= 13 ? '#2563eb' : '#6b7280';
      const priorityPct = ((p.priorityScore || 0) / 10) * 100;
      const priorityColor = (p.priorityScore || 0) >= 8 ? '#dc2626' : (p.priorityScore || 0) >= 5 ? '#d97706' : (p.priorityScore || 0) >= 3 ? '#2563eb' : '#6b7280';
      const nivel = p.nivel || 'Médio';
      const nivelClass = nivel === 'Crítica' || nivel === 'Crítico' ? 'critica' : nivel === 'Alta' ? 'alta' : nivel === 'Médio' || nivel === 'Media' ? 'media' : 'baixa';
      return `
        <div class="ai-item" style="background:${bg};border-radius:6px;padding:0.65rem;${isTop3 ? 'border:1px solid #fde68a;margin-bottom:0.35rem;' : 'margin-bottom:0.25rem;'}">
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span style="font-size:1.1rem;">${medal}</span>
            <strong style="flex:1;">${p.nome || 'Sem nome'}</strong>
            <span class="tag">${p.vertical || ''}</span>
            <span class="badge badge-${nivelClass}">${nivel}</span>
          </div>
          <div style="display:flex;gap:0.5rem;margin-top:0.35rem;flex-wrap:wrap;font-size:0.75rem;color:#666;">
            <span>🎯 Prioridade: <strong>${p.priorityScore || '?'}/10</strong></span>
            <span>📢 Marketing: <strong>${p.marketingScore || '?'}/25</strong></span>
            ${p.diasRestantes !== undefined ? `<span>📅 ${p.diasRestantes} dias restantes</span>` : ''}
            ${p.prazo ? `<span>⏰ Prazo: ${formatDate(p.prazo)}</span>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:0.2rem;margin-top:0.25rem;">
            <div class="priority-bar">
              <span style="font-size:0.72rem;color:#666;font-weight:600;min-width:110px;">Prioridade:</span>
              <div class="priority-fill"><span style="width:${priorityPct}%;background:${priorityColor}"></span></div>
              <span style="font-size:0.72rem;color:#666;min-width:30px;text-align:right;">${p.priorityScore || 0}/10</span>
            </div>
            <div class="priority-bar">
              <span style="font-size:0.72rem;color:#666;font-weight:600;min-width:110px;">Marketing:</span>
              <div class="priority-fill"><span style="width:${marketingPct}%;background:${marketingColor}"></span></div>
              <span style="font-size:0.72rem;color:#666;min-width:30px;text-align:right;">${p.marketingScore || 0}/25</span>
            </div>
          </div>
          <div style="display:flex;gap:0.5rem;margin-top:0.25rem;flex-wrap:wrap;font-size:0.72rem;color:#888;">
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
        <span class="badge badge-${c.gravidade === 'alta' ? 'alta' : 'media'}">${c.gravidade === 'alta' ? 'Alta' : 'Média'}</span>
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
        ? `<div style="margin-top:0.25rem;font-size:0.8rem;color:#0055cc;">📧 Notificar: ${team.map(t => t.email).join(', ')}</div>`
        : '<div style="margin-top:0.25rem;font-size:0.8rem;color:#92400e;">⚠ Nenhum membro de marketing cadastrado para esta vertical.</div>';
      return `
      <div class="ai-item">
        <span class="badge badge-media">Marketing</span>
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
        <div class="project-meta" style="margin-top:0.4rem;">
          <span class="tag">${r.vertical}</span>
          <span class="tag badge-${r.statusPrazo === 'urgente' ? 'urgente' : r.statusPrazo === 'atrasado' ? 'atrasado' : r.statusPrazo === 'próximo' ? 'proximo' : 'prazo'}">${r.statusPrazo}</span>
          <span class="tag">Equipe: ${r.equipe}</span>
          ${r.custo ? `<span class="tag tag-cost">Custo: ${formatMoney(r.custo)}</span>` : ''}
          ${r.lucro ? `<span class="tag tag-profit">Lucro: ${formatMoney(r.lucro)}</span>` : ''}
        </div>
      </div>
    `).join('');
  }
}

// ─── Edit Projects ──────────────────────────────

function renderEditProjectsList() {
  const list = document.getElementById('editProjectsList');
  if (!list) return;
  if (projects.length === 0) {
    list.innerHTML = '<p class="empty-state">Nenhum projeto cadastrado.</p>';
    return;
  }
  list.innerHTML = projects.map(p => {
    const hoje = new Date();
    const prazoDate = new Date(p.prazo + 'T23:59:59');
    const diff = Math.ceil((prazoDate - hoje) / (1000 * 60 * 60 * 24));
    const urgente = diff <= 7;
    return `
      <div class="project-card">
        <div class="project-info">
          <h4>${p.nome}</h4>
          <div class="project-responsavel">👤 ${p.responsavel || 'Sem responsável'}</div>
          <div class="project-meta">
            <span class="tag">${p.vertical}</span>
            <span class="tag ${urgente ? 'tag-urgent' : ''}">Prazo: ${formatDate(p.prazo)}</span>
            <span class="tag">Equipe: ${p.equipe}</span>
          </div>
        </div>
        <div class="project-actions">
          <button class="btn-secondary" onclick="openEditModal(${p.id})">✏️ Editar</button>
          <button class="btn-danger" onclick="deleteProject(${p.id})">Remover</button>
        </div>
      </div>`;
  }).join('');
}

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
    agent.setProjects(projects);
    showNotification('Projeto atualizado com sucesso!', 'info');
  } catch (err) {
    alert('Erro ao salvar: ' + err.message);
  }
}

// ─── Dev Edit Mode ──────────────────────────────

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

// ─── Box Resizing ──────────────────────────────

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

// ─── Box Repositioning ──────────────────────────

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

showLogin();