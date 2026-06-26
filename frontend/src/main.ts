import "./style.css";
import { getInitialLocale, t, type Locale } from "./i18n";

const API_URL = "http://localhost:8009";
const WS_URL = API_URL.replace("http://", "ws://").replace("https://", "wss://");
let socket: WebSocket | null = null;
let socketReady: Promise<void> | null = null;

type Mode = "push" | "agent";
type Stack = "local" | "openai";
type StackMode = "hybrid" | "local" | "openai";

type ResponseMetrics = {
  transcriptionMs?: number;
  llmMs?: number;
  ttsMs?: number;
};

type CurrentTurn = {
  llmTokens: string;
  audioBase64?: string;
  metrics: ResponseMetrics;
  mode: Mode;
  stack: Stack;
};

type StackConfig = {
  key: Stack;
  label: string;
  description: string;
  requested: boolean;
  available: boolean;
  reason?: string | null;
  reason_code?: string | null;
  llm_model?: string;
  stt_model?: string;
  tts_model?: string;
  tts_voice?: string;
  base_url?: string | null;
};

type HealthResponse = {
  status: string;
  stack_mode?: StackMode;
  default_stack?: Stack;
  available_stacks?: Stack[];
  stacks?: Partial<Record<Stack, StackConfig>>;
};

type AgentRuntime = {
  enabled: boolean;
  processing: boolean;
  stream: MediaStream | null;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  source: MediaStreamAudioSourceNode | null;
  vadFrame: number | null;
  mediaRecorder: MediaRecorder | null;
  chunks: Blob[];
  mimeType: string;
  lastSpeechAt: number;
  audioPlaying: boolean;
};

const VAD_THRESHOLD = 0.045;
const VAD_END_SILENCE_MS = 1100;

const pageTitleEl = document.getElementById("page-title") as HTMLTitleElement | null;
const heroTitleEl = document.getElementById("hero-title")!;
const heroSubtitleEl = document.getElementById("hero-subtitle")!;
const stackModeLabelEl = document.getElementById("stack-mode-label")!;
const connectionLabelEl = document.getElementById("connection-label")!;
const dashboardSessionLabelEl = document.getElementById("dashboard-session-label")!;
const dashboardUserLabelEl = document.getElementById("dashboard-user-label")!;
const dashboardStackLabelEl = document.getElementById("dashboard-stack-label")!;
const dashboardMemoryLabelEl = document.getElementById("dashboard-memory-label")!;
const dashboardStatusLabelEl = document.getElementById("dashboard-status-label")!;
const modeTitleEl = document.getElementById("mode-title")!;
const modeDescriptionEl = document.getElementById("mode-description")!;
const stacksTitleEl = document.getElementById("stacks-title")!;
const agentTitleEl = document.getElementById("agent-title")!;
const agentDescriptionEl = document.getElementById("agent-description")!;
const chatTitleEl = document.getElementById("chat-title")!;
const chatDescriptionEl = document.getElementById("chat-description")!;
const emptyTitleEl = document.getElementById("empty-title")!;
const emptyDescriptionEl = document.getElementById("empty-description")!;
const quickSummaryTitleEl = document.getElementById("quick-summary-title")!;
const quickSummaryDescriptionEl = document.getElementById("quick-summary-description")!;
const summaryStackModeLabelEl = document.getElementById("summary-stack-mode-label")!;
const summaryConnectionLabelEl = document.getElementById("summary-connection-label")!;
const recordingIndicatorTextEl = document.getElementById("recording-indicator-text")!;
const tipsTitleEl = document.getElementById("tips-title")!;
const tipsDescriptionEl = document.getElementById("tips-description")!;
const tip1El = document.getElementById("tip-1")!;
const tip2El = document.getElementById("tip-2")!;
const tip3El = document.getElementById("tip-3")!;
const conversation = document.getElementById("conversation")!;
const statusText = document.getElementById("status-text")!;
const recordingIndicator = document.getElementById("recording-indicator")!;
const sessionIdEl = document.getElementById("session-id")!;
const userIdEl = document.getElementById("user-id")!;
const stackNameEl = document.getElementById("stack-name")!;
const memoryCountEl = document.getElementById("memory-count")!;
const stackModeEl = document.getElementById("stack-mode")!;
const stackModeSideEl = document.getElementById("stack-mode-side")!;
const connectionStateEl = document.getElementById("connection-state")!;
const connectionStateSideEl = document.getElementById("connection-state-side")!;
const stackSummaryEl = document.getElementById("stack-summary")!;
const stackNoteEl = document.getElementById("stack-note")!;
const stackBar = document.getElementById("stack-bar")!;
const footerTipEl = document.getElementById("footer-tip")!;
const conversationEmptyEl = document.getElementById("conversation-empty")!;
const chatStatusLabelEl = document.getElementById("chat-status-label")!;
const modePushButton = document.getElementById("mode-push") as HTMLButtonElement;
const modeAgentButton = document.getElementById("mode-agent") as HTMLButtonElement;
const agentControls = document.getElementById("agent-controls")!;
const agentToggleButton = document.getElementById("agent-toggle") as HTMLButtonElement;
const agentStateEl = document.getElementById("agent-state")!;
const langPtButton = document.getElementById("lang-pt") as HTMLButtonElement;
const langEnButton = document.getElementById("lang-en") as HTMLButtonElement;

