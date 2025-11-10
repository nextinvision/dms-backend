import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        serviceCenters: {
          include: {
            serviceCenter: true,
          },
        },
      },
    });

    if (!user) {
      await this.logAudit(null, 'LOGIN', 'User', null, 'Failed login attempt - user not found', ipAddress, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      await this.logAudit(user.id, 'LOGIN', 'User', user.id, 'Failed login attempt - invalid password', ipAddress, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
    });

    // Save session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    // Log successful login
    await this.logAudit(user.id, 'LOGIN', 'User', user.id, 'Successful login', ipAddress, userAgent);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        serviceCenters: user.serviceCenters.map((sc) => ({
          id: sc.serviceCenter.id,
          name: sc.serviceCenter.name,
          code: sc.serviceCenter.code,
        })),
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken);

      const session = await this.prisma.session.findUnique({
        where: { refreshToken: refreshTokenDto.refreshToken },
        include: { user: true },
      });

      if (!session || session.expiresAt < new Date() || session.user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const newPayload = {
        sub: session.user.id,
        email: session.user.email,
        role: session.user.role,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string, userId: string) {
    await this.prisma.session.deleteMany({
      where: {
        refreshToken,
        userId,
      },
    });

    await this.logAudit(userId, 'LOGOUT', 'User', userId, 'User logged out');
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        serviceCenters: {
          include: {
            serviceCenter: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      serviceCenters: user.serviceCenters.map((sc) => ({
        id: sc.serviceCenter.id,
        name: sc.serviceCenter.name,
        code: sc.serviceCenter.code,
      })),
    };
  }

  private async logAudit(
    userId: string | null,
    action: string,
    entityType: string | null,
    entityId: string | null,
    description?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: action as any,
        entityType,
        entityId,
        description,
        ipAddress,
        userAgent,
      },
    });
  }
}

