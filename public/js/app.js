const API_BASE = '/api';
const agent = new AIAgent();

let projects = [];
let marketingTeam = [];
let notificationTimeout = null;

function navegar(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
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

document.getElementById('projectForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    nome: document.getElementById('nome').value,
    vertical: document.getElementById('vertical').value,
    responsavel: document.getElementById('responsavel').value,
    descricao: document.getElementById('descricao').value,
    prazo: document.getElementById('prazo').value,
    custo: parseFloat(document.getElementById('custo').value) || 0,
    lucro: parseFloat(document.getElementById('lucro').value) || 0,
    equipe: parseInt(document.getElementById('equipe').value) || 1,
    precisaMarketing: agent.detectarNecessidadeMarketing({
      nome: document.getElementById('nome').value,
      descricao: document.getElementById('descricao').value
    })
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

  const prioridadesEl = document.getElementById('prioridadesContent');
  if (analysis.prioridades.length === 0) {
    prioridadesEl.innerHTML = '<p class="empty-state">Nenhuma prioridade calculada.</p>';
  } else {
    const sorted = [...analysis.prioridades].sort((a, b) => b.score - a.score);
    prioridadesEl.innerHTML = sorted.map(p => {
      const pct = (p.score / 10) * 100;
      const color = p.score >= 8 ? '#dc2626' : p.score >= 5 ? '#d97706' : p.score >= 3 ? '#2563eb' : '#6b7280';
      return `
        <div class="ai-item">
          <strong>${p.nome}</strong>
          <span class="badge badge-${p.nivel === 'Crítica' ? 'critica' : p.nivel === 'Alta' ? 'alta' : p.nivel === 'Média' ? 'media' : 'baixa'}">${p.nivel}</span>
          <div class="priority-bar">
            <span style="font-size:0.78rem;color:#666;">Score: ${p.score}/10</span>
            <div class="priority-fill"><span style="width:${p.score * 10}%;background:${color}"></span></div>
          </div>
          <div style="font-size:0.78rem;color:#666;">Prazo: ${formatDate(p.prazo)} | ${p.diasRestantes} dias restantes</div>
        </div>
      `;
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

loadProjects();
loadMarketingTeam();
