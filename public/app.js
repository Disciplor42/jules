// State Management
const state = {
  apiKey: localStorage.getItem('jules_api_key') || '',
  sessions: [],
  sources: [],
  selectedSessionId: null,
  activeSession: null,
  activities: [],
  lastActivityTimestamp: null,
  pollInterval: null,
  isPolling: false
};

// DOM Elements
const elements = {
  apiKeyStatusBtn: document.getElementById('apiKeyStatusBtn'),
  apiKeyDot: document.getElementById('apiKeyDot'),
  apiKeyText: document.getElementById('apiKeyText'),
  apiKeyModal: document.getElementById('apiKeyModal'),
  apiKeyForm: document.getElementById('apiKeyForm'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  apiKeyError: document.getElementById('apiKeyError'),
  btnApiKeyCancel: document.getElementById('btnApiKeyCancel'),

  btnNewSession: document.getElementById('btnNewSession'),
  btnNoSessionNew: document.getElementById('btnNoSessionNew'),
  newSessionModal: document.getElementById('newSessionModal'),
  btnCloseNewSessionModal: document.getElementById('btnCloseNewSessionModal'),
  btnCancelCreateSession: document.getElementById('btnCancelCreateSession'),
  createSessionForm: document.getElementById('createSessionForm'),
  selectSource: document.getElementById('selectSource'),
  selectBranch: document.getElementById('selectBranch'),
  inputTitle: document.getElementById('inputTitle'),
  inputPrompt: document.getElementById('inputPrompt'),
  selectAutomationMode: document.getElementById('selectAutomationMode'),
  checkRequirePlanApproval: document.getElementById('checkRequirePlanApproval'),

  btnRefreshSessions: document.getElementById('btnRefreshSessions'),
  sessionSearch: document.getElementById('sessionSearch'),
  sessionsList: document.getElementById('sessionsList'),

  noSessionView: document.getElementById('noSessionView'),
  activeSessionView: document.getElementById('activeSessionView'),

  sessionStateBadge: document.getElementById('sessionStateBadge'),
  sessionTitle: document.getElementById('sessionTitle'),
  sessionSourceText: document.getElementById('sessionSourceText'),
  sessionIdText: document.getElementById('sessionIdText'),
  btnRefreshActivities: document.getElementById('btnRefreshActivities'),
  btnDeleteSession: document.getElementById('btnDeleteSession'),

  sessionPrBanner: document.getElementById('sessionPrBanner'),
  sessionPrTitle: document.getElementById('sessionPrTitle'),
  sessionPrLink: document.getElementById('sessionPrLink'),

  activitiesFeed: document.getElementById('activitiesFeed'),
  sendMessageForm: document.getElementById('sendMessageForm'),
  messageInput: document.getElementById('messageInput'),
  btnSendMessage: document.getElementById('btnSendMessage'),
  pollingStatusText: document.getElementById('pollingStatusText')
};

// Helper: Headers
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-goog-api-key': state.apiKey
  };
}

