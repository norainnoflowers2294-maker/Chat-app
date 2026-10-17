import { describe, it, expect, beforeAll } from 'bun:test';
import { parseCharacterFile, parsePersonaFile, parsePngMetadata } from './pngParser';

describe('parsePngMetadata', () => {
  beforeAll(() => {
    // Polyfill FileReader for Bun test environment
    if (typeof globalThis.FileReader === 'undefined') {
      globalThis.FileReader = class FileReader {
        result: any;
        onload: any;
        readAsDataURL(file: File) {
          this.result = 'data:image/png;base64,mocked_base64';
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      } as any;
    }
  });

  const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  it('should parse a valid PNG with a tEXt chunk', async () => {
    const keyword = 'chara';
    const text = 'test character data';
    const keywordBytes = new TextEncoder().encode(keyword);
    const textBytes = new TextEncoder().encode(text);

    const chunkType = [0x74, 0x45, 0x58, 0x74]; // 'tEXt'
    const chunkData = new Uint8Array([...keywordBytes, 0, ...textBytes]);

    const lengthBytes = [
      (chunkData.length >> 24) & 0xff,
      (chunkData.length >> 16) & 0xff,
      (chunkData.length >> 8) & 0xff,
      chunkData.length & 0xff,
    ];

    const crcBytes = [0, 0, 0, 0]; // CRC is ignored by the parser

    const bytes = new Uint8Array([
      ...PNG_SIGNATURE,
      ...lengthBytes,
      ...chunkType,
      ...chunkData,
      ...crcBytes,
    ]);

    const file = new File([bytes], 'test.png', { type: 'image/png' });
    const result = await parsePngMetadata(file);

    expect(result.textChunks).toEqual({ chara: 'test character data' });
    expect(result.base64Image).toBe('data:image/png;base64,mocked_base64');
  });

  it('should return empty chunks for an invalid PNG', async () => {
    const bytes = new TextEncoder().encode('not a real png image');
    const file = new File([bytes], 'invalid.png', { type: 'image/png' });

    const result = await parsePngMetadata(file);

    expect(result.textChunks).toEqual({});
  });

  it('should handle a truncated chunk header gracefully', async () => {
    // Only includes signature and 2 extra bytes (needs at least 8 bytes for length+type)
    const bytes = new Uint8Array([...PNG_SIGNATURE, 0x00, 0x00]);
    const file = new File([bytes], 'truncated_header.png', { type: 'image/png' });

    const result = await parsePngMetadata(file);

    expect(result.textChunks).toEqual({});
  });

  it('should handle truncated chunk data gracefully', async () => {
    // Specify a length of 100 but provide only a few bytes
    const lengthBytes = [0, 0, 0, 100];
    const chunkType = [0x74, 0x45, 0x58, 0x74]; // 'tEXt'
    const bytes = new Uint8Array([
      ...PNG_SIGNATURE,
      ...lengthBytes,
      ...chunkType,
      0x01, 0x02, 0x03, // Only 3 bytes of data instead of 100
    ]);
    const file = new File([bytes], 'truncated_data.png', { type: 'image/png' });

    const result = await parsePngMetadata(file);

    expect(result.textChunks).toEqual({});
  });

  it('should ignore a tEXt chunk that is missing a null separator', async () => {
    const keyword = 'chara';
    const text = 'test character data';
    const keywordBytes = new TextEncoder().encode(keyword);
    const textBytes = new TextEncoder().encode(text);

    const chunkType = [0x74, 0x45, 0x58, 0x74]; // 'tEXt'
    // Intentionally omit the null separator (0x00) between keyword and text
    const chunkData = new Uint8Array([...keywordBytes, ...textBytes]);

    const lengthBytes = [
      (chunkData.length >> 24) & 0xff,
      (chunkData.length >> 16) & 0xff,
      (chunkData.length >> 8) & 0xff,
      chunkData.length & 0xff,
    ];

    const crcBytes = [0, 0, 0, 0];

    const bytes = new Uint8Array([
      ...PNG_SIGNATURE,
      ...lengthBytes,
      ...chunkType,
      ...chunkData,
      ...crcBytes,
    ]);

    const file = new File([bytes], 'missing_null.png', { type: 'image/png' });
    const result = await parsePngMetadata(file);

    expect(result.textChunks).toEqual({});
  });
});


describe('parseCharacterFile', () => {
  it('maps the full character card data object from JSON imports', async () => {
    const card = {
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: 'Mira Vale',
        nicknames: ['Mira', 'Starling'],
        age: '27',
        ethnicity: 'Latina',
        birthday: '10/24',
        birthYear: '1999',
        zodiacSign: 'Scorpio',
        avatar: 'https://example.com/mira.png',
        height: '5 ft 7 in',
        bodyType: 'Athletic',
        scars: [{ location: 'left hand', description: 'small mark' }],
        birthmarks: [{ location: 'shoulder', description: 'crescent' }],
        tattoos: [{ location: 'arm', description: 'flowers' }],
        hairColor: 'black',
        eyeColor: 'brown',
        description: 'A sharp-eyed investigator.',
        voiceDescription: 'Low and warm',
        voiceTags: ['Raspy'],
        personality: 'Curious and patient',
        backstory: 'Raised by her grandmother.',
        spouse: { name: 'Ren', relationshipStatus: 'Married' },
        familyMembers: [{ name: 'Inez', relationship: 'Sister', status: 'Alive' }],
        scenario: 'A late night at the station.',
        first_mes: 'You are late.',
        pov: 'first_person',
        summary: 'An investigator with a secret.',
        mes_example: '<START> Mira: Keep moving.',
        system_prompt: 'Stay in character.',
        tags: ['Mystery', 'Original'],
        alternate_greetings: ['What took you so long?'],
        creator_notes: 'Created for testing.',
        extensions: { custom_setting: 'rainy city' },
      },
    };
    const file = new File([JSON.stringify(card)], 'mira.json', { type: 'application/json' });
    const result = await parseCharacterFile(file);

    expect(result.name).toBe('Mira Vale');
    expect(result.nicknames).toEqual(['Mira', 'Starling']);
    expect(result.scars?.[0].description).toBe('small mark');
    expect(result.spouse?.name).toBe('Ren');
    expect(result.familyMembers?.[0].name).toBe('Inez');
    expect(result.mes_example).toContain('Keep moving');
    expect(result.alternate_greetings).toEqual(['What took you so long?']);
    expect(result.creator_notes).toBe('Created for testing.');
    expect(result.customFields?.custom_setting).toBe('rainy city');
  });

  it('parses a base64 encoded SillyTavern card from a PNG tEXt chunk', async () => {
    const card = { spec: 'chara_card_v2', data: { name: 'Embedded Mira', personality: 'Bold', first_mes: 'Hello!' } };
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const keywordBytes = new TextEncoder().encode('chara');
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(card))));
    const dataBytes = new TextEncoder().encode(payload);
    const chunkData = new Uint8Array([...keywordBytes, 0, ...dataBytes]);
    const length = chunkData.length;
    const bytes = new Uint8Array([
      ...signature,
      (length >>> 24) & 0xff, (length >>> 16) & 0xff, (length >>> 8) & 0xff, length & 0xff,
      0x74, 0x45, 0x58, 0x74,
      ...chunkData, 0, 0, 0, 0,
    ]);
    const file = new File([bytes], 'embedded.png', { type: 'image/png' });
    const result = await parseCharacterFile(file);

    expect(result.name).toBe('Embedded Mira');
    expect(result.personality).toBe('Bold');
    expect(result.avatar).toBe('data:image/png;base64,mocked_base64');
  });


  it('imports the complete character profile from an embedded PNG card', async () => {
    const card = {
      spec: 'chara_card_v3',
      data: {
        name: 'Mira Vale',
        aliases: ['Starling'],
        age: '27',
        race: 'Latina',
        birth_date: '10/24',
        physical_description: 'Tall with dark curls',
        voice: 'Low and warm',
        personality: 'Curious and patient',
        lore: 'Raised by her grandmother.',
        scenario: 'A late night at the station.',
        first_message: 'You are late.',
        example: 'Mira: Keep moving.',
        tags: ['Mystery'],
      },
    };
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const keywordBytes = new TextEncoder().encode('ccv3');
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(card))));
    const chunkData = new Uint8Array([...keywordBytes, 0, ...new TextEncoder().encode(payload)]);
    const length = chunkData.length;
    const bytes = new Uint8Array([
      ...signature,
      (length >>> 24) & 0xff, (length >>> 16) & 0xff, (length >>> 8) & 0xff, length & 0xff,
      0x74, 0x45, 0x58, 0x74, ...chunkData, 0, 0, 0, 0,
    ]);
    const result = await parseCharacterFile(new File([bytes], 'mira.png', { type: 'image/png' }));
    expect(result.name).toBe('Mira Vale');
    expect(result.nicknames).toEqual(['Starling']);
    expect(result.ethnicity).toBe('Latina');
    expect(result.description).toBe('Tall with dark curls');
    expect(result.backstory).toBe('Raised by her grandmother.');
    expect(result.first_mes).toBe('You are late.');
    expect(result.mes_example).toBe('Mira: Keep moving.');
    expect(result.tags).toEqual(['Mystery']);
  });

  it('marks PNGs without embedded card data as image-only imports', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'avatar.png', { type: 'image/png' });
    const result = await parseCharacterFile(file);

    expect(result.name).toBe('avatar');
    expect(result.customFields?.importWarning).toContain('Only its image was imported');
  });
});

