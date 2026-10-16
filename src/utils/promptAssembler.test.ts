import { describe, expect, test } from 'bun:test';
import {
  buildOpenRouterMessages,
  getUnknownVariables,
  replacePromptVariables,
  KNOWN_PROMPT_VARIABLES,
} from './promptAssembler';
import { Character, Persona, Lorebook, Plugin, Chat } from '../types/roleplay';
import { DEFAULT_PROMPTS, DEFAULT_CHAT_BEHAVIOR } from '../lib/storage';

describe('promptAssembler utils', () => {
  test('replaces prompt variables correctly', () => {
    const template = 'Hello {{user}}, I am {{char}} in {{scenario}}.';
    const result = replacePromptVariables(template, {
      '{{user}}': 'Alice',
      '{{char}}': 'Lucious',
      '{{scenario}}': 'Penthouse',
    });
    expect(result).toBe('Hello Alice, I am Lucious in Penthouse.');
  });

  test('identifies unknown variables', () => {
    const template = 'Known {{char}} and {{user}}, but unknown {{custom_var}} and {{unknown_2}}.';
    const unknown = getUnknownVariables(template);
    expect(unknown).toEqual(['{{custom_var}}', '{{unknown_2}}']);
  });

  test('builds OpenRouter system messages with custom prompts and strict constraints', () => {
    const characters: Character[] = [
      {
        id: 'c1',
        name: 'Lucious',
        avatar: '/lucious.jpg',
        summary: 'Corporate Leader',
        description: 'Tall and sharp.',
        personality: 'Charming and assertive.',
        scenario: 'Penthouse meeting',
        first_mes: 'Welcome.',
        mes_example: '',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const persona: Persona = {
      id: 'p1',
      name: 'The Muse',
      avatar: '/avatar.jpg',
      description: 'An artist.',
      speaking_style: 'Eloquent.',
      traits: ['Creative'],
      is_default: true,
      createdAt: new Date().toISOString(),
    };

    const chat: Chat = {
      id: 'chat_1',
      title: 'Test Chat',
      characterIds: ['c1'],
      personaId: 'p1',
      lorebookIds: [],
      pluginIds: [],
      scenario: 'High rise balcony',
      messages: [
        {
          id: 'm1',
          senderId: 'user',
          senderName: 'The Muse',
          content: 'Good evening Lucious.',
          timestamp: Date.now(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const messages = buildOpenRouterMessages({
      characters,
      persona,
      lorebooks: [],
      plugins: [],
      chat,
      prompts: {
        ...DEFAULT_PROMPTS,
        mainSystemPrompt: 'Custom System Prompt for {{char}} interacting with {{user}}.',
      },
      chatBehavior: {
        ...DEFAULT_CHAT_BEHAVIOR,
        pov: 'third_person',
        neverSpeakForUser: true,
      },
    });

    expect(messages.length).toBeGreaterThanOrEqual(2); // system message + chat history
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('Custom System Prompt for Lucious interacting with The Muse.');
    expect(messages[0].content).toContain('[CRITICAL CONSTRAINT]');
    expect(messages[0].content).toContain('Do NOT under any circumstances speak for The Muse');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toBe('Good evening Lucious.');
  });
});