const sessionId = getOrCreateStorageValue("voice-chat-session-id", sessionStorage);
const userId = getOrCreateStorageValue("voice-chat-user-id", localStorage, "guest");
sessionIdEl.textContent = shortId(sessionId);
userIdEl.textContent = shortId(userId);

let currentMode: Mode = "push";
let currentStack: Stack = normalizeStack(localStorage.getItem("voice-chat-stack"));
let currentLocale: Locale = getInitialLocale();
let currentStackMode: StackMode = "hybrid";
let currentTurn: CurrentTurn | null = null;
let pushRecorder: MediaRecorder | null = null;
let pushChunks: Blob[] = [];
let isPushRecording = false;
let botAudioElement: HTMLAudioElement | null = null;
let availableStacks: Stack[] = [];
let stackConfigs: Partial<Record<Stack, StackConfig>> = {};

const agentRuntime: AgentRuntime = {
  enabled: false,
  processing: false,
  stream: null,
  audioContext: null,
  analyser: null,
  source: null,
  vadFrame: null,
  mediaRecorder: null,
  chunks: [],
  mimeType: "audio/webm",
  lastSpeechAt: 0,
  audioPlaying: false,
};

function setStatus(msg: string) {
  statusText.innerHTML = msg;
}

function defaultPushStatus() {
  return t(currentLocale, "defaultPushStatusHtml");
}

function defaultAgentStatus() {
  return t(currentLocale, "defaultAgentStatus");
}

function setConnectionState(msg: string) {
  connectionStateEl.textContent = msg;
  connectionStateEl.setAttribute("data-state", msg.toLowerCase());
  connectionStateSideEl.textContent = msg;
}

function setChatStatus(msg: string) {
  chatStatusLabelEl.textContent = msg;
}

function syncConversationEmptyState() {
  const hasMessages = conversation.children.length > 0;
  conversationEmptyEl.classList.toggle("hidden", hasMessages);
}

function getOrCreateStorageValue(key: string, storage: Storage, prefix = "session") {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const value = `${prefix}-${crypto.randomUUID()}`;
  storage.setItem(key, value);
  return value;
}

function shortId(value: string) {
  return value.slice(0, 12);
}

function normalizeStack(value: unknown): Stack {
  return value === "openai" ? "openai" : "local";
}

function stackLabel(stack: Stack) {
  if (stack === "openai") return "OpenAI";
  return currentLocale === "en" ? "100% local" : "100% local";
}

function stackModeLabel(mode: StackMode) {
  if (mode === "local") return t(currentLocale, "stackModeLocal");
  if (mode === "openai") return t(currentLocale, "stackModeOpenAI");
  return t(currentLocale, "stackModeHybrid");
}

function selectedStackConfig() {
  return stackConfigs[currentStack];
}

function formatMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

function formatStackMeta(config: StackConfig) {
  const values: string[] = [];
  if (config.llm_model) values.push(`LLM ${config.llm_model}`);
  if (config.stt_model) values.push(`STT ${config.stt_model}`);
  if (config.tts_model) values.push(`TTS ${config.tts_model}`);
  if (config.base_url && config.key === "local") values.push(t(currentLocale, "stackOllamaRemote"));
  return values.slice(0, 3);
}

function localizedStackDescription(config: StackConfig) {
  if (config.key === "openai") return t(currentLocale, "stackDescOpenAI");
  return t(currentLocale, "stackDescLocal");
}

function localizedStackReason(config: StackConfig) {
  if (config.reason_code === "disabled_by_stack_mode") return t(currentLocale, "stackReasonDisabled");
  if (config.reason_code === "missing_local_model") return t(currentLocale, "stackReasonMissingLocalModel");
  if (config.reason_code === "missing_openai_api_key") return t(currentLocale, "stackReasonMissingOpenAIKey");
  return config.reason ?? t(currentLocale, "stackUnavailable");
}

