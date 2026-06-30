const fs = require('fs');
const path = require('path');
const { Ollama: OllamaClient } = require('ollama'); // Raw SDK để lấy danh sách model
const { Ollama, OllamaEmbeddings } = require('@langchain/ollama');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

const OLLAMA_HOST = process.env.Ollama_URL || 'http://localhost:11434';
const ollamaClientInstance = new OllamaClient({ host: OLLAMA_HOST });
const CACHE_DIR = path.join(__dirname, '../../uploads/vector_store');

// Đảm bảo thư mục cache tồn tại
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Lấy model có sẵn trong Ollama
const getAvailableModel = async () => {
  try {
    const response = await ollamaClientInstance.list();
    if (!response.models || response.models.length === 0) {
      throw new Error('Chưa có model nào được cài đặt trong Ollama. Vui lòng chạy lệnh: ollama run llama3');
    }
    const defaultModel = process.env.OLLAMA_MODEL || response.models[0].name;
    return defaultModel;
  } catch (error) {
    console.error('Không thể kết nối với Ollama:', error.message);
    throw new Error('Hệ thống AI hiện đang không khả dụng (Lỗi kết nối Ollama).');
  }
};

/**
 * Phân tích câu hỏi để lấy từ khóa hoặc nhận dạng câu chào
 */
const extractSearchKeyword = async (userMessage) => {
  const model = await getAvailableModel();
  
  const prompt = `
Bạn là một trợ lý ảo phân tích ý định của người dùng.
- Nếu câu của người dùng là một lời chào hỏi thông thường (như "xin chào", "hello", "hi"), HÃY TRẢ VỀ CHỮ "GREETING".
- Nếu người dùng muốn hỏi về tài liệu, nhiệm vụ của bạn là lấy ra TÊN MÔN HỌC hoặc TÊN TÀI LIỆU. HÃY TRẢ VỀ TỪ KHÓA ĐÓ.
- Nếu không tìm thấy hoặc câu hỏi không rõ ràng, HÃY TRẢ VỀ CHỮ "NULL".
TUYỆT ĐỐI CHỈ TRẢ VỀ 1 TRONG 3 KẾT QUẢ TRÊN, KHÔNG TRẢ LỜI THÊM BẤT KỲ CHỮ NÀO KHÁC.

Câu của người dùng: "${userMessage}"
Kết quả:`;

  const response = await ollamaClientInstance.generate({
    model: model,
    prompt: prompt,
    stream: false,
    options: { temperature: 0.1 }
  });

  const keyword = response.response.trim();
  if (keyword.toUpperCase() === 'NULL' || keyword === '') {
    return null;
  }
  return keyword.replace(/^["']|["']$/g, '');
};

// Tính Cosine Similarity
const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Trả lời câu hỏi của người dùng dựa trên RAG (Chunking + Vector Search)
 */
const answerQuestionWithRAG = async (documentId, documentContext, userMessage) => {
  const modelName = await getAvailableModel();
  
  // 1. Khởi tạo Embeddings Model (bắt buộc máy phải cài nomic-embed-text)
  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: OLLAMA_HOST,
  });

  const cacheFile = path.join(CACHE_DIR, `${documentId}.json`);
  let memoryVectors = [];

  // 2. Kiểm tra Cache Vector Store
  if (fs.existsSync(cacheFile)) {
    console.log(`[RAG] Đang tải Vector từ cache cho tài liệu ${documentId}...`);
    memoryVectors = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
  } else {
    console.log(`[RAG] Chưa có cache. Đang xử lý Chunking và Embedding cho tài liệu ${documentId}...`);
    
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const chunks = await splitter.createDocuments([documentContext]);
    
    // Tạo Vector Store thủ công
    for (const chunk of chunks) {
      const vector = await embeddings.embedQuery(chunk.pageContent);
      memoryVectors.push({ content: chunk.pageContent, vector });
    }
    
    // Lưu lại cache
    fs.writeFileSync(cacheFile, JSON.stringify(memoryVectors));
    console.log(`[RAG] Đã lưu cache thành công tại ${cacheFile}.`);
  }

  // 3. Tìm kiếm Vector: Lấy 3 đoạn văn (chunks) liên quan nhất đến câu hỏi
  const queryVector = await embeddings.embedQuery(userMessage);
  
  const scoredChunks = memoryVectors.map(v => ({
    content: v.content,
    score: cosineSimilarity(queryVector, v.vector)
  }));
  
  scoredChunks.sort((a, b) => b.score - a.score);
  const contextChunks = scoredChunks.slice(0, 3).map(doc => doc.content).join('\n\n---\n\n');

  // 4. Gọi LLM sinh câu trả lời
  const llm = new Ollama({
    baseUrl: OLLAMA_HOST,
    model: modelName,
  });

  const prompt = `Bạn là một trợ lý học tập AI thông minh của AI Study Hub.
Dưới đây là một số đoạn trích xuất từ tài liệu do hệ thống tìm được (đã lọc các phần liên quan). 
Hãy sử dụng DUY NHẤT thông tin từ các đoạn trích này để trả lời câu hỏi của người dùng.
Nếu câu hỏi nằm ngoài phạm vi đoạn trích, hãy nói rằng tài liệu không đề cập đến vấn đề này.

--- CÁC ĐOẠN TRÍCH TỪ TÀI LIỆU ---
${contextChunks}

--- CÂU HỎI CỦA NGƯỜI DÙNG ---
${userMessage}

Câu trả lời của bạn:`;

  const response = await llm.invoke(prompt);
  return response.trim();
};

module.exports = {
  extractSearchKeyword,
  answerQuestionWithRAG,
};
