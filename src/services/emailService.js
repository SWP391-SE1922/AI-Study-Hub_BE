const nodemailer = require('nodemailer');

const createTransporter = async () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Thiếu EMAIL_USER hoặc EMAIL_PASS');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.verify();

  return transporter;
};

const sendMail = async ({ to, subject, html }) => {
  const transporter = await createTransporter();

  return transporter.sendMail({
    from:
      process.env.EMAIL_FROM ||
      `"AI Study Hub" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

const sendWelcome = async (email, fullName) => {
  return sendMail({
    to: email,
    subject: 'Chào mừng đến với AI Study Hub',
    html: `
      <h2>Xin chào ${fullName}</h2>
      <p>Tài khoản của bạn đã được tạo thành công.</p>
    `,
  });
};

const sendResetPassword = async (email, token) => {
  const resetUrl =
    `${process.env.FRONTEND_URL || 'http://localhost:5173'}` +
    `/reset-password?token=${token}`;

  console.log('Reset URL:', resetUrl);

  return sendMail({
    to: email,
    subject: 'Đặt lại mật khẩu AI Study Hub',
    html: `
      <h2>Đặt lại mật khẩu</h2>
      <p>Nhấn vào liên kết dưới đây:</p>

      <a href="${resetUrl}">
        Đặt lại mật khẩu
      </a>

      <br><br>

      <p>Hoặc copy link:</p>
      <p>${resetUrl}</p>

      <p>Link hết hạn sau 10 phút.</p>
    `,
  });
};

module.exports = {
  sendWelcome,
  sendResetPassword,
};