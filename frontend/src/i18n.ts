export type Locale = "pt" | "en";

type TranslationKey =
  | "pageTitle"
  | "heroTitle"
  | "heroSubtitle"
  | "stackModeLabel"
  | "connectionLabel"
  | "dashboardSession"
  | "dashboardUser"
  | "dashboardActiveStack"
  | "dashboardMemories"
  | "dashboardStatus"
  | "modeTitle"
  | "modeDescription"
  | "modePush"
  | "modeAgent"
  | "stacksTitle"
  | "stacksLoading"
  | "agentTitle"
  | "agentDescription"
  | "startAgent"
  | "stopAgent"
  | "agentDisconnected"
  | "quickSummaryTitle"
  | "quickSummaryDescription"
  | "recordingNow"
  | "tipsTitle"
  | "tipsDescription"
  | "tip1"
  | "tip2"
  | "tip3"
  | "chatTitle"
  | "chatDescription"
  | "readyToChat"
  | "emptyTitle"
  | "emptyDescription"
  | "footerPushHtml"
  | "footerAgent"
  | "defaultPushStatusHtml"
  | "defaultAgentStatus"
  | "chatStatusPush"
  | "chatStatusAgent"
  | "chatStatusSessionConnected"
  | "chatStatusListening"
  | "chatStatusTranscribing"
  | "chatStatusThinking"
  | "chatStatusSynthesizing"
  | "chatStatusWaitingSpeech"
  | "chatStatusReadyQuestion"
  | "chatStatusMemoriesSynced"
  | "chatStatusSendingAudio"
  | "chatStatusCapturingVoice"
  | "chatStatusMicError"
  | "chatStatusProcessingTurn"
  | "chatStatusAgentListening"
  | "chatStatusAgentPaused"
  | "chatStatusInitializing"
  | "stackModeLocal"
  | "stackModeOpenAI"
  | "stackModeHybrid"
  | "stackSummaryTemplate"
  | "stackSummaryNone"
  | "stackUnavailable"
  | "stackAwaitingBackend"
  | "noStacksExposed"
  | "stackReady"
  | "stackUnavailableStatus"
  | "stackDescLocal"
  | "stackDescOpenAI"
  | "stackReasonDisabled"
  | "stackReasonMissingLocalModel"
  | "stackReasonMissingOpenAIKey"
  | "stackOllamaRemote"
  | "errorPrefix"
  | "connectionErrorPrefix"
  | "healthErrorPrefix"
  | "backendUnavailable"
  | "connecting"
  | "connected"
  | "connectionFailed"
  | "disconnected"
  | "transcribingAudio"
  | "processingSpeech"
  | "recordingReleaseHtml"
  | "listeningSpeech"
  | "thinkingWithMemory"
  | "synthesizingResponse"
  | "noStackAvailable"
  | "stackUnavailableTemplate"
  | "voiceAvatar"
  | "aiAvatar";

