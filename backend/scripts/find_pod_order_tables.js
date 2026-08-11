const mysql = require('mysql2/promise');

async function findPodOrderTables() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  const [tbls] = await conn.query('SHOW TABLES');
  const names = tbls.map(t => Object.values(t)[0]);
  
  const podTables = names.filter(n => n.includes('pod') || n.includes('custom') || n.includes('design') || n.includes('print'));
  console.log('POD / Customization related tables:', podTables);

  for (const t of podTables) {
    const [cols] = await conn.query(`DESCRIBE ${t}`);
    console.log(`\nTable ${t}:`, cols.map(c => c.Field));
  }

  await conn.end();
}

findPodOrderTables().catch(console.error);
