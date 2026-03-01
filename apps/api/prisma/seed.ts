import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data (BetterAuth tables + app tables)
  await prisma.redemption.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.activityType.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.family.deleteMany();

  // Create family
  const family = await prisma.family.create({
    data: {
      name: 'The Smiths',
      inviteCode: 'DEMO1234',
    },
  });

  // Create users (BetterAuth schema: no passwordHash on user, id is a string set externally)
  const adminId = 'seed-admin-001';
  const memberId = 'seed-member-001';

  const admin = await prisma.user.create({
    data: {
      id: adminId,
      email: 'admin@fitsy.dev',
      emailVerified: true,
      name: 'Admin Smith',
      role: 'ADMIN',
      familyId: family.id,
      totalPoints: 0,
    },
  });

  const member = await prisma.user.create({
    data: {
      id: memberId,
      email: 'member@fitsy.dev',
      emailVerified: true,
      name: 'Member Smith',
      role: 'MEMBER',
      familyId: family.id,
      totalPoints: 0,
    },
  });

  // Seed activity types
  const running = await prisma.activityType.create({
    data: { familyId: family.id, name: 'Running', icon: '🏃', measurementType: 'DISTANCE', pointsPerUnit: 1, unit: 'km' },
  });
  const cycling = await prisma.activityType.create({
    data: { familyId: family.id, name: 'Cycling', icon: '🚴', measurementType: 'DISTANCE', pointsPerUnit: 0.4, unit: 'km' },
  });
  const incline = await prisma.activityType.create({
    data: { familyId: family.id, name: 'Incline Treadmill', icon: '⛰️', measurementType: 'DISTANCE', pointsPerUnit: 2, unit: 'km' },
  });
  const homeTread = await prisma.activityType.create({
    data: { familyId: family.id, name: 'Home Treadmill', icon: '🏠', measurementType: 'DISTANCE', pointsPerUnit: 1, unit: 'km' },
  });
  const gym = await prisma.activityType.create({
    data: { familyId: family.id, name: 'Gym Workout', icon: '🏋️', measurementType: 'EFFORT', pointsLow: 4, pointsMedium: 6, pointsHigh: 8, pointsExtreme: 12 },
  });
  const parkWalk = await prisma.activityType.create({
    data: { familyId: family.id, name: 'Outdoor Park Walk', icon: '🌳', measurementType: 'FLAT', flatPoints: 5 },
  });

  // Suppress unused variable warnings
  void incline;
  void homeTread;

  // Sample activity logs
  let adminPoints = 0;
  let memberPoints = 0;

  const logs = [
    { userId: admin.id, activityTypeId: running.id, measurementType: 'DISTANCE' as const, distanceKm: 5, pointsEarned: 5 },
    { userId: admin.id, activityTypeId: gym.id, measurementType: 'EFFORT' as const, effortLevel: 'HIGH' as const, pointsEarned: 8 },
    { userId: admin.id, activityTypeId: parkWalk.id, measurementType: 'FLAT' as const, pointsEarned: 5 },
    { userId: member.id, activityTypeId: cycling.id, measurementType: 'DISTANCE' as const, distanceKm: 10, pointsEarned: 4 },
    { userId: member.id, activityTypeId: gym.id, measurementType: 'EFFORT' as const, effortLevel: 'EXTREME' as const, pointsEarned: 12 },
    { userId: member.id, activityTypeId: running.id, measurementType: 'DISTANCE' as const, distanceKm: 3, pointsEarned: 3 },
  ];

  for (const log of logs) {
    await prisma.activityLog.create({ data: log });
    if (log.userId === admin.id) adminPoints += log.pointsEarned;
    else memberPoints += log.pointsEarned;
  }

  await prisma.user.update({ where: { id: admin.id }, data: { totalPoints: adminPoints } });
  await prisma.user.update({ where: { id: member.id }, data: { totalPoints: memberPoints } });

  // Sample rewards
  await prisma.reward.createMany({
    data: [
      { familyId: family.id, name: 'Movie Night', description: 'Pick any movie for family movie night', pointCost: 50 },
      { familyId: family.id, name: 'Pizza Dinner', description: 'Choose your favorite pizza for dinner', pointCost: 100, quantity: 5 },
      { familyId: family.id, name: 'New Running Shoes', description: 'Get a new pair of running shoes', pointCost: 500, quantity: 1 },
    ],
  });

  console.log('Seed complete!');
  console.log(`Admin (${admin.email}): ${adminPoints} points`);
  console.log(`Member (${member.email}): ${memberPoints} points`);
  console.log('Note: Use BetterAuth API to register real user accounts with passwords.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
