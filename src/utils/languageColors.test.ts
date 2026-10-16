import { describe, it, expect, setSystemTime } from 'bun:test';
import { getLanguageColor, formatRelativeTime } from './languageColors';

describe('getLanguageColor', () => {
  it('should return default color for null', () => {
    expect(getLanguageColor(null)).toBe('#8b949e');
  });

  it('should return default color for empty string', () => {
    expect(getLanguageColor('')).toBe('#8b949e');
  });

  it('should return specific color for known languages', () => {
    expect(getLanguageColor('TypeScript')).toBe('#3178c6');
    expect(getLanguageColor('JavaScript')).toBe('#f1e05a');
    expect(getLanguageColor('Python')).toBe('#3572A5');
  });

  it('should return fallback color for unknown languages', () => {
    expect(getLanguageColor('UnknownLanguage')).toBe('#8b949e');
  });
});

describe('formatRelativeTime', () => {
  const baseTime = new Date('2023-01-01T12:00:00Z');

  it('should return original string for invalid date', () => {
    expect(formatRelativeTime('invalid-date')).toBe('invalid-date');
  });

  it('should return "just now" for times under 1 minute', () => {
    setSystemTime(baseTime);
    const date = new Date(baseTime.getTime() - 30 * 1000); // 30 seconds ago
    expect(formatRelativeTime(date.toISOString())).toBe('just now');
    setSystemTime(); // reset
  });

  it('should format minutes correctly', () => {
    setSystemTime(baseTime);
    const date = new Date(baseTime.getTime() - 5 * 60 * 1000); // 5 minutes ago
    expect(formatRelativeTime(date.toISOString())).toBe('5m ago');
    setSystemTime();
  });

  it('should format hours correctly', () => {
    setSystemTime(baseTime);
    const date = new Date(baseTime.getTime() - 3 * 3600 * 1000); // 3 hours ago
    expect(formatRelativeTime(date.toISOString())).toBe('3h ago');
    setSystemTime();
  });

  it('should format days correctly', () => {
    setSystemTime(baseTime);
    const date = new Date(baseTime.getTime() - 4 * 86400 * 1000); // 4 days ago
    expect(formatRelativeTime(date.toISOString())).toBe('4d ago');
    setSystemTime();
  });

  it('should format weeks correctly', () => {
    setSystemTime(baseTime);
    const date = new Date(baseTime.getTime() - 2 * 604800 * 1000); // 2 weeks ago
    expect(formatRelativeTime(date.toISOString())).toBe('2w ago');
    setSystemTime();
  });

  it('should fallback to locale date string for times over 30 days', () => {
    setSystemTime(baseTime);
    const date = new Date(baseTime.getTime() - 40 * 86400 * 1000); // 40 days ago

    // Check if it formats properly
    const expected = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    expect(formatRelativeTime(date.toISOString())).toBe(expected);
    setSystemTime();
  });
});
