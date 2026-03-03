import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async register(registerDto: RegisterDto) {
    const existing = await this.usersService.findByEmail(registerDto.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.usersService.create({
      ...registerDto,
    });

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(user: User, userAgent?: string, ipAddress?: string) {
    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken, userAgent, ipAddress);
    await this.usersService.updateLastLogin(user.id);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: tokenHash, isRevoked: false },
      relations: ['user'],
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        await this.refreshTokenRepository.update(storedToken.id, {
          isRevoked: true,
        });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old refresh token (rotation)
    await this.refreshTokenRepository.update(storedToken.id, {
      isRevoked: true,
    });

    // Generate new tokens
    const tokens = await this.generateTokens(storedToken.user);
    await this.storeRefreshToken(storedToken.userId, tokens.refreshToken);

    return {
      user: this.sanitizeUser(storedToken.user),
      ...tokens,
    };
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.refreshTokenRepository.update(
      { token: tokenHash, userId, isRevoked: false },
      { isRevoked: true },
    );
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );

    // Directly update password since update DTO excludes it
    await this.refreshTokenRepository.manager
      .getRepository(User)
      .update(userId, { password: hashedPassword });

    // Revoke all refresh tokens for this user
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );

    return { message: 'Password changed successfully' };
  }

  private async generateTokens(user: User) {
    const payload: Record<string, string> = {
      sub: user.id,
      email: user.email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get('jwt.accessExpiration'),
      } as any),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiration'),
      } as any),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    rawToken: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const tokenHash = this.hashToken(rawToken);

    const expiration =
      this.configService.get<string>('jwt.refreshExpiration') || '7d';
    const expiresAt = this.calculateExpiry(expiration);

    const refreshToken = this.refreshTokenRepository.create({
      token: tokenHash,
      userId,
      expiresAt,
      userAgent,
      ipAddress,
    });

    await this.refreshTokenRepository.save(refreshToken);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private calculateExpiry(duration: string): Date {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2] as 's' | 'm' | 'h' | 'd';
    const msMap: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * msMap[unit]);
  }

  private sanitizeUser(user: User) {
    const { password, ...result } = user;
    return result;
  }
}
