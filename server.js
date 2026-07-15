const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let projects = [];
let projectIdCounter = 1;

app.get('/api/projects', (req, res) => {
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const { nome, vertical, descricao, prazo, equipe, precisaMarketing, custo, lucro, responsavel, cViability, cImpact, cAreas, cAlignment, cInnovation } = req.body;
  if (!nome || !vertical || !descricao || !prazo) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, vertical, descricao, prazo' });
  }
  const project = {
    id: projectIdCounter++,
    nome,
    vertical,
    descricao,
    prazo,
    equipe: parseInt(equipe) || 1,
    precisaMarketing: precisaMarketing || false,
    custo: parseFloat(custo) || 0,
    lucro: parseFloat(lucro) || 0,
    responsavel: responsavel || '',
    cViability: parseInt(cViability) || 3,
    cImpact: parseInt(cImpact) || 3,
    cAreas: parseInt(cAreas) || 3,
    cAlignment: parseInt(cAlignment) || 3,
    cInnovation: parseInt(cInnovation) || 3,
    criadoEm: new Date().toISOString()
  };
  projects.push(project);
  res.status(201).json(project);
});

app.delete('/api/projects/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Projeto não encontrado' });
  projects.splice(index, 1);
  res.json({ message: 'Projeto removido' });
});

let marketingTeam = [];
let memberIdCounter = 1;

app.get('/api/marketing-team', (req, res) => {
  res.json(marketingTeam);
});

app.post('/api/marketing-team', (req, res) => {
  const { nome, email, vertical } = req.body;
  if (!nome || !email || !vertical) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, vertical' });
  }
  const member = { id: memberIdCounter++, nome, email, vertical };
  marketingTeam.push(member);
  res.status(201).json(member);
});

app.delete('/api/marketing-team/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = marketingTeam.findIndex(m => m.id === id);
  if (index === -1) return res.status(404).json({ error: 'Membro não encontrado' });
  marketingTeam.splice(index, 1);
  res.json({ message: 'Membro removido' });
});

app.get('/api/ai/analysis', (req, res) => {
  const analysis = runAIAnalysis(projects);
  res.json(analysis);
});

function runAIAnalysis(projects) {
  const conflitos = detectarConflitos(projects);
  const oportunidades = identificarOportunidades(projects);
  const marketingRequests = identificarMarketingRequests(projects);
  const marketingRanking = rankProjetosMarketing(projects);
  const prioridades = avaliarPrioridades(projects);
  const resumos = gerarResumos(projects);
  return { conflitos, oportunidades, marketingRequests, marketingRanking, prioridades, resumos };
}

function rankProjetosMarketing(projects) {
  return projects
    .map(p => {
      const score = (p.cViability || 3) + (p.cImpact || 3) + (p.cAreas || 3) + (p.cAlignment || 3) + (p.cInnovation || 3);
      const nivel = score >= 22 ? 'Crítico' : score >= 18 ? 'Alto' : score >= 13 ? 'Médio' : 'Baixo';
      return {
        id: p.id,
        nome: p.nome,
        vertical: p.vertical,
        score,
        nivel,
        viabilidade: p.cViability || 3,
        impacto: p.cImpact || 3,
        areas: p.cAreas || 3,
        alinhamento: p.cAlignment || 3,
        inovacao: p.cInnovation || 3
      };
    })
    .sort((a, b) => b.score - a.score);
}

function detectarConflitos(projects) {
  const conflitos = [];
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const a = projects[i], b = projects[j];
      if (a.prazo === b.prazo && a.vertical !== b.vertical) {
        conflitos.push({
          tipo: 'prazo',
          gravidade: 'alta',
          mensagem: `"${a.nome}" (${a.vertical}) e "${b.nome}" (${b.vertical}) têm o mesmo prazo: ${a.prazo}`,
          projetos: [a.id, b.id]
        });
      }
      if (a.vertical === b.vertical && a.prazo === b.prazo) {
        conflitos.push({
          tipo: 'recurso',
          gravidade: 'media',
          mensagem: `"${a.nome}" e "${b.nome}" são da mesma vertical (${a.vertical}) com prazos idênticos. Considere redistribuir recursos.`,
          projetos: [a.id, b.id]
        });
      }
    }
  }
  return conflitos;
}

function identificarOportunidades(projects) {
  const oportunidades = [];
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const a = projects[i], b = projects[j];
      if (a.vertical === b.vertical) {
        oportunidades.push({
          tipo: 'uniao_vertical',
          economia: `${Math.ceil((a.equipe + b.equipe) * 0.3)} horas/semana`,
          mensagem: `"${a.nome}" e "${b.nome}" são da mesma vertical (${a.vertical}). Unir reuniões pode economizar ${Math.ceil((a.equipe + b.equipe) * 0.3)}h/semana.`,
          projetos: [a.id, b.id]
        });
      }
      const descA = a.descricao.toLowerCase(), descB = b.descricao.toLowerCase();
      const palavrasA = descA.split(' '), palavrasB = descB.split(' ');
      const comuns = palavrasA.filter(p => palavrasB.includes(p) && p.length > 4);
      if (comuns.length >= 2) {
        oportunidades.push({
          tipo: 'sinergia',
          economia: `${Math.ceil((a.equipe + b.equipe) * 0.2)} horas/semana`,
          mensagem: `"${a.nome}" e "${b.nome}" compartilham temas similares (${comuns.slice(0, 3).join(', ')}). Considere colaboração.`,
          projetos: [a.id, b.id]
        });
      }
    }
  }
  return oportunidades;
}

function identificarMarketingRequests(projects) {
  return projects
    .filter(p => p.precisaMarketing)
    .map(p => ({
      projetoId: p.id,
      projetoNome: p.nome,
      vertical: p.vertical,
      mensagem: `O projeto "${p.nome}" da vertical ${p.vertical} solicitou apoio de marketing.`
    }));
}

function avaliarPrioridades(projects) {
  return projects.map(p => {
    const prazoDate = new Date(p.prazo);
    const hoje = new Date();
    const diasRestantes = Math.ceil((prazoDate - hoje) / (1000 * 60 * 60 * 24));
    let urgencia = diasRestantes <= 7 ? 5 : diasRestantes <= 30 ? 3 : 1;
    let impacto = p.equipe >= 5 ? 5 : p.equipe >= 3 ? 3 : 1;
    let rentabilidade = p.lucro - p.custo > 0 ? 2 : p.lucro - p.custo > -5000 ? 0 : -1;
    let prioridade = Math.min(10, Math.max(1, urgencia + impacto + (p.precisaMarketing ? 2 : 0) + rentabilidade));
    let nivel = prioridade >= 8 ? 'Crítica' : prioridade >= 5 ? 'Alta' : prioridade >= 3 ? 'Média' : 'Baixa';
    return {
      id: p.id,
      nome: p.nome,
      score: prioridade,
      nivel,
      prazo: p.prazo,
      diasRestantes: Math.ceil((new Date(p.prazo) - new Date()) / (1000 * 60 * 60 * 24))
    };
  });
}

function gerarResumos(projects) {
  return projects.map(p => {
    const prazoDate = new Date(p.prazo);
    const hoje = new Date();
    const diasRestantes = Math.ceil((prazoDate - hoje) / (1000 * 60 * 60 * 24));
    const statusPrazo = diasRestantes < 0 ? 'atrasado' : diasRestantes <= 7 ? 'urgente' : diasRestantes <= 30 ? 'próximo' : 'dentro do prazo';
    return {
      id: p.id,
      nome: p.nome,
      resumo: `${p.nome} é um projeto da vertical ${p.vertical} com equipe de ${p.equipe} pessoa(s). Prazo: ${p.prazo} (${statusPrazo}). Responsável: ${p.responsavel || 'não definido'}. Custo: R$ ${p.custo.toFixed(2)} | Lucro: R$ ${p.lucro.toFixed(2)}. ${p.precisaMarketing ? 'Solicita apoio de marketing.' : 'Não requer marketing no momento.'} Descrição: ${p.descricao.substring(0, 100)}${p.descricao.length > 100 ? '...' : ''}`,
      statusPrazo,
      vertical: p.vertical,
      equipe: p.equipe,
      custo: p.custo,
      lucro: p.lucro,
      responsavel: p.responsavel
    };
  });
}

app.listen(PORT, () => {
  console.log(`Meu Azul rodando em http://localhost:${PORT}`);
});
