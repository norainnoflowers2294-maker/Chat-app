import { Character, FeatureMark, Lorebook } from '../types/roleplay';

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

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function firstDefined(data: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') return data[key];
  }
  return undefined;
}

function normalizeFeatureMarks(value: unknown): FeatureMark[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: any, index) => {
    if (typeof item === 'string') return { id: `imported_mark_${index}`, location: '', description: item };
    return {
      id: asString(item?.id, `imported_mark_${index}`),
      location: asString(item?.location ?? item?.place),
      description: asString(item?.description ?? item?.details ?? item?.text),
    };
  });
}

function unwrapCard(parsed: any): Record<string, any> {
  let data = parsed?.data || parsed?.character || parsed;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Character card JSON must contain an object.');
  // Some exporters wrap card data more than once.
  if (data.data && typeof data.data === 'object') data = data.data;
  return data;
}

function normalizeCharacterCard(parsed: any, fallbackName: string, avatar?: string): Partial<Character> {
  const data = unwrapCard(parsed);
  const physical = firstDefined(data, 'physical_description', 'appearance', 'looks');
  const backstory = firstDefined(data, 'backstory', 'history', 'background', 'lore');
  const summary = firstDefined(data, 'summary', 'short_description');
  const familyRaw = firstDefined(data, 'familyMembers', 'family_members', 'relatives');
  const familyMembers = Array.isArray(familyRaw) ? familyRaw.map((item: any, index) => ({
    id: asString(item?.id, `imported_family_${index}`),
    name: asString(item?.name, typeof item === 'string' ? item : ''),
    relationship: asString(item?.relationship ?? item?.relation, 'Other'),
    age: asString(item?.age),
    description: asString(item?.description),
    status: asString(item?.status, 'Unknown'),
    characterId: asString(item?.characterId ?? item?.character_id) || undefined,
  })) : [];
  const spouseRaw = firstDefined(data, 'spouse', 'current_spouse');
  const spouse = typeof spouseRaw === 'string'
    ? (spouseRaw ? { name: spouseRaw, relationshipStatus: '' } : undefined)
    : spouseRaw && typeof spouseRaw === 'object'
      ? { name: asString(spouseRaw.name), relationshipStatus: asString(spouseRaw.relationshipStatus ?? spouseRaw.relationship_status ?? spouseRaw.status), characterId: asString(spouseRaw.characterId ?? spouseRaw.character_id) || undefined }
      : undefined;

  const consumed = new Set([
    'name', 'nicknames', 'nickname', 'age', 'ethnicity', 'birthday', 'birthYear', 'birth_year', 'zodiacSign', 'zodiac_sign',
    'avatar', 'image', 'height', 'bodyType', 'body_type', 'build', 'scars', 'birthmarks', 'tattoos',
    'hairColor', 'hair_color', 'eyeColor', 'eye_color', 'description', 'physical_description', 'appearance', 'looks',
    'voiceDescription', 'voice_description', 'voice', 'voiceTags', 'voice_tags', 'personality', 'backstory', 'history', 'background', 'lore',
    'spouse', 'current_spouse', 'familyMembers', 'family_members', 'relatives', 'scenario', 'first_mes', 'greeting', 'firstMessage',
    'pov', 'summary', 'short_description', 'mes_example', 'example_dialogue', 'system_prompt', 'tags', 'alternate_greetings', 'creator_notes',
    'customFields', 'custom_fields', 'extensions', 'creator', 'character_version', 'spec', 'spec_version', 'post_history_instructions',
  ]);
  const rawCustom = firstDefined(data, 'customFields', 'custom_fields', 'extensions');
  const unknownFields = Object.fromEntries(Object.entries(data).filter(([key]) => !consumed.has(key)));
  const customFields = { ...(rawCustom && typeof rawCustom === 'object' && !Array.isArray(rawCustom) ? rawCustom : {}), ...unknownFields };

  const tagsRaw = firstDefined(data, 'tags');
  const greetingsRaw = firstDefined(data, 'alternate_greetings', 'alternateGreetings');
  const nicknamesRaw = firstDefined(data, 'nicknames', 'nickname');
  const rawPov = asString(firstDefined(data, 'pov', 'reply_pov'));
  const normalizedPov = /first/i.test(rawPov) ? 'first_person' : /third/i.test(rawPov) ? 'third_person' : rawPov;
  const description = asString(firstDefined(data, 'description', 'physical_description', 'appearance', 'looks'));
  const cardSummary = asString(summary, description.slice(0, 150));

  return {
    name: asString(firstDefined(data, 'name'), fallbackName),
    nicknames: Array.isArray(nicknamesRaw) ? nicknamesRaw.map((value: unknown) => asString(value)).filter(Boolean) : (typeof nicknamesRaw === 'string' ? nicknamesRaw.split(',').map((v: string) => v.trim()).filter(Boolean) : []),
    age: asString(firstDefined(data, 'age')),
    ethnicity: asString(firstDefined(data, 'ethnicity', 'race')),
    birthday: asString(firstDefined(data, 'birthday', 'birth_date')),
    birthYear: asString(firstDefined(data, 'birthYear', 'birth_year')),
    zodiacSign: asString(firstDefined(data, 'zodiacSign', 'zodiac_sign')),
    avatar: avatar || asString(firstDefined(data, 'avatar', 'image')),
    height: asString(firstDefined(data, 'height')),
    bodyType: asString(firstDefined(data, 'bodyType', 'body_type', 'build')),
    scars: normalizeFeatureMarks(data.scars),
    birthmarks: normalizeFeatureMarks(data.birthmarks),
    tattoos: normalizeFeatureMarks(data.tattoos),
    hairColor: asString(firstDefined(data, 'hairColor', 'hair_color')),
    eyeColor: asString(firstDefined(data, 'eyeColor', 'eye_color')),
    description,
    voiceDescription: asString(firstDefined(data, 'voiceDescription', 'voice_description', 'voice')),
    voiceTags: Array.isArray(firstDefined(data, 'voiceTags', 'voice_tags')) ? firstDefined(data, 'voiceTags', 'voice_tags').map((v: unknown) => asString(v)).filter(Boolean) : [],
    personality: asString(firstDefined(data, 'personality')),
    backstory: asString(backstory),
    spouse,
    familyMembers,
    scenario: asString(firstDefined(data, 'scenario')),
    first_mes: asString(firstDefined(data, 'first_mes', 'greeting', 'firstMessage'), 'Hello!'),
    pov: normalizedPov,
    summary: cardSummary,
    mes_example: asString(firstDefined(data, 'mes_example', 'example_dialogue')),
    system_prompt: asString(firstDefined(data, 'system_prompt', 'post_history_instructions')),
    tags: Array.isArray(tagsRaw) ? tagsRaw.map((v: unknown) => asString(v)).filter(Boolean) : (typeof tagsRaw === 'string' ? tagsRaw.split(',').map((v: string) => v.trim()).filter(Boolean) : []),
    alternate_greetings: Array.isArray(greetingsRaw) ? greetingsRaw.map((v: unknown) => asString(v)).filter(Boolean) : [],
    creator_notes: asString(firstDefined(data, 'creator_notes')),
    customFields,
  };
}

