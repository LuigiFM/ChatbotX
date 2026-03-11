const API_BASE = `${document.origin}/api/Chatbot`;
const DEFAULT_TEMPERATURE = 1.0;

const app = document.getElementById('app');
const toggleSidebar = document.getElementById('toggleSidebar');
const menuNav = document.getElementById('menuNav');
const openModalBtn = document.getElementById('openModal');
const closeModalBtn = document.getElementById('closeModal');
const cancelModalBtn = document.getElementById('cancelModal');
const modalOverlay = document.getElementById('modalOverlay');
const chatbotForm = document.getElementById('chatbotForm');
const dashboardBotList = document.getElementById('dashboardBotList');
const chatbotList = document.getElementById('chatbotList');
const chatbotSelectList = document.getElementById('chatbotSelectList');
const botModelSelect = document.getElementById('botModel');
const totalBotsEl = document.getElementById('totalBots');
const topModelEl = document.getElementById('topModel');
const seedBotsBtn = document.getElementById('seedBots');
const pageTitle = document.getElementById('pageTitle');
const pageDescription = document.getElementById('pageDescription');
const pages = document.querySelectorAll('.page');
const globalActions = document.getElementById('globalActions');
const chatSelectedBotName = document.getElementById('chatSelectedBotName');
const chatSelectedBotMeta = document.getElementById('chatSelectedBotMeta');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const conversationBadge = document.getElementById('conversationBadge');
const activeConversationLabel = document.getElementById('activeConversationLabel');
const metricsBots = document.getElementById('metricsBots');
const metricsSelectedBot = document.getElementById('metricsSelectedBot');
const metricsMessages = document.getElementById('metricsMessages');
const createBotSubmitBtn = document.getElementById('createBotSubmitBtn');
const createBotStatus = document.getElementById('createBotStatus');

const geminiModels = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b'
];

const pageConfig = {
  dashboard: { title: 'Dashboard de Chatbots', description: 'Crie, visualize e organize seus assistentes com uma interface elegante em roxo.' },
  chatbots: { title: 'Gerenciamento de Chatbots', description: 'Veja os bots cadastrados, seus IDs e apague os que não forem mais necessários.' },
  chat: { title: 'Chat com seus bots', description: 'Selecione um chatbot, carregue os dados via API e envie mensagens ao webhook.' },
  metrics: { title: 'Métricas', description: 'Resumo de uso da aplicação e do bot selecionado atualmente.' },
  settings: { title: 'Configurações', description: 'Referência rápida dos endpoints locais utilizados neste frontend.' }
};

let chatbots = [];
let selectedBotId = null;
let currentConversationId = null;
let conversations = {};

function generateGuidFallback() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateConversationId() {
  if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return generateGuidFallback();
}

function setStatus(message = '', type = '') {
  createBotStatus.textContent = message;
  createBotStatus.className = `status-text ${type}`.trim();
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getInitials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
}

function populateModels() {
  geminiModels.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    botModelSelect.appendChild(option);
  });
}

function openModal() {
  modalOverlay.classList.add('active');
  document.getElementById('botName').focus();
}

function closeModal() {
  modalOverlay.classList.remove('active');
  chatbotForm.reset();
  createBotSubmitBtn.disabled = false;
  createBotSubmitBtn.textContent = 'Confirmar';
  setStatus('');
}

function normalizeResponseText(text) {
  if (typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed;
}

function safeJsonParse(rawText) {
  const normalized = normalizeResponseText(rawText);
  if (!normalized) return '';
  try {
    return JSON.parse(normalized);
  } catch {
    return normalized;
  }
}

function extractChatbotId(data) {
  if (typeof data === 'string') return data.trim().replace(/^"|"$/g, '');
  if (!data || typeof data !== 'object') return null;

  const candidates = [data.id, data.chatbotId, data.chatBotId, data.Id, data.ID, data.value, data.Value];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().replace(/^"|"$/g, '');
    }
  }
  return null;
}

function extractAiMessage(data) {
  if (data == null) return 'Resposta vazia da API.';
  if (typeof data === 'string') return data;
  return data.message || data.response || data.reply || data.answer || data.text || data.content || data.raw || JSON.stringify(data, null, 2);
}

function buildCreatePayload(model, behavior) {
  return {
    model,
    temperature: DEFAULT_TEMPERATURE,
    messages: [
      {
        role: 'system',
        content: behavior
      }
    ]
  };
}

