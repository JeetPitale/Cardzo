import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Cardzo database seed...');

  // 1. Create Default Institution
  const institution = await prisma.institution.upsert({
    where: { code: 'APEX-TECH' },
    update: {},
    create: {
      name: 'Apex Institute of Technology & Science',
      code: 'APEX-TECH',
      logoUrl: '/assets/cardzo-logo.png',
      primaryColor: '#0A84FF',
      address: 'Innovation Campus, Silicon Valley, CA'
    }
  });

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 2. Create Users
  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cardzo.io' },
    update: {},
    create: {
      email: 'admin@cardzo.io',
      passwordHash,
      name: 'Dr. Elena Vance',
      role: 'ADMIN',
      department: 'Campus Security & Registrar',
      institutionId: institution.id,
      identifierNumber: 'DIR-8801'
    }
  });

  // Garud Verifier
  const garud = await prisma.user.upsert({
    where: { email: 'garud@cardzo.io' },
    update: {},
    create: {
      email: 'garud@cardzo.io',
      passwordHash,
      name: 'Officer Vikram Singh',
      role: 'GARUD',
      department: 'Campus Security - Gate Alpha',
      institutionId: institution.id,
      identifierNumber: 'SEC-4029'
    }
  });

  // Cardholder 1: Aarav
  const aarav = await prisma.user.upsert({
    where: { email: 'aarav@cardzo.io' },
    update: {},
    create: {
      email: 'aarav@cardzo.io',
      passwordHash,
      name: 'Aarav Sharma',
      role: 'CARDHOLDER',
      department: 'Computer Science & AI',
      institutionId: institution.id,
      identifierNumber: 'CS-2023-0492'
    }
  });

  // Cardholder 2: Priya
  const priya = await prisma.user.upsert({
    where: { email: 'priya@cardzo.io' },
    update: {},
    create: {
      email: 'priya@cardzo.io',
      passwordHash,
      name: 'Priya Patel',
      role: 'CARDHOLDER',
      department: 'Electrical Engineering',
      institutionId: institution.id,
      identifierNumber: 'EE-2024-0118'
    }
  });

  // 3. Create Sample Credentials for Aarav
  // Card 1: Official University ID (Issuer-Verified)
  await prisma.credential.create({
    data: {
      userId: aarav.id,
      institutionId: institution.id,
      type: 'COLLEGE_ID',
      title: 'Apex Student Identity Pass',
      issuerName: 'Apex Institute Registrar',
      cardholderName: aarav.name,
      identifier: 'CS-2023-0492',
      status: 'ACTIVE',
      isScannedPhysical: false,
      isVerified: true,
      colorTheme: 'blue',
      category: 'College ID',
      isPinned: true,
      expiresAt: new Date('2027-06-30')
    }
  });

  // Card 2: Scanned Physical Driving License (Original Look copy, unverified)
  await prisma.credential.create({
    data: {
      userId: aarav.id,
      type: 'DRIVING_LICENSE',
      title: 'State Driver License',
      issuerName: 'Department of Motor Vehicles',
      cardholderName: aarav.name,
      identifier: 'DL-948201-B',
      status: 'ACTIVE',
      isScannedPhysical: true,
      isVerified: false,
      colorTheme: 'emerald',
      category: 'Driving Licence',
      isPinned: false,
      expiresAt: new Date('2028-11-14')
    }
  });

  // Card 3: Scanned Campus Fitness Membership Card
  await prisma.credential.create({
    data: {
      userId: aarav.id,
      type: 'MEMBERSHIP',
      title: 'Apex Arena Fitness & Sports Pass',
      issuerName: 'Apex Recreation Center',
      cardholderName: aarav.name,
      identifier: 'FIT-2024-99',
      status: 'ACTIVE',
      isScannedPhysical: true,
      isVerified: false,
      colorTheme: 'purple',
      category: 'Membership',
      isPinned: false
    }
  });

  // Card 4: Priya's Student ID
  await prisma.credential.create({
    data: {
      userId: priya.id,
      institutionId: institution.id,
      type: 'COLLEGE_ID',
      title: 'Apex Student Identity Pass',
      issuerName: 'Apex Institute Registrar',
      cardholderName: priya.name,
      identifier: 'EE-2024-0118',
      status: 'ACTIVE',
      isScannedPhysical: false,
      isVerified: true,
      colorTheme: 'blue',
      category: 'College ID',
      isPinned: true,
      expiresAt: new Date('2028-05-31')
    }
  });

  // 4. Past Attendance Sessions for Aarav (for realistic streak & logs)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(9, 15, 0, 0);

  const yesterdayOut = new Date(yesterday);
  yesterdayOut.setHours(17, 30, 0, 0);

  const pastSession = await prisma.attendanceSession.create({
    data: {
      userId: aarav.id,
      institutionId: institution.id,
      checkInTimestamp: yesterday,
      checkOutTimestamp: yesterdayOut,
      checkInVerifierId: garud.id,
      checkOutVerifierId: garud.id,
      location: 'Main Gate Alpha',
      status: 'CHECKED_OUT'
    }
  });

  await prisma.attendanceEvent.create({
    data: {
      sessionId: pastSession.id,
      userId: aarav.id,
      verifierId: garud.id,
      eventType: 'CHECK_IN',
      timestamp: yesterday,
      notes: 'Check-in via Garud Scanner at Main Gate Alpha'
    }
  });

  await prisma.attendanceEvent.create({
    data: {
      sessionId: pastSession.id,
      userId: aarav.id,
      verifierId: garud.id,
      eventType: 'CHECK_OUT',
      timestamp: yesterdayOut,
      notes: 'Check-out via Garud Scanner at Main Gate Alpha'
    }
  });

  console.log('✅ Seed completed successfully!');
  console.log('Credentials seeded:');
  console.log('  Admin:       admin@cardzo.io / Password123!');
  console.log('  Garud Staff: garud@cardzo.io / Password123!');
  console.log('  Cardholder:  aarav@cardzo.io / Password123!');
  console.log('  Cardholder:  priya@cardzo.io / Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
