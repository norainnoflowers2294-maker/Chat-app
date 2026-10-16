import { describe, it, expect, beforeAll } from 'bun:test';
import { parsePngMetadata } from './pngParser';

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
