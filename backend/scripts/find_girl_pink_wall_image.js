const mysql = require('mysql2/promise');

async function findGirlPinkWallImage() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('=== SEARCHING DATABASE FOR LIFESTYLE / PINK WALL GIRL IMAGE ===');

  // Search product_images
  const [pi] = await conn.query('SELECT * FROM product_images');
  console.log('product_images:', pi);

  // Search products
  const [p] = await conn.query('SELECT id, name, pod_template_id FROM products');
  console.log('products:', p);

  // Search pod_assets
  const [pa] = await conn.query('SELECT id, name, asset_type, object_key, public_url FROM pod_assets');
  console.log('pod_assets:', pa);

  // Search pod_view_layers for Template 1 and 2
  const [pvl] = await conn.query(`
    SELECT pvl.id, pvl.view_id, pvl.layer_type, pa.name, pa.public_url, pa.object_key
    FROM pod_view_layers pvl
    JOIN pod_assets pa ON pvl.asset_id = pa.id
  `);
  console.log('pod_view_layers:', pvl);

  await conn.end();
}

findGirlPinkWallImage().catch(console.error);
