import { connectDatabase, sequelize } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';
import { QueryTypes } from 'sequelize';

export const runFullSellerCustomerSyncVerification = async () => {
  await connectDatabase();
  const req = supertest(app);

  console.log('====================================================');
  console.log('STEP 3 & STEP 4 VERIFICATION: SELLER TO STOREFRONT SYNC & PRODUCT IMAGES');
  console.log('====================================================');

  // 1. Seller Login
  console.log('\n[1] Logging in as Seller...');
  const sellerLogin = await req.post('/api/v1/auth/login').send({
    email: 'admin@comzilo.com',
    password: 'SuperAdminSecurePassword2026!',
  });

  if (sellerLogin.status !== 200 || !sellerLogin.body?.data?.accessToken) {
    throw new Error('Seller login failed!');
  }
  const token = sellerLogin.body.data.accessToken;
  console.log('✅ Seller authenticated successfully!');

  // 2. Create Product "zz-pro" with images array via POST /api/v1/products
  const sku = 'SKU-ZZ-PRO-' + Date.now();
  console.log(`\n[2] Creating Product "zz-pro" (SKU: ${sku}) with Product Images array...`);
  const createRes = await req
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'zz-pro',
      productType: 'physical',
      sku,
      price: 2499.0,
      shortDescription: 'Enterprise physical product zz-pro created by seller with images',
      status: 'published',
      visibility: 'public',
      images: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500',
          isPrimary: true,
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500',
          isPrimary: false,
        },
      ],
    });

  console.log(`POST /api/v1/products Status: ${createRes.status}`);
  if (createRes.status !== 201) {
    console.error('Create Response:', JSON.stringify(createRes.body, null, 2));
    throw new Error('Product creation failed!');
  }

  const createdProduct = createRes.body.data;
  console.log(
    `✅ Product Created in MySQL! ID: ${createdProduct.id}, Name: "${createdProduct.name}", Status: "${createdProduct.status}"`
  );

  // 3. Verify Database Record in MySQL
  console.log('\n[3] Database Verification Query for products table:');
  const dbRows: any[] = await sequelize.query(
    `SELECT id, tenant_id, store_id, name, product_type, status, visibility FROM products WHERE id = :id`,
    { replacements: { id: createdProduct.id }, type: QueryTypes.SELECT }
  );
  console.table(dbRows);

  console.log('Database Verification Query for normalized product_images table:');
  const imageRows: any[] = await sequelize.query(
    `SELECT id, product_id, image_url, thumbnail_url, display_order, is_primary FROM product_images WHERE product_id = :id`,
    { replacements: { id: createdProduct.id }, type: QueryTypes.SELECT }
  );
  console.table(imageRows);

  if (imageRows.length === 0) {
    throw new Error(
      'Image verification failed: No records created in normalized product_images table!'
    );
  }

  // 4. Verify Customer Storefront API GET /api/v1/products
  console.log('\n[4] Querying Customer Storefront API (GET /api/v1/products without token)...');
  const customerRes = await req.get('/api/v1/products?limit=100');
  console.log(`Customer GET /products Status: ${customerRes.status}`);

  const publicProducts = customerRes.body.data || [];
  const foundZz = publicProducts.find(
    (p: any) => p.name === 'zz-pro' || p.id === createdProduct.id
  );
  if (!foundZz) {
    throw new Error(
      'CRITICAL FAILURE: Product "zz-pro" created by seller is NOT appearing on Customer Storefront!'
    );
  }

  console.log('\n====================================================');
  console.log('🎉 CRITICAL SUCCESS: Seller product appears on Customer Storefront!');
  console.log(`   - Product ID: ${foundZz.id}`);
  console.log(`   - Product Name: ${foundZz.name}`);
  console.log(`   - Product Type: ${foundZz.productType}`);
  console.log(`   - Price: ₹${foundZz.price}`);
  console.log(`   - Attached Images in product_images table: ${imageRows.length}`);
  console.log('====================================================');
};

runFullSellerCustomerSyncVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
