const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu chèn dữ liệu mẫu (Seeding)...');

  // Xóa sạch dữ liệu cũ theo thứ tự phụ thuộc
  await prisma.document.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Hash mật khẩu
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 1. Tạo Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@gmail.com',
      password: hashedPassword,
      fullName: 'Admin System',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  const student = await prisma.user.create({
    data: {
      email: 'student@gmail.com',
      password: hashedPassword,
      fullName: 'Nguyễn Văn A',
      role: 'USER',
      isVerified: true,
    },
  });

  console.log('Tạo người dùng mẫu thành công.');

  // 2. Tạo Categories
  const catMath = await prisma.category.create({
    data: { name: 'Toán học', description: 'Tài liệu môn Toán cao cấp, Giải tích, Đại số tuyến tính' },
  });

  const catPhysics = await prisma.category.create({
    data: { name: 'Vật lý', description: 'Tài liệu Vật lý đại cương' },
  });

  const catProgramming = await prisma.category.create({
    data: { name: 'Lập trình', description: 'Tài liệu các môn Cấu trúc dữ liệu, Lập trình Web, Di động' },
  });

  const catEconomics = await prisma.category.create({
    data: { name: 'Kinh tế', description: 'Tài liệu môn Kinh tế vĩ mô, vi mô' },
  });

  const catEnglish = await prisma.category.create({
    data: { name: 'Tiếng Anh', description: 'Tài liệu luyện thi IELTS, TOEIC' },
  });

  console.log('Tạo danh mục mẫu thành công.');

  // 3. Tạo Documents
  await prisma.document.create({
    data: {
      title: 'Tài liệu Giải tích 1',
      description: 'Giáo trình Giải tích 1 trường Đại học Bách Khoa',
      subject: 'Giải tích 1',
      fileUrl: '/uploads/mock-calculus-1.pdf',
      fileName: 'giai_tich_1.pdf',
      fileSize: 2048576, // 2MB
      mimeType: 'application/pdf',
      uploadedBy: student.id,
      categoryId: catMath.id,
      isPublic: true,
      downloadCount: 15,
    },
  });

  await prisma.document.create({
    data: {
      title: 'Slide bài giảng lập trình C++',
      description: 'Slide hướng dẫn lập trình C++ cơ bản đến nâng cao',
      subject: 'Nhập môn lập trình',
      fileUrl: '/uploads/mock-cpp-slides.pdf',
      fileName: 'cpp_lecture_slides.pdf',
      fileSize: 4194304, // 4MB
      mimeType: 'application/pdf',
      uploadedBy: student.id,
      categoryId: catProgramming.id,
      isPublic: true,
      downloadCount: 5,
    },
  });

  await prisma.document.create({
    data: {
      title: 'Tài liệu TOEIC 750+ ôn tập',
      description: 'Tài liệu nội bộ ôn tập từ vựng ngữ pháp TOEIC',
      subject: 'Tiếng Anh chuyên ngành',
      fileUrl: '/uploads/mock-toeic-prep.docx',
      fileName: 'toeic_vocabulary.docx',
      fileSize: 1024000, // ~1MB
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      uploadedBy: student.id,
      categoryId: catEnglish.id,
      isPublic: false, // Tài liệu riêng tư
      downloadCount: 0,
    },
  });

  console.log('Tạo tài liệu mẫu thành công.');
  console.log('Seeding thành công! 🎉');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
