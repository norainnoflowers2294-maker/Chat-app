export interface Character {
  id: string;
  userId?: string;
  name: string;
  avatar: string;
  summary: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  system_prompt?: string;
  tags: string[];
  alternate_greetings?: string[];
  creator_notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoreEntry {
  id: string;
  keys: string[];
  secondary_keys?: string[];
  comment?: string;
  content: string;
  constant: boolean;
  selective: boolean;
  insertion_order: number;
  position: 'before_char' | 'after_char';
  enabled: boolean;
}

export interface Lorebook {
  id: string;
  userId?: string;
  name: string;
  description: string;
  avatar?: string;
  scan_depth: number;
  token_budget: number;
  recursive_scanning: boolean;
  entries: LoreEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Persona {
  id: string;
  userId?: string;
  name: string;
  display_name?: string;
  nicknames?: string;
  occupation?: string;
  avatar: string;
  description: string;
  appearance?: string;
  backstory?: string;
  speaking_style: string;
  traits: string[];
  is_default: boolean;
  favorite?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Plugin {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'mechanics' | 'immersion' | 'utility' | 'style' | 'analysis';
  enabled: boolean;
  config: Record<string, any>;
  customPrompt?: string;
  badge?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  avatar?: string;
  content: string;
  timestamp: number;
  swipes?: string[];
  currentSwipeIndex?: number;
  emotions?: string[];
  tokens?: number;
}

export interface Chat {
  id: string;
  userId?: string;
  title: string;
  characterIds: string[];
  personaId: string;
  lorebookIds: string[];
  pluginIds: string[];
  scenario: string;
  bgImage?: string;
  messages: ChatMessage[];
  relationshipScore?: number;
  inventory?: string[];
  weather?: string;
  timeOfDay?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionDiagnostic {
  status: 'connected' | 'error' | 'untested' | 'testing';
  lastChecked: number | null;
  statusCode?: number;
  errorMessage?: string;
  errorCategory?: 'missing_key' | 'auth_failed' | 'no_credits' | 'rate_limited' | 'model_unavailable' | 'network_error';
  suggestedFix?: string;
  latencyMs?: number;
  availableModels?: string[];
}

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  siteUrl: string;
  siteName: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
  lastSync?: number;
}

export interface StoryMemory {
  id: string;
  chatId?: string;
  title: string;
  type: 'note' | 'quote' | 'recap';
  content: string;
  createdAt: string;
}