// API Calls
async function apiFetch(endpoint, options = {}) {
  const headers = { ...getHeaders(), ...(options.headers || {}) };
  const res = await fetch(endpoint, { ...options, headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  updateApiKeyUI();
  lucide.createIcons();
  setupEventListeners();

  if (state.apiKey) {
    loadSources();
    loadSessions();
  } else {
    showApiKeyModal();
  }
});

// Setup Event Listeners
function setupEventListeners() {
  elements.apiKeyStatusBtn.addEventListener('click', showApiKeyModal);
  elements.btnApiKeyCancel.addEventListener('click', hideApiKeyModal);
  elements.apiKeyForm.addEventListener('submit', handleApiKeySubmit);

  elements.btnNewSession.addEventListener('click', showNewSessionModal);
  elements.btnNoSessionNew.addEventListener('click', showNewSessionModal);
  elements.btnCloseNewSessionModal.addEventListener('click', hideNewSessionModal);
  elements.btnCancelCreateSession.addEventListener('click', hideNewSessionModal);
  elements.createSessionForm.addEventListener('submit', handleCreateSession);

  elements.selectSource.addEventListener('change', handleSourceChange);

  elements.btnRefreshSessions.addEventListener('click', () => loadSessions(true));
  elements.sessionSearch.addEventListener('input', renderSessionsList);

  elements.btnRefreshActivities.addEventListener('click', () => {
    if (state.selectedSessionId) loadActivities(state.selectedSessionId, true);
  });

  elements.btnDeleteSession.addEventListener('click', handleDeleteSession);
  elements.sendMessageForm.addEventListener('submit', handleSendMessage);
}

// API Key Modal Handling
function updateApiKeyUI() {
  if (state.apiKey) {
    elements.apiKeyDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
    elements.apiKeyText.innerText = `Key: ${state.apiKey.substring(0, 6)}...`;
  } else {
    elements.apiKeyDot.className = 'w-2 h-2 rounded-full bg-amber-500';
    elements.apiKeyText.innerText = 'Set API Key';
  }
}

function showApiKeyModal() {
  elements.apiKeyInput.value = state.apiKey;
  elements.apiKeyError.classList.add('hidden');
  elements.apiKeyModal.classList.remove('hidden');
}

function hideApiKeyModal() {
  elements.apiKeyModal.classList.add('hidden');
}

async function handleApiKeySubmit(e) {
  e.preventDefault();
  const key = elements.apiKeyInput.value.trim();
  if (!key) return;

  state.apiKey = key;
  localStorage.setItem('jules_api_key', key);
  updateApiKeyUI();
  elements.apiKeyError.classList.add('hidden');

  try {
    await loadSources();
    await loadSessions();
    hideApiKeyModal();
  } catch (err) {
    elements.apiKeyError.innerText = `Validation Error: ${err.message}`;
    elements.apiKeyError.classList.remove('hidden');
  }
}

// Load Sources
async function loadSources() {
  try {
    const data = await apiFetch('/api/sources');
    state.sources = data.sources || [];
    renderSourcesDropdown();
  } catch (err) {
    console.error('Failed to load sources:', err);
  }
}

function renderSourcesDropdown() {
  elements.selectSource.innerHTML = '';
  if (state.sources.length === 0) {
    elements.selectSource.innerHTML = '<option value="">No connected sources found</option>';
    return;
  }

  state.sources.forEach(src => {
    const opt = document.createElement('option');
    opt.value = src.name;
    const repoName = src.githubRepo ? `${src.githubRepo.owner}/${src.githubRepo.repo}` : src.name;
    opt.innerText = repoName;
    elements.selectSource.appendChild(opt);
  });

  handleSourceChange();
}

function handleSourceChange() {
  const selectedName = elements.selectSource.value;
  const sourceObj = state.sources.find(s => s.name === selectedName);
  elements.selectBranch.innerHTML = '';

  if (sourceObj && sourceObj.githubRepo && sourceObj.githubRepo.branches) {
    sourceObj.githubRepo.branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.displayName;
      opt.innerText = b.displayName;
      if (sourceObj.githubRepo.defaultBranch && b.displayName === sourceObj.githubRepo.defaultBranch.displayName) {
        opt.selected = true;
      }
      elements.selectBranch.appendChild(opt);
    });
  } else {
    const opt = document.createElement('option');
    opt.value = 'main';
    opt.innerText = 'main';
    elements.selectBranch.appendChild(opt);
  }
}

// New Session Handling
function showNewSessionModal() {
  if (!state.apiKey) {
    showApiKeyModal();
    return;
  }
  if (state.sources.length === 0) {
    loadSources();
  }
  elements.newSessionModal.classList.remove('hidden');
}

function hideNewSessionModal() {
  elements.newSessionModal.classList.add('hidden');
}