function syncLanguageButtons() {
  langPtButton.classList.toggle("active", currentLocale === "pt");
  langEnButton.classList.toggle("active", currentLocale === "en");
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLocale === "pt" ? "pt-BR" : "en";
  if (pageTitleEl) {
    pageTitleEl.textContent = t(currentLocale, "pageTitle");
  }
  heroTitleEl.textContent = t(currentLocale, "heroTitle");
  heroSubtitleEl.textContent = t(currentLocale, "heroSubtitle");
  stackModeLabelEl.textContent = t(currentLocale, "stackModeLabel");
  connectionLabelEl.textContent = t(currentLocale, "connectionLabel");
  dashboardSessionLabelEl.textContent = t(currentLocale, "dashboardSession");
  dashboardUserLabelEl.textContent = t(currentLocale, "dashboardUser");
  dashboardStackLabelEl.textContent = t(currentLocale, "dashboardActiveStack");
  dashboardMemoryLabelEl.textContent = t(currentLocale, "dashboardMemories");
  dashboardStatusLabelEl.textContent = t(currentLocale, "dashboardStatus");
  modeTitleEl.textContent = t(currentLocale, "modeTitle");
  modeDescriptionEl.textContent = t(currentLocale, "modeDescription");
  modePushButton.textContent = t(currentLocale, "modePush");
  modeAgentButton.textContent = t(currentLocale, "modeAgent");
  stacksTitleEl.textContent = t(currentLocale, "stacksTitle");
  agentTitleEl.textContent = t(currentLocale, "agentTitle");
  agentDescriptionEl.textContent = t(currentLocale, "agentDescription");
  chatTitleEl.textContent = t(currentLocale, "chatTitle");
  chatDescriptionEl.textContent = t(currentLocale, "chatDescription");
  emptyTitleEl.textContent = t(currentLocale, "emptyTitle");
  emptyDescriptionEl.textContent = t(currentLocale, "emptyDescription");
  quickSummaryTitleEl.textContent = t(currentLocale, "quickSummaryTitle");
  quickSummaryDescriptionEl.textContent = t(currentLocale, "quickSummaryDescription");
  summaryStackModeLabelEl.textContent = t(currentLocale, "stackModeLabel");
  summaryConnectionLabelEl.textContent = t(currentLocale, "connectionLabel");
  recordingIndicatorTextEl.textContent = t(currentLocale, "recordingNow");
  tipsTitleEl.textContent = t(currentLocale, "tipsTitle");
  tipsDescriptionEl.textContent = t(currentLocale, "tipsDescription");
  tip1El.textContent = t(currentLocale, "tip1");
  tip2El.textContent = t(currentLocale, "tip2");
  tip3El.textContent = t(currentLocale, "tip3");
  if (!conversation.children.length) {
    setStatus(currentMode === "push" ? defaultPushStatus() : defaultAgentStatus());
  }
  if (chatStatusLabelEl.textContent === "" || chatStatusLabelEl.textContent === t(currentLocale === "pt" ? "en" : "pt", "chatStatusInitializing")) {
    setChatStatus(t(currentLocale, "chatStatusInitializing"));
  }
  syncLanguageButtons();
}

function setLocale(locale: Locale) {
  currentLocale = locale;
  localStorage.setItem("voice-chat-locale", locale);
  applyStaticTranslations();
  renderStackOptions();
  syncStackUi();
  updateAgentState(agentRuntime.enabled ? (agentRuntime.audioPlaying ? t(currentLocale, "chatStatusSynthesizing") : t(currentLocale, "chatStatusAgentListening")) : t(currentLocale, "agentDisconnected"), agentRuntime.enabled);
  footerTipEl.innerHTML = currentMode === "push" ? t(currentLocale, "footerPushHtml") : t(currentLocale, "footerAgent");
}

function updateStackSummary() {
  const requestedCount = Object.values(stackConfigs).filter((config): config is StackConfig => Boolean(config?.requested)).length;
  const availableCount = availableStacks.length;
  stackModeEl.textContent = stackModeLabel(currentStackMode);
  stackModeSideEl.textContent = stackModeLabel(currentStackMode);
  stackSummaryEl.textContent =
    requestedCount > 0
      ? t(currentLocale, "stackSummaryTemplate", { available: availableCount, requested: requestedCount })
      : t(currentLocale, "stackSummaryNone");

  const currentConfig = selectedStackConfig();
  if (!currentConfig) {
    stackNameEl.textContent = t(currentLocale, "stackUnavailable");
    stackNoteEl.textContent = t(currentLocale, "stackAwaitingBackend");
    return;
  }

  stackNameEl.textContent = stackLabel(currentConfig.key);
  stackNoteEl.textContent = currentConfig.available
    ? `${localizedStackDescription(currentConfig)}${currentConfig.base_url ? ` · ${currentConfig.base_url}` : ""}`
    : localizedStackReason(currentConfig);
}

