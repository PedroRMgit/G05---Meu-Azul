const API_BASE = '/api';
const agent = new AIAgent();

const form = document.getElementById('projectForm');
const projectsList = document.getElementById('projectsList');
const totalProjetos = document.getElementById('totalProjetos');
const totalSetores = document.getElementById('totalSetores');
const totalMarketing = document.getElementById('totalMarketing');
const runAnalysisBtn = document.getElementById('runAnalysisBtn');

let projects = [];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T23:59:59');
  return d.toLocaleDateString('pt-BR');
}

function getStatusClass(prazo) {
  const hoje = new Date();
  const prazoDate = new Date(prazo + 'T23:59:59');
  const diff = Math.ceil((prazoDate - hoje) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'tag-urgent';
  if (diff <= 7) return 'tag-urgent';
  return '';
}

function getStatusLabel(prazo) {
  const hoje = new Date();
  const prazoDate = new Date(prazo + 'T23:59:59');
  const diff = Math.ceil((prazoDate - hoje) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)} dias atrasado`;
  if (diff === 0) return 'Hoje';
  if (diff <= 7) return `${diff} dias restantes`;
  return formatDate(prazo);
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
  } catch (err) {
    alert('Erro ao cadastrar projeto: ' + err.message);
  }
}

async function deleteProject(id) {
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
  if (projects.length === 0) {
    projectsList.innerHTML = '<p class="empty-state">Nenhum projeto cadastrado. Use o formulário acima.</p>';
    return;
  }
  projectsList.innerHTML = projects.map(p => {
    const hoje = new Date();
    const prazoDate = new Date(p.prazo + 'T23:59:59');
    const diff = Math.ceil((prazoDate - hoje) / (1000 * 60 * 60 * 24));
    const urgente = diff <= 7;
    return `
      <div class="project-card">
        <div class="project-info">
          <h4>${p.nome}</h4>
          <p>${p.descricao.substring(0, 120)}${p.descricao.length > 120 ? '...' : ''}</p>
          <div class="project-meta">
            <span class="tag">${p.setor}</span>
            <span class="tag ${urgente ? 'tag-urgent' : ''}">Prazo: ${formatDate(p.prazo)}</span>
            <span class="tag">Equipe: ${p.equipe}</span>
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
  totalProjetos.textContent = projects.length;
  const setores = new Set(projects.map(p => p.setor));
  totalSetores.textContent = setores.size;
  totalMarketing.textContent = projects.filter(p => p.precisaMarketing).length;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    nome: document.getElementById('nome').value,
    setor: document.getElementById('setor').value,
    descricao: document.getElementById('descricao').value,
    prazo: document.getElementById('prazo').value,
    equipe: parseInt(document.getElementById('equipe').value) || 1,
    precisaMarketing: document.getElementById('precisaMarketing').checked
  };
  await addProject(data);
  form.reset();
});

runAnalysisBtn.addEventListener('click', () => {
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
    marketingEl.innerHTML = analysis.marketingRequests.map(m => `
      <div class="ai-item">
        <span class="badge badge-media">Marketing</span>
        ${m.mensagem}
      </div>
    `).join('');
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
            <span style="font-size:0.8rem;color:#666;">Score: ${p.score}/10</span>
            <div class="priority-fill"><span style="width:${p.score * 10}%;background:${color}"></span></div>
          </div>
          <div style="font-size:0.8rem;color:#666;">Prazo: ${formatDate(p.prazo)} | ${p.diasRestantes} dias restantes</div>
        </div>
      `).join('');
  }
}

loadProjects();

  const resumosEl = document.getElementById('resumosContent');
  if (analysis.resumos.length === 0) {
    resumosEl.innerHTML = '<p class="empty-state">Nenhum resumo disponível.</p>';
  } else {
    resumosEl.innerHTML = analysis.resumos.map(r => `
      <div class="resumo-card">
        <h4>${r.nome}</h4>
        <p>${r.resumo}</p>
        <div class="project-meta">
          <span class="tag">${r.setor}</span>
          <span class="tag badge-${r.statusPrazo === 'urgente' ? 'urgente' : r.statusPrazo === 'atrasado' ? 'atrasado' : r.statusPrazo === 'próximo' ? 'proximo' : 'prazo'}">${r.statusPrazo}</span>
          <span class="tag">Equipe: ${r.equipe}</span>
        </div>
      </div>
    `).join('');
  }
}