function upsertConversation(botId) {
  if (!conversations[botId]) {
    conversations[botId] = { conversationId: generateConversationId(), messages: [] };
  }
  return conversations[botId];
}

function getSelectedBot() {
  return chatbots.find(bot => String(bot.id) === String(selectedBotId)) || null;
}

function updateStats() {
  totalBotsEl.textContent = chatbots.length;
  metricsBots.textContent = `${chatbots.length} bot${chatbots.length === 1 ? '' : 's'} cadastrado${chatbots.length === 1 ? '' : 's'}.`;

  if (!chatbots.length) {
    topModelEl.textContent = '—';
  } else {
    const modelCount = chatbots.reduce((acc, bot) => {
      acc[bot.model] = (acc[bot.model] || 0) + 1;
      return acc;
    }, {});
    const [mostUsed] = Object.entries(modelCount).sort((a, b) => b[1] - a[1]);
    topModelEl.textContent = mostUsed ? mostUsed[0] : '—';
  }

  if (!selectedBotId) {
    activeConversationLabel.textContent = '—';
    metricsSelectedBot.textContent = 'Nenhum bot selecionado.';
    metricsMessages.textContent = '0 mensagens carregadas.';
    return;
  }

  const selectedBot = getSelectedBot();
  const conversation = upsertConversation(selectedBotId);
  activeConversationLabel.textContent = conversation.conversationId.slice(0, 8);
  metricsSelectedBot.textContent = selectedBot ? `${selectedBot.name} (ID: ${selectedBot.id})` : 'Nenhum bot selecionado.';
  metricsMessages.textContent = `${conversation.messages.length} mensagem(ns) carregada(s).`;
}

function renderBotCard(bot, showDelete = true) {
  return `
    <div class="chatbot-item">
      <div class="bot-avatar">${escapeHtml(getInitials(bot.name) || 'AI')}</div>
      <div class="bot-main">
        <h4>${escapeHtml(bot.name)}</h4>
        <p>${escapeHtml(bot.behavior)}</p>
        <div class="bot-meta">
          <span class="tag">${escapeHtml(bot.model)}</span>
          <span class="tag">ID: ${escapeHtml(bot.id || 'sem ID')}</span>
        </div>
      </div>
      <div class="bot-actions">
        <div class="status">Ativo</div>
        ${showDelete ? `<button class="btn btn-danger btn-small" data-delete-id="${escapeHtml(bot.id)}">Apagar</button>` : ''}
      </div>
    </div>
  `;
}

function renderDashboardBots() {
  if (!chatbots.length) {
    dashboardBotList.innerHTML = `<div class="empty-state">Nenhum chatbot criado ainda. Clique em <strong>Adicionar chatbot</strong> para começar.</div>`;
    return;
  }
  dashboardBotList.innerHTML = chatbots.slice(0, 4).map(bot => renderBotCard(bot, false)).join('');
}

function renderChatbots() {
  chatbotList.innerHTML = chatbots.length
    ? chatbots.map(bot => renderBotCard(bot, true)).join('')
    : `<div class="empty-state">Nenhum chatbot cadastrado no momento.</div>`;
  renderDashboardBots();
  renderChatbotSelector();
  updateStats();
}

function renderChatbotSelector() {
  chatbotSelectList.innerHTML = chatbots.length
    ? chatbots.map(bot => `
      <button class="chatbot-select-item ${String(bot.id) === String(selectedBotId) ? 'active' : ''}" data-select-id="${escapeHtml(bot.id)}">
        <strong>${escapeHtml(bot.name)}</strong>
        <div class="muted">${escapeHtml(bot.model)}</div>
        <div class="muted">ID: ${escapeHtml(bot.id)}</div>
      </button>
    `).join('')
    : `<div class="empty-state">Crie ao menos um chatbot para iniciar conversas.</div>`;
}

function renderMessages() {
  if (!selectedBotId) {
    chatMessages.innerHTML = `<div class="message system">Selecione um bot para iniciar uma conversa.</div>`;
    conversationBadge.textContent = 'conversationId: —';
    return;
  }

  const conversation = upsertConversation(selectedBotId);
  currentConversationId = conversation.conversationId;
  conversationBadge.textContent = `conversationId: ${conversation.conversationId}`;

  if (!conversation.messages.length) {
    chatMessages.innerHTML = `<div class="message system">Conversa iniciada. Envie a primeira mensagem.</div>`;
    updateStats();
    return;
  }

  chatMessages.innerHTML = conversation.messages.map(msg => `
    <div class="message ${msg.role}">${escapeHtml(msg.content)}</div>
  `).join('');

  requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  updateStats();
}