function syncStackUi() {
  const cards = stackBar.querySelectorAll<HTMLButtonElement>(".stack-card");
  cards.forEach((card) => {
    card.classList.toggle("active", card.dataset.stack === currentStack);
  });
  updateStackSummary();
}

function renderStackOptions() {
  stackBar.innerHTML = "";
  const order: Stack[] = ["local", "openai"];
  const configs = order
    .map((stack) => stackConfigs[stack])
    .filter((config): config is StackConfig => Boolean(config && (config.requested || config.available)));

  if (!configs.length) {
    const empty = document.createElement("div");
    empty.className = "panel-note";
    empty.textContent = t(currentLocale, "noStacksExposed");
    stackBar.appendChild(empty);
    updateStackSummary();
    return;
  }

  configs.forEach((config) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stack-card";
    button.dataset.stack = config.key;
    button.disabled = !config.available;

    const statusClass = config.available ? "available" : "";
    const statusText = config.available ? t(currentLocale, "stackReady") : t(currentLocale, "stackUnavailableStatus");
    const metaTags = formatStackMeta(config)
      .map((item) => `<span>${item}</span>`)
      .join("");

    button.innerHTML = `
      <div class="stack-card-header">
        <span class="stack-card-title">${stackLabel(config.key)}</span>
        <span class="stack-card-status ${statusClass}">${statusText}</span>
      </div>
      <p class="stack-card-description">${localizedStackDescription(config)}</p>
      <div class="stack-card-meta">
        ${metaTags}
      </div>
    `;

    button.addEventListener("click", () => setStack(config.key));
    stackBar.appendChild(button);
  });

  syncStackUi();
}

function applyRuntimeConfig(payload: Partial<HealthResponse> & { current_stack?: Stack }) {
  currentStackMode = payload.stack_mode ?? currentStackMode;
  availableStacks = Array.isArray(payload.available_stacks)
    ? payload.available_stacks.filter((stack): stack is Stack => stack === "local" || stack === "openai")
    : availableStacks;

  if (payload.stacks) {
    stackConfigs = payload.stacks;
  }

  const preferredStack = normalizeStack(localStorage.getItem("voice-chat-stack"));
  const backendDefault = normalizeStack(payload.current_stack ?? payload.default_stack ?? preferredStack);

  if (availableStacks.includes(preferredStack)) {
    currentStack = preferredStack;
  } else if (availableStacks.includes(backendDefault)) {
    currentStack = backendDefault;
  } else {
    currentStack = backendDefault;
  }

  localStorage.setItem("voice-chat-stack", currentStack);
  renderStackOptions();
  syncStackUi();
  agentToggleButton.disabled = availableStacks.length === 0;
}

function setMode(mode: Mode) {
  currentMode = mode;
  modePushButton.classList.toggle("active", mode === "push");
  modeAgentButton.classList.toggle("active", mode === "agent");
  agentControls.classList.toggle("hidden", mode !== "agent");
  footerTipEl.innerHTML =
    mode === "push"
      ? t(currentLocale, "footerPushHtml")
      : t(currentLocale, "footerAgent");
  setChatStatus(mode === "push" ? t(currentLocale, "chatStatusPush") : t(currentLocale, "chatStatusAgent"));

  if (mode === "push") {
    if (agentRuntime.enabled) {
      void stopVoiceAgent();
    }
    setStatus(defaultPushStatus());
  } else {
    setStatus(agentRuntime.enabled ? t(currentLocale, "chatStatusAgentListening") : defaultAgentStatus());
  }
}

function setStack(stack: Stack) {
  const config = stackConfigs[stack];
  if (!config) return;

  if (!config.available) {
    addMessage("assistant", localizedStackReason(config) ?? t(currentLocale, "stackUnavailableTemplate", { label: stackLabel(config.key) }));
    return;
  }

  currentStack = stack;
  localStorage.setItem("voice-chat-stack", currentStack);
  syncStackUi();
  socket?.send(JSON.stringify({ type: "session.memories", stack: currentStack }));
}

function updateAgentState(text: string, active = false) {
  agentStateEl.textContent = text;
  agentToggleButton.classList.toggle("active", active);
  agentToggleButton.textContent = active ? t(currentLocale, "stopAgent") : t(currentLocale, "startAgent");
}

