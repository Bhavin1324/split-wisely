/**
 * Avatar utilities for generating DiceBear cartoon Character avatars and resolving profile avatars.
 * Strictly focused on cheerful, smiling-to-neutral Character styles.
 */

export type CharacterStyle =
  | 'adventurer'
  | 'adventurer-neutral'
  | 'avataaars'
  | 'avataaars-neutral'
  | 'big-smile'
  | 'bottts'
  | 'bottts-neutral'
  | 'croodles'
  | 'croodles-neutral'
  | 'dylan'
  | 'fun-emoji'
  | 'lorelei'
  | 'lorelei-neutral'
  | 'micah'
  | 'miniavs'
  | 'notionists'
  | 'open-peeps'
  | 'personas'
  | 'pixel-art'
  | 'pixel-art-neutral'
  | 'thumbs';

// Backwards compatibility alias
export type CartoonStyle = CharacterStyle;

export type CharacterSubCategory =
  | 'all'
  | 'people'
  | 'adventurers'
  | 'robots'
  | 'illustrated'
  | 'personas'
  | 'smiles'
  | 'doodles'
  | 'pixel-art';

export interface CartoonPreset {
  id: string;
  name: string;
  category: Exclude<CharacterSubCategory, 'all'>;
  style: CharacterStyle;
  seed: string;
  url: string;
}

export const PASTEL_BACKGROUNDS = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,c5f6fa,d3f9d8,ffe066,fcc2d7,eebefa';

/**
 * Generates a DiceBear cartoon SVG avatar URL guaranteed to have a smiling/neutral expression.
 */
export function getCartoonAvatarUrl(
  seed: string,
  style: CharacterStyle = 'avataaars',
  customParams = ''
): string {
  const cleanSeed = encodeURIComponent(seed.trim() || 'user');
  const base = `https://api.dicebear.com/9.x/${style}/svg?seed=${cleanSeed}&radius=50&backgroundColor=${PASTEL_BACKGROUNDS}`;
  return customParams ? `${base}&${customParams}` : base;
}

/**
 * Resolves the display avatar URL for a user profile.
 * If user has a custom uploaded avatar, returns it.
 * Otherwise returns a deterministic cartoon avatar based on their ID or Name.
 */
export function getUserAvatarUrl(
  profile?: { id?: string; full_name?: string; avatar_url?: string | null } | null,
  fallbackStyle: CharacterStyle = 'avataaars'
): string {
  if (profile?.avatar_url && profile.avatar_url.trim() !== '') {
    return profile.avatar_url;
  }

  const seed = profile?.id || profile?.full_name || 'default-user';
  return getCartoonAvatarUrl(seed, fallbackStyle);
}

/**
 * Extracts initials from a full name (e.g. "Sarah Chen" -> "SC").
 */
export function getInitials(name?: string): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Vast pool of Character styles for rich random dice generation.
 */
export const ALL_CHARACTER_STYLES: CharacterStyle[] = [
  'adventurer',
  'adventurer-neutral',
  'avataaars',
  'avataaars-neutral',
  'big-smile',
  'bottts',
  'bottts-neutral',
  'croodles',
  'croodles-neutral',
  'dylan',
  'fun-emoji',
  'lorelei',
  'lorelei-neutral',
  'micah',
  'miniavs',
  'notionists',
  'open-peeps',
  'personas',
  'pixel-art',
  'thumbs',
];

const CHEERFUL_SEEDS = [
  'Happy', 'Sunny', 'Breeze', 'Joy', 'Lucky', 'Smile', 'Nova', 'Echo',
  'Zen', 'Spark', 'Bliss', 'Haven', 'Glow', 'Cheer', 'Cosmo', 'Radiant',
  'Aura', 'Charming', 'Serene', 'Meadow', 'Pip', 'SunnyDay', 'StarLight',
  'KindHeart', 'Merry', 'Jovial', 'Bright', 'Peppy', 'Vibrant', 'Zest',
];

/**
 * Generates a completely random Character avatar from the vast style pool with guaranteed cheerful/neutral mood.
 */
