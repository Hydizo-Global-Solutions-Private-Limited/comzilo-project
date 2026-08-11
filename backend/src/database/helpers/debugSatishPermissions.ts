import { connectDatabase, sequelize } from '../../config/database';
import { User, UserRole, Role, Permission } from '../models';
import { AuthorizationService } from '../../services/authorization.service';
import { QueryTypes } from 'sequelize';

export const debugSatishPermissions = async () => {
  await connectDatabase();
  const authzService = new AuthorizationService();

  console.log('====================================================');
  console.log('DEBUGGING USER PERMISSIONS & USER_ROLES IN DB');
  console.log('====================================================');

  // Find user "satish trade" or seller users
  const users: any = await sequelize.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.tenant_id
     FROM users u
     ORDER BY u.id DESC LIMIT 10`,
    { type: QueryTypes.SELECT }
  );

  console.log('Recent Users in DB:');
  console.table(users);

  for (const user of users) {
    const userRoles: any = await sequelize.query(
      `SELECT ur.id, ur.user_id, ur.role_id, ur.tenant_id, ur.store_id, r.code as role_code
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = :userId`,
      { replacements: { userId: user.id }, type: QueryTypes.SELECT }
    );

    console.log(`\nUser ID: ${user.id} (${user.email}) - UserRoles entries:`);
    console.table(userRoles);

    const permsWithUndefinedStore = await authzService.getUserPermissions(user.tenant_id, user.id);
    const permsWithStore1 = await authzService.getUserPermissions(user.tenant_id, user.id, 1);

    console.log(`Permissions (storeId = undefined): Count = ${permsWithUndefinedStore.length}`);
    console.log(`Permissions (storeId = 1): Count = ${permsWithStore1.length}`);
    console.log(
      `Has 'warehouse.create' (undefined storeId): ${permsWithUndefinedStore.includes('warehouse.create')}`
    );
    console.log(
      `Has 'warehouse.create' (storeId = 1): ${permsWithStore1.includes('warehouse.create')}`
    );
  }
};

if (require.main === module) {
  debugSatishPermissions()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
