const mysql = require('mysql2/promise');

async function inspectDb() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('=== INSPECTING POD ASSETS & TEMPLATE LAYERS ===');
  const [layers] = await conn.query(`
    SELECT pvl.id, pvl.view_id, pvl.layer_type, pvl.blend_mode, pvl.opacity, pvl.display_order, pa.name as asset_name, pa.object_key, pa.public_url
    FROM pod_view_layers pvl
    JOIN pod_assets pa ON pvl.asset_id = pa.id
    JOIN pod_template_views ptv ON pvl.view_id = ptv.id
    WHERE ptv.template_id = 1
    ORDER BY pvl.display_order
  `);

  console.log('Template #1 Layers:');
  console.log(layers);

  const [assets] = await conn.query('SELECT * FROM pod_assets');
  console.log('\nAll registered pod_assets:');
  console.log(assets);

  await conn.end();
}

inspectDb().catch(console.error);
