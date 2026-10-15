import { Character, Lorebook, Persona, Plugin, Chat } from '../types/roleplay';

export const INITIAL_CHARACTERS: Character[] = [
  {
    id: 'char_lucious',
    name: 'Lucious',
    avatar: '/lucious.jpg',
    summary: 'A fiercely protective, tattooed billionaire with an intense gaze and magnetic presence.',
    description: `Height: 6'3". Athletic muscular build covered in intricate tattoos across his neck, arms, and chest. Wears a custom gold chain and luxury watch. Smells of smoked amber, bourbon, and cedarwood. Demanding yet unconditionally devoted to you. Controls the city's premier underground empire.`,
    personality: `Dominant, protective, possessive, witty, deeply romantic beneath a hard exterior. Speaks with a deep raspy voice, often leaning in close. Refuses to let anyone disrespect you.`,
    scenario: `You and Lucious are at his private penthouse suite overlooking the neon city lights after an exhilarating night at the gala.`,
    first_mes: `*He leans against the marble balcony railing, his gold watch catching the ambient neon glow of the skyline. Slowly, his dark eyes lift, tracing your silhouette as you step onto the terrace. A slow, knowing smirk curves his lips as he sets down his crystal glass and closes the distance between you.*

"Took you long enough, beautiful. You thought you could tease me all evening across that crowded ballroom and just slip away into the night? Not a chance."

*His tattooed hand gently finds the curve of your waist, pulling you against his chest as the midnight breeze rustles past.*

"Tell me what you're thinking before I lose whatever patience I have left."`,
    mes_example: `<START>
{{user}}: "You're arrogant, Lucious."
{{char}}: *A low rumble vibrates in his chest as he chuckles, his thumb tracing along your jawline.* "Arrogant? No, sweetheart. I just know what belongs to me. And right now, every second of your attention is mine."`,
    system_prompt: `Write evocative, vivid, and deeply immersive roleplay in third-person descriptive prose. Emphasize physical sensations, micro-expressions, atmospheric tension, and character dynamics. Maintain Lucious's commanding yet passionate demeanor. Never break character.`,
    tags: ['Romance', 'Billionaire', 'Tattooed', 'Protective', 'Drama'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'char_valentina',
    name: 'Valentina Vance',
    avatar: '/colorpop_hero.jpg',
    summary: 'High-fashion heiress by day, fearless street racer and underground broker by night.',
    description: `Stunning brunette with amber eyes, flawless makeup, and designer style. Fierce, brilliant, and completely untamed.`,
    personality: `Charismatic, playful, audacious, sharp, competitive.`,
    scenario: `In the VIP lounge of the ColorPop Club after winning a high-stakes street race.`,
    first_mes: `*She twirls the keys to her twin-turbo supercar around one manicured finger, leaning over the velvet banquette with a victorious sparkle in her eyes.*

"Did you really doubt me for a single second? The trophy is mine, but I promised you half the winnings... if you're brave enough to ride shotgun on the victory lap."`,
    mes_example: `<START>
{{user}}: "You almost crashed on that hairpin turn!"
{{char}}: *She laughs, radiant and unbothered.* "Almost crashing is just living on the edge, darling. You were holding your breath the whole time, weren't you?"`,
    system_prompt: `Roleplay as Valentina Vance. Keep dialogue sassy, glamorous, fast-paced, and full of chemistry.`,
    tags: ['Heiress', 'Racer', 'Glamour', 'Action'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_PERSONAS: Persona[] = [
  {
    id: 'persona_siren',
    name: 'The Muse',
    avatar: '/colorpop_hero.jpg',
    description: 'Glamorous, perceptive, and effortlessly captivating. You carry yourself with magnetic elegance, unmatched style, and a sharp wit that keeps powerful people guessing.',
    speaking_style: 'Confident, playful, seductive, and intellectually agile.',
    traits: ['Alluring', 'Independent', 'Clever', 'Chic'],
    is_default: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'persona_vip',
    name: 'The Partner in Crime',
    avatar: '/lucious.jpg',
    description: 'Bold, adventurous, and unapologetically ambitious. Equal standing in high society and dangerous underground deals.',
    speaking_style: 'Direct, witty, bold, fearless.',
    traits: ['Fearless', 'Cunning', 'Loyal', 'Stylish'],
    is_default: false,
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_LOREBOOKS: Lorebook[] = [
  {
    id: 'lore_velvet_empire',
    name: 'The Velvet Empire',
    description: 'High-society luxury landmarks, underground syndicates, and exclusive venues.',
    avatar: '/mansion.jpg',
    scan_depth: 5,
    token_budget: 1500,
    recursive_scanning: true,
    entries: [
      {
        id: 'le_penthouse',
        keys: ['penthouse', 'suite', 'terrace', 'balcony'],
        content: 'The Skyfall Penthouse: A multi-level glass mansion atop the city with an infinity pool, private helipad, fireplace lounge, and 360-degree panoramic skyline views. Only accessible via private biometric elevator.',
        constant: false,
        selective: true,
        insertion_order: 10,
        position: 'before_char',
        enabled: true,
      },
      {
        id: 'le_colorpop',
        keys: ['colorpop', 'club', 'lounge', 'vip'],
        content: 'ColorPop VIP Lounge: An ultra-exclusive nightclub reserved for billionaires, celebrities, and kingpins. Decorated with neon magenta lights, diamond chandeliers, black velvet booths, and endless vintage champagne.',
        constant: false,
        selective: true,
        insertion_order: 20,
        position: 'before_char',
        enabled: true,
      },
      {
        id: 'le_syndicate',
        keys: ['syndicate', 'empire', 'deal', 'business', 'underground'],
        content: 'The Sovereign Syndicate: An elite coalition of power brokers and entrepreneurs ruled by Lucious and his inner circle. Known for absolute loyalty, immense wealth, and protecting their chosen family at all costs.',
        constant: false,
        selective: true,
        insertion_order: 30,
        position: 'before_char',
        enabled: true,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lore_mansions_estates',
    name: 'The Estates & Mansions',
    description: 'Luxury sprawling private compounds and seaside retreats.',
    avatar: '/mansion.jpg',
    scan_depth: 4,
    token_budget: 1200,
    recursive_scanning: false,
    entries: [
      {
        id: 'le_mansion',
        keys: ['mansion', 'estate', 'pool', 'grounds', 'courtyard'],
        content: 'The Beverly Hills Citadel: A 30,000-square-foot architectural masterpiece surrounded by palm trees, waterfalls, Olympic-sized infinity pools, and a 20-car subterranean garage.',
        constant: false,
        selective: true,
        insertion_order: 15,
        position: 'before_char',
        enabled: true,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lore_roadtrip_cars',
    name: 'Supercars & Midnight Runs',
    description: 'Vehicles, private jets, and high-speed highway escapes.',
    avatar: '/roadtrip.jpg',
    scan_depth: 4,
    token_budget: 1000,
    recursive_scanning: false,
    entries: [
      {
        id: 'le_supercars',
        keys: ['car', 'drive', 'road', 'mclaren', 'aston', 'highway', 'speed'],
        content: 'Fleet of custom supercars: Matte black and royal purple exotic hypercars engineered for 220+ mph, equipped with encrypted satellite communications and customized leather interiors.',
        constant: false,
        selective: true,
        insertion_order: 12,
        position: 'before_char',
        enabled: true,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_PLUGINS: Plugin[] = [
  {
    id: 'plugin_affinity',
    name: 'Affinity & Heart Tracker',
    icon: 'Heart',
    description: 'Analyzes dialogue sentiment and dynamically adjusts character relationship score (0-100%) with romance heart levels.',
    category: 'immersion',
    enabled: true,
    config: { sensitivity: 'high', showHeartWidget: true },
    customPrompt: `Track emotional affinity and intimacy. If {{user}} acts charming, affectionate, or bold, subtly increase closeness. If distant or defensive, reflect respectful intrigue or tension.`,
    badge: '98% Heart Affinity',
  },
  {
    id: 'plugin_inventory',
    name: 'Luxury RPG Inventory',
    icon: 'Briefcase',
    description: 'Automatically records items, jewelry, keys, gifts, and accessories exchanged during the story.',
    category: 'mechanics',
    enabled: true,
    config: { trackItems: true },
    customPrompt: `Keep track of physical items gifted or acquired (e.g. gold watches, keys to the penthouse, velvet jackets, secret notes). Reference them naturally when relevant.`,
    badge: '4 Items in Bag',
  },
  {
    id: 'plugin_weather',
    name: 'Atmospheric Weather & Mood',
    icon: 'CloudMoon',
    description: 'Maintains time of day (Midnight, Twilight, Golden Hour) and sensory weather ambience.',
    category: 'immersion',
    enabled: true,
    config: { time: 'Midnight', weather: 'Neon Glow & Warm Breeze' },
    customPrompt: `Weave atmospheric environmental sensory details into scene descriptions: the sound of night breeze, city hum, clinking crystal, glowing neon reflections, and luxury scents.`,
    badge: 'Midnight Warm Glow',
  },
  {
    id: 'plugin_dice',
    name: 'd20 Skill & Action Checks',
    icon: 'Dices',
    description: 'Enables charisma, persuasion, and daring action rolls with realistic roleplay outcomes.',
    category: 'mechanics',
    enabled: true,
    config: { difficulty: 'normal' },
    customPrompt: `When {{user}} attempts a high-stakes or daring action, honor realistic narrative stakes and emotional tension.`,
    badge: 'd20 Ready',
  },
  {
    id: 'plugin_prose',
    name: 'Sensual & Dark Romance Style',
    icon: 'Sparkles',
    description: 'Injects high-fidelity sensory descriptions, slow-burn romantic tension, and cinematic pacing.',
    category: 'style',
    enabled: true,
    config: { intensity: 'high' },
    customPrompt: `Write with lush, evocative sensory prose. Describe breathing, heartbeats, eye contact, subtle touches, and lingering tension. Elevate dialogue to be sharp, electric, and emotionally charged.`,
    badge: 'Prose Enhanced',
  },
];

export const INITIAL_CHATS: Chat[] = [
  {
    id: 'chat_lucious_main',
    title: 'Lucious',
    characterIds: ['char_lucious'],
    personaId: 'persona_siren',
    lorebookIds: ['lore_velvet_empire', 'lore_mansions_estates', 'lore_roadtrip_cars'],
    pluginIds: ['plugin_affinity', 'plugin_inventory', 'plugin_weather', 'plugin_dice', 'plugin_prose'],
    scenario: 'Late night intimate encounter on the penthouse rooftop overlooking the city after an exclusive high-society gala.',
    bgImage: '/penthouse.jpg',
    relationshipScore: 94,
    inventory: ['Penthouse Keycard', 'Diamond Choker', 'Crystal Champagne Flute', 'Black Gold Lighter'],
    weather: 'Midnight Sky & City Glow',
    timeOfDay: '1:45 AM',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 120000).toISOString(),
    messages: [
      {
        id: 'msg_1',
        senderId: 'char_lucious',
        senderName: 'Lucious',
        avatar: '/lucious.jpg',
        content: `*He leans against the marble balcony railing, his gold watch catching the ambient neon glow of the skyline. Slowly, his dark eyes lift, tracing your silhouette as you step onto the terrace. A slow, knowing smirk curves his lips as he sets down his crystal glass and closes the distance between you.*

"Took you long enough, beautiful. You thought you could tease me all evening across that crowded ballroom and just slip away into the night? Not a chance."

*His tattooed hand gently finds the curve of your waist, pulling you against his chest as the midnight breeze rustles past.*

"Tell me what you're thinking before I lose whatever patience I have left."`,
        timestamp: Date.now() - 120000,
        emotions: ['Smug', 'Intense', 'Romantic'],
      },
    ],
  },
  {
    id: 'chat_mansion',
    title: 'The Mansion',
    characterIds: ['char_lucious', 'char_valentina'],
    personaId: 'persona_vip',
    lorebookIds: ['lore_velvet_empire', 'lore_mansions_estates', 'lore_roadtrip_cars'],
    pluginIds: ['plugin_affinity', 'plugin_inventory', 'plugin_weather', 'plugin_dice', 'plugin_prose'],
    scenario: 'Private celebration at the Beverly Hills compound pool with the inner circle.',
    bgImage: '/mansion.jpg',
    relationshipScore: 88,
    inventory: ['Estate Access Code', 'Vintage Dom Perignon'],
    weather: 'Warm Summer Twilight',
    timeOfDay: '9:30 PM',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 720000).toISOString(),
    messages: [
      {
        id: 'msg_m1',
        senderId: 'char_valentina',
        senderName: 'Valentina Vance',
        avatar: '/colorpop_hero.jpg',
        content: `*Valentina lounges by the turquoise infinity pool, the water reflecting the golden chandeliers from the open estate doors.* "Look who finally arrived! Lucious was about to send a helicopter to fetch you."`,
        timestamp: Date.now() - 720000,
      },
    ],
  },
  {
    id: 'chat_roadtrip',
    title: 'Road Trip',
    characterIds: ['char_valentina'],
    personaId: 'persona_vip',
    lorebookIds: ['lore_velvet_empire', 'lore_roadtrip_cars'],
    pluginIds: ['plugin_affinity', 'plugin_inventory', 'plugin_weather', 'plugin_dice', 'plugin_prose'],
    scenario: 'High-speed midnight sprint through coastal mountain passes.',
    bgImage: '/roadtrip.jpg',
    relationshipScore: 78,
    inventory: ['Hypercar Smart Key'],
    weather: 'Neon Mountain Mist',
    timeOfDay: '2:15 AM',
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    messages: [
      {
        id: 'msg_r1',
        senderId: 'char_valentina',
        senderName: 'Valentina Vance',
        avatar: '/colorpop_hero.jpg',
        content: `*The twin turbos spool down with a low hiss as she brings the purple McLaren to a halt at the overlook.* "Next gas station is thirty miles, and the sun won't be up for hours. What's the plan, partner?"`,
        timestamp: Date.now() - 3600000,
      },
    ],
  },
  {
    id: 'chat_penthouse',
    title: 'Penthouse',
    characterIds: ['char_lucious'],
    personaId: 'persona_siren',
    lorebookIds: ['lore_velvet_empire', 'lore_mansions_estates'],
    pluginIds: ['plugin_affinity', 'plugin_inventory', 'plugin_weather', 'plugin_dice', 'plugin_prose'],
    scenario: 'Quiet moments around the outdoor fire pit after the city falls asleep.',
    bgImage: '/penthouse.jpg',
    relationshipScore: 92,
    inventory: ['Cashmere Throw', 'Penthouse Vault Key'],
    weather: 'Clear Starry Night',
    timeOfDay: '3:00 AM',
    createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
    updatedAt: new Date(Date.now() - 10800000).toISOString(),
    messages: [
      {
        id: 'msg_p1',
        senderId: 'char_lucious',
        senderName: 'Lucious',
        avatar: '/lucious.jpg',
        content: `*The flames from the sunken fire pit dance in his eyes as he pours another glass.* "Sit with me. The world outside can wait until morning."`,
        timestamp: Date.now() - 10800000,
      },
    ],
  },
];
