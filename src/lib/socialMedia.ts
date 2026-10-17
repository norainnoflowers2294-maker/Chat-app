export interface SocialProfile {
  id: string;
  name: string;
  bio: string;
  relationship?: string;
  avatar?: string;
}

export interface SocialPost {
  id: string;
  profileId: string;
  text: string;
  createdAt: string;
  likes: number;
  likedByUser?: boolean;
}

export interface SocialMediaWorld {
  profiles: SocialProfile[];
  posts: SocialPost[];
}

export const DEFAULT_SOCIAL_WORLD: SocialMediaWorld = {
  profiles: [
    { id: 'lucious', name: 'Lucious', relationship: 'The brothers’ oldest', bio: 'Private life, public reputation. I decide what people get to know.' },
    { id: 'emmy', name: 'Emmy', relationship: 'The center of her own story', bio: 'Family, friends, and a life on my own terms.' },
    { id: 'vic', name: 'Vic', relationship: 'Lucious’ brother', bio: 'Family comes first. Everything else can wait.' },
    { id: 'abel', name: 'Abel', relationship: 'Lucious’ brother', bio: 'Keeping it simple. Keeping my people close.' },
    { id: 'reese', name: 'Reese', relationship: 'Lucious’ brother', bio: 'The youngest brother. Usually the one asking what the plan is.' },
    { id: 'ryker', name: 'Ryker', relationship: 'Lucious’ cousin', bio: 'If my people need me, I’m already on my way.' },
    { id: 'kaylynn', name: 'Kaylynn', relationship: 'Emmy’s sister', bio: 'Sister first. Always in your corner.' },
    { id: 'asha', name: 'Asha', relationship: 'Emmy’s friend', bio: 'Good friends, good music, and taking way too many pictures.' },
    { id: 'bri', name: 'Bri', relationship: 'Emmy’s friend', bio: 'Here for the memories and the group chat updates.' },
    { id: 'kyla', name: 'Kyla', relationship: 'Lucious’ ex', bio: 'Some chapters are harder to close than others.' },
    { id: 'luca', name: 'Luca', bio: 'I know a guy. Usually.' },
    { id: 'kyle', name: 'Kyle', bio: 'Keeping my circle small and my plans flexible.' },
    { id: 'matt', name: 'Matt', bio: 'Work hard, show up for your people, repeat.' },
    { id: 'val', name: 'Val', relationship: 'Lucious’ ex', bio: 'I know my worth. I’m learning to act like it.' },
  ],
  posts: [
    { id: 'seed_lucious', profileId: 'lucious', text: 'Quiet night. That’s all I’m saying.', createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), likes: 12 },
    { id: 'seed_emmy', profileId: 'emmy', text: 'A day for me and my girls. Phone on DND after this.', createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(), likes: 24 },
    { id: 'seed_vic', profileId: 'vic', text: 'Family dinner. Everybody showed up for once.', createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(), likes: 9 },
    { id: 'seed_kaylynn', profileId: 'kaylynn', text: 'Sister time is the best time. No debate.', createdAt: new Date(Date.now() - 1000 * 60 * 130).toISOString(), likes: 17 },
    { id: 'seed_asha', profileId: 'asha', text: 'I have the pictures. And yes, everybody looks good.', createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), likes: 11 },
    { id: 'seed_kyla', profileId: 'kyla', text: 'Some people really think the past stays in the past.', createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(), likes: 6 },
  ],
};

export function formatSocialWorldContext(world: SocialMediaWorld): string {
  const profiles = world.profiles.map((profile) => `@${profile.id} — ${profile.name}: ${profile.bio}`).join('
');
  const latestPosts = [...world.posts]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 12)
    .map((post) => {
      const profile = world.profiles.find((item) => item.id === post.profileId);
      return `@${post.profileId} (${profile?.name || 'Unknown'}): "${post.text}"`;
    })
    .join('
');
  return [
    '[SOCIAL MEDIA WORLD — ATTACHED BY USER]',
    'This is a separate fictional social network. Only use it as background when the user has explicitly enabled social media for this chat. Posts are independent events; do not force them into the current scene or assume every character has seen every post. Never write posts or actions for {{user}}.',
    'Profiles:',
    profiles || 'No profiles yet.',
    'Recent posts:',
    latestPosts || 'No posts yet.',
  ].join('
');
}