async function handleCreateSession(e) {
  e.preventDefault();
  const sourceName = elements.selectSource.value;
  const branch = elements.selectBranch.value;
  const title = elements.inputTitle.value.trim();
  const prompt = elements.inputPrompt.value.trim();
  const automationMode = elements.selectAutomationMode.value;
  const requirePlanApproval = elements.checkRequirePlanApproval.checked;

  if (!sourceName || !title || !prompt) return;

  const btn = document.getElementById('btnSubmitCreateSession');
  btn.disabled = true;
  btn.innerText = 'Creating...';

  try {
    const payload = {
      prompt,
      title,
      sourceContext: {
        source: sourceName,
        githubRepoContext: {
          startingBranch: branch
        }
      },
      automationMode,
      requirePlanApproval
    };

    const newSession = await apiFetch('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    hideNewSessionModal();
    elements.createSessionForm.reset();
    await loadSessions();
    selectSession(newSession.id || (newSession.name ? newSession.name.split('/').pop() : null));
  } catch (err) {
    alert(`Failed to create session: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Start Session';
  }
}

// Sessions Management
async function loadSessions(manual = false) {
  try {
    if (manual) elements.btnRefreshSessions.classList.add('animate-spin');
    const data = await apiFetch('/api/sessions?pageSize=50');
    state.sessions = data.sessions || [];
    renderSessionsList();
  } catch (err) {
    console.error('Error loading sessions:', err);
  } finally {
    elements.btnRefreshSessions.classList.remove('animate-spin');
  }
}

function renderSessionsList() {
  const query = elements.sessionSearch.value.toLowerCase().trim();
  const filtered = state.sessions.filter(s => {
    const title = (s.title || s.prompt || '').toLowerCase();
    const id = (s.id || s.name || '').toLowerCase();
    return title.includes(query) || id.includes(query);
  });

  elements.sessionsList.innerHTML = '';

  if (filtered.length === 0) {
    elements.sessionsList.innerHTML = `
      <div class="p-4 text-center text-xs text-slate-500">
        ${query ? 'No matching sessions' : 'No sessions found'}
      </div>
    `;
    return;
  }

  filtered.forEach(session => {
    const id = session.id || (session.name ? session.name.split('/').pop() : '');
    const title = session.title || session.prompt || 'Untitled Session';
    const stateVal = session.state || 'QUEUED';
    const isSelected = id === state.selectedSessionId;

    const item = document.createElement('div');
    item.className = `p-3 cursor-pointer transition border-l-2 ${
      isSelected
        ? 'bg-slate-800/80 border-blue-500 text-white'
        : 'border-transparent text-slate-300 hover:bg-slate-800/40 hover:text-slate-100'
    }`;

    item.onclick = () => selectSession(id);

    item.innerHTML = `
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="text-xs font-medium truncate">${escapeHtml(title)}</span>
        ${getStateBadgeHTML(stateVal, 'compact')}
      </div>
      <div class="flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span class="truncate">${session.sourceContext?.source ? session.sourceContext.source.replace('sources/', '') : id}</span>
        <span>${formatDate(session.createTime)}</span>
      </div>
    `;

    elements.sessionsList.appendChild(item);
  });
}

// Select Session
async function selectSession(sessionId) {
  if (!sessionId) return;
  state.selectedSessionId = sessionId;
  state.lastActivityTimestamp = null;
  state.activities = [];

  renderSessionsList();

  elements.noSessionView.classList.add('hidden');
  elements.activeSessionView.classList.remove('hidden');

  // Load Session Details & Activities
  await fetchSessionDetails(sessionId);
  await loadActivities(sessionId);

  startPolling();
}

async function fetchSessionDetails(sessionId) {
  try {
    const session = await apiFetch(`/api/sessions/${sessionId}`);
    state.activeSession = session;
    renderSessionHeader(session);
  } catch (err) {
    console.error('Error fetching session details:', err);
  }
}

function renderSessionHeader(session) {
  elements.sessionTitle.innerText = session.title || session.prompt || 'Untitled Session';
  elements.sessionStateBadge.innerHTML = getStateBadgeHTML(session.state || 'QUEUED', 'full');
  elements.sessionSourceText.innerText = session.sourceContext?.source || 'No source';
  elements.sessionIdText.innerText = `id: ${session.id || session.name}`;

  // Check outputs for PR
  if (session.outputs && session.outputs.length > 0) {
    const prOutput = session.outputs.find(o => o.pullRequest);
    if (prOutput) {
      elements.sessionPrTitle.innerText = prOutput.pullRequest.title || 'Pull Request';
      elements.sessionPrLink.href = prOutput.pullRequest.url || '#';
      elements.sessionPrBanner.classList.remove('hidden');
    } else {
      elements.sessionPrBanner.classList.add('hidden');
    }
  } else {
    elements.sessionPrBanner.classList.add('hidden');
  }
}

// Delete Session
async function handleDeleteSession() {
  if (!state.selectedSessionId) return;
  if (!confirm('Are you sure you want to delete this session?')) return;

  try {
    await apiFetch(`/api/sessions/${state.selectedSessionId}`, { method: 'DELETE' });
    stopPolling();
    state.selectedSessionId = null;
    state.activeSession = null;
    elements.activeSessionView.classList.add('hidden');
    elements.noSessionView.classList.remove('hidden');
    await loadSessions();
  } catch (err) {
    alert(`Failed to delete session: ${err.message}`);
  }
}

// Activities Handling
async function loadActivities(sessionId, manual = false) {
  try {
    if (manual) elements.btnRefreshActivities.classList.add('animate-spin');

    let url = `/api/sessions/${sessionId}/activities?pageSize=100`;
    if (state.lastActivityTimestamp && !manual) {
      url += `&createTime=${state.lastActivityTimestamp}`;
    }

    const data = await apiFetch(url);
    const newActivities = data.activities || [];

    if (manual || !state.lastActivityTimestamp) {
      state.activities = newActivities;
    } else if (newActivities.length > 0) {
      // Append non-duplicate activities
      const existingIds = new Set(state.activities.map(a => a.id || a.name));
      newActivities.forEach(act => {
        const id = act.id || act.name;
        if (!existingIds.has(id)) {
          state.activities.push(act);
        }
      });
    }

    if (state.activities.length > 0) {
      const latest = state.activities[state.activities.length - 1];
      if (latest.createTime) {
        state.lastActivityTimestamp = latest.createTime;
      }
    }

    renderActivities();
  } catch (err) {
    console.error('Error loading activities:', err);
  } finally {
    elements.btnRefreshActivities.classList.remove('animate-spin');
  }
}

function renderActivities() {
  elements.activitiesFeed.innerHTML = '';

  if (state.activities.length === 0) {
    elements.activitiesFeed.innerHTML = `
      <div class="text-center py-12 text-slate-500 text-xs">
        No activities recorded yet for this session.
      </div>
    `;
    return;
  }

  state.activities.forEach(activity => {
    const actCard = createActivityElement(activity);
    if (actCard) {
      elements.activitiesFeed.appendChild(actCard);
    }
  });

  lucide.createIcons();
  scrollToBottomFeed();
}

function createActivityElement(act) {
  const card = document.createElement('div');
  card.className = 'bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3';

  const headerTime = formatDate(act.createTime);
  const originator = act.originator || 'system';

  // Determine Activity Content
  if (act.planGenerated) {
    const plan = act.planGenerated.plan;
    card.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <div class="flex items-center space-x-2 text-xs font-semibold text-blue-400">
          <i data-lucide="list-checks" class="w-4 h-4"></i>
          <span>Plan Generated</span>
        </div>
        <span class="text-[11px] font-mono text-slate-500">${headerTime}</span>
      </div>
      <div class="space-y-2 pt-1">
        ${renderPlanSteps(plan ? plan.steps : [])}
      </div>
    `;
  } else if (act.planApproved) {
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
          <i data-lucide="check-circle-2" class="w-4 h-4"></i>
          <span>Plan Approved</span>
        </div>
        <span class="text-[11px] font-mono text-slate-500">${headerTime}</span>
      </div>
    `;
  } else if (act.userMessaged) {
    card.className = 'bg-blue-950/20 border border-blue-900/40 rounded-xl p-4 space-y-2 ml-8';
    card.innerHTML = `
      <div class="flex items-center justify-between text-xs text-blue-400 font-semibold">
        <div class="flex items-center space-x-2">
          <i data-lucide="user" class="w-4 h-4"></i>
          <span>User Message</span>
        </div>
        <span class="text-[11px] font-mono text-slate-500">${headerTime}</span>
      </div>
      <div class="text-sm text-slate-200 whitespace-pre-wrap">${escapeHtml(act.userMessaged.userMessage || '')}</div>
    `;
  } else if (act.agentMessaged) {
    card.innerHTML = `
      <div class="flex items-center justify-between text-xs text-indigo-400 font-semibold border-b border-slate-800 pb-2">
        <div class="flex items-center space-x-2">
          <i data-lucide="bot" class="w-4 h-4"></i>
          <span>Jules</span>
        </div>
        <span class="text-[11px] font-mono text-slate-500">${headerTime}</span>
      </div>
      <div class="text-sm text-slate-200 whitespace-pre-wrap pt-1">${escapeHtml(act.agentMessaged.agentMessage || '')}</div>
    `;
  } else if (act.progressUpdated) {
    const prog = act.progressUpdated;
    card.innerHTML = `
      <div class="flex items-center justify-between text-xs text-amber-400 font-semibold">
        <div class="flex items-center space-x-2">
          <i data-lucide="loader" class="w-4 h-4 animate-spin"></i>
          <span>${escapeHtml(prog.title || 'Progress Update')}</span>
        </div>
        <span class="text-[11px] font-mono text-slate-500">${headerTime}</span>
      </div>
      ${prog.description ? `<div class="text-xs text-slate-400 pl-6">${escapeHtml(prog.description)}</div>` : ''}
    `;
  } else if (act.sessionCompleted) {
    card.className = 'bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-4';
    card.innerHTML = `
      <div class="flex items-center justify-between text-xs text-emerald-400 font-semibold">
        <div class="flex items-center space-x-2">
          <i data-lucide="check-check" class="w-5 h-5"></i>
          <span class="text-sm">Session Completed</span>
        </div>
        <span class="text-[11px] font-mono text-slate-500">${headerTime}</span>
      </div>
    `;
  } else if (act.sessionFailed) {
    card.className = 'bg-red-950/20 border border-red-900/50 rounded-xl p-4 space-y-1';
    card.innerHTML = `
      <div class="flex items-center justify-between text-xs text-red-400 font-semibold">
        <div class="flex items-center space-x-2">
          <i data-lucide="alert-triangle" class="w-5 h-5"></i>
          <span class="text-sm">Session Failed</span>
        </div>
        <span class="text-[11px] font-mono text-slate-500">${headerTime}</span>
      </div>
      <div class="text-xs text-red-300 pl-7">${escapeHtml(act.sessionFailed.reason || 'Unknown error')}</div>
    `;
  } else {
    // Default description
    card.innerHTML = `
      <div class="flex items-center justify-between text-xs text-slate-400">
        <span class="font-semibold text-slate-300">${escapeHtml(act.description || 'Activity')}</span>
        <span class="text-[11px] font-mono text-slate-500">${headerTime}</span>
      </div>
    `;
  }

  // Render Artifacts if present
  if (act.artifacts && act.artifacts.length > 0) {
    const artContainer = document.createElement('div');
    artContainer.className = 'mt-3 pt-3 border-t border-slate-800/80 space-y-3';

    act.artifacts.forEach(art => {
      if (art.changeSet && art.changeSet.gitPatch) {
        artContainer.appendChild(renderGitPatch(art.changeSet.gitPatch));
      }
      if (art.bashOutput) {
        artContainer.appendChild(renderBashOutput(art.bashOutput));
      }
      if (art.media) {
        artContainer.appendChild(renderMedia(art.media));
      }
    });

    card.appendChild(artContainer);
  }

  // Action buttons for state (e.g. Approve Plan button)
  if (act.planGenerated && state.activeSession?.state === 'AWAITING_PLAN_APPROVAL') {
    const approveDiv = document.createElement('div');
    approveDiv.className = 'pt-3 border-t border-slate-800 flex justify-end';
    approveDiv.innerHTML = `
      <button onclick="approvePlan()" class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition">
        <i data-lucide="check" class="w-4 h-4"></i>
        <span>Approve Plan</span>
      </button>
    `;
    card.appendChild(approveDiv);
  }

  return card;
}

// Render Plan Steps
function renderPlanSteps(steps) {
  if (!steps || steps.length === 0) return '<div class="text-xs text-slate-500">No steps detailed.</div>';

  return steps.map((step, idx) => `
    <div class="flex items-start space-x-3 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/50">
      <span class="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-mono shrink-0 text-[10px]">
        ${step.index !== undefined ? step.index + 1 : idx + 1}
      </span>
      <div class="flex-1">
        <div class="font-semibold text-slate-200">${escapeHtml(step.title || '')}</div>
        ${step.description ? `<div class="text-slate-400 mt-0.5 text-[11px] leading-relaxed">${escapeHtml(step.description)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

// Render Artifact Components
function renderGitPatch(gitPatch) {
  const div = document.createElement('div');
  div.className = 'bg-slate-950 border border-slate-800 rounded-lg overflow-hidden';

  const commitMsg = gitPatch.suggestedCommitMessage || 'Code Changes';
  const patchContent = gitPatch.unidiffPatch || '';

  div.innerHTML = `
    <div class="bg-slate-900/90 px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
      <div class="flex items-center space-x-2 font-mono text-slate-300">
        <i data-lucide="file-code" class="w-3.5 h-3.5 text-blue-400"></i>
        <span>${escapeHtml(commitMsg)}</span>
      </div>
      <span class="text-[10px] text-slate-500 font-mono">${gitPatch.baseCommitId ? `base: ${gitPatch.baseCommitId.substring(0, 7)}` : ''}</span>
    </div>
    <div class="p-3 overflow-x-auto max-h-64 font-mono text-xs text-slate-300 leading-relaxed bg-slate-950">
      ${formatDiff(patchContent)}
    </div>
  `;
  return div;
}

function formatDiff(patchText) {
  if (!patchText) return '<span class="text-slate-600">No patch diff data.</span>';
  const lines = patchText.split('\n');
  return lines.map(line => {
    const safeLine = escapeHtml(line);
    if (line.startsWith('+') && !line.startsWith('+++')) {
      return `<div class="diff-add pl-1">${safeLine}</div>`;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      return `<div class="diff-del pl-1">${safeLine}</div>`;
    } else if (line.startsWith('@@') || line.startsWith('diff ')) {
      return `<div class="diff-header py-0.5">${safeLine}</div>`;
    }
    return `<div class="pl-1 text-slate-400">${safeLine}</div>`;
  }).join('');
}

function renderBashOutput(bash) {
  const div = document.createElement('div');
  div.className = 'bg-slate-950 border border-slate-800 rounded-lg overflow-hidden font-mono text-xs';

  div.innerHTML = `
    <div class="bg-slate-900/90 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
      <div class="flex items-center space-x-2">
        <i data-lucide="terminal" class="w-3.5 h-3.5 text-emerald-400"></i>
        <span class="text-slate-200 font-semibold">$ ${escapeHtml(bash.command || '')}</span>
      </div>
      <span class="${bash.exitCode === 0 ? 'text-emerald-400' : 'text-red-400'} font-bold">
        exit: ${bash.exitCode ?? 0}
      </span>
    </div>
    <pre class="p-3 text-slate-300 overflow-x-auto max-h-48 whitespace-pre-wrap">${escapeHtml(bash.output || '')}</pre>
  `;
  return div;
}

function renderMedia(media) {
  const div = document.createElement('div');
  div.className = 'bg-slate-950 border border-slate-800 rounded-lg p-2';

  if (media.mimeType?.startsWith('image/')) {
    div.innerHTML = `<img src="data:${media.mimeType};base64,${media.data}" class="max-w-full rounded h-auto" />`;
  } else {
    div.innerHTML = `<div class="text-xs text-slate-400">Media file: ${media.mimeType}</div>`;
  }
  return div;
}

// Actions
async function approvePlan() {
  if (!state.selectedSessionId) return;
  try {
    await apiFetch(`/api/sessions/${state.selectedSessionId}/approvePlan`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    await fetchSessionDetails(state.selectedSessionId);
    await loadActivities(state.selectedSessionId, true);
  } catch (err) {
    alert(`Failed to approve plan: ${err.message}`);
  }
}

async function handleSendMessage(e) {
  e.preventDefault();
  const msg = elements.messageInput.value.trim();
  if (!msg || !state.selectedSessionId) return;

  elements.btnSendMessage.disabled = true;
  elements.messageInput.value = '';

  try {
    await apiFetch(`/api/sessions/${state.selectedSessionId}/sendMessage`, {
      method: 'POST',
      body: JSON.stringify({ prompt: msg })
    });

    // Optimistically load activities
    await loadActivities(state.selectedSessionId, true);
  } catch (err) {
    alert(`Failed to send message: ${err.message}`);
  } finally {
    elements.btnSendMessage.disabled = false;
  }
}

// Non-Spam Polling Strategy
function startPolling() {
  stopPolling();
  state.isPolling = true;

  // Poll every 5 seconds only when session is active
  state.pollInterval = setInterval(async () => {
    if (!state.selectedSessionId || !state.isPolling) return;

    const activeStates = ['QUEUED', 'PLANNING', 'IN_PROGRESS', 'AWAITING_PLAN_APPROVAL', 'AWAITING_USER_FEEDBACK'];
    if (state.activeSession && activeStates.includes(state.activeSession.state)) {
      await fetchSessionDetails(state.selectedSessionId);
      await loadActivities(state.selectedSessionId);
    }
  }, 5000);
}

function stopPolling() {
  state.isPolling = false;
  if (state.pollInterval) {
    clearInterval(state.pollInterval);
    state.pollInterval = null;
  }
}

// Helpers
function getStateBadgeHTML(stateVal, mode = 'full') {
  const map = {
    'QUEUED': { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Queued' },
    'PLANNING': { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Planning' },
    'AWAITING_PLAN_APPROVAL': { bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20', label: 'Plan Approval' },
    'AWAITING_USER_FEEDBACK': { bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'User Feedback' },
    'IN_PROGRESS': { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse', label: 'In Progress' },
    'PAUSED': { bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20', label: 'Paused' },
    'COMPLETED': { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Completed' },
    'FAILED': { bg: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Failed' }
  };

  const badge = map[stateVal] || { bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20', label: stateVal };

  if (mode === 'compact') {
    return `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono border ${badge.bg}">${badge.label}</span>`;
  }

  return `<span class="px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${badge.bg}">${badge.label}</span>`;
}

function formatDate(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return isoString;
  }
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function scrollToBottomFeed() {
  elements.activitiesFeed.scrollTop = elements.activitiesFeed.scrollHeight;
}
