const prisma = require('../config/database');
const { getStorageService } = require('../config/storage');
const documentParser = require('../utils/documentParser');
const storageService = getStorageService();
const fs = require('fs');
const path = require('path');
const https = require('https');

// Ollama Config
const OLLAMA_URL = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = 'qwen2.5:7b';

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
    data: { userId, title: title || 'Cuộc trò chuyện mới' },
  });
};

const getUserChatSessions = async (userId) => {
  return prisma.chatSession.findMany({
    where: { userId },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
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
 * Gọi Ollama API công bằng và bọc tiếng Việt chặt chẽ
 */
async function callOllama(systemPrompt, userPrompt) {
  try {
    const vietnameseInstruction = 'Bạn phải luôn trả lời bằng Tiếng Việt, không được dùng ngôn ngữ khác. ';
    const fullSystemPrompt = vietnameseInstruction + (systemPrompt || '');

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `${fullSystemPrompt}\n\nNgười dùng: ${userPrompt}\nTrợ lý (hãy trả lời bằng Tiếng Việt):`,
        stream: false
      })
    });

    if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error calling Ollama:', error);
    return 'Xin lỗi, tôi không thể kết nối tới máy chủ AI lúc này. Vui lòng thử lại sau.';
  }
}

/**
 * Trích xuất từ khóa sạch sẽ
 */
