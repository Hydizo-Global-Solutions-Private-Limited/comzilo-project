const mysql = require('mysql2/promise');

async function fixProduct19AndCleanTemplates() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('=== FIXING PRODUCT #19 & CLEANING TEMPLATE ASSETS ===');

  // 1. Update Product #19 in products table
  await conn.query('UPDATE products SET pod_template_id=1, product_type="print_on_demand", status="active" WHERE id=19');

  // 2. Set clean studio white T-shirt photo in product_images for Product #19
  await conn.query('DELETE FROM product_images WHERE product_id=19');
  await conn.query(
    'INSERT INTO product_images (product_id, image_url, is_primary, display_order) VALUES (19, "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800", 1, 1)'
  );

  // 3. Fetch photographic transparent PNG layer asset IDs
  const [baseAst] = await conn.query('SELECT id FROM pod_assets WHERE object_key="photo_tshirt_base_front.png"');
  const [maskAst] = await conn.query('SELECT id FROM pod_assets WHERE object_key="photo_tshirt_mask_front.png"');
  const [shadowAst] = await conn.query('SELECT id FROM pod_assets WHERE object_key="photo_tshirt_shadow_front.png"');
  const [highlightAst] = await conn.query('SELECT id FROM pod_assets WHERE object_key="photo_tshirt_highlight_front.png"');
  const [textureAst] = await conn.query('SELECT id FROM pod_assets WHERE object_key="photo_tshirt_texture_front.png"');

  const baseId = baseAst.length > 0 ? baseAst[0].id : null;
  const maskId = maskAst.length > 0 ? maskAst[0].id : null;
  const shadowId = shadowAst.length > 0 ? shadowAst[0].id : null;
  const highlightId = highlightAst.length > 0 ? highlightAst[0].id : null;
  const textureId = textureAst.length > 0 ? textureAst[0].id : null;

  // 4. Update pod_view_layers for Template #1 and #2 with 5 separated transparent PNG layers
  const [views] = await conn.query('SELECT id FROM pod_template_views');
  for (const vw of views) {
    await conn.query('DELETE FROM pod_view_layers WHERE view_id=?', [vw.id]);

    if (baseId) {
      await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "base_mockup", "normal", 1.00, 1)', [vw.id, baseId]);
    }
    if (maskId) {
      await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "mask", "multiply", 0.90, 2)', [vw.id, maskId]);
    }
    if (shadowId) {
      await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "shadow", "multiply", 0.75, 3)', [vw.id, shadowId]);
    }
    if (highlightId) {
      await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "highlight", "screen", 0.55, 4)', [vw.id, highlightId]);
    }
    if (textureId) {
      await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "texture", "overlay", 0.45, 5)', [vw.id, textureId]);
    }
  }

  console.log('SUCCESSFULLY FIXED PRODUCT #19 AND INSTALLED 5-LAYER TRANSPARENT PNG TEMPLATE STACK!');

  await conn.end();
}

fixProduct19AndCleanTemplates().catch(console.error);
