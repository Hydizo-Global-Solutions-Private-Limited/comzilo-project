const mysql = require('mysql2/promise');

async function populateCustomizationForTestOrders() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('=== POPULATING CUSTOMIZATION METADATA FOR RECENT TEST ORDERS ===');

  const transparentGarmentImg = 'http://localhost:5000/uploads/pod_assets/photo_tshirt_base_front.png';
  const transparentMaskImg = 'http://localhost:5000/uploads/pod_assets/photo_tshirt_mask_front.png';
  const productColor = '#DB2777'; // Blush Pink
  const productColorName = 'Blush Pink';

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
    <rect width="500" height="500" fill="#F8FAFC"/>
    <image href="${transparentGarmentImg}" width="500" height="500" preserveAspectRatio="xMidYMid meet"/>
    <rect width="500" height="500" fill="${productColor}" opacity="0.85" style="mask-image: url(${transparentMaskImg}); -webkit-mask-image: url(${transparentMaskImg}); mask-size: contain; -webkit-mask-size: contain; mix-blend-mode: multiply;"/>
    <text x="120" y="240" fill="#FFFFFF" font-size="28" font-family="Inter, sans-serif" font-weight="bold">Custom Lumise Artwork</text>
  </svg>`;

  const previewImage = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;

  const customizationPayload = JSON.stringify({
    productColor,
    productColorName,
    previewImage,
    sides: {
      front: {
        elements: [
          { type: 'text', content: 'Custom Lumise Artwork', color: '#FFFFFF', fontSize: 28, fontFamily: 'Inter', x: 120, y: 240 }
        ]
      }
    },
    createdAt: new Date().toISOString()
  });

  // Update product_name and customization in order_items for recent POD orders
  await conn.query(
    'UPDATE order_items SET product_name = "Custom Premium Cotton T-Shirt (Blush Pink)", customization = ? WHERE product_id = 19',
    [customizationPayload]
  );

  console.log('SUCCESSFULLY POPULATED CUSTOMIZATION METADATA FOR ALL RECENT POD ORDERS!');

  await conn.end();
}

populateCustomizationForTestOrders().catch(console.error);
