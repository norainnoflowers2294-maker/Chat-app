import { Character, Lorebook } from '../types/roleplay';

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      out += String.fromCharCode(bytes[i]);
    }
    return out;
  }
}

export async function parsePngMetadata(file: File): Promise<{ textChunks: Record<string, string>; base64Image: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;

  const textChunks: Record<string, string> = {};

  if (isPng) {
    let offset = 8;
    while (offset < bytes.length) {
      if (offset + 8 > bytes.length) break;

      const length =
        (bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3];

      const type = String.fromCharCode(
        bytes[offset + 4],
        bytes[offset + 5],
        bytes[offset + 6],
        bytes[offset + 7]
      );

      const dataStart = offset + 8;
      const dataEnd = dataStart + length;

      if (dataEnd > bytes.length) break;

      if (type === 'tEXt') {
        const chunkData = bytes.slice(dataStart, dataEnd);
        let nullIdx = -1;
        for (let i = 0; i < chunkData.length; i++) {
          if (chunkData[i] === 0) {
            nullIdx = i;
            break;
          }
        }

        if (nullIdx !== -1) {
          const keyword = decodeUtf8(chunkData.slice(0, nullIdx));
          const text = decodeUtf8(chunkData.slice(nullIdx + 1));
          textChunks[keyword] = text;
        }
      }

      offset = dataEnd + 4;
    }
  }

  const base64Image = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  return { textChunks, base64Image };
}

export async function parseCharacterFile(file: File): Promise<Partial<Character>> {
  if (file.name.endsWith('.json')) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const data = parsed.data || parsed;
    return {
      name: data.name || 'Unnamed Character',
      summary: data.summary || data.description?.slice(0, 150) || '',
      description: data.description || '',
      personality: data.personality || '',
      scenario: data.scenario || '',
      first_mes: data.first_mes || data.greeting || 'Hello!',
      mes_example: data.mes_example || '',
      system_prompt: data.system_prompt || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
    };
  }

  const { textChunks, base64Image } = await parsePngMetadata(file);
  const rawChara = textChunks['chara'] || textChunks['ccv3'] || textChunks['description'] || textChunks['Comment'];

  if (rawChara) {
    try {
      let jsonStr = rawChara;
      try {
        jsonStr = decodeURIComponent(escape(atob(rawChara)));
      } catch {}

      const parsed = JSON.parse(jsonStr);
      const data = parsed.data || parsed;

      return {
        name: data.name || file.name.replace(/\.[^/.]+$/, ''),
        avatar: base64Image,
        summary: data.summary || data.description?.slice(0, 150) || '',
        description: data.description || '',
        personality: data.personality || '',
        scenario: data.scenario || '',
        first_mes: data.first_mes || data.greeting || 'Hello!',
        mes_example: data.mes_example || '',
        system_prompt: data.system_prompt || '',
        tags: Array.isArray(data.tags) ? data.tags : ['imported'],
      };
    } catch (e) {
      console.error('Failed to parse embedded chara JSON:', e);
    }
  }

  return {
    name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
    avatar: base64Image,
    summary: 'Imported character card',
    description: '',
    personality: '',
    scenario: '',
    first_mes: 'Hello there! Let us begin our roleplay.',
    tags: ['imported'],
  };
}

export async function parseLorebookFile(file: File): Promise<Partial<Lorebook>> {
  if (file.name.endsWith('.json')) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const data = parsed.data || parsed;

    const rawEntries = data.entries || data;
    const entriesList = Array.isArray(rawEntries)
      ? rawEntries
      : Object.values(rawEntries);

    const entries = entriesList.map((e: any, idx: number) => ({
      id: e.id || `entry_${idx}`,
      keys: Array.isArray(e.keys) ? e.keys : (e.key || '').split(',').map((k: string) => k.trim()).filter(Boolean),
      secondary_keys: Array.isArray(e.secondary_keys) ? e.secondary_keys : [],
      comment: e.comment || e.name || '',
      content: e.content || '',
      constant: Boolean(e.constant),
      selective: Boolean(e.selective),
      insertion_order: e.insertion_order || e.order || idx,
      position: (e.position === 'after_char' ? 'after_char' : 'before_char') as 'before_char' | 'after_char',
      enabled: e.enabled !== false,
    }));

    return {
      name: data.name || file.name.replace(/\.[^/.]+$/, ''),
      description: data.description || '',
      scan_depth: data.scan_depth || 4,
      token_budget: data.token_budget || 1500,
      recursive_scanning: Boolean(data.recursive_scanning),
      entries,
    };
  }

  const { textChunks, base64Image } = await parsePngMetadata(file);
  const rawLore = textChunks['lorebook'] || textChunks['world_info'] || textChunks['chara'];

  if (rawLore) {
    try {
      let jsonStr = rawLore;
      try {
        jsonStr = decodeURIComponent(escape(atob(rawLore)));
      } catch {}
      const parsed = JSON.parse(jsonStr);
      const data = parsed.data || parsed;
      return {
        name: data.name || file.name.replace(/\.[^/.]+$/, ''),
        description: data.description || '',
        avatar: base64Image,
        entries: Array.isArray(data.entries) ? data.entries : [],
      };
    } catch {}
  }

  return {
    name: file.name.replace(/\.[^/.]+$/, ''),
    description: 'Imported Lorebook',
    avatar: base64Image,
    entries: [],
  };
}

export function exportCharacterJson(character: Character) {
  const v2Card = {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: character.name,
      description: character.description,
      personality: character.personality,
      scenario: character.scenario,
      first_mes: character.first_mes,
      mes_example: character.mes_example,
      creator_notes: character.creator_notes || 'Created with ColorPop Roleplay Hub',
      system_prompt: character.system_prompt || '',
      tags: character.tags,
      alternate_greetings: character.alternate_greetings || [],
    },
  };

  const blob = new Blob([JSON.stringify(v2Card, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${character.name.toLowerCase().replace(/\s+/g, '_')}_card.json`;
  a.click();
  URL.revokeObjectURL(url);
}
