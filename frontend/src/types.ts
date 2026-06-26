export type Mode = "push" | "agent";
export type Stack = "local" | "openai";
export type StackMode = "hybrid" | "local" | "openai";

export type ResponseMetrics = {
  transcriptionMs?: number;
  llmMs?: number;
  ttsMs?: number;
};

export type StackConfig = {
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

export type HealthResponse = {
  status: string;
  stack_mode?: StackMode;
  default_stack?: Stack;
  available_stacks?: Stack[];
  stacks?: Partial<Record<Stack, StackConfig>>;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  audioBase64?: string;
  recordedBlobUrl?: string;
  metrics?: ResponseMetrics;
  stack?: Stack;
};
