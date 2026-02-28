import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FamilyModule } from './family/family.module';

@Module({
  imports: [PrismaModule, AuthModule, FamilyModule],
})
export class AppModule {}
