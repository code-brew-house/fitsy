import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { club: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.image,
      role: user.role,
      clubId: user.clubId,
      totalPoints: user.totalPoints,
      createdAt: user.createdAt.toISOString(),
      club: user.club
        ? {
            id: user.club.id,
            name: user.club.name,
            inviteCode: user.club.inviteCode,
            createdAt: user.club.createdAt.toISOString(),
          }
        : null,
    };
  }
}
