import { connectDatabase, sequelize } from '../../config/database';
import { QueryTypes } from 'sequelize';

export const checkSchema = async () => {
  await connectDatabase();
  const [createStmt]: any = await sequelize.query(`SHOW CREATE TABLE product_images`, {
    type: QueryTypes.SELECT,
  });
  console.log('SHOW CREATE TABLE product_images:\n', createStmt['Create Table']);
};

checkSchema()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
