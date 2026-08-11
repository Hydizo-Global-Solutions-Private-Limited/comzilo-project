import { connectDatabase, sequelize } from '../../config/database';
import { QueryTypes } from 'sequelize';

export const alterSchema = async () => {
  await connectDatabase();

  console.log('Updating product_images table columns...');

  const columns: any[] = await sequelize.query(`DESCRIBE product_images`, {
    type: QueryTypes.SELECT,
  });
  const colNames = columns.map((c: any) => c.Field);

  if (!colNames.includes('image_url')) {
    await sequelize.query(
      `ALTER TABLE product_images ADD COLUMN image_url VARCHAR(1000) NULL AFTER product_id`
    );
  }
  if (!colNames.includes('thumbnail_url')) {
    await sequelize.query(
      `ALTER TABLE product_images ADD COLUMN thumbnail_url VARCHAR(1000) NULL AFTER image_url`
    );
  }
  if (!colNames.includes('display_order')) {
    await sequelize.query(
      `ALTER TABLE product_images ADD COLUMN display_order INT NOT NULL DEFAULT 0 AFTER thumbnail_url`
    );
  }
  if (!colNames.includes('is_primary')) {
    await sequelize.query(
      `ALTER TABLE product_images ADD COLUMN is_primary TINYINT(1) NOT NULL DEFAULT 0 AFTER display_order`
    );
  }

  // Populate image_url from url if null
  await sequelize.query(
    `UPDATE product_images SET image_url = url WHERE image_url IS NULL OR image_url = ''`
  );

  console.log(
    '✅ product_images schema updated with image_url, thumbnail_url, display_order, is_primary!'
  );
};

alterSchema()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
