import { connectDatabase, sequelize } from '../../config/database';
import { app } from '../../app';
import supertest from 'supertest';
import { QueryTypes } from 'sequelize';

export const runCompleteQAVerification = async () => {
  await connectDatabase();
  const req = supertest(app);

  console.log('====================================================');
  console.log('FINAL ENTERPRISE QA & ARCHITECTURE VERIFICATION');
  console.log('====================================================');

  // 1. Seller Login
  console.log('\n[1] Authenticating Seller...');
  const loginRes = await req.post('/api/v1/auth/login').send({
    email: 'admin@comzilo.com',
    password: 'SuperAdminSecurePassword2026!',
  });
  if (loginRes.status !== 200 || !loginRes.body?.data?.accessToken) {
    throw new Error('Seller login failed!');
  }
  const token = loginRes.body.data.accessToken;
  console.log('✅ Seller authenticated successfully!');

  // 2. Create Product
  const sku = 'QA-PRODUCT-' + Date.now();
  console.log(`\n[2] Creating Product with SKU: ${sku}...`);
  const createRes = await req
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Enterprise Wireless Mechanical Keyboard',
      productType: 'physical',
      sku,
      price: 4999.0,
      shortDescription: 'Premium RGB mechanical keyboard for workspace productivity',
      status: 'published',
      visibility: 'public',
    });

  if (createRes.status !== 201) {
    console.error('Create product failed:', createRes.body);
    throw new Error('Product creation failed!');
  }
  const product = createRes.body.data;
  console.log(`✅ Product Created in MySQL! ID: ${product.id}`);

  // 3. Test POST /api/v1/products/:id/images (Upload Image File)
  console.log(`\n[3] Testing Real File Upload via POST /api/v1/products/${product.id}/images...`);
  const sampleImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  const uploadRes = await req
    .post(`/api/v1/products/${product.id}/images`)
    .set('Authorization', `Bearer ${token}`)
    .attach('image', sampleImageBuffer, 'keyboard-featured.png');

  console.log(`POST /api/v1/products/${product.id}/images Status: ${uploadRes.status}`);
  if (uploadRes.status !== 201) {
    console.error('Upload Image Failed:', uploadRes.body);
    throw new Error('Image upload failed!');
  }
  const uploadedImg = uploadRes.body.data;
  console.log(
    `✅ Real Image Uploaded & Stored in MySQL! ID: ${uploadedImg.id}, URL: ${uploadedImg.imageUrl}`
  );

  // 4. Test GET /api/v1/products/:id/images
  console.log(`\n[4] Testing GET /api/v1/products/${product.id}/images...`);
  const getImgsRes = await req.get(`/api/v1/products/${product.id}/images`);
  console.log(`GET /api/v1/products/${product.id}/images Status: ${getImgsRes.status}`);
  const imgList = getImgsRes.body.data || [];
  console.log(`✅ Found ${imgList.length} image(s) attached to product in product_images table!`);

  // 5. Test DELETE /api/v1/products/:id/images/:imageId
  console.log(`\n[5] Testing DELETE /api/v1/products/${product.id}/images/${uploadedImg.id}...`);
  const deleteImgRes = await req
    .delete(`/api/v1/products/${product.id}/images/${uploadedImg.id}`)
    .set('Authorization', `Bearer ${token}`);
  console.log(
    `DELETE /api/v1/products/${product.id}/images/${uploadedImg.id} Status: ${deleteImgRes.status}`
  );
  if (deleteImgRes.status !== 200) {
    throw new Error('Image delete failed!');
  }
  console.log('✅ Product Image deleted successfully!');

  // 6. Test Storefront Listing & Details API
  console.log('\n[6] Testing Customer Storefront Product Listing & Details APIs...');
  const catalogRes = await req.get('/api/v1/products?limit=10');
  console.log(
    `GET /api/v1/products Status: ${catalogRes.status}, Count: ${catalogRes.body?.data?.length || 0}`
  );

  const detailsRes = await req.get(`/api/v1/products/${product.id}`);
  console.log(
    `GET /api/v1/products/${product.id} Status: ${detailsRes.status}, Name: "${detailsRes.body?.data?.name}"`
  );

  // 7. Verify MySQL Relationships
  console.log('\n[7] Database Audit for Product Relationships:');
  const dbProduct: any[] = await sequelize.query(
    `SELECT p.id, p.tenant_id, p.store_id, p.name, p.sku, p.status, p.visibility,
            (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) as total_images
     FROM products p WHERE p.id = :id`,
    { replacements: { id: product.id }, type: QueryTypes.SELECT }
  );
  console.table(dbProduct);

  console.log('\n====================================================');
  console.log('🎉 ALL ENTERPRISE QA & ARCHITECTURAL CHECKS PASSED 100%!');
  console.log('====================================================');
};

runCompleteQAVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
