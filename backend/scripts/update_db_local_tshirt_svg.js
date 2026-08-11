const mysql = require('mysql2/promise');

async function updateDbLocalSvg() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db'
  });

  console.log('Connected to comzilo_db');

  const localSvgUrl = 'http://localhost:5000/uploads/products/tshirt_white.svg';

  // 1. Update product_images table
  const [res1] = await connection.execute(
    `UPDATE product_images SET image_url = ?, thumbnail_url = ? WHERE product_id IN (18, 19)`,
    [localSvgUrl, localSvgUrl]
  );
  console.log('Updated product_images rows:', res1.affectedRows);

  // 2. Update product_pod_templates table
  const [res2] = await connection.execute(
    `UPDATE product_pod_templates SET mockup_preview_url = ? WHERE product_id IN (18, 19)`,
    [localSvgUrl]
  );
  console.log('Updated product_pod_templates rows:', res2.affectedRows);

  await connection.end();
}

updateDbLocalSvg().catch((err) => {
  console.error('Error updating DB local SVG:', err);
  process.exit(1);
});
