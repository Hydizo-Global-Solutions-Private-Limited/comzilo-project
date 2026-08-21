/* eslint-disable @typescript-eslint/no-explicit-any */
import { CanvasElement } from './LumiseProductDesigner';

export interface ImagePlaceholderConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  fit: 'contain' | 'cover';
  filter?: string;
  border?: string;
  borderRadius?: number;
  boxShadow?: string;
  aspectRatio?: number;
}

export interface SafePrintAreaConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SmartPodTemplate {
  id: string;
  name: string;
  category: 't-shirts' | 'phone-covers' | 'coffee-mugs';
  code: string;
  desc: string;
  badge: string;
  thumbnailUrl: string;
  artworkUrl: string;
  defaultFont: string;
  defaultTextColor: string;
  safePrintArea: SafePrintAreaConfig;
  imagePlaceholder?: ImagePlaceholderConfig;
  defaultLayers: CanvasElement[];
}

export const SMART_POD_TEMPLATES: SmartPodTemplate[] = [
  // ==========================================
  // APPAREL & T-SHIRT DEDICATED TEMPLATES (1-10)
  // ==========================================

  // 1. MINIMAL
  {
    id: 'minimal',
    name: 'Minimal',
    category: 't-shirts',
    code: 'SMART-MIN-01',
    desc: '"We Are All In This Together" cursive script typography & heart icon',
    badge: 'POPULAR',
    thumbnailUrl: '/pod/pod_tmpl_minimal.png',
    artworkUrl: '/pod/pod_tmpl_minimal.png',
    defaultFont: 'Montserrat',
    defaultTextColor: '#0F172A',
    safePrintArea: { x: 135, y: 105, width: 210, height: 290 },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'Minimal Print Artwork',
        x: 153,
        y: 155,
        width: 175,
        height: 140,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_minimal.png',
      },
    ],
  },

  // 2. TYPOGRAPHY
  {
    id: 'typography',
    name: 'Typography',
    category: 't-shirts',
    code: 'SMART-TYPO-02',
    desc: 'Black & Cyan Blue Wild Wolf with "Eyes of the Wilderness" arch typography',
    badge: 'TRENDING',
    thumbnailUrl: '/pod/pod_tmpl_typography.png',
    artworkUrl: '/pod/pod_tmpl_typography.png',
    defaultFont: 'Bebas Neue',
    defaultTextColor: '#0284C7',
    safePrintArea: { x: 135, y: 105, width: 210, height: 290 },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'Typography Print Artwork',
        x: 145,
        y: 140,
        width: 190,
        height: 190,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_typography.png',
      },
    ],
  },

  // 3. VINTAGE
  {
    id: 'vintage',
    name: 'Vintage',
    category: 't-shirts',
    code: 'SMART-VINT-03',
    desc: 'SALFORD Vintage Horse Drawing • "Established 2021" Edition',
    badge: 'RETRO',
    thumbnailUrl: '/pod/pod_tmpl_vintage.png',
    artworkUrl: '/pod/pod_tmpl_vintage.png',
    defaultFont: 'Playfair Display',
    defaultTextColor: '#D97706',
    safePrintArea: { x: 135, y: 105, width: 210, height: 290 },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'Vintage Print Artwork',
        x: 148,
        y: 135,
        width: 185,
        height: 225,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_vintage.png',
      },
    ],
  },

  // 4. ANIME
  {
    id: 'anime',
    name: 'Anime',
    category: 't-shirts',
    code: 'SMART-ANM-04',
    desc: '"I DO MY BEST all the time" Anime Boy Dark Hoodie Edition',
    badge: 'HOT',
    thumbnailUrl: '/pod/pod_tmpl_anime.png',
    artworkUrl: '/pod/pod_tmpl_anime.png',
    defaultFont: 'Orbitron',
    defaultTextColor: '#EF4444',
    safePrintArea: { x: 135, y: 105, width: 210, height: 290 },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'Anime Print Artwork',
        x: 162,
        y: 118,
        width: 155,
        height: 265,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_anime.png',
      },
    ],
  },

  // 5. SPORTS
  {
    id: 'sports',
    name: 'Sports',
    category: 't-shirts',
    code: 'SMART-SPT-05',
    desc: 'Vintage Retro Sunset Basketball Dunk Graphic',
    badge: 'NEW',
    thumbnailUrl: '/pod/pod_tmpl_sports.png',
    artworkUrl: '/pod/pod_tmpl_sports.png',
    defaultFont: 'Oswald',
    defaultTextColor: '#F59E0B',
    safePrintArea: { x: 135, y: 105, width: 210, height: 290 },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'Sports Print Artwork',
        x: 145,
        y: 135,
        width: 190,
        height: 230,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_sports.png',
      },
    ],
  },

  // 6. BIRTHDAY
  {
    id: 'birthday',
    name: 'Birthday',
    category: 't-shirts',
    code: 'SMART-BDAY-06',
    desc: 'Peach & Brown Illustrative "Birthday Girl" Cake Celebration Graphic',
    badge: 'PARTY',
    thumbnailUrl: '/pod/pod_tmpl_birthday.png',
    artworkUrl: '/pod/pod_tmpl_birthday.png',
    defaultFont: 'Pacifico',
    defaultTextColor: '#EC4899',
    safePrintArea: { x: 135, y: 105, width: 210, height: 290 },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'Birthday Print Artwork',
        x: 148,
        y: 140,
        width: 185,
        height: 205,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_birthday.png',
      },
    ],
  },

  // 7. GAMING
  {
    id: 'gaming',
    name: 'Gaming',
    category: 't-shirts',
    code: 'SMART-GAM-07',
    desc: 'Game Mode – Level Up Your Life Gaming Graphic',
    badge: 'GAMER',
    thumbnailUrl: '/pod/pod_tmpl_gaming.png',
    artworkUrl: '/pod/pod_tmpl_gaming.png',
    defaultFont: 'Orbitron',
    defaultTextColor: '#F97316',
    safePrintArea: { x: 135, y: 105, width: 210, height: 290 },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'Gaming Print Artwork',
        x: 145,
        y: 180,
        width: 190,
        height: 80,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_gaming.png',
      },
    ],
  },

  // 8. FLORAL
  {
    id: 'floral',
    name: 'Floral',
    category: 't-shirts',
    code: 'SMART-FLR-08',
    desc: '"The Still MORNING CLUB" Tropical Floral & Coconut Graphic',
    badge: 'BOTANICAL',
    thumbnailUrl: '/pod/pod_tmpl_floral.png',
    artworkUrl: '/pod/pod_tmpl_floral.png',
    defaultFont: 'Dancing Script',
    defaultTextColor: '#451A03',
    safePrintArea: { x: 135, y: 105, width: 210, height: 290 },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'Floral Print Artwork',
        x: 145,
        y: 145,
        width: 190,
        height: 200,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_floral.png',
      },
    ],
  },

  // 9. STREETWEAR
  {
    id: 'streetwear',
    name: 'Streetwear',
    category: 't-shirts',
    code: 'SMART-STR-09',
    desc: '"YOU JUST GOT SERVED" Yellow Urban Typography',
    badge: 'URBAN',
    thumbnailUrl: '/pod/pod_tmpl_streetwear.png',
    artworkUrl: '/pod/pod_tmpl_streetwear.png',
    defaultFont: 'Bebas Neue',
    defaultTextColor: '#EAB308',
    safePrintArea: { x: 135, y: 105, width: 210, height: 290 },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'Streetwear Print Artwork',
        x: 148,
        y: 145,
        width: 185,
        height: 200,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_streetwear.png',
      },
    ],
  },

  // 10. PHOTO PRINT
  {
    id: 'photo-print',
    name: 'Photo Print',
    category: 't-shirts',
    code: 'SMART-PHT-10',
    desc: 'Gold Elegant Photo Frame with Automatic Photo Masking',
    badge: 'PHOTO',
    thumbnailUrl: '/pod/pod_tmpl_photo_print.png',
    artworkUrl: '/pod/pod_tmpl_photo_print.png',
    defaultFont: 'Poppins',
    defaultTextColor: '#D97706',
    safePrintArea: { x: 135, y: 105, width: 210, height: 290 },
    imagePlaceholder: {
      x: 158,
      y: 130,
      width: 165,
      height: 240,
      fit: 'cover',
      border: 'none',
      borderRadius: 2,
    },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'Photo Print Artwork',
        x: 148,
        y: 120,
        width: 185,
        height: 260,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_photo_print.png',
      },
    ],
  },

  // ==========================================
  // PHONE COVER DEDICATED TEMPLATES (11-14)
  // ==========================================
  // 11. PHONE URBAN CYBER CASE
  {
    id: 'phone-streetwear',
    name: 'Urban Cyber Case',
    category: 'phone-covers',
    code: 'PHN-STR-01',
    desc: 'NEVER GIVE UP Stencil Typography Urban Case Graphic',
    badge: 'URBAN',
    thumbnailUrl: '/pod/pod_tmpl_urban_cyber.png',
    artworkUrl: '/pod/pod_tmpl_urban_cyber.png',
    defaultFont: 'Bebas Neue',
    defaultTextColor: '#FFFFFF',
    safePrintArea: { x: 120, y: 15, width: 240, height: 450 },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'Urban Cyber Print Artwork',
        x: 120,
        y: 15,
        width: 240,
        height: 450,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_urban_cyber.png',
      },
    ],
  },
  {
    id: 'phone-anime',
    name: 'Manga Shield',
    category: 'phone-covers',
    code: 'PHN-ANM-02',
    desc: 'High-contrast anime graphics phone skin',
    badge: 'HOT',
    thumbnailUrl: '/pod/pod_tmpl_anime.png',
    artworkUrl: '/pod/pod_tmpl_anime.png',
    defaultFont: 'Orbitron',
    defaultTextColor: '#EF4444',
    safePrintArea: { x: 120, y: 15, width: 240, height: 450 },
    imagePlaceholder: {
      x: 120,
      y: 15,
      width: 240,
      height: 450,
      fit: 'cover',
      border: 'none',
    },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'Anime Phone Artwork',
        x: 120,
        y: 15,
        width: 240,
        height: 450,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_anime.png',
      },
    ],
  },

  // ==========================================
  // COFFEE MUG DEDICATED TEMPLATES (15-18)
  // ==========================================

  // 15. MUG I LOVE ME TYPOGRAPHY
  {
    id: 'mug-photo-wrap',
    name: 'I ❤️ ME',
    category: 'coffee-mugs',
    code: 'MUG-LOVE-01',
    desc: '"I ❤️ ME" Red Heart Bold Typography Mug Graphic',
    badge: 'TRENDING',
    thumbnailUrl: '/pod/pod_tmpl_mug_i_heart_me.png',
    artworkUrl: '/pod/pod_tmpl_mug_i_heart_me.png',
    defaultFont: 'Playfair Display',
    defaultTextColor: '#111827',
    safePrintArea: { x: 155, y: 130, width: 205, height: 250 },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'I ❤️ ME Typography Artwork',
        x: 175,
        y: 165,
        width: 165,
        height: 180,
        rotation: 0,
        opacity: 1,
        isLocked: false,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_mug_i_heart_me.png',
      },
    ],
  },

  // 16. MUG FLORAL BLOSSOM
  {
    id: 'mug-floral',
    name: 'Floral Blossom',
    category: 'coffee-mugs',
    code: 'MUG-FLR-02',
    desc: 'Botanical coffee floral watercolor artwork',
    badge: 'POPULAR',
    thumbnailUrl: '/pod/pod_tmpl_floral.png',
    artworkUrl: '/pod/pod_tmpl_floral.png',
    defaultFont: 'Dancing Script',
    defaultTextColor: '#0284C7',
    safePrintArea: { x: 130, y: 130, width: 200, height: 220 },
    imagePlaceholder: {
      x: 150,
      y: 155,
      width: 160,
      height: 140,
      fit: 'cover',
      border: 'none',
      borderRadius: 12,
    },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'Mug Floral Artwork',
        x: 130,
        y: 130,
        width: 200,
        height: 220,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_floral.png',
      },
    ],
  },

  // 17. MUG MINIMAL MONOGRAM
  {
    id: 'mug-minimal',
    name: 'Minimal Monogram',
    category: 'coffee-mugs',
    code: 'MUG-MIN-03',
    desc: 'Clean initial monogram artwork',
    badge: 'TRENDING',
    thumbnailUrl: '/pod/pod_tmpl_minimal.png',
    artworkUrl: '/pod/pod_tmpl_minimal.png',
    defaultFont: 'Montserrat',
    defaultTextColor: '#111827',
    safePrintArea: { x: 130, y: 130, width: 200, height: 220 },
    imagePlaceholder: {
      x: 160,
      y: 150,
      width: 140,
      height: 140,
      fit: 'contain',
      border: 'none',
      borderRadius: 4,
    },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'Mug Minimal Artwork',
        x: 130,
        y: 130,
        width: 200,
        height: 220,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_minimal.png',
      },
    ],
  },

  // 18. MUG BIRTHDAY CELEBRATION
  {
    id: 'mug-birthday',
    name: 'Birthday Celebration',
    category: 'coffee-mugs',
    code: 'MUG-BDAY-04',
    desc: 'Celebratory birthday gift mug artwork',
    badge: 'GIFT',
    thumbnailUrl: '/pod/pod_tmpl_birthday.png',
    artworkUrl: '/pod/pod_tmpl_birthday.png',
    defaultFont: 'Pacifico',
    defaultTextColor: '#EC4899',
    safePrintArea: { x: 130, y: 130, width: 200, height: 220 },
    imagePlaceholder: {
      x: 150,
      y: 155,
      width: 160,
      height: 140,
      fit: 'cover',
      border: 'none',
      borderRadius: 8,
    },
    defaultLayers: [
      {
        id: 'layer-artwork',
        type: 'image',
        name: 'Mug Birthday Artwork',
        x: 130,
        y: 130,
        width: 200,
        height: 220,
        rotation: 0,
        opacity: 1,
        isLocked: true,
        isHidden: false,
        imageUrl: '/pod/pod_tmpl_birthday.png',
      },
    ],
  },
];
