const mysql = require('mysql2/promise');

async function fixTshirtImages() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db'
  });

  console.log('Connected to comzilo_db');

  // Clean real isolated White T-shirt image
  const realTshirtImg = 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800';

  // 1. Update product_images table
  const [res1] = await connection.execute(
    `UPDATE product_images SET image_url = ?, thumbnail_url = ? WHERE product_id IN (18, 19)`,
    [realTshirtImg, realTshirtImg]
  );
  console.log('Updated product_images table rows:', res1.affectedRows);

  // 2. Update product_pod_templates table
  const [res2] = await connection.execute(
    `UPDATE product_pod_templates SET mockup_preview_url = ? WHERE product_id IN (18, 19)`,
    [realTshirtImg]
  );
  console.log('Updated product_pod_templates table rows:', res2.affectedRows);

  // 3. Verify images for product 18 and 19
  const [rows] = await connection.execute('SELECT * FROM product_images WHERE product_id IN (18, 19)');
  console.log('Current product_images in DB:', rows);

  await connection.end();
}

fixTshirtImages().catch((err) => {
  console.error('Error fixing tshirt images:', err);
  process.exit(1);
});
