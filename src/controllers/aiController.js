const aiService = require('../services/aiService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../utils/response');
const prisma = require('../config/database');

/**
 * Endpoint hỏi AI
 */
const askQuestion = asyncHandler(async (req, res) => {
  const { question, mode } = req.body;
  const userId = req.user ? req.user.id : null;

  if (!question) {
    return sendError(res, 'Vui lòng cung cấp câu hỏi.', 400);
  }

  const result = await aiService.askQuestion(question, mode || 'qa', userId);

  return sendSuccess(
    res,
    'Trả lời từ AI thành công',
    result,
    null,
    200
  );
});

/**
 * Lấy danh sách phiên cha
 */
const getChatSessions = asyncHandler(async (req, res) => {
  const sessions = await prisma.chatSession.findMany({
    where: { userId: req.user.id, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
  });
  return sendSuccess(res, 'Thành công', { sessions });
});

/**
 * Tạo phiên chat mới
 */
const createChatSession = asyncHandler(async (req, res) => {
  const { title } = req.body;
  const session = await prisma.chatSession.create({
    data: {
      userId: req.user.id,
      title: title || 'Cuộc trò chuyện mới',
    },
  });
  return sendSuccess(res, 'Thành công', { session }, null, 201);
});

/**
 * Lấy tin nhắn của phiên cha
 */
const getChatMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await prisma.chatSession.findFirst({
    where: { id, userId: req.user.id, deletedAt: null },
  });
  if (!session) return sendError(res, 'Không tìm thấy phiên chat', 404);

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: id, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  return sendSuccess(res, 'Thành công', { messages });
});

/**
 * Gửi tin nhắn và nhận phản hồi AI (lưu lịch sử)
 */
const sendChatMessage = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message) return sendError(res, 'Vui lòng nhập tin nhắn', 400);

  let activeSessionId = sessionId;
  let session;

  if (!activeSessionId || activeSessionId === 'new') {
    session = await prisma.chatSession.create({
      data: { userId: req.user.id, title: message.substring(0, 30) + '...' },
    });
    activeSessionId = session.id;
  } else {
    session = await prisma.chatSession.findFirst({
      where: { id: activeSessionId, userId: req.user.id, deletedAt: null },
    });
    if (!session) return sendError(res, 'Không tìm thấy phiên chat', 404);
  }

  // Save User message
  const userMsg = await prisma.chatMessage.create({
    data: { sessionId: activeSessionId, role: 'user', content: message },
  });

  // Ask AI
  const result = await aiService.askQuestion(message, 'qa', req.user.id);

  // Save AI message
  const aiMsg = await prisma.chatMessage.create({
    data: { sessionId: activeSessionId, role: 'assistant', content: result.answer },
  });

  await prisma.chatSession.update({
    where: { id: activeSessionId },
    data: { updatedAt: new Date() },
  });

  return sendSuccess(res, 'Thành công', {
    session,
    messages: [userMsg, aiMsg],
    reply: result.answer
  });
});

/**
 * Xóa phiên cha
 */
const deleteChatSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await prisma.chatSession.findFirst({
    where: { id, userId: req.user.id },
  });
  if (!session) return sendError(res, 'Không tìm thấy phiên chat', 404);

  await prisma.chatSession.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return res.status(204).send();
});

module.exports = {
  askQuestion,
  getChatSessions,
  createChatSession,
  getChatMessages,
  sendChatMessage,
  deleteChatSession
};
