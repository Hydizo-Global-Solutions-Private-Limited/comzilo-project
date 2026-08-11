const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function downloadAndApplyRealPhotos() {
  const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'products');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const photos = [
    {
      name: 'tshirt_white_real.jpg',
      url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'
    },
    {
      name: 'tshirt_black_real.jpg',
      url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80'
    },
    {
      name: 'phone_case_real.jpg',
      url: 'https://images.unsplash.com/photo-1541877206-e06266933454?w=800&auto=format&fit=crop&q=80'
    }
  ];

  for (const p of photos) {
    const filePath = path.join(uploadsDir, p.name);
    console.log(`Downloading ${p.name}...`);
    const res = await fetch(p.url);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved ${p.name} (${buffer.length} bytes) to ${filePath}`);
  }

  // Update MySQL database records
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db'
  });

  const whitePhotoUrl = 'http://localhost:5000/uploads/products/tshirt_white_real.jpg';
  const blackPhotoUrl = 'http://localhost:5000/uploads/products/tshirt_black_real.jpg';

  // Product 18 ("this logo") -> White T-shirt photo
  await connection.execute(
    `UPDATE product_images SET image_url = ?, thumbnail_url = ? WHERE product_id = 18`,
    [whitePhotoUrl, whitePhotoUrl]
  );
  await connection.execute(
    `UPDATE product_pod_templates SET mockup_preview_url = ? WHERE product_id = 18`,
    [whitePhotoUrl]
  );

  // Product 19 ("Custom Premium Cotton T-Shirt") -> White T-shirt photo
  await connection.execute(
    `UPDATE product_images SET image_url = ?, thumbnail_url = ? WHERE product_id = 19`,
    [whitePhotoUrl, whitePhotoUrl]
  );
  await connection.execute(
    `UPDATE product_pod_templates SET mockup_preview_url = ? WHERE product_id = 19`,
    [whitePhotoUrl]
  );

  console.log('Successfully updated DB with real photographic product image URLs!');
  await connection.end();
}

downloadAndApplyRealPhotos().catch(console.error);
