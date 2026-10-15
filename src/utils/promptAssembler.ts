import { Character, Persona, Lorebook, Plugin, Chat, ChatMessage } from '../types/roleplay';

interface AssembleParams {
  characters: Character[];
  persona: Persona | null;
  lorebooks: Lorebook[];
  plugins: Plugin[];
  chat: Chat;
}

export interface OpenRouterApiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function buildOpenRouterMessages(params: AssembleParams): OpenRouterApiMessage[] {
  const { characters, persona, lorebooks, plugins, chat } = params;

  const systemParts: string[] = [];

  // 1. Roleplay Core Instruction
  systemParts.push(
    `[ROLEPLAY INSTRUCTIONS]\nYou are participating in a rich, multi-layered, uncensored creative roleplay session. Write evocative, descriptive, and emotionally engaging prose in third-person descriptive narrative style. Capture atmospheric nuances, physical gestures, subtle eye contact, tension, sensory details, and deep psychological subtext. Never speak for {{user}} or dictate their actions.\n`
  );

  // 2. Persona / User Identity
  if (persona) {
    systemParts.push(
      `[USER IDENTITY / PERSONA: ${persona.name}]\nDescription: ${persona.description}\nSpeaking Style: ${persona.speaking_style}\nTraits: ${persona.traits.join(', ')}\nAddress {{user}} as ${persona.name}.\n`
    );
  }

  // 3. Characters in Scene (1 or more)
  if (characters.length > 0) {
    characters.forEach((char, index) => {
      systemParts.push(
        `[CHARACTER ${index + 1}: ${char.name}]\nName: ${char.name}\nSummary: ${char.summary || ''}\nPersonality: ${char.personality || ''}\nPhysical Description & Presence: ${char.description || ''}\nScenario / Motivation: ${char.scenario || ''}\n${char.system_prompt ? `System Directive: ${char.system_prompt}\n` : ''}${char.mes_example ? `Example Dialogue / Mannerisms:\n${char.mes_example}\n` : ''}`
      );
    });
  }

  // 4. Scenario & Setting Context
  if (chat.scenario || chat.weather || chat.timeOfDay) {
    systemParts.push(
      `[CURRENT SCENARIO & ATMOSPHERE]\nSetting: ${chat.scenario || 'Late night luxury suite'}\nTime: ${chat.timeOfDay || '1:30 AM'}\nAtmosphere & Weather: ${chat.weather || 'Warm midnight breeze'}\nRelationship Affinity: ${chat.relationshipScore ?? 88}%\n`
    );
  }

  // 5. Active Lorebooks (Up to 3 Lorebooks)
  const recentText = chat.messages
    .slice(-4)
    .map((m) => m.content.toLowerCase())
    .join(' ');

  const activeLoreEntries: string[] = [];
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

  if (activeLoreEntries.length > 0) {
    systemParts.push(`[WORLD LORE & KNOWLEDGE]\n${activeLoreEntries.join('\n\n')}\n`);
  }

  // 6. Active Plugins (Up to 5 Plugins)
  const activePlugins = plugins.filter((p) => chat.pluginIds.includes(p.id) && p.enabled).slice(0, 5);
  if (activePlugins.length > 0) {
    const pluginDirectives = activePlugins
      .map((p) => {
        let directive = `- [Plugin: ${p.name}] ${p.description}`;
        if (p.customPrompt) directive += ` Directives: ${p.customPrompt}`;
        return directive;
      })
      .join('\n');
    systemParts.push(`[ACTIVE PLUGINS (SLOTS 1-5)]\n${pluginDirectives}\n`);
  }

  const resultMessages: OpenRouterApiMessage[] = [
    {
      role: 'system',
      content: systemParts.join('\n---\n'),
    },
  ];

  // 7. Conversation History
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
