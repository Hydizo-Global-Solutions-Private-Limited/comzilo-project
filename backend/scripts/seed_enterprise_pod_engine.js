const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

function uuidv4() {
  return crypto.randomUUID();
}

async function seedEnterprisePod() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
    multipleStatements: true,
  });

  console.log('Seeding Enterprise POD Engine data with Product #20 actual image...');

  // 1. Fetch Product #20 primary image URL from product_images table
  const [prodImgRows] = await conn.query('SELECT image_url FROM product_images WHERE product_id=20 AND is_primary=1 LIMIT 1');
  const prod20ImageUrl = prodImgRows.length > 0 ? prodImgRows[0].image_url : 'https://image.hm.com/assets/hm/fb/1e/fb1ec5f3e79a3009b91bc9f12dc45156f01ded57.jpg?imwidth=768';

  // 2. Seed pod_product_types
  const productTypes = [
    { name: 'Apparel', slug: 'apparel' },
    { name: 'Drinkware', slug: 'drinkware' },
    { name: 'Accessories', slug: 'accessories' },
    { name: 'Packaging', slug: 'packaging' },
  ];

  let apparelTypeId = 1;
  for (const pt of productTypes) {
    const [existing] = await conn.query('SELECT id FROM pod_product_types WHERE slug=?', [pt.slug]);
    if (existing.length > 0) {
      if (pt.slug === 'apparel') apparelTypeId = existing[0].id;
    } else {
      const u = uuidv4();
      const [res] = await conn.query('INSERT INTO pod_product_types (uuid, name, slug) VALUES (?, ?, ?)', [u, pt.name, pt.slug]);
      if (pt.slug === 'apparel') apparelTypeId = res.insertId;
    }
  }

  // 3. Register assets in pod_assets table using Product #20's actual uploaded image URL
  const podAssetsDir = path.join(__dirname, '..', 'public', 'uploads', 'pod_assets');
  if (!fs.existsSync(podAssetsDir)) {
    fs.mkdirSync(podAssetsDir, { recursive: true });
  }

  const maskSvgFront = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <path d="M 150 50 L 200 90 C 225 100 275 100 300 90 L 350 50 L 460 125 L 400 200 L 360 170 L 360 450 L 140 450 L 140 170 L 100 200 L 40 125 Z" fill="#000000"/>
  </svg>`;

  fs.writeFileSync(path.join(podAssetsDir, 'tshirt_mask_front.svg'), maskSvgFront);
  fs.writeFileSync(path.join(podAssetsDir, 'tshirt_mask_back.svg'), maskSvgFront);

  const assetRecords = [
    {
      name: 'Product 20 Uploaded Base Image',
      type: 'base_mockup',
      file: 'prod_20_base.jpg',
      url: prod20ImageUrl,
      mime: 'image/jpeg',
    },
    {
      name: 'T-Shirt Mask Front',
      type: 'mask',
      file: 'tshirt_mask_front.svg',
      url: 'http://localhost:5000/uploads/pod_assets/tshirt_mask_front.svg',
      mime: 'image/svg+xml',
    },
    {
      name: 'T-Shirt Mask Back',
      type: 'mask',
      file: 'tshirt_mask_back.svg',
      url: 'http://localhost:5000/uploads/pod_assets/tshirt_mask_back.svg',
      mime: 'image/svg+xml',
    },
  ];

  const assetIds = {};
  for (const ast of assetRecords) {
    const [existing] = await conn.query('SELECT id FROM pod_assets WHERE object_key=?', [ast.file]);
    if (existing.length > 0) {
      await conn.query('UPDATE pod_assets SET public_url=? WHERE id=?', [ast.url, existing[0].id]);
      assetIds[ast.type + '_' + ast.file] = existing[0].id;
    } else {
      const u = uuidv4();
      const [res] = await conn.query(
        'INSERT INTO pod_assets (uuid, tenant_id, name, asset_type, storage_provider, bucket, object_key, public_url, mime_type, width, height) VALUES (?, 1, ?, ?, "local", "default", ?, ?, ?, 800, 800)',
        [u, ast.name, ast.type, ast.file, ast.url, ast.mime]
      );
      assetIds[ast.type + '_' + ast.file] = res.insertId;
    }
  }

  // 4. Seed pod_templates (Classic Reusable T-Shirt Template v1)
  let templateId = 1;
  const [existingTpl] = await conn.query('SELECT id FROM pod_templates WHERE name="Classic Premium Cotton Tee Template v1"');
  if (existingTpl.length > 0) {
    templateId = existingTpl[0].id;
  } else {
    const u = uuidv4();
    const [res] = await conn.query(
      'INSERT INTO pod_templates (uuid, product_type_id, tenant_id, name, rendering_profile, description, version, status) VALUES (?, ?, 1, "Classic Premium Cotton Tee Template v1", "garment", "Standard POD Round-Neck Cotton T-Shirt Template", 1, "published")',
      [u, apparelTypeId]
    );
    templateId = res.insertId;
  }

  // 5. Seed pod_template_views (Front, Back, Left, Right)
  const views = [
    { name: 'Front', order: 1, baseFile: 'prod_20_base.jpg', maskFile: 'tshirt_mask_front.svg' },
    { name: 'Back', order: 2, baseFile: 'prod_20_base.jpg', maskFile: 'tshirt_mask_back.svg' },
    { name: 'Left', order: 3, baseFile: 'prod_20_base.jpg', maskFile: 'tshirt_mask_front.svg' },
    { name: 'Right', order: 4, baseFile: 'prod_20_base.jpg', maskFile: 'tshirt_mask_front.svg' },
  ];

  for (const vw of views) {
    let viewId;
    const [existingVw] = await conn.query('SELECT id FROM pod_template_views WHERE template_id=? AND view_name=?', [templateId, vw.name]);
    if (existingVw.length > 0) {
      viewId = existingVw[0].id;
    } else {
      const u = uuidv4();
      const [res] = await conn.query('INSERT INTO pod_template_views (uuid, template_id, view_name, display_order) VALUES (?, ?, ?, ?)', [
        u,
        templateId,
        vw.name,
        vw.order,
      ]);
      viewId = res.insertId;
    }

    // Seed base_mockup layer (display_order: 1) using Product #20's actual uploaded image URL asset
    const baseAssetId = assetIds['base_mockup_' + vw.baseFile];
    if (baseAssetId) {
      const [existingBase] = await conn.query('SELECT id FROM pod_view_layers WHERE view_id=? AND layer_type="base_mockup"', [viewId]);
      if (existingBase.length === 0) {
        await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "base_mockup", "normal", 1.00, 1)', [
          viewId,
          baseAssetId,
        ]);
      } else {
        await conn.query('UPDATE pod_view_layers SET asset_id=? WHERE id=?', [baseAssetId, existingBase[0].id]);
      }
    }

    // Seed mask layer (display_order: 2)
    const maskAssetId = assetIds['mask_' + vw.maskFile];
    if (maskAssetId) {
      const [existingMask] = await conn.query('SELECT id FROM pod_view_layers WHERE view_id=? AND layer_type="mask"', [viewId]);
      if (existingMask.length === 0) {
        await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "mask", "multiply", 0.90, 2)', [
          viewId,
          maskAssetId,
        ]);
      }
    }
  }

  // Link Product #18, #19, #20 to pod_template_id
  await conn.query('UPDATE products SET pod_template_id=? WHERE id IN (18, 19, 20)', [templateId]);
  console.log('Successfully updated Enterprise POD assets to use Product #20 actual uploaded image URL!');

  await conn.end();
}

seedEnterprisePod().catch(console.error);
