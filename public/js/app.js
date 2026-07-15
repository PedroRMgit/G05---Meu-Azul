const API_BASE = '/api';
const agent = new AIAgent();

let projects = [];
let marketingTeam = [];
let notificationTimeout = null;
let isAuthenticated = false;

function navegar(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  if (page === 'devtools') devToolsLoad();
}

function switchLoginTab(tab) {
  document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.login-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-login-tab="${tab}"]`).classList.add('active');
  document.getElementById(`login-panel-${tab}`).classList.add('active');
  document.getElementById('devError').style.display = 'none';
  document.querySelectorAll('#mainNav .nav-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`#mainNav [data-page="${tab}"]`).classList.add('active');
  document.getElementById('page-login').classList.add('active');
}

function loginDev() {
  const key = document.getElementById('devKey').value;
  if (key === '123') {
    isAuthenticated = true;
    document.getElementById('mainNav').style.display = 'none';
    document.getElementById('appNav').style.display = 'flex';
    document.getElementById('sidebarProfile').style.display = 'flex';
    document.getElementById('devError').style.display = 'none';
    navegar('dashboard');
    loadProjects();
    loadMarketingTeam();
  } else {
    document.getElementById('devError').style.display = 'block';
  }
}

function logout() {
  isAuthenticated = false;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.getElementById('mainNav').style.display = 'flex';
  document.getElementById('appNav').style.display = 'none';
  document.getElementById('sidebarProfile').style.display = 'none';
  document.getElementById('devKey').value = '';
  switchLoginTab('login');
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
    renderMarketingTeam();
  } catch (err) {
    console.error('Erro ao carregar equipe de marketing:', err);
  }
}

async function addMarketingMember() {
  const nome = document.getElementById('mktNome').value.trim();
  const email = document.getElementById('mktEmail').value.trim();
  const vertical = document.getElementById('mktVertical').value;
  if (!nome || !email || !vertical) {
    alert('Preencha todos os campos do membro.');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/marketing-team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, vertical })
    });
    if (!res.ok) throw new Error('Erro ao adicionar');
    const member = await res.json();
    marketingTeam.push(member);
    renderMarketingTeam();
    document.getElementById('mktNome').value = '';
    document.getElementById('mktEmail').value = '';
    showNotification(`${nome} adicionado à equipe de ${vertical}`, 'info');
  } catch (err) {
    alert('Erro ao adicionar membro: ' + err.message);
  }
}

async function deleteMarketingMember(id) {
  try {
    await fetch(`${API_BASE}/marketing-team/${id}`, { method: 'DELETE' });
    marketingTeam = marketingTeam.filter(m => m.id !== id);
    renderMarketingTeam();
  } catch (err) {
    alert('Erro ao remover membro');
  }
}

function renderMarketingTeam() {
  const list = document.getElementById('marketingTeamList');
  if (marketingTeam.length === 0) {
    list.innerHTML = '<p class="empty-state">Nenhum membro cadastrado.</p>';
    return;
  }
  list.innerHTML = marketingTeam.map(m => `
    <div class="member-card">
      <div>
        <strong>${m.nome}</strong>
        <span class="tag">${m.vertical}</span>
        <span style="font-size:0.85rem;color:#666;margin-left:0.5rem">${m.email}</span>
      </div>
      <button class="btn-danger" onclick="deleteMarketingMember(${m.id})">Remover</button>
    </div>
  `).join('');
}

async function loadProjects() {
  try {
    const res = await fetch(`${API_BASE}/projects`);
    projects = await res.json();
    renderProjects();
    updateStats();
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
    updateStats();
    agent.setProjects(projects);
    if (project.precisaMarketing) {
      const team = marketingTeam.filter(m => m.vertical === project.vertical);
      if (team.length > 0) {
        const emails = team.map(m => m.email).join(', ');
        showNotification(
          `IA detectou que "${project.nome}" precisa de marketing da vertical ${project.vertical}. Notificar: ${emails}`,
          'marketing'
        );
      } else {
        showNotification(
          `IA detectou que "${project.nome}" precisa de marketing da vertical ${project.vertical}. Nenhum membro cadastrado nessa vertical.`,
          'warning'
        );
      }
    } else {
      showNotification(`Projeto "${project.nome}" cadastrado com sucesso!`, 'info');
    }
    navegar('dashboard');
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
    updateStats();
    agent.setProjects(projects);
  } catch (err) {
    alert('Erro ao remover projeto');
  }
}

