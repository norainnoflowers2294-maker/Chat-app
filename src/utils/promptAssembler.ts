import { Character, Persona, Lorebook, Plugin, Chat, ChatMessage, PromptsConfig, ChatBehaviorConfig, StoryMemory } from '../types/roleplay';

export const KNOWN_PROMPT_VARIABLES = [
  '{{char}}',
  '{{user}}',
  '{{scenario}}',
  '{{persona}}',
  '{{lorebooks}}',
  '{{memory}}',
  '{{chat_history}}',
];

export interface AssembleParams {
  characters: Character[];
  persona: Persona | null;
  lorebooks: Lorebook[];
  plugins: Plugin[];
  chat: Chat;
  prompts?: PromptsConfig;
  chatBehavior?: ChatBehaviorConfig;
  memories?: StoryMemory[];
}

export interface OpenRouterApiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
  Finds any {{variable_name}} in text that is not in the list of supported prompt variables.
 */
export function getUnknownVariables(template: string): string[] {
  if (!template) return [];
  const matches = template.match(/\{\{[a-zA-Z0-9_]+\}\}/g) || [];
  const uniqueMatches = Array.from(new Set(matches));
  return uniqueMatches.filter((varName) => !KNOWN_PROMPT_VARIABLES.includes(varName));
}

/**
  Replaces known prompt variables with actual runtime values.
 */
export function replacePromptVariables(template: string, vars: Record<string, string>): string {
  if (!template) return '';
  let result = template;
  Object.entries(vars).forEach(([key, val]) => {
    // Replace all occurrences of key
    const escaped = key.replace(/[{}]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), val || '');
  });
  return result;
}

export function buildOpenRouterMessages(params: AssembleParams): OpenRouterApiMessage[] {
  const { characters, persona, lorebooks, plugins, chat, prompts, chatBehavior, memories } = params;

  const charName = characters.map((c) => c.name).join(' & ') || 'Character';
  const userName = persona?.name || 'User';
  const scenarioText = chat.scenario || 'Late night encounters';
  const personaText = persona
    ? `Name: ${persona.name}\nDescription: ${persona.description}\nSpeaking Style: ${persona.speaking_style}\nTraits: ${persona.traits.join(', ')}`
    : 'Default persona';

  // Active Lorebooks
  const recentText = chat.messages
    .slice(-4)
    .map((m) => m.content.toLowerCase())
    .join(' ');

  const activeLoreEntries: string[] = [];
  if (chatBehavior?.includeLorebook !== false) {
    lorebooks.slice(0, 3).forEach((lb) => {
      lb.entries.forEach((entry) => {
        if (!entry.enabled) return;
        const matched =
          entry.constant ||
          entry.keys.some((key) => key.trim() && recentText.includes(key.trim().toLowerCase()));
        if (matched) {
          activeLoreEntries.push(`[LORE: ${entry.keys.join('/')}]\n${entry.content}`);
        }
      });
    });
  }
  const lorebooksText = activeLoreEntries.length > 0 ? activeLoreEntries.join('\n\n') : 'None';

  // Memories
  let memoryText = 'None';
  if (chatBehavior?.includeMemory !== false && memories && memories.length > 0) {
    memoryText = memories
      .filter((m) => !m.chatId || m.chatId === chat.id)
      .map((m) => `[${m.type.toUpperCase()}] ${m.title}: ${m.content}`)
      .join('\n');
  }

  // Recent chat history string for variable
  const recentMessages = chat.messages.slice(-6);
  const chatHistoryText = recentMessages
    .map((m) => `${m.senderName}: ${m.content}`)
    .join('\n');

  const variableValues: Record<string, string> = {
    '{{char}}': charName,
    '{{user}}': userName,
    '{{scenario}}': scenarioText,
    '{{persona}}': personaText,
    '{{lorebooks}}': lorebooksText,
    '{{memory}}': memoryText,
    '{{chat_history}}': chatHistoryText,
  };

  const systemParts: string[] = [];

  // 1. Main System Prompt
  const mainSys = prompts?.mainSystemPrompt
    ? replacePromptVariables(prompts.mainSystemPrompt, variableValues)
    : `[ROLEPLAY INSTRUCTIONS]\nYou are participating in a rich creative roleplay session as ${charName}. Never speak for ${userName}.`;
  systemParts.push(mainSys);

  // 2. POV & Formatting Rules
  const povInstruction =
    chatBehavior?.pov === 'first_person'
      ? `Write in first-person point-of-view ('I...').`
      : `Write in third-person descriptive narrative style ('He/She/They...').`;
  const formatInstruction = chatBehavior?.formattingStyle
    ? `Formatting guidelines: ${chatBehavior.formattingStyle}`
    : `Use asterisks for actions (*smiles*) and quotation marks for speech.`;
  systemParts.push(`[POV & FORMATTING]\n${povInstruction}\n${formatInstruction}`);

  // 3. User Persona / Identity
  if (prompts?.userPersonaPrompt) {
    systemParts.push(replacePromptVariables(prompts.userPersonaPrompt, variableValues));
  } else if (persona) {
    systemParts.push(`[USER IDENTITY / PERSONA: ${persona.name}]\n${personaText}`);
  }

  // 4. Character Behavior & Scene Directives
  if (prompts?.characterBehaviorPrompt) {
    systemParts.push(replacePromptVariables(prompts.characterBehaviorPrompt, variableValues));
  }
  if (characters.length > 0) {
    characters.forEach((char, index) => {
      systemParts.push(
        `[CHARACTER ${index + 1}: ${char.name}]\nSummary: ${char.summary || ''}\nPersonality: ${char.personality || ''}\nDescription: ${char.description || ''}${
          char.system_prompt ? `\nDirective: ${char.system_prompt}` : ''
        }${char.mes_example ? `\nExample Dialogue:\n${char.mes_example}` : ''}`
      );
    });
  }

  // 5. Memory & Lore Continuity Prompt
  if (prompts?.memoryContinuityPrompt) {
    systemParts.push(replacePromptVariables(prompts.memoryContinuityPrompt, variableValues));
  } else if (activeLoreEntries.length > 0) {
    systemParts.push(`[WORLD LORE & KNOWLEDGE]\n${lorebooksText}`);
  }

  // 6. Roleplay Style Prompt
  if (prompts?.roleplayStylePrompt) {
    systemParts.push(replacePromptVariables(prompts.roleplayStylePrompt, variableValues));
  }

  // 7. Narrator Prompt
  if (chatBehavior?.narratorEnabled !== false && prompts?.narratorPrompt) {
    systemParts.push(replacePromptVariables(prompts.narratorPrompt, variableValues));
  }

  // 8. Out of Character Prompt
  if (prompts?.oocPrompt) {
    systemParts.push(replacePromptVariables(prompts.oocPrompt, variableValues));
  }

  // 9. Active Plugins
  const activePlugins = plugins.filter((p) => chat.pluginIds.includes(p.id) && p.enabled).slice(0, 5);
  if (activePlugins.length > 0) {
    const pluginDirectives = activePlugins
      .map((p) => `- [Plugin: ${p.name}] ${p.description}${p.customPrompt ? ` Directive: ${p.customPrompt}` : ''}`)
      .join('\n');
    systemParts.push(`[ACTIVE PLUGINS]\n${pluginDirectives}`);
  }

  // 10. Strict Constraint: Never Speak For User
  if (chatBehavior?.neverSpeakForUser !== false) {
    systemParts.push(
      `[CRITICAL CONSTRAINT]\nDo NOT under any circumstances speak for {{user}} (${userName}), dictate their dialogue, or decide actions for {{user}}. Stop writing as soon as your character's turn is complete.`
    );
  }

  const assembledSystem = systemParts.join('\n\n---\n\n');

  const resultMessages: OpenRouterApiMessage[] = [
    {
      role: 'system',
      content: replacePromptVariables(assembledSystem, variableValues),
    },
  ];

  // Add Chat Message History
  chat.messages.forEach((msg) => {
    if (msg.senderId === 'user') {
      resultMessages.push({
        role: 'user',
        content: msg.content,
      });
    } else {
      resultMessages.push({
        role: 'assistant',
        content: msg.content,
      });
    }
  });

  return resultMessages;
}
