import { connectDatabase } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';

export const verifyCatalogModule = async () => {
  await connectDatabase();
  const req = supertest(app);

  console.log('====================================================');
  console.log('CATALOG MANAGEMENT MODULE - ENTERPRISE E2E SUITE');
  console.log('====================================================');

  // STEP 1: Seller Authentication
  console.log('\n[1] Login as Seller Admin...');
  const loginRes = await req.post('/api/v1/auth/login').send({
    email: 'admin@comzilo.com',
    password: 'SuperAdminSecurePassword2026!',
  });
  if (loginRes.status !== 200 || !loginRes.body?.data?.accessToken) {
    throw new Error('Seller login failed!');
  }
  const token = loginRes.body.data.accessToken;
  console.log('✅ Seller authenticated!');

  // STEP 2: Create Main Category & Sub Category
  console.log('\n[2] Create Main Category "Electronics" & Sub Category "Smartphones"...');
  const mainCatRes = await req
    .post('/api/v1/catalog/categories')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Electronics Test ' + Date.now(),
      description: 'Consumer Electronics & Gadgets',
      metaTitle: 'Buy Electronics Online',
      metaDescription: 'Top quality electronics at best prices',
    });
  console.log(`POST /api/v1/catalog/categories Status: ${mainCatRes.status}`);
  if (mainCatRes.status !== 200 && mainCatRes.status !== 201)
    throw new Error('Failed to create main category');
  const mainCategory = mainCatRes.body.data;
  console.log(`   - Main Category ID: ${mainCategory.id}, Name: "${mainCategory.name}"`);

  const subCatRes = await req
    .post('/api/v1/catalog/categories')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Smartphones ' + Date.now(),
      parentId: mainCategory.id,
      description: 'iOS & Android Smartphones',
    });
  console.log(
    `   - Sub Category Created under parent ${mainCategory.id}! ID: ${subCatRes.body?.data?.id}`
  );

  // STEP 3: Verify Nested Category Tree API
  console.log('\n[3] Fetch Category Tree (GET /api/v1/catalog/categories)...');
  const treeRes = await req.get('/api/v1/catalog/categories');
  console.log(`GET /api/v1/catalog/categories Status: ${treeRes.status}`);
  const tree = treeRes.body.data || [];
  const parentInTree = tree.find((c: any) => c.id === mainCategory.id);
  if (
    !parentInTree ||
    !Array.isArray(parentInTree.children) ||
    parentInTree.children.length === 0
  ) {
    throw new Error('Nested Category Tree verification failed!');
  }
  console.log(
    `✅ Category Tree Verified! Parent "${parentInTree.name}" contains ${parentInTree.children.length} sub-category(ies).`
  );

  // STEP 4: Create Brand
  console.log('\n[4] Create Brand "TechCorp" (POST /api/v1/catalog/brands)...');
  const brandRes = await req
    .post('/api/v1/catalog/brands')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'TechCorp ' + Date.now(),
      logoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200',
      bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000',
      description: 'Leading innovations in high technology',
      isFeatured: true,
    });
  console.log(`POST /api/v1/catalog/brands Status: ${brandRes.status}`);
  if (brandRes.status !== 200 && brandRes.status !== 201) throw new Error('Failed to create brand');
  console.log(`✅ Brand Created! ID: ${brandRes.body.data.id}, Name: "${brandRes.body.data.name}"`);

  // STEP 5: Create Collection (Smart Rule Collection)
  console.log('\n[5] Create Collection "Flash Sale Gadgets" (POST /api/v1/catalog/collections)...');
  const colRes = await req
    .post('/api/v1/catalog/collections')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Flash Sale Gadgets ' + Date.now(),
      type: 'flash_sale',
      description: 'Exclusive limited time discounts',
      isFeatured: true,
      rulesJson: { condition: 'PRICE_LESS_THAN', value: 5000 },
    });
  console.log(`POST /api/v1/catalog/collections Status: ${colRes.status}`);
  if (colRes.status !== 200 && colRes.status !== 201)
    throw new Error('Failed to create collection');
  console.log(
    `✅ Collection Created! ID: ${colRes.body.data.id}, Type: "${colRes.body.data.type}"`
  );

  // STEP 6: Create Product Attribute & Values
  console.log('\n[6] Create Attribute "Color" with values (Red, Blue, Black)...');
  const attrRes = await req
    .post('/api/v1/catalog/attributes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Color ' + Date.now(),
      type: 'color',
      values: [
        { value: 'Red', colorCode: '#FF0000' },
        { value: 'Blue', colorCode: '#0000FF' },
        { value: 'Black', colorCode: '#000000' },
      ],
    });
  console.log(`POST /api/v1/catalog/attributes Status: ${attrRes.status}`);
  if (attrRes.status !== 200 && attrRes.status !== 201)
    throw new Error('Failed to create product attribute');
  console.log(
    `✅ Attribute Created! ID: ${attrRes.body.data.id}, Name: "${attrRes.body.data.name}"`
  );

  // STEP 7: Create Product Tag
  console.log('\n[7] Create Tag "Bestseller" (POST /api/v1/catalog/tags)...');
  const tagRes = await req
    .post('/api/v1/catalog/tags')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Bestseller ' + Date.now(),
      color: '#EF4444',
    });
  console.log(`POST /api/v1/catalog/tags Status: ${tagRes.status}`);
  if (tagRes.status !== 200 && tagRes.status !== 201) throw new Error('Failed to create tag');
  console.log(`✅ Tag Created! ID: ${tagRes.body.data.id}`);

  // STEP 8: Dynamic Filters Engine API
  console.log('\n[8] Fetch Dynamic Catalog Filters (GET /api/v1/catalog/filters)...');
  const filtersRes = await req.get('/api/v1/catalog/filters');
  console.log(`GET /api/v1/catalog/filters Status: ${filtersRes.status}`);
  if (filtersRes.status !== 200 || !filtersRes.body?.data?.categories) {
    throw new Error('Failed to retrieve catalog dynamic filters');
  }
  console.log('✅ Dynamic Catalog Filters Engine Verified!');
  console.log(`   - Categories Count: ${filtersRes.body.data.categories.length}`);
  console.log(`   - Brands Count: ${filtersRes.body.data.brands.length}`);
  console.log(`   - Attributes Count: ${filtersRes.body.data.attributes.length}`);
  console.log(
    `   - Dynamic Price Range: ₹${filtersRes.body.data.priceRange.min} - ₹${filtersRes.body.data.priceRange.max}`
  );

  console.log('\n====================================================');
  console.log('✅ ALL CATALOG MANAGEMENT MODULE VERIFICATIONS PASSED 100%!');
  console.log('====================================================');
};

verifyCatalogModule()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