function decodeCardPayload(raw: string): any {
  const candidates = [raw];
  try {
    const binary = atob(raw.trim());
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    candidates.unshift(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {}
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch {}
  }
  throw new Error('No valid character card data was found in this PNG.');
}

export async function parseCharacterFile(file: File): Promise<Partial<Character>> {
  const fallbackName = file.name.replace(/\\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Unnamed Character';
  if (file.name.toLowerCase().endsWith('.json')) {
    return normalizeCharacterCard(JSON.parse(await file.text()), fallbackName);
  }

  const { textChunks, base64Image } = await parsePngMetadata(file);
  const rawChara = Object.entries(textChunks).find(([key]) =>
    ['chara', 'ccv3', 'description', 'comment'].includes(key.toLowerCase())
  )?.[1];

  if (rawChara) {
    try {
      return normalizeCharacterCard(decodeCardPayload(rawChara), fallbackName, base64Image);
    } catch (error) {
      console.warn('Could not read embedded character card data:', error);
    }
  }

  return {
    name: fallbackName,
    avatar: base64Image,
    summary: 'PNG image imported as the character avatar. No embedded character card data was found.',
    description: '',
    personality: '',
    scenario: '',
    first_mes: 'Hello!',
    mes_example: '',
    tags: [],
    customFields: { importWarning: 'This PNG contains no readable character card metadata. Only its image was imported.' },
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
      nicknames: character.nicknames || [],
      age: character.age || '',
      ethnicity: character.ethnicity || '',
      birthday: character.birthday || '',
      birthYear: character.birthYear || '',
      zodiacSign: character.zodiacSign || '',
      avatar: character.avatar,
      height: character.height || '',
      bodyType: character.bodyType || '',
      scars: character.scars || [],
      birthmarks: character.birthmarks || [],
      tattoos: character.tattoos || [],
      hairColor: character.hairColor || '',
      eyeColor: character.eyeColor || '',
      voiceDescription: character.voiceDescription || '',
      voiceTags: character.voiceTags || [],
      backstory: character.backstory || '',
      spouse: character.spouse,
      familyMembers: character.familyMembers || [],
      pov: character.pov || 'third_person',
      description: character.description,
      personality: character.personality,
      scenario: character.scenario,
      first_mes: character.first_mes,
      mes_example: character.mes_example,
      creator_notes: character.creator_notes || 'Created with Pretty Little Fantasies',
      system_prompt: character.system_prompt || '',
      tags: character.tags,
      alternate_greetings: character.alternate_greetings || [],
      customFields: character.customFields || {},
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
