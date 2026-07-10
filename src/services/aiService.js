const prisma = require('../config/database');
const { getStorageService } = require('../config/storage');
const documentParser = require('../utils/documentParser');
const storageService = getStorageService();

// Ollama Config
const OLLAMA_URL = process.env.Ollama_URL || 'http://localhost:11434';
const OLLAMA_MODEL = 'llama3'; // Default model, can be changed based on user preference

function buildTitle(message) {
  const clean = String(message || '').trim().replace(/\s+/g, ' ');
  if (!clean) return 'Cuộc trò chuyện mới';
  return clean.length > 50 ? `${clean.slice(0, 50)}...` : clean;
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

/**
 * Call Ollama API
 */
async function callOllama(systemPrompt, userPrompt) {
  try {
    // Bắt buộc trả lời bằng Tiếng Việt
    const vietnameseInstruction = 'Bạn phải luôn trả lời bằng Tiếng Việt, không được dùng ngôn ngữ khác. ';
    const fullSystemPrompt = vietnameseInstruction + (systemPrompt || '');
    
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `${fullSystemPrompt}\n\nNgười dùng: ${userPrompt}\nTrợ lý (hãy trả lời bằng Tiếng Việt):`,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error calling Ollama:', error);
    return 'Xin lỗi, tôi không thể kết nối tới máy chủ AI (Ollama) lúc này. Vui lòng thử lại sau.';
  }
}

/**
 * Phân tích từ khóa tìm kiếm
 */
async function extractSearchKeyword(message) {
  // Kết quả keyword có thể có chự "GREETING" hoặc "NULL" bằng tiếng Anh
  const prompt = `Bạn là trợ lý phân tích câu hỏi. Nhiệm vụ của bạn là trích xuất từ khóa chính từ câu hỏi của người dùng.
Nếu người dùng đang chào hỏi (xin chào, hello, hi, …), hãy trả về chính xác chuỗi "GREETING".
Nếu không tìm được tên tài liệu hay từ khóa cụ thể, hãy trả về chính xác chuỗi "NULL".
Chỉ trả về từ khóa, "GREETING", hoặc "NULL", không giải thích gì thêm.

Câu hỏi: "${message}"
Từ khóa:`;

  try {
    const result = await callOllama('', prompt);
    return result.trim();
  } catch (err) {
    return 'NULL';
  }
}

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

  // RAG Logic:
  // 1. Phân tích từ khóa
  const keyword = await extractSearchKeyword(cleanMessage);
  
  let assistantReply = '';
  
  if (keyword === 'GREETING') {
    assistantReply = 'Xin chào! Tôi là Trợ lý AI của hệ thống AI Study Hub. Tôi có thể giúp bạn đọc hiểu, tóm tắt và giải đáp thắc mắc về các tài liệu học tập có trên hệ thống. Bạn muốn tìm hiểu về tài liệu nào?';
  } else if (!keyword || keyword.toUpperCase() === 'NULL' || keyword.toUpperCase().includes('NULL')) {
    // Nếu không có keyword, chat thông thường với AI
    assistantReply = await callOllama('Bạn là trợ lý ảo AI Study Hub thân thiện. Hãy trả lời câu hỏi của người dùng một cách ngắn gọn, súc tích.', cleanMessage);
  } else {
    // Tìm tài liệu CỦA USER HIỆN TẠI dựa vào từ khóa
    const document = await prisma.document.findFirst({
      where: {
        uploadedBy: userId, // BẢO MẬT: CHỈ TÀI LIỆU CỦA USER NÀY
        OR: [
          { title: { contains: keyword } },
          { subject: { contains: keyword } }, // subject là String thường
          { fileName: { contains: keyword } }, // tìm theo tên file
          { category: { name: { contains: keyword } } }, // category là relation
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!document) {
      assistantReply = `Hệ thống không tìm thấy tài liệu nào của bạn liên quan đến từ khóa "${keyword}". Vui lòng đảm bảo bạn đã tải tài liệu này lên hệ thống.`;
    } else {
      try {
        const absolutePath = storageService.getDownloadUrl(document.fileUrl);
        const textContent = await documentParser.parseDocumentText(absolutePath);
        
        // Cắt bớt text nếu quá dài (Ollama context window)
        const truncatedText = textContent.length > 5000 ? textContent.substring(0, 5000) + '...' : textContent;
        
        const systemPrompt = `Bạn là trợ lý học tập thông minh của hệ thống AI Study Hub. Dưới đây là nội dung tài liệu có tên "${document.title}".
Dựa VÀO NỘI DUNG TÀI LIỆU NÀY, hãy trả lời câu hỏi của người dùng bằng Tiếng Việt một cách rõ ràng, dễ hiểu và đầy đủ. Nếu câu hỏi không liên quan đến tài liệu, hãy nói rõ là không tìm thấy thông tin trong tài liệu.
Nội dung tài liệu:
"""
${truncatedText}
"""`;
        
        assistantReply = await callOllama(systemPrompt, cleanMessage);
      } catch (err) {
        console.error('Lỗi RAG:', err);
        assistantReply = 'Xin lỗi, tôi không thể đọc nội dung tài liệu này (có thể file lỗi hoặc định dạng không hỗ trợ).';
      }
    }
  }

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: 'assistant',
      content: assistantReply,
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