function renderProjects() {
  const list = document.getElementById('projectsList');
  if (projects.length === 0) {
    list.innerHTML = '<p class="empty-state">Nenhum projeto cadastrado. Clique em <strong>"+"</strong> na barra lateral para criar um novo projeto.</p>';
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
          <div class="project-resumo">${p.descricao.substring(0, 100)}${p.descricao.length > 100 ? '...' : ''}</div>
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

function updateStats() {
  document.getElementById('totalProjetos').textContent = projects.length;
  const verticais = new Set(projects.map(p => p.vertical));
  document.getElementById('totalVerticais').textContent = verticais.size;
  document.getElementById('totalMarketing').textContent = projects.filter(p => p.precisaMarketing).length;
  const custoTotal = projects.reduce((s, p) => s + (p.custo || 0), 0);
  const lucroTotal = projects.reduce((s, p) => s + (p.lucro || 0), 0);
  document.getElementById('totalCusto').textContent = formatMoney(custoTotal);
  document.getElementById('totalLucro').textContent = formatMoney(lucroTotal);
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

document.getElementById('nome').addEventListener('input', updateAICriteriaPreview);
document.getElementById('descricao').addEventListener('input', updateAICriteriaPreview);

document.getElementById('projectForm').addEventListener('submit', async (e) => {
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

document.getElementById('runAnalysisBtn').addEventListener('click', () => {
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
      const nivel = p.nivel || (p.nivel === 'Crítico' ? 'Crítico' : p.nivel === 'Crítica' ? 'Crítica' : 'Médio');
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

function devToolsShowNotification(message, type) {
  const el = document.getElementById('devToolsNotification');
  el.textContent = message;
  el.className = `notification notification-${type}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

async function devToolsLoad() {
  const editor = document.getElementById('devToolsEditor');
  editor.innerHTML = '<p class="empty-state">Carregando...</p>';
  try {
    const res = await fetch(`${API_BASE}/dev/config`);
    if (!res.ok) throw new Error('Erro ao carregar config');
    const config = await res.json();
    editor.innerHTML = Object.entries(config).map(([catKey, cat]) => `
      <div class="dev-category" style="margin-bottom:1.25rem;">
        <h3 style="font-size:1rem;color:#003399;margin-bottom:0.5rem;padding-bottom:0.35rem;border-bottom:1px solid #e0e7ff;">${cat.label}</h3>
        <div class="dev-items" data-category="${catKey}">
          ${cat.items.map((item, idx) => `
            <div class="dev-item" data-key="${item.key}" style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;padding:0.35rem 0.5rem;background:#f8faff;border-radius:6px;">
              <div class="dev-reorder" style="display:flex;flex-direction:column;gap:1px;">
                <button class="dev-btn-up" onclick="devToolsMove(this,-1)" style="background:none;border:none;cursor:pointer;font-size:0.6rem;padding:0;line-height:1;color:#666;" title="Mover para cima">▲</button>
                <button class="dev-btn-down" onclick="devToolsMove(this,1)" style="background:none;border:none;cursor:pointer;font-size:0.6rem;padding:0;line-height:1;color:#666;" title="Mover para baixo">▼</button>
              </div>
              <input type="text" class="dev-item-input" value="${item.value.replace(/"/g, '&quot;')}" data-old="${item.value.replace(/"/g, '&quot;')}" style="flex:1;padding:0.35rem 0.5rem;border:1.5px solid #d0d5dd;border-radius:6px;font-size:0.85rem;font-family:inherit;">
              <span class="dev-item-key" style="font-size:0.7rem;color:#999;font-family:monospace;">${item.key}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (err) {
    editor.innerHTML = `<p style="color:#dc2626;">Erro ao carregar: ${err.message}</p>`;
  }
}

function devToolsMove(btn, direction) {
  const item = btn.closest('.dev-item');
  const container = item.parentElement;
  const items = [...container.querySelectorAll('.dev-item')];
  const idx = items.indexOf(item);
  if (direction === -1 && idx > 0) {
    container.insertBefore(item, items[idx - 1]);
  } else if (direction === 1 && idx < items.length - 1) {
    container.insertBefore(items[idx + 1], item);
  }
}

async function devToolsApply() {
  const applyBtn = document.getElementById('devApplyBtn');
  applyBtn.disabled = true;
  applyBtn.textContent = '⏳ Salvando...';
  try {
    const categories = {};
    document.querySelectorAll('.dev-category').forEach(cat => {
      const catKey = cat.querySelector('.dev-items').dataset.category;
      const items = [];
      cat.querySelectorAll('.dev-item').forEach(item => {
        const key = item.dataset.key;
        const value = item.querySelector('.dev-item-input').value.trim();
        const oldValue = item.querySelector('.dev-item-input').dataset.old;
        items.push({ key, value, oldValue });
      });
      categories[catKey] = { items };
    });
    const res = await fetch(`${API_BASE}/dev/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao salvar');
    devToolsShowNotification(result.message || 'Alterações salvas com sucesso!', 'info');
    await devToolsLoad();
  } catch (err) {
    devToolsShowNotification('Erro: ' + err.message, 'warning');
  } finally {
    applyBtn.disabled = false;
    applyBtn.textContent = '💾 Aplicar';
  }
}

async function devToolsGitStatus() {
  const output = document.getElementById('devGitOutput');
  output.textContent = 'Carregando status...';
  try {
    const res = await fetch(`${API_BASE}/dev/git/status`);
    const result = await res.json();
    output.textContent = result.output || 'Sem resposta';
  } catch (err) {
    output.textContent = 'Erro: ' + err.message;
  }
}

async function devToolsGitPush() {
  const output = document.getElementById('devGitOutput');
  output.textContent = 'Executando push...';
  try {
    const res = await fetch(`${API_BASE}/dev/git/push`, { method: 'POST' });
    const result = await res.json();
    output.textContent = result.output || 'Push realizado com sucesso!';
  } catch (err) {
    output.textContent = 'Erro: ' + err.message;
  }
}

navegar('login');
