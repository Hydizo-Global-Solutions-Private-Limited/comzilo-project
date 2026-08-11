import { BaseRepository } from '../core/BaseRepository';
import { PasswordResetToken } from '../database/models/passwordResetToken';

export class PasswordResetTokenRepository extends BaseRepository<PasswordResetToken> {
  constructor() {
    super(PasswordResetToken);
  }

  public async findActiveToken(
    tenantId: number | null,
    tokenHash: string
  ): Promise<PasswordResetToken | null> {
    return this.findOne(tenantId, {
      where: {
        tokenHash,
        consumedAt: null,
      },
    });
  }
}
