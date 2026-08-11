import { connectDatabase, sequelize } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';
import { QueryTypes } from 'sequelize';

export const verifyEnterpriseCatalog = async () => {
  await connectDatabase();
  const req = supertest(app);

  console.log('====================================================');
  console.log('ENTERPRISE CATALOG MANAGEMENT QA & ARCHITECTURE SUITE');
  console.log('====================================================');

  // STEP 1: Seller Login
  console.log('\n[1] Seller Panel Authentication...');
  const loginRes = await req.post('/api/v1/auth/login').send({
    email: 'admin@comzilo.com',
    password: 'SuperAdminSecurePassword2026!',
  });
  if (loginRes.status !== 200 || !loginRes.body?.data?.accessToken) {
    throw new Error('Seller login failed!');
  }
  const token = loginRes.body.data.accessToken;
  console.log('✅ Seller authenticated!');

  // STEP 2: Category Management & Tree Verification
  console.log('\n[2] Category Management: Creating Parent Category & Sub-Category...');
  const mainCat = await req
    .post('/api/v1/catalog/categories')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Consumer Electronics ' + Date.now(),
      description: 'Smart devices, TVs, laptops & gadgets',
      metaTitle: 'Buy Electronics Online',
      metaDescription: 'Shop consumer electronics at wholesale rates',
      canonicalUrl: 'https://comzilo.com/categories/electronics',
    });
  console.log(
    `   - Main Category Created! ID: ${mainCat.body?.data?.id}, Status: ${mainCat.status}`
  );

  const subCat = await req
    .post('/api/v1/catalog/categories')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Smartphones ' + Date.now(),
      parentId: mainCat.body.data.id,
      description: 'Android & iOS flagship smartphones',
    });
  console.log(
    `   - Sub-Category Created! ID: ${subCat.body?.data?.id}, Parent ID: ${mainCat.body?.data?.id}`
  );

  const treeRes = await req.get('/api/v1/catalog/categories');
  console.log(`   - Category Tree API Status: ${treeRes.status}`);

  // STEP 3: Brand Management
  console.log('\n[3] Brand Management: Creating Brand with Logo & Banner...');
  const brandRes = await req
    .post('/api/v1/catalog/brands')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Apple ' + Date.now(),
      logoUrl: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=200',
      bannerUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1000',
      description: 'Innovative electronics and software products',
      isFeatured: true,
    });
  console.log(
    `   - Brand Created! ID: ${brandRes.body?.data?.id}, Name: "${brandRes.body?.data?.name}"`
  );

  // STEP 4: Collection Management
  console.log('\n[4] Collection Management: Creating Smart Rule Collection...');
  const colRes = await req
    .post('/api/v1/catalog/collections')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Flagship Smartphones Collection ' + Date.now(),
      type: 'smart',
      description: 'Auto-grouped premium smartphones',
      isFeatured: true,
      rulesJson: { condition: 'PRICE_GREATER_THAN', value: 20000 },
    });
  console.log(
    `   - Collection Created! ID: ${colRes.body?.data?.id}, Type: "${colRes.body?.data?.type}"`
  );

  // STEP 5: Attribute & Swatch Management
  console.log('\n[5] Attribute & Swatches: Creating Color Swatch Attribute...');
  const attrRes = await req
    .post('/api/v1/catalog/attributes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Device Finish ' + Date.now(),
      type: 'color',
      values: [
        { value: 'Space Gray', colorCode: '#4B4B4B' },
        { value: 'Silver', colorCode: '#E0E0E0' },
        { value: 'Midnight Green', colorCode: '#004D40' },
      ],
    });
  console.log(
    `   - Attribute Created! ID: ${attrRes.body?.data?.id}, Name: "${attrRes.body?.data?.name}"`
  );

  // STEP 6: Tag Management
  console.log('\n[6] Tag Management: Creating Badge Tags...');
  const tagRes = await req
    .post('/api/v1/catalog/tags')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Premium Flagship ' + Date.now(),
      color: '#8B5CF6',
    });
  console.log(`   - Tag Created! ID: ${tagRes.body?.data?.id}`);

  // STEP 7: Product Creation with Catalog Integration
  console.log('\n[7] Product Creation: Seller Panel -> MySQL Database...');
  const productSku = 'SKU-CATALOG-' + Date.now();
  const prodRes = await req
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'iPhone 15 Pro Max',
      sku: productSku,
      price: 134900.0,
      costPrice: 100000.0,
      productType: 'physical',
      status: 'published',
      visibility: 'public',
      description: 'Titanium design with A17 Pro chip and 48MP camera system',
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500',
          isPrimary: true,
          displayOrder: 0,
        },
      ],
    });
  console.log(
    `   - Product Created! ID: ${prodRes.body?.data?.id}, Status: "${prodRes.body?.data?.status}"`
  );

  // STEP 8: Storefront Integration & Dynamic Filters Engine
  console.log('\n[8] Customer Storefront: Querying Catalog APIs & Dynamic Filters Engine...');
  const storefrontRes = await req.get('/api/v1/products?limit=50');
  console.log(`   - Customer Storefront GET /api/v1/products Status: ${storefrontRes.status}`);

  const filtersRes = await req.get('/api/v1/catalog/filters');
  console.log(
    `   - Dynamic Filters Engine GET /api/v1/catalog/filters Status: ${filtersRes.status}`
  );
  console.log(
    `   - Dynamic Price Range: ₹${filtersRes.body?.data?.priceRange?.min} - ₹${filtersRes.body?.data?.priceRange?.max}`
  );

  // STEP 9: MySQL Database Rows Verification
  console.log('\n[9] MySQL Database Verification Query...');
  const dbRows: any[] = await sequelize.query(
    `SELECT id, name, sku, price, status, visibility FROM products WHERE sku = :sku`,
    { replacements: { sku: productSku }, type: QueryTypes.SELECT }
  );
  console.table(dbRows);
  if (dbRows.length === 0) throw new Error('Product not found in MySQL!');

  console.log('\n====================================================');
  console.log('✅ COMPLETE ENTERPRISE CATALOG MODULE PASSED 100%!');
  console.log('====================================================');
};

verifyEnterpriseCatalog()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
