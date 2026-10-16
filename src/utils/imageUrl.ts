// Resolve bundled pictures at the deployed app base, including paths in saved chats.
// Uploaded data URLs, blob URLs, and external image URLs must stay unchanged.
const bundledImages = new Set([
  'colorpop_hero.jpg', 'lucious.jpg', 'mansion.jpg', 'penthouse.jpg', 'roadtrip.jpg',
]);

export function resolveImageUrl(source: string | undefined | null): string | undefined {
  if (!source) return undefined;
  const filename = source.replace(/^\.?\//, '');
  if (bundledImages.has(filename)) {
    return `${import.meta.env.BASE_URL}${filename}`;
  }
  return source;
}
