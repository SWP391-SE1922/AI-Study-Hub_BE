const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: parseInt(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendWelcome = async (email, fullName) => {
  try {
    const info = await transporter.sendMail({
      from: `"AI Study Hub" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Chào mừng bạn đến với AI Study Hub',
      html: `
        <h2>Chào mừng ${fullName}!</h2>
        <p>Cảm ơn bạn đã tham gia Hệ thống Quản lý Tài liệu Học tập.</p>
        <p>Chúc bạn có trải nghiệm tuyệt vời!</p>
      `,
    });
    console.log('Welcome email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

const sendResetPassword = async (email, token) => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3636}`;
  const resetLink = `${baseUrl}/api/auth/reset-password?token=${token}`;
  
  try {
    const info = await transporter.sendMail({
      from: `"AI Study Hub" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Yêu cầu đặt lại mật khẩu',
      html: `
        <h2>Yêu cầu đặt lại mật khẩu</h2>
        <p>Bạn nhận được email này vì đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
        <p>Vui lòng nhấp vào đường dẫn bên dưới để đặt lại mật khẩu (đường dẫn có hiệu lực trong 10 phút):</p>
        <br />
        <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background-color:#007bff;color:#fff;text-decoration:none;border-radius:5px;">Đặt lại mật khẩu</a>
        <br /><br />
        <p>Nếu nút trên không hoạt động, hãy copy và dán đường dẫn sau vào trình duyệt:</p>
        <p>${resetLink}</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      `,
    });
    console.log('Reset password email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending reset password email:', error);
    return false;
  }
};

const sendVerificationEmail = async (email, token) => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3636}`;
  const verifyLink = `${baseUrl}/api/auth/verify-email?token=${token}`;
  
  try {
    const info = await transporter.sendMail({
      from: `"AI Study Hub" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Xác thực tài khoản AI Study Hub',
      html: `
        <h2>Xác thực địa chỉ email</h2>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại Hệ thống Quản lý Tài liệu Học tập.</p>
        <p>Vui lòng nhấp vào đường dẫn bên dưới để xác thực tài khoản của bạn (đường dẫn có hiệu lực trong 24 giờ):</p>
        <br />
        <a href="${verifyLink}" style="display:inline-block;padding:10px 20px;background-color:#28a745;color:#fff;text-decoration:none;border-radius:5px;">Xác thực Email</a>
        <br /><br />
        <p>Nếu nút trên không hoạt động, hãy copy và dán đường dẫn sau vào trình duyệt:</p>
        <p>${verifyLink}</p>
        <p>Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email.</p>
      `,
    });
    console.log('Verification email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

module.exports = {
  sendWelcome,
  sendResetPassword,
  sendVerificationEmail,
};
