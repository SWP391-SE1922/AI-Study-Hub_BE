const aiService = require('../services/aiService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const createSession = asyncHandler(async (req, res) => {
  const session = await aiService.createChatSession(req.user.id, req.body.title);
  return sendSuccess(res, 'Tạo cuộc trò chuyện thành công', { session }, null, 201);
});

const getSessions = asyncHandler(async (req, res) => {
  const sessions = await aiService.getUserChatSessions(req.user.id);
  return sendSuccess(res, 'Lấy danh sách cuộc trò chuyện thành công', { sessions }, null, 200);
});

const getMessages = asyncHandler(async (req, res) => {
  const messages = await aiService.getSessionMessages(req.user.id, req.params.sessionId);
  return sendSuccess(res, 'Lấy tin nhắn thành công', { messages }, null, 200);
});

const chat = asyncHandler(async (req, res) => {
  const result = await aiService.chat(req.user.id, req.body.sessionId, req.body.message);
  return sendSuccess(res, 'Gửi tin nhắn thành công', result, null, 200);
});

const deleteSession = asyncHandler(async (req, res) => {
  await aiService.deleteChatSession(req.user.id, req.params.sessionId);
  return res.status(204).end();
});

module.exports = {
  createSession,
  getSessions,
  getMessages,
  chat,
  deleteSession,
};