const translations: Record<Locale, Record<TranslationKey, string>> = {
  pt: {
    pageTitle: "Voice Studio · STT + LLM + TTS",
    heroTitle: "Assistente de voz com stacks configuraveis",
    heroSubtitle: "STT, memoria, LLM e TTS orquestrados por backend e refletidos automaticamente na interface.",
    stackModeLabel: "Modo de stack",
    connectionLabel: "Conexao",
    dashboardSession: "Sessao",
    dashboardUser: "Usuario",
    dashboardActiveStack: "Stack ativa",
    dashboardMemories: "Memorias",
    dashboardStatus: "Status",
    modeTitle: "Modo de conversa",
    modeDescription: "Escolha como voce quer interagir.",
    modePush: "Push-to-Talk",
    modeAgent: "Voice Agent",
    stacksTitle: "Stacks disponiveis",
    stacksLoading: "Lendo configuracao do backend...",
    agentTitle: "Agente de voz",
    agentDescription: "Ative a escuta continua com VAD no navegador.",
    startAgent: "Iniciar Agente de Voz",
    stopAgent: "Parar Agente de Voz",
    agentDisconnected: "Desconectado",
    quickSummaryTitle: "Resumo rapido",
    quickSummaryDescription: "Estado atual da interface e da captura.",
    recordingNow: "Gravando agora",
    tipsTitle: "Boas praticas",
    tipsDescription: "Fluxo ideal para uma experiencia mais natural.",
    tip1: "Fale uma frase por vez para melhorar a transcricao.",
    tip2: "Use `Voice Agent` para interacoes mais fluidas.",
    tip3: "Troque a stack conforme custo, privacidade e latencia.",
    chatTitle: "Conversas e respostas",
    chatDescription: "As respostas incluem audio e metricas por etapa.",
    readyToChat: "Pronto para conversar",
    emptyTitle: "Comece uma nova conversa",
    emptyDescription: "Grave uma pergunta para receber resposta em texto, audio e metricas por etapa.",
    footerPushHtml: 'Segure <kbd>Espaco</kbd> no modo Push-to-Talk ou ligue o agente para conversa continua.',
    footerAgent: "Ative o agente para ouvir continuamente e responder por voz.",
    defaultPushStatusHtml: 'Aperte e segure <kbd>Espaco</kbd> para falar',
    defaultAgentStatus: "Clique em iniciar para conversar por voz continuamente",
    chatStatusPush: "Push-to-Talk ativo",
    chatStatusAgent: "Voice Agent disponivel",
    chatStatusSessionConnected: "Sessao conectada",
    chatStatusListening: "Ouvindo",
    chatStatusTranscribing: "Transcrevendo",
    chatStatusThinking: "Processando",
    chatStatusSynthesizing: "Gerando audio",
    chatStatusWaitingSpeech: "Aguardando nova fala",
    chatStatusReadyQuestion: "Pronto para nova pergunta",
    chatStatusMemoriesSynced: "Memorias sincronizadas",
    chatStatusSendingAudio: "Enviando audio",
    chatStatusCapturingVoice: "Capturando voz",
    chatStatusMicError: "Erro no microfone",
    chatStatusProcessingTurn: "Processando turno",
    chatStatusAgentListening: "Agente ouvindo",
    chatStatusAgentPaused: "Agente pausado",
    chatStatusInitializing: "Inicializando",
    stackModeLocal: "Somente local",
    stackModeOpenAI: "Somente OpenAI",
    stackModeHybrid: "Local + OpenAI",
    stackSummaryTemplate: "{available} stack(s) disponivel(is) de {requested} configurada(s) no backend.",
    stackSummaryNone: "Nenhuma stack configurada no backend.",
    stackUnavailable: "Indisponivel",
    stackAwaitingBackend: "Aguardando configuracao do backend.",
    noStacksExposed: "Nenhuma stack foi exposta pelo backend.",
    stackReady: "Pronta",
    stackUnavailableStatus: "Indisponivel",
    stackDescLocal: "Whisper STT + Ollama + Supertonic 3",
    stackDescOpenAI: "OpenAI STT + LLM + TTS",
    stackReasonDisabled: "Desativada por STACK_MODE.",
    stackReasonMissingLocalModel: "Modelo local do Supertonic nao encontrado.",
    stackReasonMissingOpenAIKey: "OPENAI_API_KEY nao configurada.",
    stackOllamaRemote: "Ollama remoto",
    errorPrefix: "Erro",
    connectionErrorPrefix: "Erro de conexao",
    healthErrorPrefix: "Falha ao ler /health",
    backendUnavailable: "Backend indisponivel",
    connecting: "Conectando",
    connected: "Conectado",
    connectionFailed: "Falha na conexao",
    disconnected: "Desconectado",
    transcribingAudio: "Transcrevendo audio...",
    processingSpeech: "Processando fala...",
    recordingReleaseHtml: "Gravando... solte <kbd>Espaco</kbd> para enviar",
    listeningSpeech: "Ouvindo fala...",
    thinkingWithMemory: "Raciocinando com memoria...",
    synthesizingResponse: "Sintetizando resposta...",
    noStackAvailable: "Nenhuma stack disponivel no backend.",
    stackUnavailableTemplate: "A stack {label} nao esta disponivel.",
    voiceAvatar: "VOZ",
    aiAvatar: "AI",
  },
  en: {
    pageTitle: "Voice Studio · STT + LLM + TTS",
    heroTitle: "Voice assistant with configurable stacks",
    heroSubtitle: "STT, memory, LLM, and TTS orchestrated by the backend and reflected automatically in the interface.",
    stackModeLabel: "Stack mode",
    connectionLabel: "Connection",
    dashboardSession: "Session",
    dashboardUser: "User",
    dashboardActiveStack: "Active stack",
    dashboardMemories: "Memories",
    dashboardStatus: "Status",
    modeTitle: "Conversation mode",
    modeDescription: "Choose how you want to interact.",
    modePush: "Push-to-Talk",
    modeAgent: "Voice Agent",
    stacksTitle: "Available stacks",
    stacksLoading: "Loading backend configuration...",
    agentTitle: "Voice agent",
    agentDescription: "Enable continuous listening with browser-side VAD.",
    startAgent: "Start Voice Agent",
    stopAgent: "Stop Voice Agent",
    agentDisconnected: "Disconnected",
    quickSummaryTitle: "Quick summary",
    quickSummaryDescription: "Current interface and capture state.",
    recordingNow: "Recording now",
    tipsTitle: "Best practices",
    tipsDescription: "Recommended flow for a more natural experience.",
    tip1: "Speak one sentence at a time for better transcription.",
    tip2: "Use `Voice Agent` for more fluid interactions.",
    tip3: "Switch stacks based on cost, privacy, and latency.",
    chatTitle: "Conversations and responses",
    chatDescription: "Responses include audio and per-stage metrics.",
    readyToChat: "Ready to chat",
    emptyTitle: "Start a new conversation",
    emptyDescription: "Record a question to receive text, audio, and per-stage metrics.",
    footerPushHtml: 'Hold <kbd>Space</kbd> in Push-to-Talk mode or start the agent for continuous conversation.',
    footerAgent: "Enable the agent to listen continuously and reply with voice.",
    defaultPushStatusHtml: 'Hold <kbd>Space</kbd> to speak',
    defaultAgentStatus: "Click start to talk continuously by voice",
    chatStatusPush: "Push-to-Talk active",
    chatStatusAgent: "Voice Agent available",
    chatStatusSessionConnected: "Session connected",
    chatStatusListening: "Listening",
    chatStatusTranscribing: "Transcribing",
    chatStatusThinking: "Processing",
    chatStatusSynthesizing: "Generating audio",
    chatStatusWaitingSpeech: "Waiting for new speech",
    chatStatusReadyQuestion: "Ready for a new question",
    chatStatusMemoriesSynced: "Memories synced",
    chatStatusSendingAudio: "Sending audio",
    chatStatusCapturingVoice: "Capturing voice",
    chatStatusMicError: "Microphone error",
    chatStatusProcessingTurn: "Processing turn",
    chatStatusAgentListening: "Agent listening",
    chatStatusAgentPaused: "Agent paused",
    chatStatusInitializing: "Initializing",
    stackModeLocal: "Local only",
    stackModeOpenAI: "OpenAI only",
    stackModeHybrid: "Local + OpenAI",
    stackSummaryTemplate: "{available} stack(s) available out of {requested} configured in the backend.",
    stackSummaryNone: "No stack configured in the backend.",
    stackUnavailable: "Unavailable",
    stackAwaitingBackend: "Waiting for backend configuration.",
    noStacksExposed: "No stack was exposed by the backend.",
    stackReady: "Ready",
    stackUnavailableStatus: "Unavailable",
    stackDescLocal: "Whisper STT + Ollama + Supertonic 3",
    stackDescOpenAI: "OpenAI STT + LLM + TTS",
    stackReasonDisabled: "Disabled by STACK_MODE.",
    stackReasonMissingLocalModel: "Supertonic local model not found.",
    stackReasonMissingOpenAIKey: "OPENAI_API_KEY is not configured.",
    stackOllamaRemote: "Remote Ollama",
    errorPrefix: "Error",
    connectionErrorPrefix: "Connection error",
    healthErrorPrefix: "Failed to read /health",
    backendUnavailable: "Backend unavailable",
    connecting: "Connecting",
    connected: "Connected",
    connectionFailed: "Connection failed",
    disconnected: "Disconnected",
    transcribingAudio: "Transcribing audio...",
    processingSpeech: "Processing speech...",
    recordingReleaseHtml: "Recording... release <kbd>Space</kbd> to send",
    listeningSpeech: "Listening to speech...",
    thinkingWithMemory: "Reasoning with memory...",
    synthesizingResponse: "Synthesizing response...",
    noStackAvailable: "No stack is available in the backend.",
    stackUnavailableTemplate: "The {label} stack is not available.",
    voiceAvatar: "YOU",
    aiAvatar: "AI",
  },
};

export function getInitialLocale(): Locale {
  const stored = localStorage.getItem("voice-chat-locale");
  if (stored === "pt" || stored === "en") {
    return stored;
  }
  const browserLocale = navigator.language.toLowerCase();
  return browserLocale.startsWith("pt") ? "pt" : "en";
}

export function t(locale: Locale, key: TranslationKey, vars?: Record<string, string | number>) {
  const template = translations[locale][key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(vars[name] ?? ""));
}