async function extractSearchKeyword(message) {
  const prompt = `Bạn là một công cụ máy móc phân tích bóc tách dữ liệu cốt lõi, KHÔNG PHẢI một chat bot trò chuyện.
Nhiệm vụ của bạn: Trích xuất DUY NHẤT từ 1 đến 3 từ khóa danh từ quan trọng (tên tài liệu, môn học, chủ đề) từ câu hỏi của người dùng để làm tham số tìm kiếm trong SQL Database.

Quy tắc bắt buộc:
1. Nếu người dùng đang chào hỏi (xin chào, hello, hi, chào bạn...), CHỈ trả về đúng từ: GREETING
2. Nếu câu hỏi chung chung, trò chuyện phiếm, hỏi đáp kiến thức chung hoặc không liên quan đến tìm tài liệu cụ thể (ví dụ: viết một bài văn, giải toán, dịch hộ đoạn này, tính toán, giải thích khái niệm tổng quát...), CHỈ trả về đúng từ: NULL
3. Ngoài 2 trường hợp trên, CHỈ trả về các từ khóa tìm kiếm chính bằng Tiếng Việt. KHÔNG viết thêm câu giải thích, KHÔNG viết từ nối, KHÔNG dùng tiếng Trung, KHÔNG viết "Từ khóa là:".

Câu hỏi của người dùng: "${message}"
Kết quả bóc tách:`;

  try {
    const result = await callOllama('', prompt);
    let cleanResult = result.trim().replace(/['"“”]/g, '');
    if (cleanResult.toUpperCase().includes('GREETING')) return 'GREETING';
    if (cleanResult.toUpperCase().includes('NULL')) return 'NULL';
    return cleanResult;
  } catch (err) {
    return 'NULL';
  }
}

/**
 * Tải file an toàn bằng Stream, xử lý tốt ký tự UTF-8 ẩn
 */
function downloadFileFromUrl(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Tải file thất bại với mã trạng thái: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => { });
      reject(err);
    });
  });
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
    data: { sessionId: session.id, role: 'user', content: cleanMessage },
  });

  const keyword = await extractSearchKeyword(cleanMessage);
  let assistantReply = '';

  if (keyword === 'GREETING') {
    assistantReply = 'Xin chào! Tôi là Trợ lý AI của hệ thống AI Study Hub. Tôi có thể giúp bạn đọc hiểu, tóm tắt và giải đáp thắc mắc về các tài liệu học tập có trên hệ thống. Bạn muốn tìm hiểu về tài liệu nào?';
  } else if (!keyword || keyword.toUpperCase() === 'NULL' || keyword.toUpperCase().includes('NULL')) {
    assistantReply = await callOllama('Bạn là trợ lý ảo AI Study Hub thân thiện. Hãy trả lời câu hỏi của người dùng một cách ngắn gọn, súc tích và hoàn toàn bằng Tiếng Việt.', cleanMessage);
  } else {
    const document = await prisma.document.findFirst({
      where: {
        uploadedBy: userId,
        OR: [
          { title: { contains: keyword } },
          { subject: { contains: keyword } },
          { fileName: { contains: keyword } },
          { category: { name: { contains: keyword } } },
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!document) {
      assistantReply = await callOllama(`Người dùng hỏi về "${keyword}". Hệ thống không tìm thấy file tài liệu nào tên là "${keyword}" trong kho lưu trữ riêng của họ. Hãy dựa vào kiến thức thông minh của bạn để trả lời, tư vấn hoặc định hướng tổng quan về chủ đề này cho họ bằng Tiếng Việt thật hữu ích.`, cleanMessage);
    } else {
      let tempFilePath = '';
      let fileUrl = '';

      try {
        fileUrl = storageService.getDownloadUrl(document.fileUrl);
        const isRemote = fileUrl.startsWith('http://') || fileUrl.startsWith('https://');

        // --- BƯỚC KIỂM TRA ĐỊNH DẠNG FILE HỖ TRỢ ĐỂ TRÁNH CRASH ---
        const fileExtension = path.extname(document.fileName || fileUrl || '').toLowerCase();
        const allowedExtensions = ['.txt', '.pdf', '.docx'];

        if (!allowedExtensions.includes(fileExtension)) {
          // Fallback nếu file là .pptx, .xlsx,... AI sẽ trả lời trực tiếp dựa trên tên file thay vì cố tình giải nén text
          assistantReply = await callOllama(`Người dùng muốn hỏi về tài liệu "${document.title}" (Môn: ${document.subject || 'Chưa rõ'}). Định dạng file này là PowerPoint/Excel (${fileExtension}) nên hệ thống không thể trích xuất toàn bộ văn bản thô trực tiếp. Hãy dựa trên tiêu đề và câu hỏi "${cleanMessage}" để tư vấn thông tin hữu ích nhất cho họ bằng Tiếng Việt.`, cleanMessage);
        } else {
          // Tiến hành xử lý đọc file bình thường đối với định dạng hợp lệ (.txt, .pdf, .docx)
          if (isRemote) {
            const tempDir = path.join(__dirname, '../uploads/temp');
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }

            // Ép tên file tạm không chứa ký tự tiếng việt phức tạp để tránh lỗi font hệ thống ổ đĩa
            tempFilePath = path.join(tempDir, `${Date.now()}_clean_temp${fileExtension}`);
            await downloadFileFromUrl(fileUrl, tempFilePath);
          } else {
            tempFilePath = fileUrl;
          }

          const textContent = await documentParser.parseDocumentText(tempFilePath);
          const truncatedText = textContent.length > 5000 ? textContent.substring(0, 5000) + '...' : textContent;

          const systemPrompt = `Bạn là trợ lý học tập thông minh của hệ thống AI Study Hub. Dưới đây là nội dung tài liệu có tên "${document.title}".
Dựa VÀO NỘI DUNG TÀI LIỆU NÀY, hãy trả lời câu hỏi của người dùng bằng Tiếng Việt một cách rõ ràng, dễ hiểu và đầy đủ. Nếu câu hỏi không liên quan đến tài liệu, hãy nói rõ là không tìm thấy thông tin trong tài liệu.
Nội dung tài liệu:
"""
${truncatedText}
"""`;

          assistantReply = await callOllama(systemPrompt, cleanMessage);

          if (isRemote && tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        }
      } catch (err) {
        console.error('Lỗi RAG:', err);
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try { fs.unlinkSync(tempFilePath); } catch (e) { }
        }
        assistantReply = await callOllama(`Người dùng muốn hỏi về tài liệu "${document.title}". Tuy nhiên hệ thống gặp sự cố kỹ thuật nhỏ khi mở tệp. Hãy trả lời câu hỏi "${cleanMessage}" bằng tri thức sẵn có của bạn một cách lịch sự nhất.`, cleanMessage);
      }
    }
  }

  const assistantMessage = await prisma.chatMessage.create({
    data: { sessionId: session.id, role: 'assistant', content: assistantReply },
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