function addMessage(
  role: "user" | "assistant",
  text: string,
  audioBase64?: string,
  recordedBlob?: Blob,
  metrics?: ResponseMetrics,
  stack?: Stack
) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? t(currentLocale, "voiceAvatar") : t(currentLocale, "aiAvatar");

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  if (audioBase64) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = `data:audio/wav;base64,${audioBase64}`;
    bubble.appendChild(audio);
  } else if (recordedBlob) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = URL.createObjectURL(recordedBlob);
    bubble.appendChild(audio);
  }

  if (metrics && (metrics.transcriptionMs || metrics.llmMs || metrics.ttsMs)) {
    const metricsEl = document.createElement("div");
    metricsEl.className = "metrics";
    metricsEl.innerHTML = [
      stack ? `<span>${stackLabel(stack)}</span>` : "",
      metrics.transcriptionMs ? `<span>STT ${formatMs(metrics.transcriptionMs)}</span>` : "",
      metrics.llmMs ? `<span>LLM ${formatMs(metrics.llmMs)}</span>` : "",
      metrics.ttsMs ? `<span>TTS ${formatMs(metrics.ttsMs)}</span>` : "",
    ]
      .filter(Boolean)
      .join("");
    bubble.appendChild(metricsEl);
  }

  div.appendChild(avatar);
  div.appendChild(bubble);
  conversation.appendChild(div);
  syncConversationEmptyState();
  conversation.scrollTop = conversation.scrollHeight;
  return div as HTMLDivElement;
}

function showTyping() {
  const div = document.createElement("div");
  div.className = "msg assistant";
  div.id = "typing-msg";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = t(currentLocale, "aiAvatar");

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const dots = document.createElement("span");
  dots.className = "typing-dots";
  dots.innerHTML = "<span></span><span></span><span></span>";
  bubble.appendChild(dots);

  div.appendChild(avatar);
  div.appendChild(bubble);
  conversation.appendChild(div);
  syncConversationEmptyState();
  conversation.scrollTop = conversation.scrollHeight;
}

function removeTyping() {
  document.getElementById("typing-msg")?.remove();
  syncConversationEmptyState();
}

function updateTypingText(text: string) {
  const el = document.getElementById("typing-msg");
  if (!el) return;
  const bubble = el.querySelector(".bubble");
  if (!bubble) return;
  bubble.textContent = text;
  conversation.scrollTop = conversation.scrollHeight;
}

function finalizeTyping(fullText: string, audioBase64?: string, metrics?: ResponseMetrics, stack?: Stack) {
  removeTyping();
  return addMessage("assistant", fullText, audioBase64, undefined, metrics, stack);
}

async function loadRuntimeConfig() {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) {
    throw new Error(`${t(currentLocale, "healthErrorPrefix")}: ${response.status}`);
  }
  const data = (await response.json()) as HealthResponse;
  applyRuntimeConfig(data);
}

async function connectSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return;
  if (socketReady) return socketReady;

  setConnectionState(t(currentLocale, "connecting"));
  socketReady = new Promise((resolve, reject) => {
    socket = new WebSocket(`${WS_URL}/ws?session_id=${encodeURIComponent(sessionId)}&user_id=${encodeURIComponent(userId)}`);
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      setConnectionState(t(currentLocale, "connected"));
      resolve();
    };

    socket.onerror = () => {
      setConnectionState(t(currentLocale, "connectionFailed"));
      reject(new Error("WebSocket connection failed"));
    };

    socket.onclose = () => {
      socket = null;
      socketReady = null;
      setConnectionState(t(currentLocale, "disconnected"));
      if (agentRuntime.enabled) {
        updateAgentState(t(currentLocale, "agentDisconnected"));
      }
    };

    socket.onmessage = (event) => {
      if (typeof event.data === "string") {
        handleServerEvent(JSON.parse(event.data));
      }
    };
  });

  return socketReady;
}

function updateMemoryCount(value: number | undefined) {
  if (typeof value === "number") {
    memoryCountEl.textContent = String(value);
  }
}

function playAssistantAudio(div: HTMLDivElement) {
  const audioEl = div.querySelector("audio") as HTMLAudioElement | null;
  if (!audioEl) {
    if (currentMode === "agent") {
      agentRuntime.processing = false;
      setStatus(t(currentLocale, "chatStatusAgentListening"));
      updateAgentState(t(currentLocale, "chatStatusListening"), true);
    }
    return;
  }

  botAudioElement = audioEl;
  if (currentMode === "agent") {
    agentRuntime.audioPlaying = true;
    updateAgentState("Falando", true);
    setStatus("Assistente falando...");
  }

  const finish = () => {
    if (currentMode === "agent") {
      agentRuntime.audioPlaying = false;
      agentRuntime.processing = false;
      updateAgentState(t(currentLocale, "chatStatusListening"), true);
      setStatus(t(currentLocale, "chatStatusAgentListening"));
    }
  };

  audioEl.onended = finish;
  audioEl.onpause = () => {
    if (audioEl.ended) finish();
  };

  void audioEl.play().catch(() => {
    finish();
  });
}

