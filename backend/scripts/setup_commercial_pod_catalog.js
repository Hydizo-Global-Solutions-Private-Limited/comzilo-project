const mysql = require('mysql2/promise');

async function setupCommercialPodCatalog() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('Setting up Commercial Storefront Catalog Images & POD Template Separation...');

  // Professional Commercial Studio Product Photos (Pure White Background, Centered Studio Lighting)
  const commercialCatalogImages = {
    tshirt_black: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
    tshirt_white: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800',
    hoodie_blue: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800',
    mug_white: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800',
    phone_case: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800',
  };

  // 1. Audit POD products
  const podProductIds = [16, 17, 18, 19, 20, 23];

  for (const pid of podProductIds) {
    // Clear legacy mixed images
    await conn.query('DELETE FROM product_images WHERE product_id=?', [pid]);

    let studioImage = commercialCatalogImages.tshirt_black;
    if (pid === 17) studioImage = commercialCatalogImages.phone_case;
    if (pid === 16) studioImage = commercialCatalogImages.mug_white;
    if (pid === 19) studioImage = commercialCatalogImages.tshirt_white;

    // Insert clean commercial studio catalog image
    await conn.query(
      'INSERT INTO product_images (product_id, image_url, is_primary, display_order) VALUES (?, ?, 1, 1)',
      [pid, studioImage]
    );

    // Update product type to print_on_demand
    await conn.query(
      'UPDATE products SET product_type="print_on_demand", status="active" WHERE id=?',
      [pid]
    );
  }

  // Ensure Product #23 ("Enterprise POD Demo T-Shirt") uses Template #2
  await conn.query('UPDATE products SET pod_template_id=2 WHERE id=23');

  // Print final audit table
  const [podCatalog] = await conn.query(
    'SELECT p.id, p.name, p.product_type, p.pod_template_id, pi.image_url FROM products p JOIN product_images pi ON p.id=pi.product_id WHERE p.product_type="print_on_demand"'
  );

  console.log('\n=== COMMERCIAL POD CATALOG STOREFRONT IMAGES ===');
  console.log(podCatalog);

  await conn.end();
}

setupCommercialPodCatalog().catch(console.error);
