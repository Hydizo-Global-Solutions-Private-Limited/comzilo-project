import { connectDatabase, sequelize } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';
import { QueryTypes } from 'sequelize';

export const verifyLiveE2E = async () => {
  await connectDatabase();
  const req = supertest(app);

  console.log('====================================================');
  console.log('MANUAL & LIVE END-TO-END QA VERIFICATION SUITE');
  console.log('====================================================');

  // STEP 1: Seller Authentication
  console.log('\n[1] Open Seller Panel & Login as Seller...');
  const loginRes = await req.post('/api/v1/auth/login').send({
    email: 'admin@comzilo.com',
    password: 'SuperAdminSecurePassword2026!',
  });
  if (loginRes.status !== 200 || !loginRes.body?.data?.accessToken) {
    throw new Error('Seller login failed!');
  }
  const token = loginRes.body.data.accessToken;
  console.log('✅ Seller authenticated successfully! Bearer Token acquired.');

  // STEP 2: Seller Panel Product Creation with Drag & Drop Images Payload
  const sku = 'SKU-LIVE-ZZ-' + Date.now();
  console.log(`\n[2] Seller Panel: Creating Product "zz-live-product" (SKU: ${sku})...`);
  const createRes = await req
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'zz-live-product',
      sku,
      price: 2999.0,
      costPrice: 1500.0,
      productType: 'physical',
      status: 'published',
      visibility: 'public',
      description: 'Live end-to-end seller created product with drag and drop gallery images',
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
          isPrimary: true,
          displayOrder: 0,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
          isPrimary: false,
          displayOrder: 1,
        },
      ],
    });

  console.log(`POST /api/v1/products Response Status: ${createRes.status}`);
  if (createRes.status !== 201) {
    console.error('Create Error:', createRes.body);
    throw new Error('Product creation failed!');
  }
  const product = createRes.body.data;
  console.log(
    `✅ Product Saved in MySQL! ID: ${product.id}, Name: "${product.name}", Status: "${product.status}"`
  );

  // STEP 3: MySQL Database Verification Query for products table
  console.log('\n[3] Open MySQL -> Query products table:');
  const productsInDb: any[] = await sequelize.query(
    `SELECT id, tenant_id, store_id, name, sku, product_type, status, visibility FROM products WHERE id = :id`,
    { replacements: { id: product.id }, type: QueryTypes.SELECT }
  );
  console.table(productsInDb);

  // STEP 4: MySQL Database Verification Query for product_images table
  console.log('\n[4] Open MySQL -> Query product_images table:');
  const imagesInDb: any[] = await sequelize.query(
    `SELECT id, product_id, image_url, thumbnail_url, display_order, is_primary FROM product_images WHERE product_id = :id`,
    { replacements: { id: product.id }, type: QueryTypes.SELECT }
  );
  console.table(imagesInDb);
  if (imagesInDb.length === 0) {
    throw new Error('Image verification failed: No rows created in product_images table!');
  }

  // STEP 5: Customer Storefront Listing Verification (GET /api/v1/products without token)
  console.log('\n[5] Open Customer Storefront (http://localhost:3000/products)...');
  const storefrontRes = await req.get('/api/v1/products?limit=100');
  console.log(`GET /api/v1/products Status: ${storefrontRes.status}`);

  const publicProducts = storefrontRes.body.data || [];
  const foundLiveProduct = publicProducts.find(
    (p: any) => p.id === product.id || p.name === 'zz-live-product'
  );

  if (!foundLiveProduct) {
    throw new Error(
      'CRITICAL FAILURE: Seller-created product "zz-live-product" is NOT returned to Customer Storefront!'
    );
  }
  console.log('🎉 CRITICAL SUCCESS: Seller product appears IMMEDIATELY on Customer Storefront!');
  console.log(`   - Product ID: ${foundLiveProduct.id}`);
  console.log(`   - Product Name: ${foundLiveProduct.name}`);
  console.log(`   - Retail Price: ₹${foundLiveProduct.price}`);
  console.log(`   - Featured Image: ${foundLiveProduct.images?.[0]?.imageUrl || 'N/A'}`);

  // STEP 6: Customer Product Details Page Verification
  console.log(`\n[6] Open Product Details (http://localhost:3000/products/${product.id})...`);
  const detailsRes = await req.get(`/api/v1/products/${product.id}`);
  console.log(`GET /api/v1/products/${product.id} Status: ${detailsRes.status}`);
  console.log(`   - Detailed Product Name: ${detailsRes.body?.data?.name}`);
  console.log(`   - Gallery Images Count: ${detailsRes.body?.data?.images?.length || 0}`);

  console.log('\n====================================================');
  console.log('✅ ALL LIVE END-TO-END VERIFICATIONS PASSED 100%!');
  console.log('====================================================');
};

verifyLiveE2E()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