function handleServerEvent(data: Record<string, unknown>) {
  switch (data.type) {
    case "session_ready":
      sessionIdEl.textContent = shortId(String(data.session_id ?? sessionId));
      userIdEl.textContent = shortId(String(data.user_id ?? userId));
      applyRuntimeConfig(data as Partial<HealthResponse> & { current_stack?: Stack });
      socket?.send(JSON.stringify({ type: "session.memories", stack: currentStack }));
      setStatus(currentMode === "push" ? defaultPushStatus() : defaultAgentStatus());
      setChatStatus(t(currentLocale, "chatStatusSessionConnected"));
      break;

    case "stack_selected":
      if (data.stack === "openai" || data.stack === "local") {
        currentStack = data.stack;
        localStorage.setItem("voice-chat-stack", currentStack);
        syncStackUi();
      }
      break;

    case "status":
      setChatStatus(
        data.step === "listening"
          ? t(currentLocale, "chatStatusListening")
          : data.step === "transcribing"
            ? t(currentLocale, "chatStatusTranscribing")
            : data.step === "thinking"
              ? t(currentLocale, "chatStatusThinking")
              : t(currentLocale, "chatStatusSynthesizing")
      );
      setStatus(
        data.step === "listening"
          ? currentMode === "push"
            ? t(currentLocale, "recordingReleaseHtml")
            : t(currentLocale, "listeningSpeech")
          : data.step === "transcribing"
            ? t(currentLocale, "transcribingAudio")
            : data.step === "thinking"
              ? t(currentLocale, "thinkingWithMemory")
              : t(currentLocale, "synthesizingResponse")
      );
      break;

    case "transcription": {
      if (!currentTurn) return;
      currentTurn.metrics.transcriptionMs = Number(data.duration_ms ?? 0);
      const messages = conversation.querySelectorAll(".msg.user");
      const lastUser = messages[messages.length - 1];
      if (lastUser) {
        const bubble = lastUser.querySelector(".bubble");
        const audioEl = bubble?.querySelector("audio");
        if (bubble) {
          bubble.textContent = String(data.text ?? "");
          if (audioEl) bubble.appendChild(audioEl);
        }
      }
      break;
    }

    case "llm_token":
      if (!currentTurn) return;
      currentTurn.llmTokens += String(data.token ?? "");
      updateTypingText(currentTurn.llmTokens);
      break;

    case "llm_end":
      if (!currentTurn) return;
      currentTurn.metrics.llmMs = Number(data.duration_ms ?? 0);
      currentTurn.llmTokens = String(data.full_text ?? currentTurn.llmTokens);
      break;

    case "audio":
      if (!currentTurn) return;
      currentTurn.audioBase64 = String(data.base64 ?? "");
      currentTurn.metrics.ttsMs = Number(data.duration_ms ?? 0);
      break;

    case "done":
      if (!currentTurn) return;
      if (data.metrics && typeof data.metrics === "object") {
        const metrics = data.metrics as Record<string, number | undefined>;
        currentTurn.metrics.transcriptionMs = metrics.transcription_ms ?? currentTurn.metrics.transcriptionMs;
        currentTurn.metrics.llmMs = metrics.llm_ms ?? currentTurn.metrics.llmMs;
        currentTurn.metrics.ttsMs = metrics.tts_ms ?? currentTurn.metrics.ttsMs;
      }
      updateMemoryCount(Number(data.memory_count ?? memoryCountEl.textContent));

      {
        const turnMode = currentTurn.mode;
        const assistantMessage = finalizeTyping(
          currentTurn.llmTokens,
          currentTurn.audioBase64,
          currentTurn.metrics,
          (data.stack as Stack | undefined) ?? currentTurn.stack
        );
        currentTurn = null;
        if (turnMode === "agent" || turnMode === "push") {
          playAssistantAudio(assistantMessage);
        }
        if (turnMode === "push") {
          setStatus(defaultPushStatus());
        }
      }
      currentTurn = null;
      break;

    case "error":
      removeTyping();
      addMessage("assistant", `${t(currentLocale, "errorPrefix")}: ${String(data.message ?? "Falha desconhecida.")}`);
      currentTurn = null;
      if (currentMode === "agent") {
        agentRuntime.processing = false;
        updateAgentState(t(currentLocale, "chatStatusListening"), true);
        setStatus(t(currentLocale, "chatStatusAgentListening"));
        setChatStatus(t(currentLocale, "chatStatusWaitingSpeech"));
      } else {
        setStatus(defaultPushStatus());
        setChatStatus(t(currentLocale, "chatStatusReadyQuestion"));
      }
      break;

    case "session_memories":
      if (Array.isArray(data.memories)) {
        updateMemoryCount(data.memories.length);
      }
      setChatStatus(t(currentLocale, "chatStatusMemoriesSynced"));
      break;
  }
}

