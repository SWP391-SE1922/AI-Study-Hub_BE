const nodemailer = require('nodemailer');

<<<<<<< HEAD
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
=======
const getMailCredentials = () => {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT) || 587;
  const secure = port === 465;
  return { user, pass, host, port, secure };
};

const createTransporter = async () => {
  const { user, pass, host, port, secure } = getMailCredentials();
  if (!user || !pass) {
    throw new Error('Thiếu SMTP/EMAIL user hoặc password');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.verify();
  return transporter;
};

const sendMail = async ({ to, subject, html }) => {
  const transporter = await createTransporter();
  const { user } = getMailCredentials();

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || `"AI Study Hub" <${user}>`,
    to,
    subject,
    html,
  });
};

const sendWelcome = async (email, fullName) => {
  return sendMail({
    to: email,
    subject: 'Chào mừng bạn đến với AI Study Hub',
    html: `
      <h2>Chào mừng ${fullName}!</h2>
      <p>Cảm ơn bạn đã tham gia Hệ thống Quản lý Tài liệu Học tập.</p>
      <p>Chúc bạn có trải nghiệm tuyệt vời!</p>
    `,
  });
};

const sendResetPassword = async (email, token) => {
  const resetUrl = process.env.FRONTEND_URL 
    ? `${process.env.FRONTEND_URL}/reset-password?token=${token}`
    : `${process.env.BASE_URL || `http://localhost:${process.env.PORT || 3636}`}/api/auth/reset-password?token=${token}`;

  return sendMail({
    to: email,
    subject: 'Yêu cầu đặt lại mật khẩu - AI Study Hub',
    html: `
      <h2>Yêu cầu đặt lại mật khẩu</h2>
      <p>Bạn nhận được email này vì đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
      <p>Vui lòng nhấp vào đường dẫn bên dưới để đặt lại mật khẩu (đường dẫn có hiệu lực trong 10 phút):</p>
      <br />
      <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background-color:#007bff;color:#fff;text-decoration:none;border-radius:5px;">Đặt lại mật khẩu</a>
      <br /><br />
      <p>Nếu nút trên không hoạt động, hãy copy và dán đường dẫn sau vào trình duyệt:</p>
      <p>${resetUrl}</p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
    `,
  });
>>>>>>> b33f7ce1b8bf0059cec22bb1703c2a4ed8f774a3
};

const sendVerificationEmail = async (email, token) => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3636}`;
  const verifyLink = `${baseUrl}/api/auth/verify-email?token=${token}`;
<<<<<<< HEAD
  
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
=======

  return sendMail({
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
>>>>>>> b33f7ce1b8bf0059cec22bb1703c2a4ed8f774a3
};

module.exports = {
  sendWelcome,
  sendResetPassword,
  sendVerificationEmail,
};
