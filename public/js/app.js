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
    document.getElementById('devToggleArea').style.display = 'flex';
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
  document.getElementById('devToggleArea').style.display = 'none';
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

// ─── Inline Edit Mode ──────────────────────────────────────────────

let editModeActive = false;

const EDITABLE_SELECTORS = [
  { cat: 'nav_labels', sel: '#appNav .nav-item .nav-label', key: el => {
    const page = el.closest('.nav-item')?.dataset?.page;
    const map = { dashboard:'nav_dashboard', 'novo-projeto':'nav_novo_projeto', 'equipe-marketing':'nav_equipe_marketing', editar:'nav_devtools' };
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
  const btn = document.getElementById('editModeBtn');
  const toggle = document.getElementById('editModeToggle');
  if (editModeActive) {
    bar.style.display = 'flex';
    if (btn) btn.classList.add('active');
    if (toggle) toggle.checked = true;
    enableInlineEditing();
  } else {
    bar.style.display = 'none';
    if (btn) btn.classList.remove('active');
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
  const btn = document.getElementById('editModeBtn');
  const toggle = document.getElementById('editModeToggle');
  bar.style.display = 'none';
  if (btn) btn.classList.remove('active');
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

navegar('login');