async function sendBlobTurn(blob: Blob, mimeType: string, mode: Mode, placeholderText: string) {
  if (!blob.size) {
    if (mode === "agent") {
      agentRuntime.processing = false;
      setStatus(t(currentLocale, "chatStatusAgentListening"));
      updateAgentState(t(currentLocale, "chatStatusListening"), true);
      setChatStatus(t(currentLocale, "chatStatusWaitingSpeech"));
    }
    return;
  }

  const stackConfig = selectedStackConfig();
  if (!stackConfig?.available) {
    addMessage("assistant", stackConfig ? localizedStackReason(stackConfig) : t(currentLocale, "noStackAvailable"));
    return;
  }

  await connectSocket();
  removeTyping();
  addMessage("user", placeholderText, undefined, blob);
  showTyping();
  setChatStatus(t(currentLocale, "chatStatusSendingAudio"));

  currentTurn = {
    llmTokens: "",
    metrics: {},
    mode,
    stack: currentStack,
  };

  socket?.send(JSON.stringify({ type: "turn.start", mimeType, stack: currentStack }));
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32768;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    socket?.send(bytes.slice(index, index + chunkSize));
  }
  socket?.send(JSON.stringify({ type: "turn.end" }));
}

async function startPushRecording() {
  try {
    if (currentMode !== "push" || currentTurn) return;
    await connectSocket();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    pushChunks = [];
    pushRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm",
    });

    pushRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        pushChunks.push(event.data);
      }
    };

    pushRecorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(pushChunks, { type: pushRecorder?.mimeType ?? "audio/webm" });
      void sendBlobTurn(blob, pushRecorder?.mimeType ?? "audio/webm", "push", t(currentLocale, "transcribingAudio"));
    };

    pushRecorder.start();
    isPushRecording = true;
    recordingIndicator.classList.remove("hidden");
    setStatus(t(currentLocale, "recordingReleaseHtml"));
    setChatStatus(t(currentLocale, "chatStatusCapturingVoice"));
  } catch (error) {
    setStatus(`${t(currentLocale, "chatStatusMicError")}: ${String(error)}`);
    setChatStatus(t(currentLocale, "chatStatusMicError"));
  }
}

function stopPushRecording() {
  if (pushRecorder && isPushRecording) {
    pushRecorder.stop();
    isPushRecording = false;
    recordingIndicator.classList.add("hidden");
  }
}

async function ensureAgentStream() {
  if (agentRuntime.stream) return agentRuntime.stream;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  agentRuntime.stream = stream;
  agentRuntime.audioContext = audioContext;
  agentRuntime.source = source;
  agentRuntime.analyser = analyser;
  agentRuntime.mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
  return stream;
}

function computeRms(analyser: AnalyserNode) {
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let index = 0; index < data.length; index += 1) {
    const normalized = (data[index] - 128) / 128;
    sum += normalized * normalized;
  }
  return Math.sqrt(sum / data.length);
}

function startAgentTurnRecording() {
  if (!agentRuntime.stream || agentRuntime.mediaRecorder || agentRuntime.processing || currentTurn) return;
  const recorder = new MediaRecorder(agentRuntime.stream, { mimeType: agentRuntime.mimeType });
  agentRuntime.chunks = [];
  agentRuntime.mediaRecorder = recorder;
  agentRuntime.lastSpeechAt = performance.now();
  updateAgentState(t(currentLocale, "chatStatusCapturingVoice"), true);
  setStatus(t(currentLocale, "chatStatusCapturingVoice"));
  setChatStatus(t(currentLocale, "chatStatusCapturingVoice"));

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      agentRuntime.chunks.push(event.data);
    }
  };

  recorder.onstop = () => {
    const blob = new Blob(agentRuntime.chunks, { type: agentRuntime.mimeType });
    agentRuntime.chunks = [];
    agentRuntime.mediaRecorder = null;
    agentRuntime.processing = true;
    updateAgentState(t(currentLocale, "chatStatusThinking"), true);
    setStatus(t(currentLocale, "processingSpeech"));
    setChatStatus(t(currentLocale, "chatStatusProcessingTurn"));
    void sendBlobTurn(blob, agentRuntime.mimeType, "agent", t(currentLocale, "transcribingAudio"));
  };

  recorder.start(250);
}

