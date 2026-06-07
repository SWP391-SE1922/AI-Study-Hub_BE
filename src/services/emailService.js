/**
 * Mock Email Service (Không sử dụng SMTP thực, chỉ ghi log ra Console)
 */

const sendWelcome = async (email, fullName) => {
  console.log('========================================================================');
  console.log(`✉️ GỬI EMAIL CHÀO MỪNG`);
  console.log(`Đến: ${fullName} <${email}>`);
  console.log(`Nội dung: Chào mừng bạn đã tham gia Hệ thống Quản lý Tài liệu Học tập!`);
  console.log('========================================================================');
  return true;
};

const sendResetPassword = async (email, token) => {
  const resetLink = `http://localhost:${process.env.PORT || 3636}/api/auth/reset-password?token=${token}`;
  
  console.log('========================================================================');
  console.log(`✉️ GỬI EMAIL ĐẶT LẠI MẬT KHẨU`);
  console.log(`Đến: <${email}>`);
  console.log(`Nội dung: Hãy nhấp vào liên kết sau để đặt lại mật khẩu mới (Hiệu lực 10 phút):`);
  console.log(`👉 Link: ${resetLink}`);
  console.log('========================================================================');
  return true;
};

module.exports = {
  sendWelcome,
  sendResetPassword,
};
