const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu tạo dữ liệu mẫu an toàn...');

  const hashedPassword = await bcrypt.hash('123456', 10);
  const storageLimit = 5 * 1024 * 1024 * 1024;

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {
      password: hashedPassword,
      fullName: 'Admin System',
      role: 'ADMIN',
      isVerified: true,
      storageLimit,
    },
    create: {
      email: 'admin@gmail.com',
      password: hashedPassword,
      fullName: 'Admin System',
      role: 'ADMIN',
      isVerified: true,
      usedStorage: 0,
      storageLimit,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@gmail.com' },
    update: {
      password: hashedPassword,
      fullName: 'Nguyễn Văn A',
      role: 'USER',
      isVerified: true,
      storageLimit,
    },
    create: {
      email: 'student@gmail.com',
      password: hashedPassword,
      fullName: 'Nguyễn Văn A',
      role: 'USER',
      isVerified: true,
      usedStorage: 0,
      storageLimit,
    },
  });

  const categories = [
    ['Toán học', 'Tài liệu môn Toán cao cấp, Giải tích, Đại số tuyến tính'],
    ['Vật lý', 'Tài liệu Vật lý đại cương'],
    ['Lập trình', 'Tài liệu các môn Cấu trúc dữ liệu, Lập trình Web, Di động'],
    ['Kinh tế', 'Tài liệu môn Kinh tế vĩ mô, vi mô'],
    ['Tiếng Anh', 'Tài liệu luyện thi IELTS, TOEIC'],
  ];

  const categoryMap = {};
  for (const [name, description] of categories) {
    const category = await prisma.category.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
    categoryMap[name] = category;
  }

  const existingDocs = await prisma.document.count();
  if (existingDocs === 0) {
    await prisma.document.createMany({
      data: [
        {
          title: 'Tài liệu Giải tích 1',
          description: 'Giáo trình Giải tích 1',
          subject: 'Giải tích 1',
          fileUrl: '/uploads/mock-calculus-1.pdf',
          fileName: 'giai_tich_1.pdf',
          fileSize: 2048576,
          mimeType: 'application/pdf',
          uploadedBy: student.id,
          categoryId: categoryMap['Toán học'].id,
          isPublic: true,
          downloadCount: 15,
        },
        {
          title: 'Slide bài giảng lập trình C++',
          description: 'Slide hướng dẫn lập trình C++ cơ bản đến nâng cao',
          subject: 'Nhập môn lập trình',
          fileUrl: '/uploads/mock-cpp-slides.pdf',
          fileName: 'cpp_lecture_slides.pdf',
          fileSize: 4194304,
          mimeType: 'application/pdf',
          uploadedBy: student.id,
          categoryId: categoryMap['Lập trình'].id,
          isPublic: true,
          downloadCount: 5,
        },
      ],
    });
  }

  console.log('✅ Seed an toàn hoàn tất, không xóa dữ liệu cũ.');
  console.log('Admin:', admin.email, '/ 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
