import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parser with 10MB limit to accept base64 image strings
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// -------------------------------------------------------------
// Simple in-memory rate limiter (per client IP)
// Limit: max 15 requests per minute
// -------------------------------------------------------------
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15;

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

const rateLimiter = (req: Request, res: Response, next: () => void) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, record);
    return next();
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfterSec);
    return res.status(429).json({
      error: '요청 횟수 초과',
      message: `요청이 너무 많습니다. ${retryAfterSec}초 후에 다시 시도해주세요.`
    });
  }

  record.count += 1;
  next();
};

// -------------------------------------------------------------
// POST /api/analyze-receipt
// Accepts: { base64ImageData: string, mimeType?: string, todayYMD?: string }
// -------------------------------------------------------------
app.post('/api/analyze-receipt', rateLimiter, async (req: Request, res: Response) => {
  try {
    const rawImage = req.body.base64ImageData || req.body.imageBase64 || req.body.image;
    const mimeType = req.body.mimeType || 'image/jpeg';
    const todayYMD = req.body.todayYMD || new Date().toISOString().slice(0, 10);

    if (!rawImage || typeof rawImage !== 'string') {
      return res.status(400).json({
        error: '잘못된 요청',
        message: '영수증 이미지 데이터(base64)가 제공되지 않았습니다.'
      });
    }

    // Strip data URL scheme prefix if present (e.g. data:image/jpeg;base64,...)
    const cleanBase64 = rawImage.replace(/^data:[^;]+;base64,/, '');

    // Check size limit: Decoded image must be <= 5MB (5,242,880 bytes)
    const approximateByteSize = (cleanBase64.length * 3) / 4;
    const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

    if (approximateByteSize > MAX_IMAGE_BYTES) {
      return res.status(413).json({
        error: '용량 초과',
        message: '영수증 이미지는 최대 5MB 이하만 업로드할 수 있습니다.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: '설정 필요',
        message: '서버에 GEMINI_API_KEY가 설정되지 않았습니다. AI Studio 환경변수 또는 Secret을 설정해주세요.'
      });
    }

    // Initialize Gemini SDK with User-Agent header for telemetry
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const systemInstruction = `당신은 한국 마트/편의점/온라인몰 영수증을 분석하여 식재료 목록과 결제 금액을 정제하는 AI 비서입니다.
1. 사진이 영수증이 아니거나 글씨를 전혀 읽을 수 없을 정도로 흐리면 is_valid_receipt를 false로 반환하세요.
2. 품목명 정제: 영수증 약어와 규격 표기를 사람이 읽는 자연스러운 한국어 이름으로 바꾸세요. (예: "서울)우유1L*1" -> "서울우유 1L")
3. 가격(price): 각 품목의 결제 금액(원 단위 숫자)을 price에 넣고, 영수증 전체 합계 금액을 total_amount에 넣으세요.
4. 식재료 여부(is_food): 종량제봉투, 세제, 휴지, 건전지, 배송비 등 식재료가 아닌 항목은 is_food: false로 분류하세요.
5. category는 반드시 다음 중 하나로 지정하세요: [채소, 과일, 육류, 수산물, 유제품, 계란, 두부/가공식품, 반찬/김치, 냉동식품, 음료, 양념/소스, 기타]
6. storage는 [냉장, 냉동, 실온] 중 가장 적절한 보관 위치를 지정하세요.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `오늘 날짜(${todayYMD}) 기준으로 이 영수증 이미지를 분석해서 JSON으로 반환해줘.` },
            { inlineData: { mimeType, data: cleanBase64 } }
          ]
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_valid_receipt: { type: Type.BOOLEAN },
            store: { type: Type.STRING },
            purchase_date: { type: Type.STRING },
            total_amount: { type: Type.NUMBER },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  category: { type: Type.STRING },
                  is_food: { type: Type.BOOLEAN },
                  storage: { type: Type.STRING },
                  printed_expiry_date: { type: Type.STRING }
                },
                required: ['name', 'quantity', 'category', 'is_food', 'storage']
              }
            }
          },
          required: ['is_valid_receipt', 'store', 'purchase_date', 'total_amount', 'items']
        }
      }
    });

    const responseText = response.text?.trim() || '{}';
    const parsedData = JSON.parse(responseText);

    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.error('[Receipt Analysis Server Error]:', error);
    return res.status(500).json({
      error: '영수증 분석 실패',
      message: error?.message || '영수증을 처리하는 중 서버 오류가 발생했습니다.'
    });
  }
});

// -------------------------------------------------------------
// Vite middleware for dev / static file serving for prod
// -------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
