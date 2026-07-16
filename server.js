const express = require('express');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let projects = [];
let projectIdCounter = 1;

let users = [];
let userIdCounter = 1;

app.post('/api/auth/register', (req, res) => {
  const { nome, email, senha, role } = req.body;
  if (!nome || !email || !senha || !role) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha, role' });
  }
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email já cadastrado' });
  }
  const user = {
    id: userIdCounter++,
    nome,
    email,
    senha,
    role,
    criadoEm: new Date().toISOString()
  };
  users.push(user);
  res.status(201).json({ id: user.id, nome: user.nome, email: user.email, role: user.role });
});

app.post('/api/auth/login', (req, res) => {
  const { email, senha, role } = req.body;
  if (!email || !senha || !role) {
    return res.status(400).json({ error: 'Campos obrigatórios: email, senha, role' });
  }
  const user = users.find(u => u.email === email && u.senha === senha && u.role === role);
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  res.json({ id: user.id, nome: user.nome, email: user.email, role: user.role });
});

app.post('/api/auth/test', (req, res) => {
  const { key, role } = req.body;
  if (key !== '123') {
    return res.status(401).json({ error: 'Chave inválida' });
  }
  if (!role) {
    return res.status(400).json({ error: 'Selecione um cargo' });
  }
  res.json({ id: 0, nome: 'teste', email: 'teste@azul.com.br', role });
});

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

app.put('/api/projects/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Projeto não encontrado' });
  const { nome, vertical, descricao, prazo, equipe, precisaMarketing, custo, lucro, responsavel, cViability, cImpact, cAreas, cAlignment, cInnovation } = req.body;
  const updated = {
    ...projects[index],
    ...(nome && { nome }),
    ...(vertical && { vertical }),
    ...(descricao && { descricao }),
    ...(prazo && { prazo }),
    ...(equipe !== undefined && { equipe: parseInt(equipe) }),
    ...(precisaMarketing !== undefined && { precisaMarketing }),
    ...(custo !== undefined && { custo: parseFloat(custo) }),
    ...(lucro !== undefined && { lucro: parseFloat(lucro) }),
    ...(responsavel !== undefined && { responsavel }),
    ...(cViability !== undefined && { cViability: parseInt(cViability) }),
    ...(cImpact !== undefined && { cImpact: parseInt(cImpact) }),
    ...(cAreas !== undefined && { cAreas: parseInt(cAreas) }),
    ...(cAlignment !== undefined && { cAlignment: parseInt(cAlignment) }),
    ...(cInnovation !== undefined && { cInnovation: parseInt(cInnovation) })
  };
  projects[index] = updated;
  res.json(updated);
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
  const oportunidades = [];
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

const CONFIG_PATH = path.join(__dirname, 'dev-config.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch { return null; }
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

function patchSourceFiles(changes) {
  const sourceFiles = ['public/index.html', 'public/js/app.js', 'public/js/ai-agent.js', 'public/css/style.css'];
  const report = [];
  const validChanges = changes.filter(c => c.oldValue && c.newValue && c.oldValue !== c.newValue);
  if (validChanges.length === 0) return report;

  for (const file of sourceFiles) {
    const fpath = path.join(__dirname, file);
    if (!fs.existsSync(fpath)) continue;
    let content = fs.readFileSync(fpath, 'utf-8');

    const replaceMap = {};
    for (const c of validChanges) {
      replaceMap[c.oldValue] = c.newValue;
    }

    let result = '';
    let i = 0;
    const len = content.length;
    const keys = Object.keys(replaceMap).sort((a, b) => b.length - a.length);
    const counts = {};
    keys.forEach(k => { counts[k] = 0; });

    while (i < len) {
      let matched = false;
      for (const key of keys) {
        if (content.substring(i, i + key.length) === key) {
          result += replaceMap[key];
          counts[key]++;
          i += key.length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        result += content[i];
        i++;
      }
    }

    const totalChanges = Object.values(counts).reduce((s, c) => s + c, 0);
    if (totalChanges > 0) {
      fs.writeFileSync(fpath, result, 'utf-8');
      for (const key of keys) {
        if (counts[key] > 0) {
          report.push(`${file}: ${counts[key]} ocorrência(s) de "${key}" → "${replaceMap[key]}"`);
        }
      }
    }
  }
  return report;
}

function reorderSelectOptions(html, selectId, orderedValues) {
  const re = new RegExp(`(<select[^>]*id="${selectId}"[^>]*>)([\\s\\S]*?)(<\\/select>)`, 'i');
  const m = html.match(re);
  if (!m) return html;
  const openTag = m[1];
  const closeTag = m[3];
  const inner = m[2];
  const optionRe = /(<option[^>]*>[\s\S]*?<\/option>)/gi;
  const options = [];
  let optMatch;
  while ((optMatch = optionRe.exec(inner)) !== null) {
    options.push(optMatch[1]);
  }
  const optTextRe = /<option[^>]*value="([^"]*)"[^>]*>/i;
  const nonValueOptions = options.filter(o => !o.match(/value="/i));
  const valueOptions = options.filter(o => o.match(/value="/i));
  valueOptions.sort((a, b) => {
    const va = (a.match(optTextRe) || [,''])[1];
    const vb = (b.match(optTextRe) || [,''])[1];
    const ia = orderedValues.indexOf(va);
    const ib = orderedValues.indexOf(vb);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  const reordered = [...nonValueOptions, ...valueOptions].join('\n');
  return html.replace(re, `${openTag}\n${reordered}\n${closeTag}`);
}

function reorderNavItems(html, orderedLabels) {
  const navRe = /(<nav class="sidebar-nav" id="appNav"[^>]*>)([\s\S]*?)(<\/nav>)/i;
  const m = html.match(navRe);
  if (!m) return html;
  const openTag = m[1];
  const closeTag = m[3];
  const inner = m[2];
  const btnRe = /(<button[^>]*class="nav-item[^"]*"[^>]*data-page="[^"]*"[^>]*>[\s\S]*?<\/button>)/gi;
  const buttons = [];
  let btnMatch;
  while ((btnMatch = btnRe.exec(inner)) !== null) {
    buttons.push(btnMatch[1]);
  }
  const labelRe = /<span class="nav-label">([^<]*)<\/span>/;
  buttons.sort((a, b) => {
    const la = (a.match(labelRe) || [,''])[1];
    const lb = (b.match(labelRe) || [,''])[1];
    const ia = orderedLabels.indexOf(la);
    const ib = orderedLabels.indexOf(lb);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  return html.replace(navRe, `${openTag}\n${buttons.join('\n')}\n${closeTag}`);
}

function reorderCriteriaGrid(html, orderedLabels) {
  const gridRe = /(<div class="criteria-grid">)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/form>)/i;
  const m = html.match(gridRe);
  if (!m) return html;
  const openTag = m[1];
  const closeTag = m[3];
  const inner = m[2];
  const groupRe = /(<div class="form-group">[\s\S]*?<\/div>)/gi;
  const groups = [];
  let gMatch;
  while ((gMatch = groupRe.exec(inner)) !== null) {
    groups.push(gMatch[1]);
  }
  const labelRe = /<label[^>]*>([^<]*)<\/label>/;
  groups.sort((a, b) => {
    const la = (a.match(labelRe) || [,''])[1];
    const lb = (b.match(labelRe) || [,''])[1];
    const ia = orderedLabels.indexOf(la);
    const ib = orderedLabels.indexOf(lb);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  const afterGrid = groups.join('\n') + '\n';
  return html.replace(gridRe, `${openTag}\n${afterGrid}${closeTag}`);
}

function patchSourceFileOrder(config) {
  let htmlPath = path.join(__dirname, 'public/index.html');
  if (!fs.existsSync(htmlPath)) return [];
  let html = fs.readFileSync(htmlPath, 'utf-8');
  const report = [];

  if (config.verticals) {
    const vals = config.verticals.items.map(i => i.value);
    const before = html;
    html = reorderSelectOptions(html, 'vertical', vals);
    html = reorderSelectOptions(html, 'mktVertical', vals);
    if (html !== before) report.push('public/index.html: Verticais reordenadas nos selects');
  }

  if (config.nav_labels) {
    const vals = config.nav_labels.items.map(i => i.value);
    const before = html;
    html = reorderNavItems(html, vals);
    if (html !== before) report.push('public/index.html: Navegação reordenada');
  }

  if (config.criteria) {
    const vals = config.criteria.items.map(i => i.value);
    const before = html;
    html = reorderCriteriaGrid(html, vals);
    if (html !== before) report.push('public/index.html: Critérios reordenados');
  }

  fs.writeFileSync(htmlPath, html, 'utf-8');
  return report;
}

app.get('/api/dev/config', (req, res) => {
  const config = readConfig();
  if (!config) return res.status(500).json({ error: 'Config não encontrada' });
  res.json(config);
});

function addOptionToSelect(html, selectId, value, text) {
  const re = new RegExp(`(<select[^>]*id="${selectId}"[^>]*>)([\\s\\S]*?)(<\\/select>)`, 'i');
  return html.replace(re, (match, open, inner, close) => {
    const newOpt = `\n<option value="${value}">${text}</option>`;
    return open + inner + newOpt + '\n' + close;
  });
}

function removeOptionFromSelect(html, selectId, value) {
  const re = new RegExp(`(<select[^>]*id="${selectId}"[^>]*>)([\\s\\S]*?)(<\\/select>)`, 'i');
  return html.replace(re, (match, open, inner, close) => {
    const optRe = new RegExp(`<option[^>]*value="${value}"[^>]*>[\\s\\S]*?<\\/option>\\n?`, 'i');
    return open + inner.replace(optRe, '') + close;
  });
}

app.post('/api/dev/save', (req, res) => {
  try {
    const { categories, deleted, changes: directChanges } = req.body;
    if (!categories && !directChanges) return res.status(400).json({ error: 'Dados inválidos' });
    const currentConfig = readConfig();
    if (!currentConfig) return res.status(500).json({ error: 'Config não encontrada' });

    const changes = directChanges ? directChanges.filter(c => c.oldValue && c.newValue && c.oldValue !== c.newValue) : [];
    const newItemsByCat = {};
    const allKeyMappings = {};

    if (categories) {
    for (const [catKey, catData] of Object.entries(categories)) {
      if (!currentConfig[catKey]) currentConfig[catKey] = { label: catKey, items: [] };

      const newItems = catData.items;
      const oldItems = currentConfig[catKey].items;

      const oldByKey = {};
      oldItems.forEach(item => { oldByKey[item.key] = item; });

      const catKeyMappings = {};

      for (let i = 0; i < newItems.length; i++) {
        const newItem = newItems[i];
        if (newItem.key && newItem.key.startsWith('__new_')) {
          const properKey = newItem.value.toLowerCase()
            .replace(/[^a-z0-9áéíóúàâêôãõçü]/g, '_')
            .replace(/_+/g, '_').replace(/^_|_$/g, '')
            .substring(0, 30) || `item_${Date.now()}`;
          catKeyMappings[newItem.key] = { newKey: properKey, value: newItem.value };
          Object.assign(allKeyMappings, catKeyMappings);
          newItemsByCat[catKey] = newItemsByCat[catKey] || [];
          newItemsByCat[catKey].push({ ...newItem, key: properKey });
          continue;
        }
        const oldItem = oldByKey[newItem.key];
        if (oldItem) {
          const oldVal = oldItem.value;
          const newVal = newItem.value;
          if (oldVal !== newVal) {
            changes.push({ oldValue: oldVal, newValue: newVal });
          }
        }
      }

      currentConfig[catKey].items = newItems
        .filter(i => !i.key.startsWith('__new_'))
        .map(i => {
          if (catKeyMappings[i.key]) return { key: catKeyMappings[i.key].newKey, value: i.value };
          return { key: i.key, value: i.value };
        });

      for (const [tempKey, mapping] of Object.entries(catKeyMappings)) {
        currentConfig[catKey].items.push({ key: mapping.newKey, value: mapping.value });
      }
    }

    if (deleted) {
      for (const [catKey, keys] of Object.entries(deleted)) {
        if (currentConfig[catKey]) {
          currentConfig[catKey].items = currentConfig[catKey].items.filter(i => !keys.includes(i.key));
        }
      }
    }
    }

    writeConfig(currentConfig);

    let htmlPath = path.join(__dirname, 'public/index.html');
    let html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf-8') : '';
    const htmlReports = [];

    for (const [catKey, newItems] of Object.entries(newItemsByCat)) {
      if (catKey === 'verticals') {
        const keyMapping = {};
        newItems.forEach(ni => {
          const properKey = ni.key;
          html = addOptionToSelect(html, 'vertical', properKey, ni.value);
          html = addOptionToSelect(html, 'mktVertical', properKey, ni.value);
          htmlReports.push(`Adicionado "${ni.value}" (${properKey}) aos selects`);
        });
      }
    }

    for (const [tempKey, mapping] of Object.entries(allKeyMappings)) {
      const re = new RegExp(`value="${tempKey}"`, 'g');
      html = html.replace(re, `value="${mapping.newKey}"`);
    }

    if (deleted) {
      for (const [catKey, keys] of Object.entries(deleted)) {
        if (catKey === 'verticals') {
          for (const key of keys) {
            html = removeOptionFromSelect(html, 'vertical', key);
            html = removeOptionFromSelect(html, 'mktVertical', key);
            htmlReports.push(`Removido "${key}" dos selects`);
          }
        }
      }
    }

    if (htmlReports.length > 0) fs.writeFileSync(htmlPath, html, 'utf-8');

    const textReport = patchSourceFiles(changes);
    const orderReport = patchSourceFileOrder(currentConfig);
    const allReport = [...textReport, ...orderReport, ...htmlReports];

    res.json({
      message: `${changes.length} valor(es) alterado(s). ${allReport.length} arquivo(s) atualizado(s).`,
      changes,
      report: allReport
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dev/git/status', (req, res) => {
  try {
    const output = execSync('git status', { cwd: __dirname, encoding: 'utf-8' });
    res.json({ output });
  } catch (err) {
    res.json({ output: err.stdout || err.message });
  }
});

app.post('/api/dev/git/push', (req, res) => {
  try {
    const addOut = execSync('git add -A', { cwd: __dirname, encoding: 'utf-8' });
    const commitMsg = `Atualização DevTools - ${new Date().toLocaleString('pt-BR')}`;
    let commitOut = '';
    try { commitOut = execSync(`git commit -m "${commitMsg}"`, { cwd: __dirname, encoding: 'utf-8' }); }
    catch (e) { commitOut = e.stdout || 'Nada a commitadar'; }
    let pushOut = '';
    try { pushOut = execSync('git push', { cwd: __dirname, encoding: 'utf-8' }); }
    catch (e) { pushOut = e.stdout || e.message || 'Erro no push (pode ser necessário configurar remote)'; }
    res.json({ output: `Add: ${addOut}\nCommit: ${commitOut}\nPush: ${pushOut}` });
  } catch (err) {
    res.json({ output: err.stdout || err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Meu Azul rodando em http://localhost:${PORT}`);
});
