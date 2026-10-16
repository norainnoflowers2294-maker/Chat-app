import { describe, expect, test } from 'bun:test';
import {
  mergeOpenRouterConfig,
  exportSettingsJSON,
  importSettingsJSON,
  DEFAULT_OPENROUTER_CONFIG,
  DEFAULT_PROMPTS,
} from './storage';

describe('storage settings persistence & import/export', () => {
  test('mergeOpenRouterConfig applies missing defaults gracefully', () => {
    const Partial = {
      model: 'anthropic/claude-3.5-sonnet',
      temperature: 0.9,
    };
    const merged = mergeOpenRouterConfig(Partial);
    expect(merged.model).toBe('anthropic/claude-3.5-sonnet');
    expect(merged.temperature).toBe(0.9);
    expect(merged.prompts.mainSystemPrompt).toBe(DEFAULT_PROMPTS.mainSystemPrompt);
    expect(merged.generation.maxTokens).toBe(1024);
  });

  test('exportSettingsJSON masks API key by default', () => {
    const cfg = {
      ...DEFAULT_OPENROUTER_CONFIG,
      apiKey: 'sk-or-v1-secret-key-12345',
    };

    const exportedMasked = exportSettingsJSON(cfg, false);
    const parsedMasked = JSON.parse(exportedMasked);
    expect(parsedMasked.config.apiKey).toBe('');

    const exportedWithKey = exportSettingsJSON(cfg, true);
    const parsedWithKey = JSON.parse(exportedWithKey);
    expect(parsedWithKey.config.apiKey).toBe('sk-or-v1-secret-key-12345');
  });

  test('importSettingsJSON validates and parses JSON settings files', () => {
    const validJson = JSON.stringify({
      version: '1.0',
      config: {
        model: 'deepseek/deepseek-chat',
        prompts: {
          mainSystemPrompt: 'Imported System Prompt',
        },
      },
    });

    const result = importSettingsJSON(validJson);
    expect(result.success).toBe(true);
    expect(result.config?.model).toBe('deepseek/deepseek-chat');
    expect(result.config?.prompts.mainSystemPrompt).toBe('Imported System Prompt');

    const invalidJson = 'not a json string';
    const invalidResult = importSettingsJSON(invalidJson);
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error).toBeDefined();
  });
});
