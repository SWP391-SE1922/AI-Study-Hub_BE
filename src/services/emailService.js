const nodemailer = require('nodemailer');

const getMailCredentials = () => {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = port === 465;
  const enabled = process.env.SEND_EMAIL !== 'false';
  return { user, pass, host, port, secure, enabled };
};

const createTransporter = async () => {
  const { user, pass, host, port, secure, enabled } = getMailCredentials();

  if (!enabled) {
    throw new Error('SEND_EMAIL=false nên hệ thống không gửi mail thật');
  }

  if (!user || !pass) {
    throw new Error('Thiếu SMTP_USER/EMAIL_USER hoặc SMTP_PASS/EMAIL_PASS trong .env');
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

const buildFrontendUrl = (pathWithQuery) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${frontendUrl}${pathWithQuery}`;
};

const sendMailSafe = async ({ to, subject, html, debugUrl }) => {
  try {
    await sendMail({ to, subject, html });
    return { emailSent: true };
  } catch (error) {
    console.warn('⚠️ Không gửi được email:', error.message);
    if (debugUrl) {
      console.warn('🔗 Link dùng để test local:', debugUrl);
    }
    return {
      emailSent: false,
      reason: error.message,
    };
  }
};

const sendWelcome = async (email, fullName) => {
  return sendMailSafe({
    to: email,
    subject: 'Chào mừng bạn đến với AI Study Hub',
    html: `
      <h2>Chào mừng ${fullName}!</h2>
      <p>Cảm ơn bạn đã tham gia Hệ thống Quản lý Tài liệu Học tập.</p>
      <p>Chúc bạn có trải nghiệm tốt!</p>
    `,
  });
};

const sendResetPassword = async (email, token) => {
  const resetUrl = buildFrontendUrl(`/reset-password?token=${encodeURIComponent(token)}`);

  return sendMailSafe({
    to: email,
    subject: 'Yêu cầu đặt lại mật khẩu - AI Study Hub',
    debugUrl: resetUrl,
    html: `
      <h2>Yêu cầu đặt lại mật khẩu</h2>
      <p>Bạn nhận được email này vì đã yêu cầu đặt lại mật khẩu cho tài khoản AI Study Hub.</p>
      <p>Đường dẫn có hiệu lực trong 10 phút.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;">
          Đặt lại mật khẩu
        </a>
      </p>
      <p>Nếu nút trên không hoạt động, hãy copy đường dẫn này:</p>
      <p>${resetUrl}</p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
    `,
  });
};

const sendVerificationEmail = async (email, token) => {
  const verifyLink = buildFrontendUrl(`/verify-email?token=${encodeURIComponent(token)}`);

  return sendMailSafe({
    to: email,
    subject: 'Xác thực tài khoản AI Study Hub',
    debugUrl: verifyLink,
    html: `
      <h2>Xác thực địa chỉ email</h2>
      <p>Cảm ơn bạn đã đăng ký tài khoản tại AI Study Hub.</p>
      <p>Đường dẫn có hiệu lực trong 24 giờ.</p>
      <p>
        <a href="${verifyLink}" style="display:inline-block;padding:10px 20px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;">
          Xác thực Email
        </a>
      </p>
      <p>Nếu nút trên không hoạt động, hãy copy đường dẫn này:</p>
      <p>${verifyLink}</p>
    `,
  });
};

module.exports = {
  sendWelcome,
  sendResetPassword,
  sendVerificationEmail,
};
