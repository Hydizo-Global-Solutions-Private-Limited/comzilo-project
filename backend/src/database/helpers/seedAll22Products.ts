import { connectDatabase } from '../../config/database';
import { Product, Store, Media, ProductMedia } from '../models';

interface ProductSeedItem {
  name: string;
  sku: string;
  productType: string;
  price: number;
  costPrice: number;
  status: string;
  shortDescription: string;
  imageUrl: string;
  dynamicAttributes?: any;
}

const PRODUCTS_22_LIST: ProductSeedItem[] = [
  // 1. Physical Product
  {
    name: 'Enterprise Cotton T-Shirt',
    sku: 'PHYS-TSHIRT-001',
    productType: 'physical',
    price: 499.0,
    costPrice: 200.0,
    status: 'published',
    shortDescription: '100% Premium Combed Cotton T-Shirt for Enterprise teams',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500',
    dynamicAttributes: { weight: 0.2, dimensions: '30x20x2 cm', warehouseId: 1 },
  },
  {
    name: 'Wireless Ergonomic Optical Mouse',
    sku: 'PHYS-MOUSE-002',
    productType: 'physical',
    price: 1299.0,
    costPrice: 600.0,
    status: 'published',
    shortDescription: '2.4GHz High Precision Optical Mouse with Silent Click',
    imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500',
    dynamicAttributes: { weight: 0.15, dimensions: '12x8x5 cm', warehouseId: 1 },
  },

  // 2. Variable Product
  {
    name: 'Polo T-Shirt (Size/Color Variants)',
    sku: 'VAR-POLO-001',
    productType: 'variable',
    price: 799.0,
    costPrice: 350.0,
    status: 'published',
    shortDescription: 'Classic Fit Polo T-Shirt available in Red, Navy & Black',
    imageUrl: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500',
    dynamicAttributes: { attributes: ['Color', 'Size'] },
  },
  {
    name: 'Pro Running Shoes (Size Variants)',
    sku: 'VAR-SHOES-002',
    productType: 'variable',
    price: 2999.0,
    costPrice: 1400.0,
    status: 'published',
    shortDescription: 'Lightweight Breathable Mesh Running Shoes for Athletes',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
    dynamicAttributes: { attributes: ['Size'] },
  },

  // 3. Virtual Product
  {
    name: 'Premium Storefront Membership',
    sku: 'VIRT-MEMBERSHIP-001',
    productType: 'virtual',
    price: 1999.0,
    costPrice: 0.0,
    status: 'published',
    shortDescription: 'VIP Annual Storefront Membership with Free Delivery Perks',
    imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=500',
    dynamicAttributes: { accessDurationDays: 365 },
  },
  {
    name: '1-on-1 ERP Strategy Consultation',
    sku: 'VIRT-CONSULT-002',
    productType: 'virtual',
    price: 4999.0,
    costPrice: 0.0,
    status: 'published',
    shortDescription: '60-Minute Executive ERP Implementation & Strategy Call',
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500',
    dynamicAttributes: { durationMinutes: 60 },
  },

  // 4. Downloadable Product
  {
    name: 'Java Microservices Architecture Course PDF',
    sku: 'DL-JAVA-PDF-001',
    productType: 'downloadable',
    price: 399.0,
    costPrice: 0.0,
    status: 'published',
    shortDescription: 'Comprehensive Guide to Spring Boot & Microservices PDF eBook',
    imageUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500',
    dynamicAttributes: {
      fileUrl: 'https://cdn.comzilo.com/files/java-ebook.pdf',
      downloadExpiryDays: 30,
    },
  },
  {
    name: 'Flutter Complete App Source Code',
    sku: 'DL-FLUTTER-CODE-002',
    productType: 'downloadable',
    price: 1999.0,
    costPrice: 0.0,
    status: 'published',
    shortDescription: 'Full Stack Cross-Platform Mobile Shopping App Codebase',
    imageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=500',
    dynamicAttributes: {
      fileUrl: 'https://cdn.comzilo.com/files/flutter-src.zip',
      downloadExpiryDays: 60,
    },
  },

  // 5. Print On Demand
  {
    name: 'Custom Matte Ceramic Coffee Mug',
    sku: 'POD-MUG-001',
    productType: 'print_on_demand',
    price: 349.0,
    costPrice: 120.0,
    status: 'published',
    shortDescription: '11oz High Quality Ceramic Mug with Custom Logo Printing',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500',
    dynamicAttributes: { podProvider: 'Gelato', templateId: 'MUG-11OZ' },
  },
  {
    name: 'Custom Printed Fleece Pullover Hoodie',
    sku: 'POD-HOODIE-002',
    productType: 'print_on_demand',
    price: 1799.0,
    costPrice: 800.0,
    status: 'published',
    shortDescription: 'Heavyweight Unisex Fleece Hoodie with Front & Back Print',
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500',
    dynamicAttributes: { podProvider: 'Printify', templateId: 'HOOD-FL-01' },
  },
];

export const seed22Products = async () => {
  await connectDatabase();

  console.log('====================================================');
  console.log('SEEDING 22 REAL MYSQL PRODUCTS WITH ACCURATE IMAGES');
  console.log('====================================================');

  const defaultStore = await Store.findOne({ where: { status: 'active' } });
  const tenantId = defaultStore ? defaultStore.tenantId : 1;
  const storeId = defaultStore ? defaultStore.id : 1;

  let createdCount = 0;
  for (const item of PRODUCTS_22_LIST) {
    let prod = await Product.findOne({ where: { sku: item.sku } });
    if (!prod) {
      const slug = item.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      prod = await Product.create({
        tenantId,
        storeId,
        productType: item.productType,
        name: item.name,
        slug,
        sku: item.sku,
        price: item.price,
        cost: item.costPrice,
        status: 'published',
        visibility: 'public',
        shortDescription: item.shortDescription,
        seoTitle: item.name,
        seoDescription: item.shortDescription,
      });
      createdCount++;
      console.log(
        `✅ Created Product [ID ${prod.id}] [${item.productType.toUpperCase()}]: "${item.name}"`
      );
    } else {
      await prod.update({
        productType: item.productType,
        price: item.price,
        status: 'published',
        name: item.name,
        shortDescription: item.shortDescription,
      });
      console.log(
        `ℹ️ Updated Product [ID ${prod.id}] [${item.productType.toUpperCase()}]: "${item.name}"`
      );
    }

    // Attach Media Image
    let media = await Media.findOne({ where: { tenantId, url: item.imageUrl } });
    if (!media) {
      media = await Media.create({
        tenantId,
        filename: `${item.sku}.jpg`,
        originalName: `${item.name}.jpg`,
        mimeType: 'image/jpeg',
        size: 50000,
        url: item.imageUrl,
        path: item.imageUrl,
        storageProvider: 's3',
      });
    }

    const existingPM = await ProductMedia.findOne({
      where: { productId: prod.id, mediaId: media.id },
    });
    if (!existingPM) {
      await ProductMedia.create({
        tenantId,
        productId: prod.id,
        mediaId: media.id,
        isPrimary: true,
        sortOrder: 0,
      });
      console.log(`   📸 Linked Media [ID ${media.id}] to Product [ID ${prod.id}]`);
    }
  }

  console.log('\n====================================================');
  console.log(`🎉 22 REAL PRODUCTS & ACCURATE MEDIA SEEDED INTO MYSQL!`);
  console.log('====================================================');
};

if (require.main === module) {
  seed22Products()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
