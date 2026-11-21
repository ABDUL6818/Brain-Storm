import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * AddRefreshTokenIndexes — #1475
 *
 * Adds a composite index on refresh_tokens (userId, revoked) so the
 * "live tokens for this user" lookup does not scan the whole table.
 * Matches the @Index(['userId', 'revoked']) declared on RefreshToken.
 */
export class AddRefreshTokenIndexes1760000000002 implements MigrationInterface {
  name = 'AddRefreshTokenIndexes1760000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_REFRESH_TOKENS_USER_REVOKED',
        columnNames: ['userId', 'revoked'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('refresh_tokens', 'IDX_REFRESH_TOKENS_USER_REVOKED');
  }
}
