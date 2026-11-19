import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ApiKey } from './entities/api-key.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  // ---------------------------------------------------------------------------
  // PasswordResetToken
  // ---------------------------------------------------------------------------

  createPasswordResetToken(
    data: Partial<PasswordResetToken>,
  ): PasswordResetToken {
    return this.passwordResetTokenRepository.create(data);
  }

  async savePasswordResetToken(
    token: PasswordResetToken,
  ): Promise<PasswordResetToken> {
    return this.passwordResetTokenRepository.save(token);
  }

  async findPasswordResetTokenByHash(
    tokenHash: string,
  ): Promise<PasswordResetToken | null> {
    return this.passwordResetTokenRepository.findOne({
      where: { tokenHash },
    });
  }

  async findPasswordResetTokensByUserId(
    userId: string,
  ): Promise<PasswordResetToken[]> {
    return this.passwordResetTokenRepository.find({
      where: { userId },
    });
  }

  async deletePasswordResetToken(token: PasswordResetToken): Promise<void> {
    await this.passwordResetTokenRepository.remove(token);
  }

  async deletePasswordResetTokensByUserId(userId: string): Promise<void> {
    await this.passwordResetTokenRepository.delete({ userId });
  }

  // ---------------------------------------------------------------------------
  // RefreshToken
  // ---------------------------------------------------------------------------

  createRefreshToken(data: Partial<RefreshToken>): RefreshToken {
    return this.refreshTokenRepository.create(data);
  }

  async saveRefreshToken(token: RefreshToken): Promise<RefreshToken> {
    return this.refreshTokenRepository.save(token);
  }

  async findRefreshTokenByHash(
    tokenHash: string,
  ): Promise<RefreshToken | null> {
    return this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });
  }

  async findRefreshTokensByUserId(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepository.find({
      where: { userId },
    });
  }

  async deleteRefreshToken(token: RefreshToken): Promise<void> {
    await this.refreshTokenRepository.remove(token);
  }

  async deleteRefreshTokensByUserId(userId: string): Promise<void> {
    await this.refreshTokenRepository.delete({ userId });
  }

  async deleteRefreshTokenByHash(tokenHash: string): Promise<void> {
    await this.refreshTokenRepository.delete({ tokenHash });
  }

  // ---------------------------------------------------------------------------
  // ApiKey
  // ---------------------------------------------------------------------------

  createApiKey(data: Partial<ApiKey>): ApiKey {
    return this.apiKeyRepository.create(data);
  }

  async saveApiKey(apiKey: ApiKey): Promise<ApiKey> {
    return this.apiKeyRepository.save(apiKey);
  }

  async findApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
    return this.apiKeyRepository.findOne({
      where: { keyHash },
    });
  }

  async findApiKeyById(id: string): Promise<ApiKey | null> {
    return this.apiKeyRepository.findOne({
      where: { id },
    });
  }

  async findApiKeysByUserId(userId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { userId },
    });
  }

  async deleteApiKey(apiKey: ApiKey): Promise<void> {
    await this.apiKeyRepository.remove(apiKey);
  }

  async deleteApiKeysByUserId(userId: string): Promise<void> {
    await this.apiKeyRepository.delete({ userId });
  }
}