import { connectDatabase, sequelize } from '../../config/database';
import { QueryTypes } from 'sequelize';

export const runDirectMigration = async () => {
  await connectDatabase();
  console.log('Connected to MySQL database!');

  const [createStmt]: any = await sequelize.query(`SHOW CREATE TABLE products`, {
    type: QueryTypes.SELECT,
  });
  console.log('SHOW CREATE TABLE products:\n', createStmt['Create Table']);

  console.log('\nCreating product_images table if not exists...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      product_id BIGINT UNSIGNED NOT NULL,
      image_url VARCHAR(1000) NOT NULL,
      thumbnail_url VARCHAR(1000) NULL,
      display_order INT NOT NULL DEFAULT 0,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_product_images_product_id (product_id),
      CONSTRAINT fk_product_images_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('✅ product_images table created successfully!');

  // Modify status column to VARCHAR(50) so it supports all 10 product lifecycle statuses:
  // draft, pending_review, approved, published, hidden, out_of_stock, discontinued, archived, soft_deleted
  await sequelize.query(
    `ALTER TABLE products MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'published'`
  );
  console.log('✅ Altered status column to VARCHAR(50) with default "published"!');

  await sequelize.query(
    `UPDATE products SET status = 'published' WHERE status = '' OR status IS NULL OR status = 'active'`
  );
  console.log('✅ Updated product statuses to "published"!');
};

runDirectMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
