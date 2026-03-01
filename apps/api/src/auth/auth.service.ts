import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { RegisterDto, LoginDto, AuthResponse } from '@fitsy/shared';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let familyId: string | undefined;
    if (dto.inviteCode) {
      const family = await this.prisma.family.findUnique({
        where: { inviteCode: dto.inviteCode },
      });
      if (!family) {
        throw new UnauthorizedException('Invalid invite code');
      }
      familyId = family.id;
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        familyId,
      },
    });

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role as any,
        familyId: user.familyId,
        totalPoints: user.totalPoints,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role as any,
        familyId: user.familyId,
        totalPoints: user.totalPoints,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { family: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      familyId: user.familyId,
      totalPoints: user.totalPoints,
      createdAt: user.createdAt.toISOString(),
      family: user.family
        ? {
            id: user.family.id,
            name: user.family.name,
            inviteCode: user.family.inviteCode,
            createdAt: user.family.createdAt.toISOString(),
          }
        : null,
    };
  }
}
