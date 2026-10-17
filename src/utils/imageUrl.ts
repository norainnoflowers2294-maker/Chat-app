// Resolve bundled pictures at the deployed app base, including paths in saved chats.
// Uploaded data URLs, blob URLs, and external image URLs must stay unchanged.
const bundledImages = new Set([
  'colorpop_hero.jpg', 'lucious.jpg', 'mansion.jpg', 'penthouse.jpg', 'roadtrip.jpg',
]);

export function resolveImageUrl(source: string | undefined | null): string | undefined {
  if (!source) return undefined;
  if (/^(?:data:|blob:|https?:|\/\/)/i.test(source)) return source;

  const filename = source.replace(/^\.?\//, '');
  // Character portraits and other files in public/ use root-relative paths.
  // Prefix those with Vite's base URL so they work under GitHub Pages' /Chat-app/ path.
  if (source.startsWith('/') || bundledImages.has(filename)) {
    return `${import.meta.env.BASE_URL}${filename}`;
  }
  return source;
}