describe('parsePersonaFile', () => {
  it('maps persona JSON fields and uses uploaded PNG as the avatar', async () => {
    const file = new File([JSON.stringify({
      spec: 'chara_card_v2',
      data: {
        name: 'Emmy',
        display_name: 'Emmy',
        nicknames: ['Em'],
        occupation: 'Artist',
        description: 'Warm and bold.',
        appearance: 'Curly hair.',
        backstory: 'Grew up near the coast.',
        speaking_style: 'Quick and playful.',
        traits: ['Witty', 'Loyal'],
      },
    })], 'emmy.json', { type: 'application/json' });
    const result = await parsePersonaFile(file);
    expect(result.name).toBe('Emmy');
    expect(result.nicknames).toBe('Em');
    expect(result.occupation).toBe('Artist');
    expect(result.appearance).toBe('Curly hair.');
    expect(result.speaking_style).toBe('Quick and playful.');
    expect(result.traits).toEqual(['Witty', 'Loyal']);
  });

  it('imports an embedded SillyTavern persona card from PNG', async () => {
    const card = {
      spec: 'chara_card_v2',
      data: {
        name: 'Asha',
        description: 'Confident and thoughtful.',
        appearance: 'Brown eyes, braided hair.',
        backstory: 'Her friends are everything.',
        voice_description: 'Soft but clear.',
        tags: ['Creative', 'Loyal'],
      },
    };
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const key = new TextEncoder().encode('chara');
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(card))));
    const data = new Uint8Array([...key, 0, ...new TextEncoder().encode(payload)]);
    const length = data.length;
    const bytes = new Uint8Array([
      ...signature,
      (length >>> 24) & 0xff, (length >>> 16) & 0xff, (length >>> 8) & 0xff, length & 0xff,
      0x74, 0x45, 0x58, 0x74, ...data, 0, 0, 0, 0,
    ]);
    const result = await parsePersonaFile(new File([bytes], 'asha.png', { type: 'image/png' }));
    expect(result.name).toBe('Asha');
    expect(result.description).toBe('Confident and thoughtful.');
    expect(result.appearance).toBe('Brown eyes, braided hair.');
    expect(result.backstory).toBe('Her friends are everything.');
    expect(result.speaking_style).toBe('Soft but clear.');
    expect(result.traits).toEqual(['Creative', 'Loyal']);
    expect(result.avatar).toBe('data:image/png;base64,mocked_base64');
  });
});
