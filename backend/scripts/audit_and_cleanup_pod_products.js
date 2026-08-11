const mysql = require('mysql2/promise');

async function auditAndCleanupPodProducts() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('=== STEP 1: AUDITING ALL PRODUCTS IN DATABASE ===');
  const [allProducts] = await conn.query(
    'SELECT id, name, slug, product_type, product_type_id, pod_template_id, price, status FROM products ORDER BY id'
  );
  console.log('Total Products in DB:', allProducts.length);
  console.log(allProducts);

  // 2. Identify POD products or products linked to pod_template_id
  const podProducts = allProducts.filter((p) => p.pod_template_id !== null || p.name.toLowerCase().includes('pod') || p.product_type === 'print_on_demand');
  console.log('\n=== POD PRODUCTS IDENTIFIED ===');
  console.log(podProducts);

  // 3. Update Product #23 ("Enterprise POD Demo T-Shirt") to product_type = 'print_on_demand'
  await conn.query(
    'UPDATE products SET product_type="print_on_demand", status="active" WHERE id=23 OR slug="enterprise-pod-demo-tshirt"'
  );

  // 4. Update Product #23 primary image in product_images to a high-res retail product photo
  await conn.query('DELETE FROM product_images WHERE product_id=23');
  await conn.query(
    'INSERT INTO product_images (product_id, image_url, is_primary, display_order) VALUES (23, "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800", 1, 1)'
  );

  // 5. Update Product #20 product_type to 'physical' or 'print_on_demand' based on template config
  await conn.query('UPDATE products SET product_type="print_on_demand" WHERE pod_template_id IS NOT NULL');

  // 6. Audit after updates
  const [auditedProducts] = await conn.query(
    'SELECT p.id, p.name, p.product_type, p.pod_template_id, pi.image_url FROM products p LEFT JOIN product_images pi ON p.id=pi.product_id AND pi.is_primary=1 WHERE p.pod_template_id IS NOT NULL OR p.product_type="print_on_demand"'
  );

  console.log('\n=== AUDITED POD PRODUCTS AFTER UPDATE ===');
  console.log(auditedProducts);

  await conn.end();
}

auditAndCleanupPodProducts().catch(console.error);
