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
    (seller_id, product_type_id, name, slug, description, short_description, price, is_pod, pod_mockup_type, pod_front_mockup_url, pod_back_mockup_url, images, status, sku, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      1,
      5, // print_on_demand product type
      'Custom Premium Cotton T-Shirt',
      'custom-premium-cotton-tshirt',
      'High-grade 100% combed organic cotton print-on-demand T-shirt with 4-side customizable artwork capability.',
      '100% Organic Cotton Custom POD T-Shirt',
      499.00,
      1,
      'tshirt',
      tshirtImg,
      tshirtImg,
      JSON.stringify([{ url: tshirtImg }]),
      'published',
      'POD-TSHIRT-REAL-001'
    ]
  );

  console.log('Successfully created POD T-Shirt product with ID:', result.insertId);

  // Add seller POD template record
  await connection.execute(
    `INSERT INTO seller_pod_templates
    (seller_id, product_id, category, front_mockup_url, back_mockup_url, layers_json, is_published, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    [
      1,
      result.insertId,
      'tshirt',
      tshirtImg,
      tshirtImg,
      JSON.stringify({
        sides: {
          front: { elements: [{ id: 'el_1', type: 'text', content: 'YOUR CUSTOM LOGO HERE', x: 100, y: 120, width: 240, height: 50, color: '#111827', fontSize: 24 }] },
          back: { elements: [] },
          left: { elements: [] },
          right: { elements: [] }
        }
      })
    ]
  );

  console.log('Successfully created seller_pod_templates record for Product ID:', result.insertId);
  await connection.end();
}

createPodTshirt().catch((err) => {
  console.error('Error creating POD tshirt:', err);
  process.exit(1);
});
