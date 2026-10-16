import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { resolveImageUrl } from './imageUrl';

describe('resolveImageUrl', () => {
  let originalBaseUrl: string | undefined;

  beforeEach(() => {
    originalBaseUrl = process.env.BASE_URL;
    process.env.BASE_URL = '/test-base/';
  });

  afterEach(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.BASE_URL;
    } else {
      process.env.BASE_URL = originalBaseUrl;
    }
  });

  it('should return undefined for undefined source', () => {
    expect(resolveImageUrl(undefined)).toBeUndefined();
  });

  it('should return undefined for null source', () => {
    expect(resolveImageUrl(null)).toBeUndefined();
  });

  it('should return undefined for empty string source', () => {
    expect(resolveImageUrl('')).toBeUndefined();
  });

  it('should resolve exact bundled image name', () => {
    expect(resolveImageUrl('colorpop_hero.jpg')).toBe('/test-base/colorpop_hero.jpg');
    expect(resolveImageUrl('lucious.jpg')).toBe('/test-base/lucious.jpg');
    expect(resolveImageUrl('mansion.jpg')).toBe('/test-base/mansion.jpg');
    expect(resolveImageUrl('penthouse.jpg')).toBe('/test-base/penthouse.jpg');
    expect(resolveImageUrl('roadtrip.jpg')).toBe('/test-base/roadtrip.jpg');
  });

  it('should resolve bundled image with leading slash', () => {
    expect(resolveImageUrl('/colorpop_hero.jpg')).toBe('/test-base/colorpop_hero.jpg');
  });

  it('should resolve bundled image with leading dot-slash', () => {
    expect(resolveImageUrl('./lucious.jpg')).toBe('/test-base/lucious.jpg');
  });

  it('should leave unknown local image unchanged', () => {
    expect(resolveImageUrl('unknown.jpg')).toBe('unknown.jpg');
  });

  it('should leave unknown local image with dot-slash unchanged', () => {
    expect(resolveImageUrl('./unknown.jpg')).toBe('./unknown.jpg');
  });

  it('should leave external URL unchanged', () => {
    expect(resolveImageUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
  });

  it('should leave data URL unchanged', () => {
    expect(resolveImageUrl('data:image/png;base64,iVBORw0K')).toBe('data:image/png;base64,iVBORw0K');
  });

  it('should leave blob URL unchanged', () => {
    expect(resolveImageUrl('blob:http://localhost/123')).toBe('blob:http://localhost/123');
  });
});