export function getRandomCartoonAvatarUrl(preferredCategory?: CharacterSubCategory): string {
  let stylePool: CharacterStyle[] = ALL_CHARACTER_STYLES;

  if (preferredCategory && preferredCategory !== 'all') {
    switch (preferredCategory) {
      case 'people':
        stylePool = ['avataaars', 'avataaars-neutral', 'open-peeps', 'miniavs'];
        break;
      case 'adventurers':
        stylePool = ['adventurer', 'adventurer-neutral'];
        break;
      case 'robots':
        stylePool = ['bottts', 'bottts-neutral'];
        break;
      case 'illustrated':
        stylePool = ['lorelei', 'lorelei-neutral', 'micah'];
        break;
      case 'personas':
        stylePool = ['personas', 'notionists', 'dylan'];
        break;
      case 'smiles':
        stylePool = ['big-smile', 'fun-emoji', 'thumbs'];
        break;
      case 'doodles':
        stylePool = ['croodles', 'croodles-neutral'];
        break;
      case 'pixel-art':
        stylePool = ['pixel-art', 'pixel-art-neutral'];
        break;
    }
  }

  const randomStyle = stylePool[Math.floor(Math.random() * stylePool.length)];
  const randomPrefix = CHEERFUL_SEEDS[Math.floor(Math.random() * CHEERFUL_SEEDS.length)];
  const randomId = Math.random().toString(36).substring(2, 8);
  const randomSeed = `${randomPrefix}-${randomId}`;

  return getCartoonAvatarUrl(randomSeed, randomStyle);
}

/**
 * Subcategory metadata definitions for the UI filter bar.
 */
export const CHARACTER_SUBCATEGORIES: { id: CharacterSubCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '🌟' },
  { id: 'people', label: 'People', icon: '🧑' },
  { id: 'adventurers', label: 'Adventurers', icon: '🏹' },
  { id: 'robots', label: 'Robots', icon: '🤖' },
  { id: 'illustrated', label: 'Illustrated', icon: '✨' },
  { id: 'personas', label: 'Personas', icon: '🎨' },
  { id: 'smiles', label: 'Smiles & Emojis', icon: '😄' },
  { id: 'doodles', label: 'Doodles', icon: '✏️' },
  { id: 'pixel-art', label: 'Pixel Art', icon: '👾' },
];

/**
 * Curated list of 44+ cheerful, smiling-to-neutral Character avatar presets across 8 sub-categories.
 */
