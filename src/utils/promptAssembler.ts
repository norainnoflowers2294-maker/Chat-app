import type { AppPreferences } from '../lib/preferences';
import type { StoryMemory } from '../types/roleplay';
import type { Character, Persona, Lorebook, Plugin, Chat } from '../types/roleplay';

interface AssembleParams {
  preferences?: AppPreferences;
  storyMemories?: StoryMemory[];
  socialMediaContext?: string;
  characters: Character[];
  persona: Persona | null;
  lorebooks: Lorebook[];
  plugins: Plugin[];
  chat: Chat;
}

export interface OpenRouterApiMessage { role: 'system' | 'user' | 'assistant'; content: string; }
const clean = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const list = (value?: string[]) => (value || []).map(clean).filter(Boolean).join(', ');

const replyStyleInstructions: Record<NonNullable<Chat['replyStyle']>, string> = {
  immersive: 'Write immersive, sensory prose with expressive character actions and natural dialogue.',
  dialogue: 'Keep the reply dialogue-forward. Use brief action beats and let the characters’ voices carry the scene.',
  balanced: 'Balance natural dialogue with clear, vivid action and setting details.',
  screenplay: 'Use a screenplay-like rhythm with concise action beats and character dialogue; do not add camera directions.',
};
const lengthInstructions: Record<NonNullable<Chat['replyLength']>, string> = {
  short: 'Keep each reply concise, usually one to three short paragraphs, and leave room for the user to respond.',
  medium: 'Write a moderate reply, usually three to five paragraphs, with a clear conversational opening for the user.',
  long: 'Write a fuller, slower-paced reply with several developed paragraphs, but stop before deciding what the user does.',
};
const moodInstructions: Record<NonNullable<Chat['replyMood']>, string> = {
  story: 'Follow the emotional tone established by the current scene.',
  playful: 'Favor playful banter, teasing, and lively chemistry when it fits the scene.',
  romantic: 'Emphasize affection, romantic tension, and emotionally specific gestures when appropriate.',
  dramatic: 'Lean into emotional stakes, tension, and meaningful character reactions.',
  cozy: 'Use a warm, gentle, comfortable tone with small intimate details.',
  suspenseful: 'Build anticipation with restrained reveals, uncertainty, and atmosphere.',
  comedic: 'Use light humor and witty reactions while keeping the characters recognizable.',
};

function formatCharacter(character: Character, index: number): string {
  const parts = [
    `[CHARACTER ${index + 1}: ${clean(character.name) || 'Unnamed character'}]`,
    `Name: ${clean(character.name)}`,
    character.nicknames?.length ? `Nicknames: ${list(character.nicknames)}` : '',
    character.age ? `Age: ${clean(character.age)}` : '',
    character.ethnicity ? `Ethnicity: ${clean(character.ethnicity)}` : '',
    character.birthday ? `Birthday: ${clean(character.birthday)}` : '',
    character.zodiacSign ? `Zodiac: ${clean(character.zodiacSign)}` : '',
    character.height ? `Height: ${clean(character.height)}` : '',
    character.bodyType ? `Build: ${clean(character.bodyType)}` : '',
    character.hairColor ? `Hair: ${clean(character.hairColor)}` : '',
    character.eyeColor ? `Eyes: ${clean(character.eyeColor)}` : '',
    character.scars?.length ? `Scars: ${character.scars.map(mark => [mark.location, mark.description].filter(Boolean).join(' — ')).join('; ')}` : '',
    character.birthmarks?.length ? `Birthmarks: ${character.birthmarks.map(mark => [mark.location, mark.description].filter(Boolean).join(' — ')).join('; ')}` : '',
    character.tattoos?.length ? `Tattoos: ${character.tattoos.map(mark => [mark.location, mark.description].filter(Boolean).join(' — ')).join('; ')}` : '',
    character.description ? `Physical appearance: ${clean(character.description)}` : '',
    character.personality ? `Personality: ${clean(character.personality)}` : '',
    character.backstory ? `History and background: ${clean(character.backstory)}` : '',
    character.voiceDescription ? `Voice: ${clean(character.voiceDescription)}` : '',
    character.voiceTags?.length ? `Voice qualities: ${list(character.voiceTags)}` : '',
    character.spouse ? `Spouse: ${[character.spouse.name, character.spouse.relationshipStatus].filter(Boolean).join(' — ')}` : '',
    character.familyMembers?.length ? `Family: ${character.familyMembers.map(member => [member.name, member.relationship, member.age, member.description, member.status].filter(Boolean).join(' — ')).join('; ')}` : '',
    character.summary ? `Summary: ${clean(character.summary)}` : '',
    character.tags?.length ? `Character tags: ${list(character.tags)}` : '',
    character.scenario ? `Character scenario and motivation: ${clean(character.scenario)}` : '',
    character.pov ? `Character card point of view: ${clean(character.pov)}` : '',
    character.system_prompt ? `System Directive: ${clean(character.system_prompt)}` : '',
    character.mes_example ? `Example Dialogue / Mannerisms:\n${clean(character.mes_example)}\nUse this only as a voice reference; do not repeat it verbatim.` : '',
  ].filter(Boolean);
  return parts.join('\n');
}

