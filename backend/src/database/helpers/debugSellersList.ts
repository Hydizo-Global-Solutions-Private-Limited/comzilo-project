import { connectDatabase } from '../../config/database';
import { User, Tenant, UserProfile, UserRole, Role, Store } from '../models';
import supertest from 'supertest';

export const runDebugSellersList = async () => {
  try {
    await connectDatabase();

    console.log('====================================================');
    console.log('STEP 4 & 5: VERIFY SEQUELIZE ASSOCIATIONS & QUERY');
    console.log('====================================================');

    const users = await User.findAll({
      include: [
        { model: Tenant, as: 'tenant' },
        { model: UserProfile, as: 'profile' },
        {
          model: UserRole,
          as: 'userRoles',
          include: [
            { model: Role, as: 'role' },
            { model: Store, as: 'store' },
          ],
        },
      ],
    });

    console.log(`Direct User.findAll() Rows Returned: ${users.length}`);
    if (users.length > 0) {
      console.log('Sample User Record 0:');
      console.log(
        JSON.stringify(
          {
            id: users[0].id,
            email: users[0].email,
            tenant: users[0].tenant ? { id: users[0].tenant.id, name: users[0].tenant.name } : null,
            profile: users[0].profile
              ? { id: users[0].profile.id, metadata: users[0].profile.metadata }
              : null,
            userRoles: users[0].userRoles?.map((ur: any) => ({
              role: ur.role ? { id: ur.role.id, code: ur.role.code, name: ur.role.name } : null,
              store: ur.store ? { id: ur.store.id, name: ur.store.name } : null,
            })),
          },
          null,
          2
        )
      );
    }

    console.log('====================================================');
    console.log('STEP 1 & 8: HTTP GET /api/v1/admin/sellers VERIFICATION');
    console.log('====================================================');
    const req = supertest('http://localhost:5000');
    const adminRes = await req
      .post('/api/v1/auth/login')
      .send({ email: 'admin@comzilo.com', password: 'SuperAdminSecurePassword2026!' });
    const token = adminRes.body.data.accessToken;

    const sellersRes = await req
      .get('/api/v1/admin/sellers')
      .set('Authorization', 'Bearer ' + token)
      .set('X-Tenant-UUID', '00000000-0000-0000-0000-000000000001');

    console.log(`HTTP Response Status Code: ${sellersRes.status}`);
    console.log(`Total Sellers in API Response: ${sellersRes.body.data?.total}`);
    console.log(`Sellers Array Length in API Response: ${sellersRes.body.data?.sellers?.length}`);
    console.log('Returned API JSON Payload structure:');
    console.log(
      JSON.stringify(
        {
          success: sellersRes.body.success,
          message: sellersRes.body.message,
          dataKeys: Object.keys(sellersRes.body.data || {}),
          sampleSeller: sellersRes.body.data?.sellers?.[0] || null,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error('Debug script error:', error);
  }
};

if (require.main === module) {
  runDebugSellersList().then(() => process.exit(0));
}
