const aiService = require('../services/aiService');
const documentParser = require('../utils/documentParser');
const { getStorageService } = require('../config/storage');
const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const storageService = getStorageService();

/**
 * Xử lý tin nhắn chat từ người dùng (Hỏi đáp tài liệu)
 */
const chatWithDocument = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body;
  const userId = req.user ? req.user.id : null;

  const greetingMessage = 'Xin chào! Tôi là Trợ lý AI của hệ thống AI Study Hub. Tôi có thể giúp bạn đọc hiểu, tóm tắt và giải đáp thắc mắc về các tài liệu học tập có trên hệ thống. Bạn muốn tìm hiểu về môn học nào?';

  // Nếu frontend chỉ gọi API khởi tạo (không có message) để lấy câu chào
  if (!message || message.trim() === '') {
    return res.status(200).json({
      success: true,
      data: { answer: greetingMessage }
    });
  }

  // 1. Nhờ AI trích xuất từ khóa tìm kiếm (tên tài liệu/môn học) hoặc nhận diện lời chào
  const keyword = await aiService.extractSearchKeyword(message);

  if (keyword === 'GREETING') {
    // Lưu lịch sử nếu có tin nhắn
    if (message) {
      await prisma.chatMessage.create({
        data: {
          sessionId: sessionId || null,
          userId: userId,
          question: message,
          answer: greetingMessage,
          documentId: null
        }
      });
    }
    return res.status(200).json({
      success: true,
      data: { answer: greetingMessage }
    });
  }

  if (!keyword || keyword.toUpperCase() === 'NULL') {
    const errorAns = 'Hệ thống AI không nhận diện được tên tài liệu bạn muốn hỏi. Vui lòng nói rõ tên môn học hoặc tài liệu.';
    await prisma.chatMessage.create({
      data: {
        sessionId: sessionId || null,
        userId: userId,
        question: message,
        answer: errorAns,
        documentId: null
      }
    });
    return res.status(200).json({
      success: true,
      data: { answer: errorAns }
    });
  }

  // 2. Tìm kiếm tài liệu trong DB dựa trên từ khóa
  const document = await prisma.document.findFirst({
    where: {
      OR: [
        { title: { contains: keyword } },
        { subject: { contains: keyword } },
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  // 3. Xử lý yêu cầu nghiệp vụ: Nếu tài liệu chưa up thì báo lỗi mặc định
  if (!document) {
    const errorAns = 'Tài liệu không nằm trong hệ thống của chúng tôi vui lòng thử lại sau.';
    await prisma.chatMessage.create({
      data: {
        sessionId: sessionId || null,
        userId: userId,
        question: message,
        answer: errorAns,
        documentId: null
      }
    });
    return res.status(200).json({
      success: true,
      data: {
        answer: errorAns
      }
    });
  }

  // 4. Lấy đường dẫn vật lý của file
  const absolutePath = storageService.getDownloadUrl(document.fileUrl);

  try {
    // 5. Đọc text từ file
    const textContent = await documentParser.parseDocumentText(absolutePath);

    // 6. Gửi text và câu hỏi cho AI sinh câu trả lời (Dùng RAG)
    const answer = await aiService.answerQuestionWithRAG(document.id, textContent, message);

    // 7. Lưu vào lịch sử
    await prisma.chatMessage.create({
      data: {
        sessionId: sessionId || null,
        userId: userId,
        question: message,
        answer: answer,
        documentId: document.id
      }
    });

    return sendSuccess(res, 'Thành công', { 
      documentFound: document.title,
      answer: answer 
    }, null, 200);

  } catch (error) {
    console.error('Lỗi khi đọc file hoặc gọi AI:', error);
    const errorAns = 'Xin lỗi, đã xảy ra lỗi trong quá trình đọc tài liệu (có thể định dạng không hỗ trợ) hoặc hệ thống AI đang quá tải.';
    await prisma.chatMessage.create({
      data: {
        sessionId: sessionId || null,
        userId: userId,
        question: message,
        answer: errorAns,
        documentId: document ? document.id : null
      }
    });
    return res.status(200).json({
      success: true,
      data: {
        answer: errorAns
      }
    });
  }
});

/**
 * Lấy lịch sử hội thoại
 */
const getChatHistory = asyncHandler(async (req, res) => {
  const { sessionId, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    userId: req.user.id,
  };

  if (sessionId) {
    where.sessionId = sessionId;
  }

  const total = await prisma.chatMessage.count({ where });
  const messages = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    skip,
    take,
    include: {
      document: {
        select: { id: true, title: true }
      }
    }
  });

  return sendSuccess(res, 'Lấy lịch sử thành công', messages, {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit)
  }, 200);
});

module.exports = {
  chatWithDocument,
  getChatHistory,
};