export function buildOpenRouterMessages(params: AssembleParams): OpenRouterApiMessage[] {
  const { characters, persona, lorebooks, plugins, chat, preferences, storyMemories = [], socialMediaContext = '' } = params;
  const systemParts: string[] = [];

  systemParts.push(
    `[ROLEPLAY INSTRUCTIONS]\nContinue the scene as the selected character profile or profiles. Stay consistent with their established voice, personality, history, relationships, and current situation. Use the reply settings below. Never impersonate the user, write the user's dialogue, or decide the user's thoughts, feelings, or actions. Leave a natural opening for the user's next turn.`
  );

  if (chat.socialMediaEnabled && socialMediaContext.trim()) {
    systemParts.push(socialMediaContext);
  }

  if (persona) {
    const identity = [
      `[USER IDENTITY / PERSONA: ${clean(persona.display_name) || clean(persona.name) || 'User persona'}]`,
      `Profile name: ${clean(persona.name)}`,
      persona.display_name ? `Name to use in the scene: ${clean(persona.display_name)}` : '',
      persona.nicknames ? `Nicknames: ${clean(persona.nicknames)}` : '',
      persona.occupation ? `Occupation: ${clean(persona.occupation)}` : '',
      persona.description ? `Description: ${clean(persona.description)}` : '',
      persona.appearance ? `Appearance: ${clean(persona.appearance)}` : '',
      persona.backstory ? `Background: ${clean(persona.backstory)}` : '',
      persona.speaking_style ? `Speaking Style: ${clean(persona.speaking_style)}` : '',
      persona.traits?.length ? `Traits: ${list(persona.traits)}` : '',
      `Address {{user}} as ${clean(persona.display_name) || clean(persona.name) || 'the user'} when natural. The user controls this persona; never write their actions or replies for them.`,
    ].filter(Boolean);
    systemParts.push(identity.join('\n'));
  } else {
    systemParts.push('[USER IDENTITY / PERSONA]\nNo persona profile is selected. Do not invent a detailed user biography or appearance.');
  }

  if (characters.length > 0) {
    systemParts.push(characters.map(formatCharacter).join('\n\n---\n\n'));
  } else {
    systemParts.push('[CHARACTER PROFILE STATUS]\nNo character profiles were attached to this chat. Do not pretend to know a specific character card.');
  }

  const style = chat.replyStyle || 'immersive';
  const length = chat.replyLength || 'medium';
  const pointOfView = chat.replyPointOfView === 'first_person' ? 'Write in first person as the responding character.'
    : chat.replyPointOfView === 'third_person' ? 'Write in third person.'
    : characters[0]?.pov === 'first_person' ? 'Follow the character card: write in first person as the responding character.'
    : 'Follow the character card point of view when specified; otherwise write in third person.';
  const mood = chat.replyMood || 'story';
  systemParts.push(`[CHAT REPLY SETTINGS]\nStyle: ${replyStyleInstructions[style]}\nLength: ${lengthInstructions[length]}\nPoint of view: ${pointOfView}\nMood: ${moodInstructions[mood]}\nCreativity: ${Math.max(0, Math.min(2, chat.creativity ?? 0.85)).toFixed(1)} on a 0–2 scale.`);
  if (chat.promptInstructions?.trim()) systemParts.push(`[YOUR EXTRA INSTRUCTIONS FOR THIS CHAT]\n${chat.promptInstructions.trim()}`);

  if (chat.scenario || chat.weather || chat.timeOfDay) {
    systemParts.push(`[CURRENT SCENARIO & ATMOSPHERE]\nSetting: ${chat.scenario || 'Use the character profile and recent conversation to determine the setting.'}\nTime: ${chat.timeOfDay || 'Not specified'}\nAtmosphere & Weather: ${chat.weather || 'Not specified'}\nRelationship Affinity: ${chat.relationshipScore ?? 88}%`);
  }

  const recentText = chat.messages.slice(-4).map((message) => message.content.toLowerCase()).join(' ');
  const activeLoreEntries: string[] = [];
  lorebooks.slice(0, 3).forEach((book) => book.entries.forEach((entry) => {
    if (!entry.enabled) return;
    const matched = entry.constant || entry.keys.some((key) => key.trim() && recentText.includes(key.trim().toLowerCase()));
    if (matched) activeLoreEntries.push(`[LORE: ${entry.keys.join('/')}]\n${entry.content}`);
  }));
  if (activeLoreEntries.length) systemParts.push(`[WORLD LORE & KNOWLEDGE]\n${activeLoreEntries.join('\n\n')}`);

  const activePlugins = plugins.filter((plugin) => chat.pluginIds.includes(plugin.id) && plugin.enabled).slice(0, 5);
  if (activePlugins.length) {
    const directives = activePlugins.map((plugin) => `- [Plugin: ${plugin.name}] ${plugin.description}${plugin.customPrompt ? ` Directives: ${plugin.customPrompt}` : ''}`).join('\n');
    systemParts.push(`[ACTIVE PLUGINS (SLOTS 1-5)]\n${directives}`);
  }

  if (preferences) {
    const rules = [
      preferences.trackWardrobe ? 'Preserve established clothing and accessories until the story changes them.' : '',
      preferences.trackLocations ? 'Preserve the current location and plausible travel between locations.' : '',
      preferences.npcAutonomy ? 'NPCs may act independently within the scene; never control the user persona.' : 'Do not introduce new NPC actions or off-screen events unless the user requests them.',
      preferences.narratorEnabled ? `Narration activity: ${preferences.narratorFrequency}. ${preferences.narratorFrequency === 'quiet' ? 'Keep narration brief and favor dialogue.' : preferences.narratorFrequency === 'active' ? 'Use detailed sensory scene narration alongside dialogue.' : 'Balance dialogue and scene description.'}` : 'Respond as the character; omit standalone narrator commentary and unsolicited scene narration.',
    ].filter(Boolean);
    systemParts.push(`[USER STORY PREFERENCES]\n${rules.join('\n')}`);
    if (preferences.memoryEnabled) {
      const limits = preferences.memoryDepth === 'light' ? [3, 500] : preferences.memoryDepth === 'deep' ? [15, 2000] : [8, 1000];
      const notes = storyMemories.filter((memory) => !memory.chatId || memory.chatId === chat.id).slice(0, limits[0]);
      if (notes.length) systemParts.push(`[SAVED STORY NOTES]\n${notes.map((memory) => `${memory.title}: ${memory.content.slice(0, limits[1])}`).join('\n')}`);
    }
  }

  const resultMessages: OpenRouterApiMessage[] = [{ role: 'system', content: systemParts.join('\n\n---\n\n') }];
  const history = preferences ? chat.messages.slice(-preferences.contextMessages) : chat.messages;
  history.forEach((message) => resultMessages.push({ role: message.senderId === 'user' ? 'user' : 'assistant', content: message.content }));
  return resultMessages;
}
