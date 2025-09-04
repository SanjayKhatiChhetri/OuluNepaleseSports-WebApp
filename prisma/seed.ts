import { PrismaClient } from '../generated/prisma';
import { UserRole, ContentType, MediaType, RegistrationStatus } from '../backend/src/types/enums';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data (in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning existing data...');
    await prisma.socialPost.deleteMany();
    await prisma.contentTranslation.deleteMany();
    await prisma.eventRegistration.deleteMany();
    await prisma.media.deleteMany();
    await prisma.event.deleteMany();
    await prisma.content.deleteMany();
    await prisma.user.deleteMany();
  }

  // Create users
  console.log('👥 Creating users...');
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ons-webapp.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      name: 'Admin User',
      role: UserRole.ADMIN,
      isActive: true,
      emailVerified: true,
    },
  });

  const editorUser = await prisma.user.create({
    data: {
      email: 'editor@ons-webapp.com',
      passwordHash: await bcrypt.hash('editor123', 10),
      name: 'Content Editor',
      role: UserRole.EDITOR,
      isActive: true,
      emailVerified: true,
    },
  });

  const memberUser = await prisma.user.create({
    data: {
      email: 'member@ons-webapp.com',
      passwordHash: await bcrypt.hash('member123', 10),
      name: 'John Doe',
      phone: '+358401234567',
      role: UserRole.MEMBER,
      isActive: true,
      emailVerified: true,
    },
  });

  const memberUser2 = await prisma.user.create({
    data: {
      email: 'member2@ons-webapp.com',
      passwordHash: await bcrypt.hash('member123', 10),
      name: 'Jane Smith',
      phone: '+358407654321',
      role: UserRole.MEMBER,
      isActive: true,
      emailVerified: true,
    },
  });

  // Create announcements
  console.log('📢 Creating announcements...');
  
  const announcement1 = await prisma.content.create({
    data: {
      type: ContentType.ANNOUNCEMENT,
      title: 'Welcome to ONS WebApp!',
      content: 'We are excited to launch our new community platform. Join us for upcoming events and activities.',
      slug: 'welcome-to-ons-webapp',
      featuredImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
      isPublished: true,
      publishedAt: new Date(),
      priority: 1,
      authorId: adminUser.id,
    },
  });

  const announcement2 = await prisma.content.create({
    data: {
      type: ContentType.ANNOUNCEMENT,
      title: 'New Member Registration Open',
      content: 'We are now accepting new member registrations for the 2024 season. Contact us for more information.',
      slug: 'new-member-registration-open',
      featuredImage: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800',
      isPublished: true,
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      priority: 2,
      authorId: editorUser.id,
    },
  });

  // Create news articles
  console.log('📰 Creating news articles...');
  
  const news1 = await prisma.content.create({
    data: {
      type: ContentType.NEWS,
      title: 'ONS Team Wins Regional Championship',
      content: `Our football team has achieved a remarkable victory in the regional championship! 
      
      The team showed exceptional skill and teamwork throughout the tournament, defeating strong opponents in the semi-finals and finals. This victory marks a significant milestone for our organization and demonstrates the dedication of our players and coaching staff.
      
      We are proud of all team members who contributed to this success and look forward to representing our community in the upcoming national championships.`,
      slug: 'ons-team-wins-regional-championship',
      featuredImage: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
      isPublished: true,
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      authorId: editorUser.id,
    },
  });

  const news2 = await prisma.content.create({
    data: {
      type: ContentType.NEWS,
      title: 'Community Sports Day Success',
      content: `Last weekend's community sports day was a huge success with over 200 participants!
      
      The event featured various sports activities including football, volleyball, badminton, and traditional Nepalese games. Families enjoyed food stalls, cultural performances, and friendly competitions.
      
      Special thanks to all volunteers who made this event possible and to the local businesses who sponsored the activities.`,
      slug: 'community-sports-day-success',
      featuredImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      isPublished: true,
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      authorId: editorUser.id,
    },
  });

  // Create events
  console.log('🎉 Creating events...');
  
  const eventContent1 = await prisma.content.create({
    data: {
      type: ContentType.EVENT,
      title: 'Monthly Football Training',
      content: `Join us for our monthly football training session! All skill levels welcome.
      
      What to bring:
      - Sports clothing and shoes
      - Water bottle
      - Positive attitude!
      
      Training will be conducted by our certified coaches and will include:
      - Warm-up exercises
      - Skill development drills
      - Practice matches
      - Cool-down session`,
      slug: 'monthly-football-training-march-2024',
      featuredImage: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800',
      isPublished: true,
      publishedAt: new Date(),
      authorId: editorUser.id,
    },
  });

  const event1 = await prisma.event.create({
    data: {
      contentId: eventContent1.id,
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      time: '18:00',
      location: 'Oulu Sports Center, Field 2',
      maxParticipants: 30,
      registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      registrationEnabled: true,
    },
  });

  const eventContent2 = await prisma.content.create({
    data: {
      type: ContentType.EVENT,
      title: 'Cultural Festival 2024',
      content: `Annual ONS Cultural Festival celebrating Nepalese heritage and community spirit!
      
      Event highlights:
      - Traditional dance performances
      - Authentic Nepalese cuisine
      - Cultural exhibitions
      - Music performances
      - Children's activities
      - Community awards ceremony
      
      This is a family-friendly event open to all community members and friends.`,
      slug: 'cultural-festival-2024',
      featuredImage: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
      isPublished: true,
      publishedAt: new Date(),
      authorId: adminUser.id,
    },
  });

  const event2 = await prisma.event.create({
    data: {
      contentId: eventContent2.id,
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month from now
      time: '15:00',
      location: 'Oulu Community Center, Main Hall',
      maxParticipants: 200,
      registrationDeadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
      registrationEnabled: true,
    },
  });

  // Create event registrations
  console.log('📝 Creating event registrations...');
  
  await prisma.eventRegistration.create({
    data: {
      eventId: event1.id,
      userId: memberUser.id,
      name: memberUser.name,
      email: memberUser.email,
      phone: memberUser.phone,
      status: RegistrationStatus.CONFIRMED,
    },
  });

  await prisma.eventRegistration.create({
    data: {
      eventId: event1.id,
      userId: memberUser2.id,
      name: memberUser2.name,
      email: memberUser2.email,
      phone: memberUser2.phone,
      dietaryRestrictions: 'Vegetarian',
      status: RegistrationStatus.CONFIRMED,
    },
  });

  // Guest registration (no user account)
  await prisma.eventRegistration.create({
    data: {
      eventId: event2.id,
      name: 'Guest User',
      email: 'guest@example.com',
      phone: '+358401111111',
      status: RegistrationStatus.PENDING,
    },
  });

  // Create sample media
  console.log('🖼️ Creating sample media...');
  
  await prisma.media.create({
    data: {
      filename: 'team-photo-2024.jpg',
      originalName: 'Team Photo 2024.jpg',
      url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300',
      type: MediaType.IMAGE,
      size: 2048000, // 2MB
      mimeType: 'image/jpeg',
      tags: JSON.stringify(['team', 'football', '2024']),
      eventId: event1.id,
      uploadedById: editorUser.id,
      isPublic: false, // Member-only content
    },
  });

  await prisma.media.create({
    data: {
      filename: 'training-highlights.mp4',
      originalName: 'Training Highlights.mp4',
      url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=300',
      type: MediaType.VIDEO,
      size: 1048576, // 1MB
      mimeType: 'video/mp4',
      tags: JSON.stringify(['training', 'football', 'highlights']),
      eventId: event1.id,
      uploadedById: memberUser.id,
      isPublic: false,
    },
  });

  // Create content translations
  console.log('🌐 Creating content translations...');
  
  await prisma.contentTranslation.create({
    data: {
      contentId: announcement1.id,
      language: 'fi',
      title: 'Tervetuloa ONS WebApp:iin!',
      content: 'Olemme innoissamme lanseeratessamme uuden yhteisöalustamme. Liity mukaan tuleviin tapahtumiin ja aktiviteetteihin.',
    },
  });

  await prisma.contentTranslation.create({
    data: {
      contentId: announcement1.id,
      language: 'ne',
      title: 'ONS WebApp मा स्वागत छ!',
      content: 'हामी हाम्रो नयाँ सामुदायिक प्लेटफर्म सुरु गर्न उत्साहित छौं। आगामी कार्यक्रम र गतिविधिहरूमा हामीसँग सामेल हुनुहोस्।',
    },
  });

  console.log('✅ Database seeding completed successfully!');
  console.log(`
  Created:
  - 4 users (1 admin, 1 editor, 2 members)
  - 2 announcements
  - 2 news articles  
  - 2 events
  - 3 event registrations
  - 2 media files
  - 2 content translations
  
  Test accounts:
  - Admin: admin@ons-webapp.com / admin123
  - Editor: editor@ons-webapp.com / editor123
  - Member: member@ons-webapp.com / member123
  - Member2: member2@ons-webapp.com / member123
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });