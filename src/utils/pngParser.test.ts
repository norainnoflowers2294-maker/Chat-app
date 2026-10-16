import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { exportCharacterJson } from './pngParser';
import { Character } from '../types/roleplay';

describe('exportCharacterJson', () => {
  let mockClick: ReturnType<typeof mock>;
  let mockAnchor: any;
  let mockCreateElement: ReturnType<typeof mock>;
  let mockCreateObjectURL: ReturnType<typeof mock>;
  let mockRevokeObjectURL: ReturnType<typeof mock>;
  let mockBlobConstructor: ReturnType<typeof mock>;

  const originalDocument = global.document;
  const originalURL = global.URL;
  const originalBlob = global.Blob;

  beforeEach(() => {
    mockClick = mock(() => {});
    mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
    };

    mockCreateElement = mock((tag: string) => {
      if (tag === 'a') return mockAnchor;
      return {};
    });

    global.document = {
      createElement: mockCreateElement,
    } as any;

    mockCreateObjectURL = mock((blob: any) => 'blob:test-url');
    mockRevokeObjectURL = mock((url: string) => {});

    global.URL = {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    } as any;

    mockBlobConstructor = mock((chunks: any[], options: any) => ({ chunks, options }));
    global.Blob = mockBlobConstructor as any;
  });

  afterEach(() => {
    global.document = originalDocument;
    global.URL = originalURL;
    global.Blob = originalBlob;
  });

  it('should create a correctly formatted V2 character card and trigger download', () => {
    const mockCharacter: Character = {
      id: '1',
      name: 'Test Character',
      avatar: 'test.png',
      summary: 'A test character',
      description: 'Long test description',
      personality: 'Friendly',
      scenario: 'In a test environment',
      first_mes: 'Hello world',
      mes_example: 'User: Hi\nBot: Hello',
      system_prompt: 'Test prompt',
      tags: ['test', 'bot'],
      creator_notes: 'My custom notes',
      alternate_greetings: ['Hi there', 'Greetings'],
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    };

    exportCharacterJson(mockCharacter);

    // Verify Blob creation
    expect(mockBlobConstructor).toHaveBeenCalled();
    const blobArgs = mockBlobConstructor.mock.calls[0];

    // Check JSON content
    const blobContentStr = blobArgs[0][0];
    const blobContent = JSON.parse(blobContentStr);

    expect(blobContent).toEqual({
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: 'Test Character',
        description: 'Long test description',
        personality: 'Friendly',
        scenario: 'In a test environment',
        first_mes: 'Hello world',
        mes_example: 'User: Hi\nBot: Hello',
        creator_notes: 'My custom notes',
        system_prompt: 'Test prompt',
        tags: ['test', 'bot'],
        alternate_greetings: ['Hi there', 'Greetings'],
      },
    });

    expect(blobArgs[1]).toEqual({ type: 'application/json' });

    // Verify object URL creation
    expect(mockCreateObjectURL).toHaveBeenCalled();
    const createdBlob = mockCreateObjectURL.mock.calls[0][0];
    expect(createdBlob).toEqual({ chunks: blobArgs[0], options: blobArgs[1] });

    // Verify element creation and download triggering
    expect(mockCreateElement).toHaveBeenCalledWith('a');
    expect(mockAnchor.href).toBe('blob:test-url');
    expect(mockAnchor.download).toBe('test_character_card.json');
    expect(mockClick).toHaveBeenCalled();

    // Verify cleanup
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
  });

  it('should use default values for missing optional fields', () => {
    const mockCharacter: Character = {
      id: '2',
      name: 'MinimalBot',
      avatar: 'test.png',
      summary: '',
      description: 'Desc',
      personality: 'Personality',
      scenario: 'Scenario',
      first_mes: 'First',
      mes_example: '',
      system_prompt: '',
      tags: [],
      createdAt: '',
      updatedAt: '',
    };

    exportCharacterJson(mockCharacter);

    const blobContentStr = mockBlobConstructor.mock.calls[0][0][0];
    const blobContent = JSON.parse(blobContentStr);

    expect(blobContent.data.creator_notes).toBe('Created with ColorPop Roleplay Hub');
    expect(blobContent.data.system_prompt).toBe('');
    expect(blobContent.data.alternate_greetings).toEqual([]);

    expect(mockAnchor.download).toBe('minimalbot_card.json');
  });
});
