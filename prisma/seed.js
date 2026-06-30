const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu chèn dữ liệu mẫu (Seeding)...');

  // Xóa sạch dữ liệu cũ theo thứ tự phụ thuộc
  await prisma.chatMessage.deleteMany();
  await prisma.document.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  // Hash mật khẩu
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 1. Tạo Roles
  console.log('Tạo vai trò mẫu...');
  const roleAdmin = await prisma.role.create({ data: { name: 'ADMIN' } });
  const roleUser = await prisma.role.create({ data: { name: 'USER' } });
  const roleTeacher = await prisma.role.create({ data: { name: 'TEACHER' } });
  await prisma.role.create({ data: { name: 'GUEST' } });

  // 2. Tạo Users
  console.log('Tạo người dùng mẫu...');
  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@gmail.com',
      password: hashedPassword,
      fullName: 'Nguyễn Văn Thầy',
      roleId: roleTeacher.id,
      isVerified: true,
      storageLimit: 20 * 1024 * 1024 * 1024, // 20GB
      usedStorage: 0,
    },
  });

  await prisma.user.create({
    data: {
      email: 'admin@gmail.com',
      password: hashedPassword,
      fullName: 'Admin System',
      roleId: roleAdmin.id,
      isVerified: true,
      storageLimit: 10 * 1024 * 1024 * 1024, // 10GB
      usedStorage: 0,
    },
  });

  const student = await prisma.user.create({
    data: {
      email: 'student@gmail.com',
      password: hashedPassword,
      fullName: 'Nguyễn Văn A',
      major: 'Công nghệ thông tin',
      roleId: roleUser.id,
      isVerified: true,
      storageLimit: 2 * 1024 * 1024 * 1024, // 2GB
      usedStorage: 0,
    },
  });

  console.log('Tạo người dùng mẫu thành công.');

  // 3. Tạo Categories (Loại tài liệu)
  console.log('Tạo loại tài liệu mẫu...');
  const catSlide = await prisma.category.create({
    data: { name: 'Slide bài giảng', description: 'Slide PowerPoint, PDF bài giảng trên lớp' },
  });

  const catExam = await prisma.category.create({
    data: { name: 'Đề thi & Đáp án', description: 'Đề thi giữa kỳ, cuối kỳ và đáp án mẫu' },
  });

  const catTextbook = await prisma.category.create({
    data: { name: 'Giáo trình / Sách', description: 'Giáo trình chính thức, sách tham khảo' },
  });

  await prisma.category.create({
    data: { name: 'Bài tập lớn / Assignment', description: 'Đề bài tập lớn, project, lab' },
  });

  await prisma.category.create({
    data: { name: 'Tài liệu tham khảo', description: 'Bài báo, tài liệu học thêm ngoài chương trình' },
  });

  console.log('Tạo loại tài liệu mẫu thành công.');

  // 4. Tạo Subjects (Môn học)
  console.log('Tạo môn học mẫu...');
  const subCalculus = await prisma.subject.create({
    data: { name: 'Giải tích 1', description: 'Toán giải tích 1', teacherId: teacher.id },
  });

  const subIntroProg = await prisma.subject.create({
    data: { name: 'Nhập môn lập trình', description: 'Lập trình C/C++ cơ bản', teacherId: teacher.id },
  });

  const subEnglish = await prisma.subject.create({
    data: { name: 'Tiếng Anh chuyên ngành', description: 'Tiếng Anh cho CNTT' },
  });

  console.log('Tạo môn học mẫu thành công.');

  // 5. Tạo Documents
  console.log('Tạo tài liệu mẫu...');
  // Tài liệu công khai do giảng viên đăng
  await prisma.document.create({
    data: {
      title: 'Slide bài giảng Giải tích 1 - Chương 1',
      description: 'Slide bài giảng tuần 1 môn Giải tích 1',
      subjectId: subCalculus.id,
      fileUrl: '/uploads/mock-calculus-slide.pdf',
      fileName: 'giai_tich_1_chuong1.pdf',
      fileSize: 2048576,
      mimeType: 'application/pdf',
      uploadedBy: teacher.id,
      categoryId: catSlide.id,
      isPublic: true,
      status: 'COMPLETED',
      downloadCount: 35,
    },
  });

  await prisma.document.create({
    data: {
      title: 'Đề thi cuối kỳ Giải tích 1 - HK1 2023',
      description: 'Đề thi cuối kỳ kèm đáp án chi tiết',
      subjectId: subCalculus.id,
      fileUrl: '/uploads/mock-calculus-exam.pdf',
      fileName: 'de_thi_giai_tich_1_hk1_2023.pdf',
      fileSize: 512000,
      mimeType: 'application/pdf',
      uploadedBy: teacher.id,
      categoryId: catExam.id,
      isPublic: true,
      status: 'COMPLETED',
      downloadCount: 120,
    },
  });

  await prisma.document.create({
    data: {
      title: 'Giáo trình Nhập môn lập trình C++',
      description: 'Giáo trình chính thức của khoa CNTT',
      subjectId: subIntroProg.id,
      fileUrl: '/uploads/mock-cpp-textbook.pdf',
      fileName: 'giao_trinh_cpp.pdf',
      fileSize: 4194304,
      mimeType: 'application/pdf',
      uploadedBy: teacher.id,
      categoryId: catTextbook.id,
      isPublic: true,
      status: 'COMPLETED',
      downloadCount: 50,
    },
  });

  // Tài liệu cá nhân riêng tư của sinh viên
  await prisma.document.create({
    data: {
      title: 'Ghi chú Giải tích 1 - Tuần 1',
      description: 'Ghi chú cá nhân trong giờ học',
      subjectId: subCalculus.id,
      fileUrl: '/uploads/mock-student-note.pdf',
      fileName: 'ghi_chu_giai_tich_tuan1.pdf',
      fileSize: 300000,
      mimeType: 'application/pdf',
      uploadedBy: student.id,
      categoryId: null,
      isPublic: false,
      status: 'COMPLETED',
      downloadCount: 0,
    },
  });

  await prisma.document.create({
    data: {
      title: 'Tài liệu ôn tập TOEIC 750+',
      description: 'Tài liệu ôn tập từ vựng ngữ pháp TOEIC cá nhân',
      subjectId: subEnglish.id,
      fileUrl: '/uploads/mock-toeic-prep.docx',
      fileName: 'toeic_vocabulary.docx',
      fileSize: 1024000,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      uploadedBy: student.id,
      categoryId: null,
      isPublic: false,
      status: 'COMPLETED',
      downloadCount: 0,
    },
  });

  console.log('Tạo tài liệu mẫu thành công.');
  console.log('Seeding thành công! 🎉');
  console.log('\nTài khoản mẫu:');
  console.log('  Admin   : admin@gmail.com / 123456');
  console.log('  Giảng viên: teacher@gmail.com / 123456');
  console.log('  Sinh viên : student@gmail.com / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
