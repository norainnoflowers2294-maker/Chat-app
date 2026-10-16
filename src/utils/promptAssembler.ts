import type { AppPreferences } from '../lib/preferences';
import type { StoryMemory } from '../types/roleplay';
import type { Character, Persona, Lorebook, Plugin, Chat, ChatMessage } from '../types/roleplay';

interface AssembleParams {
  preferences?: AppPreferences;
  storyMemories?: StoryMemory[];
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
  const { characters, persona, lorebooks, plugins, chat, preferences, storyMemories = [] } = params;

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

  if (preferences) {
    const rules = [
      preferences.trackWardrobe ? 'Preserve established clothing and accessories until the story changes them.' : '',
      preferences.trackLocations ? 'Preserve the current location and plausible travel between locations.' : '',
      preferences.npcAutonomy ? 'NPCs may act independently within the scene; never control the user persona.' : 'Do not introduce new NPC actions or off-screen events unless the user requests them.',
      preferences.narratorEnabled ? `Narration activity: ${preferences.narratorFrequency}. ${preferences.narratorFrequency === 'quiet' ? 'Keep narration brief and favor dialogue.' : preferences.narratorFrequency === 'active' ? 'Use detailed sensory scene narration alongside dialogue.' : 'Balance dialogue and scene description.'}` : 'Respond as the character; omit standalone narrator commentary and unsolicited scene narration.',
    ].filter(Boolean);
    systemParts.push('[USER STORY PREFERENCES]\n' + rules.join('\n'));
    if (preferences.memoryEnabled) {
      const limits = preferences.memoryDepth === 'light' ? [3, 500] : preferences.memoryDepth === 'deep' ? [15, 2000] : [8, 1000];
      const notes = storyMemories.filter(m => !m.chatId || m.chatId === chat.id).slice(0, limits[0]);
      if (notes.length) systemParts.push('[SAVED STORY NOTES]\n' + notes.map(m => `${m.title}: ${m.content.slice(0, limits[1])}`).join('\n'));
    }
  }

  const resultMessages: OpenRouterApiMessage[] = [
    {
      role: 'system',
      content: systemParts.join('\n---\n'),
    },
  ];

  // 7. Conversation History
  const history = preferences ? chat.messages.slice(-preferences.contextMessages) : chat.messages;
  history.forEach((msg) => {
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

