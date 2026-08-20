import { sequelize } from '../../config/database';
import { PodCategory, PodTemplate, Product, ProductImage } from '../models';

export async function seedPodCatalogData() {
  console.log('🌱 [POD Seeder] Starting Print-On-Demand Catalog Seeding with Custom Images...');

  // Ensure tables exist
  await sequelize.sync();

  // 1. Seed Categories
  const categoriesData = [
    {
      id: 1,
      tenantId: 1,
      name: 'T-Shirts',
      slug: 't-shirts',
      description: 'Customized apparel, graphic tees, vintage and personalized t-shirts.',
      imageUrl: '/uploads/pod/pod_tshirt.png',
      isActive: true,
      displayOrder: 1,
    },
    {
      id: 2,
      tenantId: 1,
      name: 'Phone Back Covers',
      slug: 'phone-back-covers',
      description: 'Custom protective phone cases with premium artwork, marble, neon & photo prints.',
      imageUrl: '/uploads/pod/pod_phone_case.png',
      isActive: true,
      displayOrder: 2,
    },
  ];

  for (const cat of categoriesData) {
    const existing = await PodCategory.findOne({ where: { slug: cat.slug } });
    if (!existing) {
      await PodCategory.create(cat);
      console.log(`  ✅ Created POD Category: ${cat.name}`);
    } else {
      await existing.update(cat);
      console.log(`  ℹ️ Updated POD Category: ${cat.name}`);
    }
  }

  const tshirtCategory = await PodCategory.findOne({ where: { slug: 't-shirts' } });
  const phoneCategory = await PodCategory.findOne({ where: { slug: 'phone-back-covers' } });

  // 2. Ensure POD Base Products Exist
  const podProducts = [
    {
      tenantId: 1,
      storeId: 1,
      name: 'Custom Graphic T-Shirt (Print On Demand)',
      slug: 'custom-graphic-t-shirt-pod',
      sku: 'POD-TSHIRT-001',
      shortDescription: '100% Ring-Spun Cotton customizable premium t-shirt with high-definition DTG print.',
      description: 'Create your personalized t-shirt with our interactive 2D & 3D POD studio. Choose from curated templates, custom text, and personal photo uploads.',
      status: 'active' as const,
      visibility: 'public' as const,
      category: 'Fashion',
      price: 29.99,
      comparePrice: 39.99,
      productType: 'print_on_demand',
      stockQuantity: 999,
      imageUrl: '/uploads/pod/pod_tshirt.png',
    },
    {
      tenantId: 1,
      storeId: 1,
      name: 'Custom Phone Back Cover (Print On Demand)',
      slug: 'custom-phone-back-cover-pod',
      sku: 'POD-PHONE-002',
      shortDescription: 'Shockproof slim-fit phone back cover customized with edge-to-edge sublimation artwork.',
      description: 'Design your custom phone back case with neon, marble, typography, or personalized name and photo prints for all iPhone and Galaxy models.',
      status: 'active' as const,
      visibility: 'public' as const,
      category: 'Mobile Accessories',
      price: 19.99,
      comparePrice: 27.99,
      productType: 'print_on_demand',
      stockQuantity: 999,
      imageUrl: '/uploads/pod/pod_phone_case.png',
    },
    {
      tenantId: 1,
      storeId: 1,
      name: 'Custom Premium Fleece Hoodie (Print On Demand)',
      slug: 'custom-premium-fleece-hoodie-pod',
      sku: 'POD-HOODIE-002',
      shortDescription: 'Heavyweight fleece unisex hoodie with custom pocket embroidery and back print area.',
      description: 'Design your cozy custom fleece pullover hoodie with modern typography, retro badges, or personalized line art.',
      status: 'active' as const,
      visibility: 'public' as const,
      category: 'Fashion',
      price: 49.99,
      comparePrice: 64.99,
      productType: 'print_on_demand',
      stockQuantity: 999,
      imageUrl: '/uploads/pod/pod_hoodie.png',
    },
    {
      tenantId: 1,
      storeId: 1,
      name: 'Custom Ceramic Coffee Mug (Print On Demand)',
      slug: 'custom-ceramic-coffee-mug-pod',
      sku: 'POD-MUG-001',
      shortDescription: '11oz Glossy ceramic mug with vibrant 360 wrap-around sublimation printing.',
      description: 'Personalized coffee mug for gifts, family memories, corporate logos, and creative typographic quotes.',
      status: 'active' as const,
      visibility: 'public' as const,
      category: 'Home & Kitchen',
      price: 14.99,
      comparePrice: 19.99,
      productType: 'print_on_demand',
      stockQuantity: 999,
      imageUrl: '/uploads/pod/pod_mugs.png',
    },
  ];

  for (const prodData of podProducts) {
    const { imageUrl, ...baseProd } = prodData;
    let prod = await Product.findOne({ where: { sku: baseProd.sku } });
    if (!prod) {
      prod = await Product.create(baseProd as any);
      console.log(`  ✅ Created Base POD Product: ${prod.name}`);
    } else {
      await prod.update(baseProd as any);
      console.log(`  ℹ️ Updated Base POD Product: ${prod.name}`);
    }

    // Attach ProductImage
    await ProductImage.destroy({ where: { productId: prod.id } });
    await ProductImage.create({
      productId: prod.id,
      imageUrl: imageUrl,
      isPrimary: true,
      displayOrder: 0,
    });
  }

  // 3. Exactly 10 Templates for T-Shirts
  const tshirtTemplates = [
    {
      title: 'Minimal',
      code: 'TSH-MIN-01',
      description: 'Clean, subtle minimalist line art and geometric balance.',
      thumbnailUrl: '/uploads/pod/pod_hoodie.png',
      basePrice: 24.99,
      printableArea: { x: 30, y: 25, width: 40, height: 50, shape: 'rectangle' },
      canvasJson: { elements: [{ type: 'text', text: 'LESS IS MORE', font: 'Montserrat', color: '#111827' }] },
      allowedColors: ['#FFFFFF', '#000000', '#64748B', '#E2E8F0', '#1E293B'],
      allowedSizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
    },
    {
      title: 'Typography',
      code: 'TSH-TYPO-02',
      description: 'Bold expressive typography with aesthetic lettering and quote overlays.',
      thumbnailUrl: '/uploads/pod/pod_tmpl_typography.png',
      basePrice: 26.99,
      printableArea: { x: 25, y: 20, width: 50, height: 60, shape: 'rectangle' },
      canvasJson: { elements: [{ type: 'text', text: 'CREATIVE SOUL', font: 'Bebas Neue', color: '#3B82F6' }] },
      allowedColors: ['#FFFFFF', '#1E293B', '#0F172A', '#F1F5F9', '#DC2626'],
      allowedSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    },
    {
      title: 'Vintage',
      code: 'TSH-VINT-03',
      description: 'Distressed retro 80s and 90s aesthetic grunge badge.',
      thumbnailUrl: '/uploads/pod/pod_tmpl_vintage.png',
      basePrice: 28.99,
      printableArea: { x: 20, y: 20, width: 60, height: 60, shape: 'rectangle' },
      canvasJson: { elements: [{ type: 'text', text: 'VINTAGE 1989', font: 'Playfair Display', color: '#F59E0B' }] },
      allowedColors: ['#000000', '#334155', '#475569', '#1E293B'],
      allowedSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    },
    {
      title: 'Anime',
      code: 'TSH-ANM-04',
      description: 'Dynamic Japanese manga character line art and kanji overlay.',
      thumbnailUrl: '/uploads/pod/pod_tmpl_anime.png',
      basePrice: 29.99,
      printableArea: { x: 20, y: 15, width: 60, height: 70, shape: 'rectangle' },
      canvasJson: { elements: [{ type: 'text', text: 'SHINOBI SPIRIT', font: 'Orbitron', color: '#EF4444' }] },
      allowedColors: ['#000000', '#FFFFFF', '#0F172A', '#1E3A8A'],
      allowedSizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    },
    {
      title: 'Sports',
      code: 'TSH-SPT-05',
      description: 'Athletic varsity jersey numerals and team league typography.',
      thumbnailUrl: '/uploads/pod/pod_tmpl_sports.png',
      basePrice: 27.99,
      printableArea: { x: 25, y: 20, width: 50, height: 60, shape: 'rectangle' },
      canvasJson: { elements: [{ type: 'text', text: 'ATHLETICS 07', font: 'Bebas Neue', color: '#10B981' }] },
      allowedColors: ['#1E3A8A', '#DC2626', '#FFFFFF', '#059669', '#000000'],
      allowedSizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    },
    {
      title: 'Birthday',
      code: 'TSH-BDAY-06',
      description: 'Celebratory birthday badge with custom year, name, and party themes.',
      thumbnailUrl: '/uploads/pod/pod_tmpl_birthday.png',
      basePrice: 25.99,
      printableArea: { x: 25, y: 25, width: 50, height: 50, shape: 'rectangle' },
      canvasJson: { elements: [{ type: 'text', text: 'LEGENDS ARE BORN', font: 'Pacifico', color: '#8B5CF6' }] },
      allowedColors: ['#FFFFFF', '#000000', '#F43F5E', '#A855F7'],
      allowedSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    },
    {
      title: 'Couple',
      code: 'TSH-CPL-07',
      description: 'Matching couple companion designs with complementary hearts & quotes.',
      thumbnailUrl: '/uploads/pod/pod_hoodie.png',
      basePrice: 28.99,
      printableArea: { x: 30, y: 25, width: 40, height: 50, shape: 'rectangle' },
      canvasJson: { elements: [{ type: 'text', text: 'BETTER TOGETHER', font: 'Caveat', color: '#EF4444' }] },
      allowedColors: ['#FFFFFF', '#000000', '#FECDD3', '#E0E7FF'],
      allowedSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    },
    {
      title: 'Festival',
      code: 'TSH-FEST-08',
      description: 'Vibrant cultural and holiday festival celebrations with colorful patterns.',
      thumbnailUrl: '/uploads/pod/pod_tshirt.png',
      basePrice: 29.99,
      printableArea: { x: 20, y: 20, width: 60, height: 60, shape: 'rectangle' },
      canvasJson: { elements: [{ type: 'text', text: 'FESTIVAL OF LIGHTS', font: 'Playfair Display', color: '#F59E0B' }] },
      allowedColors: ['#7C2D12', '#064E3B', '#1E1B4B', '#FFFFFF'],
      allowedSizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    },
    {
      title: 'College',
      code: 'TSH-COL-09',
      description: 'Authentic collegiate varsity arch typography with crest emblem.',
      thumbnailUrl: '/uploads/pod/pod_hoodie.png',
      basePrice: 26.99,
      printableArea: { x: 20, y: 20, width: 60, height: 50, shape: 'rectangle' },
      canvasJson: { elements: [{ type: 'text', text: 'STATE UNIVERSITY', font: 'Bebas Neue', color: '#2563EB' }] },
      allowedColors: ['#991B1B', '#1E3A8A', '#065F46', '#111827', '#F3F4F6'],
      allowedSizes: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
    },
    {
      title: 'Photo Print',
      code: 'TSH-PHT-10',
      description: 'Full-bleed high resolution personal photo print with optional caption frame.',
      thumbnailUrl: '/uploads/pod/pod_tshirt.png',
      basePrice: 31.99,
      printableArea: { x: 15, y: 15, width: 70, height: 70, shape: 'rectangle' },
      canvasJson: { elements: [{ type: 'image', placeholder: true }, { type: 'text', text: 'MEMORIES', font: 'Inter', color: '#FFFFFF' }] },
      allowedColors: ['#FFFFFF', '#000000', '#1F2937', '#475569'],
      allowedSizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
    },
  ];

  // 4. Exactly 10 Templates for Phone Covers
  const phoneTemplates = [
    {
      title: 'Transparent',
      code: 'PHN-TRN-01',
      description: 'Ultra-clear crystal frame showcasing your device color with subtle accents.',
      thumbnailUrl: '/uploads/pod/pod_phone_case.png',
      basePrice: 18.99,
      printableArea: { x: 15, y: 15, width: 70, height: 70, shape: 'rounded-rect' },
      canvasJson: { elements: [{ type: 'text', text: 'CLEAR VISION', font: 'Inter', color: '#0F172A' }] },
      allowedColors: ['#FFFFFF', '#000000', '#94A3B8'],
      allowedSizes: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro', 'Samsung Galaxy S24 Ultra', 'Samsung S24', 'Google Pixel 8 Pro', 'OnePlus 12'],
    },
    {
      title: 'Marble',
      code: 'PHN-MRB-02',
      description: 'Luxurious Italian white and gold vein marble stone texture.',
      thumbnailUrl: '/uploads/pod/pod_phone_case.png',
      basePrice: 21.99,
      printableArea: { x: 10, y: 10, width: 80, height: 80, shape: 'rounded-rect' },
      canvasJson: { elements: [{ type: 'text', text: 'CARRARA GOLD', font: 'Playfair Display', color: '#B45309' }] },
      allowedColors: ['#F8FAFC', '#0F172A', '#E2E8F0'],
      allowedSizes: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro', 'Samsung Galaxy S24 Ultra', 'Samsung S24', 'Google Pixel 8 Pro'],
    },
    {
      title: 'Floral',
      code: 'PHN-FLR-03',
      description: 'Botanical watercolor blossoms, roses, and aesthetic wildflower wreath.',
      thumbnailUrl: '/uploads/pod/pod_tmpl_floral.png',
      basePrice: 20.99,
      printableArea: { x: 15, y: 15, width: 70, height: 70, shape: 'rounded-rect' },
      canvasJson: { elements: [{ type: 'text', text: 'BLOOM & GLOW', font: 'Caveat', color: '#DB2777' }] },
      allowedColors: ['#FDF2F8', '#FFFFFF', '#000000'],
      allowedSizes: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro', 'Samsung Galaxy S24 Ultra', 'Samsung S24'],
    },
    {
      title: 'Abstract',
      code: 'PHN-ABS-04',
      description: 'Modern geometric pastel color blocking and fluid psychedelic gradients.',
      thumbnailUrl: '/uploads/pod/pod_phone_case.png',
      basePrice: 22.99,
      printableArea: { x: 10, y: 10, width: 80, height: 80, shape: 'rounded-rect' },
      canvasJson: { elements: [{ type: 'text', text: 'SPECTRUM WAVE', font: 'Montserrat', color: '#8B5CF6' }] },
      allowedColors: ['#312E81', '#4C1D95', '#0F172A', '#FFFFFF'],
      allowedSizes: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'Samsung Galaxy S24 Ultra', 'Samsung S24'],
    },
    {
      title: 'Gaming',
      code: 'PHN-GAM-05',
      description: 'Cyberpunk HUD telemetry lines, game controller badge and neon glitch lines.',
      thumbnailUrl: '/uploads/pod/pod_tmpl_gaming.png',
      basePrice: 23.99,
      printableArea: { x: 15, y: 15, width: 70, height: 70, shape: 'rounded-rect' },
      canvasJson: { elements: [{ type: 'text', text: 'LEVEL UP // 99', font: 'Orbitron', color: '#06B6D4' }] },
      allowedColors: ['#09090B', '#18181B', '#27272A', '#1E1B4B'],
      allowedSizes: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'Samsung Galaxy S24 Ultra', 'Google Pixel 8 Pro'],
    },
    {
      title: 'Cartoon',
      code: 'PHN-CRN-06',
      description: 'Adorable anime chibi characters and colorful pop art comic illustrations.',
      thumbnailUrl: '/uploads/pod/pod_phone_case.png',
      basePrice: 19.99,
      printableArea: { x: 15, y: 15, width: 70, height: 70, shape: 'rounded-rect' },
      canvasJson: { elements: [{ type: 'text', text: 'CHIBI FRIENDS', font: 'Pacifico', color: '#EC4899' }] },
      allowedColors: ['#FEF08A', '#BAE6FD', '#FBCFE8', '#FFFFFF'],
      allowedSizes: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro', 'Samsung S24'],
    },
    {
      title: 'Name Print',
      code: 'PHN-NAM-07',
      description: 'Personalized calligraphy nameplate monogram with gold foil frame.',
      thumbnailUrl: '/uploads/pod/pod_phone_case.png',
      basePrice: 21.99,
      printableArea: { x: 20, y: 30, width: 60, height: 40, shape: 'rounded-rect' },
      canvasJson: { elements: [{ type: 'text', text: 'ALEXANDER', font: 'Playfair Display', color: '#D97706' }] },
      allowedColors: ['#000000', '#1E293B', '#FFFFFF', '#064E3B'],
      allowedSizes: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro', 'Samsung Galaxy S24 Ultra', 'Samsung S24', 'Google Pixel 8 Pro', 'OnePlus 12'],
    },
    {
      title: 'Photo Print',
      code: 'PHN-PHT-08',
      description: 'High-definition personalized photo collage with custom polaroid border.',
      thumbnailUrl: '/uploads/pod/pod_phone_case.png',
      basePrice: 24.99,
      printableArea: { x: 10, y: 10, width: 80, height: 80, shape: 'rounded-rect' },
      canvasJson: { elements: [{ type: 'image', placeholder: true }] },
      allowedColors: ['#FFFFFF', '#000000', '#334155'],
      allowedSizes: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro', 'Samsung Galaxy S24 Ultra', 'Samsung S24', 'Google Pixel 8 Pro', 'OnePlus 12'],
    },
    {
      title: 'Neon',
      code: 'PHN-NON-09',
      description: 'Luminous electroluminescent retro vaporwave neon signs and glows.',
      thumbnailUrl: '/uploads/pod/pod_phone_case.png',
      basePrice: 22.99,
      printableArea: { x: 15, y: 15, width: 70, height: 70, shape: 'rounded-rect' },
      canvasJson: { elements: [{ type: 'text', text: 'NEON DREAMS', font: 'Orbitron', color: '#22D3EE' }] },
      allowedColors: ['#020617', '#0F172A', '#1E1B4B'],
      allowedSizes: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'Samsung Galaxy S24 Ultra', 'Google Pixel 8 Pro'],
    },
    {
      title: 'Luxury',
      code: 'PHN-LUX-10',
      description: 'Matte carbon fiber composite finish with brushed metallic gold badge.',
      thumbnailUrl: '/uploads/pod/pod_phone_case.png',
      basePrice: 26.99,
      printableArea: { x: 15, y: 20, width: 70, height: 60, shape: 'rounded-rect' },
      canvasJson: { elements: [{ type: 'text', text: 'EXECUTIVE EDITION', font: 'Montserrat', color: '#F59E0B' }] },
      allowedColors: ['#000000', '#18181B', '#27272A'],
      allowedSizes: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'Samsung Galaxy S24 Ultra'],
    },
  ];

  // Insert / Update T-Shirt templates
  for (const tmpl of tshirtTemplates) {
    const data = {
      tenantId: 1,
      categoryId: tshirtCategory ? tshirtCategory.id : 1,
      ...tmpl,
      isActive: true,
    };
    const existing = await PodTemplate.findOne({ where: { code: tmpl.code } });
    if (!existing) {
      await PodTemplate.create(data as any);
      console.log(`  ✅ Created T-Shirt Template: ${tmpl.title} (${tmpl.code})`);
    } else {
      await existing.update(data as any);
      console.log(`  ℹ️ Updated T-Shirt Template: ${tmpl.title} (${tmpl.code})`);
    }
  }

  // Insert / Update Phone Cover templates
  for (const tmpl of phoneTemplates) {
    const data = {
      tenantId: 1,
      categoryId: phoneCategory ? phoneCategory.id : 2,
      ...tmpl,
      isActive: true,
    };
    const existing = await PodTemplate.findOne({ where: { code: tmpl.code } });
    if (!existing) {
      await PodTemplate.create(data as any);
      console.log(`  ✅ Created Phone Template: ${tmpl.title} (${tmpl.code})`);
    } else {
      await existing.update(data as any);
      console.log(`  ℹ️ Updated Phone Template: ${tmpl.title} (${tmpl.code})`);
    }
  }

  console.log('🎉 [POD Seeder] Successfully seeded all POD categories, base products, and 20 templates!');
}

if (require.main === module) {
  seedPodCatalogData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