function stopAgentTurnRecording() {
  if (agentRuntime.mediaRecorder && agentRuntime.mediaRecorder.state !== "inactive") {
    agentRuntime.mediaRecorder.stop();
  }
}

function runVoiceActivityLoop() {
  if (!agentRuntime.enabled || !agentRuntime.analyser) return;

  const tick = () => {
    if (!agentRuntime.enabled || !agentRuntime.analyser) return;

    const now = performance.now();
    const rms = computeRms(agentRuntime.analyser);
    const speaking = rms >= VAD_THRESHOLD;

    if (!agentRuntime.processing && !agentRuntime.audioPlaying) {
      if (speaking) {
        agentRuntime.lastSpeechAt = now;
        if (!agentRuntime.mediaRecorder) {
          startAgentTurnRecording();
        }
      } else if (agentRuntime.mediaRecorder && now - agentRuntime.lastSpeechAt > VAD_END_SILENCE_MS) {
        stopAgentTurnRecording();
      }
    }

    agentRuntime.vadFrame = window.requestAnimationFrame(tick);
  };

  agentRuntime.vadFrame = window.requestAnimationFrame(tick);
}

async function startVoiceAgent() {
  if (agentRuntime.enabled) return;
  if (!selectedStackConfig()?.available) {
    addMessage("assistant", selectedStackConfig() ? localizedStackReason(selectedStackConfig()!) : t(currentLocale, "noStackAvailable"));
    return;
  }
  await connectSocket();
  await ensureAgentStream();
  agentRuntime.enabled = true;
  agentRuntime.processing = false;
  updateAgentState(t(currentLocale, "chatStatusListening"), true);
  setStatus(t(currentLocale, "chatStatusAgentListening"));
  setChatStatus(t(currentLocale, "chatStatusAgentListening"));
  runVoiceActivityLoop();
}

async function stopVoiceAgent() {
  agentRuntime.enabled = false;
  agentRuntime.processing = false;
  if (agentRuntime.vadFrame !== null) {
    window.cancelAnimationFrame(agentRuntime.vadFrame);
    agentRuntime.vadFrame = null;
  }
  if (agentRuntime.mediaRecorder && agentRuntime.mediaRecorder.state !== "inactive") {
    agentRuntime.mediaRecorder.stop();
  }
  agentRuntime.mediaRecorder = null;
  agentRuntime.chunks = [];

  if (agentRuntime.stream) {
    agentRuntime.stream.getTracks().forEach((track) => track.stop());
  }
  if (agentRuntime.audioContext) {
    await agentRuntime.audioContext.close();
  }

  agentRuntime.stream = null;
  agentRuntime.audioContext = null;
  agentRuntime.source = null;
  agentRuntime.analyser = null;
  agentRuntime.audioPlaying = false;
  updateAgentState(t(currentLocale, "agentDisconnected"), false);
  setStatus(defaultAgentStatus());
  setChatStatus(t(currentLocale, "chatStatusAgentPaused"));
  if (botAudioElement) {
    botAudioElement.pause();
    botAudioElement = null;
  }
}

document.addEventListener("keydown", (event) => {
  if (
    event.code === "Space" &&
    currentMode === "push" &&
    !isPushRecording &&
    !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
  ) {
    event.preventDefault();
    void startPushRecording();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code === "Space" && currentMode === "push" && isPushRecording) {
    event.preventDefault();
    stopPushRecording();
  }
});

modePushButton.addEventListener("click", () => setMode("push"));
modeAgentButton.addEventListener("click", () => setMode("agent"));
langPtButton.addEventListener("click", () => setLocale("pt"));
langEnButton.addEventListener("click", () => setLocale("en"));
agentToggleButton.addEventListener("click", () => {
  if (agentRuntime.enabled) {
    void stopVoiceAgent();
  } else {
    void startVoiceAgent();
  }
});

applyStaticTranslations();
updateAgentState(t(currentLocale, "agentDisconnected"), false);
setMode("push");
setConnectionState(t(currentLocale, "chatStatusInitializing"));
setChatStatus(t(currentLocale, "chatStatusInitializing"));
syncConversationEmptyState();

loadRuntimeConfig()
  .then(() => connectSocket())
  .catch((error) => {
    addMessage("assistant", `${t(currentLocale, "connectionErrorPrefix")}: ${String(error)}`);
    setStatus(t(currentLocale, "backendUnavailable"));
    setConnectionState(t(currentLocale, "backendUnavailable"));
  });