function setActivePage(pageName) {
  pages.forEach(page => page.classList.remove('active'));
  const targetPage = document.getElementById(`page-${pageName}`);
  if (targetPage) targetPage.classList.add('active');
  [...menuNav.querySelectorAll('a')].forEach(link => link.classList.toggle('active', link.dataset.page === pageName));
  pageTitle.textContent = pageConfig[pageName]?.title || 'Dashboard';
  pageDescription.textContent = pageConfig[pageName]?.description || '';
  globalActions.style.display = (pageName === 'dashboard' || pageName === 'chatbots') ? 'flex' : 'none';
}

async function readResponseData(response) {
  const rawText = await response.text();
  return safeJsonParse(rawText);
}

function buildHttpErrorMessage(prefix, response, data) {
  const base = `${prefix} (${response.status} ${response.statusText})`;
  if (typeof data === 'string' && data.trim()) return `${base}: ${data}`;
  if (data && typeof data === 'object') {
    const details = data.message || data.title || data.error || JSON.stringify(data);
    if (details) return `${base}: ${details}`;
  }
  return base;
}

async function createChatbotOnApi(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const data = await readResponseData(response);

    if (!response.ok) {
      throw new Error(buildHttpErrorMessage('Erro ao criar chatbot', response, data));
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('A requisição demorou demais. Verifique se a API local está online.');
    }
    if (error instanceof TypeError) {
      throw new Error('Falha de rede ao acessar a API. Verifique se a API está rodando e se o navegador consegue alcançá-la.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchChatbotById(id) {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json, text/plain, */*' }
  });
  const data = await readResponseData(response);
  if (!response.ok) throw new Error(buildHttpErrorMessage('Erro ao buscar chatbot', response, data));
  return data;
}

