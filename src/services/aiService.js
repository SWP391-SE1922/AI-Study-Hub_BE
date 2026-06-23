const prisma = require('../config/database');

function buildTitle(message) {
  const clean = String(message || '').trim().replace(/\s+/g, ' ');
  if (!clean) return 'Cuộc trò chuyện mới';
  return clean.length > 50 ? `${clean.slice(0, 50)}...` : clean;
}

function localReply(message) {
  const text = String(message || '').trim();
  const lower = text.toLowerCase();

  if (!text) {
    return 'Bạn hãy nhập nội dung cần hỏi, mình sẽ hỗ trợ theo dữ liệu hiện có của hệ thống.';
  }

  if (lower.includes('jwt')) {
    return 'JWT là token dùng để xác thực đăng nhập. Sau khi đăng nhập, backend trả token cho frontend. Frontend gửi token đó trong header Authorization: Bearer <token> để gọi các API cần đăng nhập.';
  }

  if (lower.includes('upload') || lower.includes('tải tài liệu') || lower.includes('tai tai lieu')) {
    return 'Để upload tài liệu: vào mục Tài liệu, bấm Upload tài liệu, chọn file, nhập tiêu đề, mô tả và phân loại. File sẽ được gửi lên backend qua API /api/documents.';
  }

  if (lower.includes('api')) {
    return 'Frontend không kết nối trực tiếp database. Luồng đúng là FE gọi API backend, backend mới truy vấn SQL Server/Prisma và trả dữ liệu về cho FE.';
  }

  if (lower.includes('cloudinary')) {
    return 'Cloudinary được xử lý ở backend. Frontend chỉ gửi file lên API backend, backend sẽ upload file lên Cloudinary nếu đã cấu hình CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET.';
  }

  return `Mình đã nhận câu hỏi: "${text}". Hiện chat này chạy bằng phản hồi nội bộ không dùng OpenAI API, nên không cần OPENAI_API_KEY. Bạn có thể dùng để kiểm tra giao diện chat, lưu lịch sử và luồng API.`;
}

async function ensureOwnedSession(userId, sessionId) {
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    const error = new Error('Không tìm thấy cuộc trò chuyện hoặc bạn không có quyền truy cập.');
    error.statusCode = 404;
    throw error;
  }

  return session;
}

const createChatSession = async (userId, title = 'Cuộc trò chuyện mới') => {
  return prisma.chatSession.create({
    data: {
      userId,
      title: title || 'Cuộc trò chuyện mới',
    },
  });
};

const getUserChatSessions = async (userId) => {
  return prisma.chatSession.findMany({
    where: { userId },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
};

const getSessionMessages = async (userId, sessionId) => {
  await ensureOwnedSession(userId, sessionId);

  return prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
};

const chat = async (userId, sessionId, message) => {
  const cleanMessage = String(message || '').trim();
  if (!cleanMessage) {
    const error = new Error('Tin nhắn không được để trống.');
    error.statusCode = 400;
    throw error;
  }

  let session;
  if (sessionId) {
    session = await ensureOwnedSession(userId, sessionId);
  } else {
    session = await createChatSession(userId, buildTitle(cleanMessage));
  }

  const userMessage = await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: 'user',
      content: cleanMessage,
    },
  });

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: 'assistant',
      content: localReply(cleanMessage),
    },
  });

  const updatedSession = await prisma.chatSession.update({
    where: { id: session.id },
    data: {
      updatedAt: new Date(),
      title: session.title || buildTitle(cleanMessage),
    },
  });

  return {
    session: updatedSession,
    messages: [userMessage, assistantMessage],
    reply: assistantMessage.content,
  };
};

const deleteChatSession = async (userId, sessionId) => {
  await ensureOwnedSession(userId, sessionId);
  await prisma.chatSession.delete({ where: { id: sessionId } });
  return true;
};

module.exports = {
  createChatSession,
  getUserChatSessions,
  getSessionMessages,
  chat,
  deleteChatSession,
};
