const mysql = require('mysql2/promise');

async function createPodTshirt() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db'
  });

  console.log('Connected to comzilo_db');

  const tshirtImg = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800';

  const [result] = await connection.execute(
    `INSERT INTO products 
    (tenant_id, store_id, product_type, name, slug, sku, short_description, description, status, price, product_type_id, created_by, updated_by, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      3,
      1,
      'print_on_demand',
      'Custom Premium Cotton T-Shirt',
      'custom-premium-cotton-tshirt-' + Date.now(),
      'POD-TSHIRT-REAL-' + Math.floor(1000 + Math.random() * 9000),
      '100% Organic Cotton Custom POD T-Shirt',
      'High-grade 100% combed organic cotton print-on-demand T-shirt with 4-side customizable artwork capability.',
      'published',
      499.00,
      5, // POD type ID
      1,
      1
    ]
  );

  const productId = result.insertId;
  console.log('Created POD T-Shirt product with ID:', productId);

  // Insert product primary image
  await connection.execute(
    `INSERT INTO product_images (product_id, image_url, thumbnail_url, display_order, is_primary, created_at, updated_at)
    VALUES (?, ?, ?, 1, 1, NOW(), NOW())`,
    [productId, tshirtImg, tshirtImg]
  );
  console.log('Inserted product_images for Product ID:', productId);

  // Insert product POD template
  const initialLayers = JSON.stringify({
    sides: {
      front: { elements: [{ id: 'el_1', type: 'text', content: 'YOUR LOGO HERE', x: 100, y: 140, width: 240, height: 50, color: '#111827', fontSize: 28 }] },
      back: { elements: [] },
      left: { elements: [] },
      right: { elements: [] }
    }
  });

  await connection.execute(
    `INSERT INTO product_pod_templates (product_id, canvas_size, layers_json, mockup_preview_url, print_area, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [productId, '1200x1200', initialLayers, tshirtImg, '300x400']
  );
  console.log('Inserted product_pod_templates for Product ID:', productId);

  await connection.end();
}

createPodTshirt().catch((err) => {
  console.error('Error creating POD tshirt:', err);
  process.exit(1);
});