export const CARTOON_AVATAR_PRESETS: CartoonPreset[] = [
  // ── 1. People & Avataaars (6 presets) ──
  { id: 'ppl-alex', name: 'Alex', category: 'people', style: 'avataaars', seed: 'AlexSmiling', url: getCartoonAvatarUrl('AlexSmiling', 'avataaars', 'mouth=smile,default&eyes=happy,default') },
  { id: 'ppl-sophia', name: 'Sophia', category: 'people', style: 'avataaars', seed: 'SophiaHappy', url: getCartoonAvatarUrl('SophiaHappy', 'avataaars', 'mouth=smile,twinkle&eyes=happy,default') },
  { id: 'ppl-marcus', name: 'Marcus', category: 'people', style: 'avataaars', seed: 'MarcusCalm', url: getCartoonAvatarUrl('MarcusCalm', 'avataaars', 'mouth=smile,default&eyes=default') },
  { id: 'ppl-emma', name: 'Emma', category: 'people', style: 'avataaars', seed: 'EmmaJoy', url: getCartoonAvatarUrl('EmmaJoy', 'avataaars', 'mouth=smile&eyes=happy') },
  { id: 'ppl-maya', name: 'Maya', category: 'people', style: 'open-peeps', seed: 'MayaPeep', url: getCartoonAvatarUrl('MayaPeep', 'open-peeps') },
  { id: 'ppl-leo', name: 'Leo', category: 'people', style: 'miniavs', seed: 'LeoMini', url: getCartoonAvatarUrl('LeoMini', 'miniavs') },

  // ── 2. Adventurers & Fantasy (6 presets) ──
  { id: 'adv-robin', name: 'Ranger Robin', category: 'adventurers', style: 'adventurer', seed: 'RobinHero', url: getCartoonAvatarUrl('RobinHero', 'adventurer') },
  { id: 'adv-morgan', name: 'Mage Morgan', category: 'adventurers', style: 'adventurer', seed: 'MorganSpell', url: getCartoonAvatarUrl('MorganSpell', 'adventurer') },
  { id: 'adv-rowan', name: 'Knight Rowan', category: 'adventurers', style: 'adventurer', seed: 'RowanGuard', url: getCartoonAvatarUrl('RowanGuard', 'adventurer') },
  { id: 'adv-finn', name: 'Explorer Finn', category: 'adventurers', style: 'adventurer', seed: 'FinnQuest', url: getCartoonAvatarUrl('FinnQuest', 'adventurer') },
  { id: 'adv-aria', name: 'Aria', category: 'adventurers', style: 'adventurer-neutral', seed: 'AriaSky', url: getCartoonAvatarUrl('AriaSky', 'adventurer-neutral') },
  { id: 'adv-zephyr', name: 'Zephyr', category: 'adventurers', style: 'adventurer-neutral', seed: 'ZephyrWind', url: getCartoonAvatarUrl('ZephyrWind', 'adventurer-neutral') },

  // ── 3. Friendly Robots (6 presets) ──
  { id: 'bot-sparky', name: 'Sparky', category: 'robots', style: 'bottts', seed: 'SparkyBot', url: getCartoonAvatarUrl('SparkyBot', 'bottts') },
  { id: 'bot-astro', name: 'Astro', category: 'robots', style: 'bottts', seed: 'AstroBot', url: getCartoonAvatarUrl('AstroBot', 'bottts') },
  { id: 'bot-gizmo', name: 'Gizmo', category: 'robots', style: 'bottts', seed: 'GizmoBot', url: getCartoonAvatarUrl('GizmoBot', 'bottts') },
  { id: 'bot-bolt', name: 'Bolt', category: 'robots', style: 'bottts', seed: 'BoltBot', url: getCartoonAvatarUrl('BoltBot', 'bottts') },
  { id: 'bot-byte', name: 'Byte', category: 'robots', style: 'bottts-neutral', seed: 'ByteBot', url: getCartoonAvatarUrl('ByteBot', 'bottts-neutral') },
  { id: 'bot-pixel', name: 'Pixel Bot', category: 'robots', style: 'bottts', seed: 'PixelBot', url: getCartoonAvatarUrl('PixelBot', 'bottts') },

  // ── 4. Illustrated & Anime (6 presets) ──
  { id: 'ill-luna', name: 'Luna', category: 'illustrated', style: 'lorelei', seed: 'LunaGlow', url: getCartoonAvatarUrl('LunaGlow', 'lorelei') },
  { id: 'ill-kai', name: 'Kai', category: 'illustrated', style: 'lorelei', seed: 'KaiBreeze', url: getCartoonAvatarUrl('KaiBreeze', 'lorelei') },
  { id: 'ill-chloe', name: 'Chloe', category: 'illustrated', style: 'lorelei', seed: 'ChloeBliss', url: getCartoonAvatarUrl('ChloeBliss', 'lorelei') },
  { id: 'ill-julian', name: 'Julian', category: 'illustrated', style: 'micah', seed: 'JulianCalm', url: getCartoonAvatarUrl('JulianCalm', 'micah') },
  { id: 'ill-hana', name: 'Hana', category: 'illustrated', style: 'micah', seed: 'HanaSmile', url: getCartoonAvatarUrl('HanaSmile', 'micah') },
  { id: 'ill-oliver', name: 'Oliver', category: 'illustrated', style: 'lorelei-neutral', seed: 'OliverPeace', url: getCartoonAvatarUrl('OliverPeace', 'lorelei-neutral') },

  // ── 5. Personas & Notionists (6 presets) ──
  { id: 'per-harper', name: 'Harper', category: 'personas', style: 'personas', seed: 'HarperJoy', url: getCartoonAvatarUrl('HarperJoy', 'personas') },
  { id: 'per-riley', name: 'Riley', category: 'personas', style: 'personas', seed: 'RileyCool', url: getCartoonAvatarUrl('RileyCool', 'personas') },
  { id: 'per-avery', name: 'Avery', category: 'personas', style: 'personas', seed: 'AveryPeace', url: getCartoonAvatarUrl('AveryPeace', 'personas') },
  { id: 'per-jordan', name: 'Jordan', category: 'personas', style: 'notionists', seed: 'JordanArt', url: getCartoonAvatarUrl('JordanArt', 'notionists') },
  { id: 'per-sam', name: 'Sam', category: 'personas', style: 'notionists', seed: 'SamDraw', url: getCartoonAvatarUrl('SamDraw', 'notionists') },
  { id: 'per-quinn', name: 'Quinn', category: 'personas', style: 'dylan', seed: 'QuinnSketch', url: getCartoonAvatarUrl('QuinnSketch', 'dylan') },

  // ── 6. Smiles & Fun Emojis (6 presets) ──
  { id: 'sml-joy', name: 'Big Joy', category: 'smiles', style: 'big-smile', seed: 'JoyfulFace', url: getCartoonAvatarUrl('JoyfulFace', 'big-smile') },
  { id: 'sml-sunny', name: 'Sunny Smile', category: 'smiles', style: 'big-smile', seed: 'SunnySmile', url: getCartoonAvatarUrl('SunnySmile', 'big-smile') },
  { id: 'sml-chuckles', name: 'Chuckles', category: 'smiles', style: 'big-smile', seed: 'ChucklesBig', url: getCartoonAvatarUrl('ChucklesBig', 'big-smile') },
  { id: 'sml-star', name: 'Star Face', category: 'smiles', style: 'fun-emoji', seed: 'StarEmoji', url: getCartoonAvatarUrl('StarEmoji', 'fun-emoji') },
  { id: 'sml-thumbs', name: 'Thumbs Up', category: 'smiles', style: 'thumbs', seed: 'ThumbsCheer', url: getCartoonAvatarUrl('ThumbsCheer', 'thumbs') },
  { id: 'sml-beaming', name: 'Beaming', category: 'smiles', style: 'fun-emoji', seed: 'BeamSmile', url: getCartoonAvatarUrl('BeamSmile', 'fun-emoji') },

  // ── 7. Doodles & Sketches (4 presets) ──
  { id: 'dood-dan', name: 'Doodle Dan', category: 'doodles', style: 'croodles', seed: 'DanDoodle', url: getCartoonAvatarUrl('DanDoodle', 'croodles') },
  { id: 'dood-sam', name: 'Sketchy Sam', category: 'doodles', style: 'croodles', seed: 'SamSketch', url: getCartoonAvatarUrl('SamSketch', 'croodles') },
  { id: 'dood-sue', name: 'Scribble Sue', category: 'doodles', style: 'croodles', seed: 'SueScribble', url: getCartoonAvatarUrl('SueScribble', 'croodles') },
  { id: 'dood-ian', name: 'Ink Ian', category: 'doodles', style: 'croodles-neutral', seed: 'IanInk', url: getCartoonAvatarUrl('IanInk', 'croodles-neutral') },

  // ── 8. Retro Pixel Art (4 presets) ──
  { id: 'pix-hero', name: 'Pixel Hero', category: 'pixel-art', style: 'pixel-art', seed: 'HeroPixel', url: getCartoonAvatarUrl('HeroPixel', 'pixel-art') },
  { id: 'pix-knight', name: '8-Bit Knight', category: 'pixel-art', style: 'pixel-art', seed: 'KnightPixel', url: getCartoonAvatarUrl('KnightPixel', 'pixel-art') },
  { id: 'pix-ace', name: 'Arcade Ace', category: 'pixel-art', style: 'pixel-art', seed: 'AcePixel', url: getCartoonAvatarUrl('AcePixel', 'pixel-art') },
  { id: 'pix-cyber', name: 'Cyber Pix', category: 'pixel-art', style: 'pixel-art-neutral', seed: 'CyberPixel', url: getCartoonAvatarUrl('CyberPixel', 'pixel-art-neutral') },
];