async function sendWebhookMessage(payload) {
  const response = await fetch(`${API_BASE}/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*'
    },
    body: JSON.stringify(payload)
  });
  const data = await readResponseData(response);
  if (!response.ok) throw new Error(buildHttpErrorMessage('Erro ao enviar mensagem', response, data));
  return data;
}

async function handleCreateBot(event) {
  event.preventDefault();

  const name = document.getElementById('botName').value.trim();
  const model = document.getElementById('botModel').value;
  const behavior = document.getElementById('botBehavior').value.trim();

  if (!name || !model || !behavior) {
    setStatus('Preencha todos os campos antes de continuar.', 'warning');
    return;
  }

  createBotSubmitBtn.disabled = true;
  createBotSubmitBtn.textContent = 'Criando...';
  setStatus('Enviando dados para a API local...', 'warning');

  const payload = buildCreatePayload(model, behavior);

  try {
    const apiData = await createChatbotOnApi(payload);
    const createdId = extractChatbotId(apiData);

    if (!createdId) {
      throw new Error(`A API respondeu, mas não foi possível extrair o ID. Resposta recebida: ${typeof apiData === 'string' ? apiData : JSON.stringify(apiData)}`);
    }

    chatbots.unshift({
      id: createdId,
      name,
      model,
      behavior,
      temperature: DEFAULT_TEMPERATURE,
      apiResponse: apiData
    });

    renderChatbots();
    setStatus('Chatbot criado com sucesso.', 'success');
    setTimeout(() => {
      closeModal();
      setActivePage('chatbots');
    }, 250);
  } catch (error) {
    setStatus(error.message || 'Erro desconhecido ao criar chatbot.', 'error');
    createBotSubmitBtn.disabled = false;
    createBotSubmitBtn.textContent = 'Confirmar';
  }
}

function deleteBot(botId) {
  const bot = chatbots.find(item => String(item.id) === String(botId));
  if (!bot) return;
  if (!confirm(`Deseja apagar o chatbot "${bot.name}"?`)) return;

  chatbots = chatbots.filter(item => String(item.id) !== String(botId));
  delete conversations[botId];

  if (String(selectedBotId) === String(botId)) {
    selectedBotId = null;
    currentConversationId = null;
    chatSelectedBotName.textContent = 'Nenhum bot selecionado';
    chatSelectedBotMeta.textContent = 'Selecione um chatbot à esquerda para carregar a conversa.';
  }

  renderChatbots();
  renderMessages();
}

async function selectBot(botId) {
  const selected = chatbots.find(bot => String(bot.id) === String(botId));
  if (!selected) return;

  selectedBotId = String(botId);
  const conversation = upsertConversation(selectedBotId);
  currentConversationId = conversation.conversationId;

  chatSelectedBotName.textContent = selected.name;
  chatSelectedBotMeta.textContent = `Modelo: ${selected.model} • ID: ${selected.id}`;
  renderChatbotSelector();
  renderMessages();
  updateStats();

  try {
    chatMessages.innerHTML = `<div class="message system">Carregando dados do bot pela API...</div>`;
    const botData = await fetchChatbotById(selectedBotId);
    const preview = typeof botData === 'object'
      ? `Bot carregado com sucesso via GET /api/Chatbot/${selectedBotId}. Modelo: ${botData.model || botData.Model || selected.model}.`
      : `Bot carregado com sucesso via GET /api/Chatbot/${selectedBotId}.`;
    renderMessages();
    conversations[selectedBotId].messages.push({ role: 'system', content: preview });
    renderMessages();
  } catch (error) {
    conversations[selectedBotId].messages.push({ role: 'system', content: `Falha ao buscar o bot na API: ${error.message}` });
    renderMessages();
  }
}

async function handleSendMessage(event) {
  event.preventDefault();

  if (!selectedBotId) {
    alert('Selecione um chatbot antes de enviar uma mensagem.');
    return;
  }

  const message = chatInput.value.trim();
  if (!message) return;

  const conversation = upsertConversation(selectedBotId);
  const payload = {
    conversationId: conversation.conversationId,
    chatbotId: String(selectedBotId),
    message
  };

  conversation.messages.push({ role: 'user', content: message });
  renderMessages();
  chatInput.value = '';

  conversation.messages.push({ role: 'system', content: 'Enviando mensagem ao webhook...' });
  renderMessages();

  try {
    const responseData = await sendWebhookMessage(payload);
    conversation.messages = conversation.messages.filter(msg => msg.content !== 'Enviando mensagem ao webhook...');
    conversation.messages.push({ role: 'ai', content: extractAiMessage(responseData) });
    renderMessages();
  } catch (error) {
    conversation.messages = conversation.messages.filter(msg => msg.content !== 'Enviando mensagem ao webhook...');
    conversation.messages.push({ role: 'system', content: `Erro ao chamar o webhook: ${error.message}` });
    renderMessages();
  }
}

function seedLocalExamples() {
  if (chatbots.length) return;
  chatbots = [
    {
      id: generateGuidFallback(),
      name: 'Atendimento Violeta',
      model: 'gemini-2.5-flash',
      behavior: 'Atende clientes com rapidez, simpatia e respostas claras, priorizando conversão e suporte eficiente.'
    },
    {
      id: generateGuidFallback(),
      name: 'Analista Purple Insights',
      model: 'gemini-2.5-pro',
      behavior: 'Analisa dados, propõe insights estratégicos e responde de forma consultiva e detalhada.'
    }
  ];
  renderChatbots();
}

function runClientSideChecks() {
  console.assert(typeof buildCreatePayload('gemini-2.5-flash', 'teste').temperature === 'number', 'temperature deve ser number');
  console.assert(/^.{8}-.{4}-.{4}-.{4}-.{12}$/.test(generateGuidFallback()), 'fallback de GUID deve ter formato GUID');
  console.assert(extractChatbotId('"abc"') === 'abc', 'deve extrair ID string com aspas');
  console.assert(extractChatbotId({ id: 'xyz' }) === 'xyz', 'deve extrair ID de objeto');
}

toggleSidebar.addEventListener('click', () => app.classList.toggle('collapsed'));
openModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);
chatbotForm.addEventListener('submit', handleCreateBot);
seedBotsBtn.addEventListener('click', seedLocalExamples);
chatForm.addEventListener('submit', handleSendMessage);

chatInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

modalOverlay.addEventListener('click', event => {
  if (event.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeModal();
});

menuNav.addEventListener('click', event => {
  const link = event.target.closest('[data-page]');
  if (!link) return;
  setActivePage(link.dataset.page);
});

chatbotList.addEventListener('click', event => {
  const button = event.target.closest('[data-delete-id]');
  if (!button) return;
  deleteBot(button.dataset.deleteId);
});

chatbotSelectList.addEventListener('click', event => {
  const button = event.target.closest('[data-select-id]');
  if (!button) return;
  selectBot(button.dataset.selectId);
});

populateModels();
runClientSideChecks();
renderChatbots();
renderMessages();
setActivePage('dashboard');

