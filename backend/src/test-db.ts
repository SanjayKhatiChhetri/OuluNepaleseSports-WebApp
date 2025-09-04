import { prisma, testDatabaseConnection } from './lib/database';
import { UserRole } from '../generated/prisma';

async function testBasicCRUD() {
  console.log('🧪 Testing basic CRUD operations...');

  try {
    // Test database connection
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // Test CREATE operation
    console.log('📝 Testing CREATE operation...');
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        role: UserRole.MEMBER,
        isActive: true,
        emailVerified: false,
      },
    });
    console.log('✅ User created:', testUser.id);

    // Test READ operation
    console.log('👀 Testing READ operation...');
    const foundUser = await prisma.user.findUnique({
      where: { id: testUser.id },
    });
    console.log('✅ User found:', foundUser?.name);

    // Test UPDATE operation
    console.log('✏️ Testing UPDATE operation...');
    const updatedUser = await prisma.user.update({
      where: { id: testUser.id },
      data: { emailVerified: true },
    });
    console.log('✅ User updated, emailVerified:', updatedUser.emailVerified);

    // Test relationship creation
    console.log('🔗 Testing relationship creation...');
    const testContent = await prisma.content.create({
      data: {
        type: 'ANNOUNCEMENT',
        title: 'Test Announcement',
        content: 'This is a test announcement',
        slug: `test-announcement-${Date.now()}`,
        isPublished: false,
        authorId: testUser.id,
      },
    });
    console.log('✅ Content created with relationship:', testContent.id);

    // Test relationship query
    console.log('🔍 Testing relationship query...');
    const userWithContent = await prisma.user.findUnique({
      where: { id: testUser.id },
      include: {
        createdContent: true,
      },
    });
    console.log('✅ User with content:', userWithContent?.createdContent.length, 'items');

    // Test DELETE operation
    console.log('🗑️ Testing DELETE operation...');
    await prisma.content.delete({
      where: { id: testContent.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    console.log('✅ Test data cleaned up');

    console.log('🎉 All CRUD operations completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ CRUD test failed:', error);
    return false;
  }
}

// Run the test
testBasicCRUD()
  .then((success) => {
    if (success) {
      console.log('✅ Database test completed successfully');
      process.exit(0);
    } else {
      console.log('❌ Database test failed');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });