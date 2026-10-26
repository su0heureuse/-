import { formatDateYMD, formatYearMonth, addMonthsToYM } from '../utils/dateUtils';

export const MOCK_RECEIPT_RESULT = {
  is_valid_receipt: true,
  store: '이마트 에브리데이 역삼점',
  purchase_date: formatDateYMD(new Date()),
  total_amount: 34200,
  items: [
    { name: '서울우유 1L', quantity: '1개', price: 2900, category: '유제품', is_food: true, storage: '냉장', printed_expiry_date: null },
    { name: '국산콩 찌개두부 300g', quantity: '1모', price: 1900, category: '두부/가공식품', is_food: true, storage: '냉장', printed_expiry_date: null },
    { name: '무항생제 대란 10구', quantity: '1팩', price: 3900, category: '계란', is_food: true, storage: '냉장', printed_expiry_date: null },
    { name: '한돈 냉장 삼겹살 400g', quantity: '400g', price: 11800, category: '육류', is_food: true, storage: '냉장', printed_expiry_date: null },
    { name: '흙대파 1단', quantity: '1단', price: 2400, category: '채소', is_food: true, storage: '냉장', printed_expiry_date: null },
    { name: '비비고 왕교자 1.05kg', quantity: '1봉', price: 8900, category: '냉동식품', is_food: true, storage: '냉동', printed_expiry_date: null },
    { name: '종량제봉투 20L', quantity: '2매', price: 900, category: '기타', is_food: false, storage: '실온', printed_expiry_date: null },
    { name: '테크 액체세제 리필', quantity: '1개', price: 1500, category: '기타', is_food: false, storage: '실온', printed_expiry_date: null }
  ]
};

export const generateThreeMonthsDemoData = () => {
  const now = new Date();
  const todayStr = formatDateYMD(now);
  const currentYM = formatYearMonth(now);
  const m1YM = addMonthsToYM(currentYM, -1);
  const m2YM = addMonthsToYM(currentYM, -2);

  const demoPurchases = [
    { id: 'd-p-1', itemId: 'd-1', name: '한돈 삼겹살 500g', category: '육류', price: 13500, purchaseDate: `${m2YM}-05`, source: 'receipt' },
    { id: 'd-p-2', itemId: 'd-2', name: '서울우유 1L', category: '유제품', price: 2900, purchaseDate: `${m2YM}-08`, source: 'receipt' },
    { id: 'd-p-3', itemId: 'd-3', name: '방울토마토 500g', category: '과일', price: 6900, purchaseDate: `${m2YM}-12`, source: 'receipt' },
    { id: 'd-p-4', itemId: 'd-4', name: '비비고 김치교자', category: '냉동식품', price: 9500, purchaseDate: `${m2YM}-18`, source: 'receipt' },
    { id: 'd-p-5', itemId: 'd-5', name: '콩나물 1봉', category: '채소', price: 1500, purchaseDate: `${m2YM}-22`, source: 'receipt' },
    { id: 'd-p-6', itemId: 'd-6', name: '특란 30구', category: '계란', price: 7900, purchaseDate: `${m2YM}-25`, source: 'receipt' },

    { id: 'd-p-7', itemId: 'd-7', name: '닭가슴살 1kg', category: '육류', price: 14900, purchaseDate: `${m1YM}-03`, source: 'receipt' },
    { id: 'd-p-8', itemId: 'd-8', name: '서울우유 1L', category: '유제품', price: 2900, purchaseDate: `${m1YM}-07`, source: 'receipt' },
    { id: 'd-p-9', itemId: 'd-9', name: '찌개용 두부 2모', category: '두부/가공식품', price: 3400, purchaseDate: `${m1YM}-11`, source: 'receipt' },
    { id: 'd-p-10', itemId: 'd-10', name: '양파 1망', category: '채소', price: 3900, purchaseDate: `${m1YM}-15`, source: 'receipt' },
    { id: 'd-p-11', itemId: 'd-11', name: '종가집 배추김치', category: '반찬/김치', price: 12900, purchaseDate: `${m1YM}-19`, source: 'receipt' },
    { id: 'd-p-12', itemId: 'd-12', name: '생연어 슬라이스', category: '수산물', price: 15800, purchaseDate: `${m1YM}-24`, source: 'receipt' },
    { id: 'd-p-13', itemId: 'd-13', name: '콩나물 1봉', category: '채소', price: 1500, purchaseDate: `${m1YM}-27`, source: 'receipt' },

    { id: 'd-p-14', itemId: 'item-1', name: '서울우유 1L', category: '유제품', price: 2900, purchaseDate: `${currentYM}-02`, source: 'receipt' },
    { id: 'd-p-15', itemId: 'item-2', name: '찌개용 두부', category: '두부/가공식품', price: 1800, purchaseDate: `${currentYM}-04`, source: 'receipt' },
    { id: 'd-p-16', itemId: 'item-3', name: '계란 (대란)', category: '계란', price: 4500, purchaseDate: `${currentYM}-06`, source: 'manual' },
    { id: 'd-p-17', itemId: 'item-4', name: '한돈 삼겹살', category: '육류', price: 9800, purchaseDate: `${currentYM}-08`, source: 'receipt' },
    { id: 'd-p-18', itemId: 'item-5', name: '양파', category: '채소', price: 2500, purchaseDate: `${currentYM}-10`, source: 'manual' },
    { id: 'd-p-19', itemId: 'item-6', name: '대파', category: '채소', price: 2200, purchaseDate: `${currentYM}-12`, source: 'receipt' },
    { id: 'd-p-20', itemId: 'item-7', name: '배추김치', category: '반찬/김치', price: 11500, purchaseDate: `${currentYM}-14`, source: 'manual' },
    { id: 'd-p-21', itemId: 'd-21', name: '팽이버섯 2봉', category: '채소', price: 1600, purchaseDate: `${currentYM}-15`, source: 'receipt' },
    { id: 'd-p-22', itemId: 'd-22', name: '그릭요거트', category: '유제품', price: 5400, purchaseDate: `${currentYM}-16`, source: 'receipt' },
    { id: 'd-p-23', itemId: 'd-23', name: '훈제오리 슬라이스', category: '육류', price: 8900, purchaseDate: `${currentYM}-18`, source: 'receipt' },
  ];

  const demoLogs = [
    { id: 'd-l-1', itemId: 'd-2', name: '서울우유 1L', category: '유제품', price: 2900, action: 'discarded', actionDate: `${m2YM}-16`, wasNearExpiry: true, viaRescueRecipe: false },
    { id: 'd-l-2', itemId: 'd-5', name: '콩나물 1봉', category: '채소', price: 1500, action: 'discarded', actionDate: `${m2YM}-28`, wasNearExpiry: true, viaRescueRecipe: false },
    { id: 'd-l-3', itemId: 'd-3', name: '방울토마토 500g', category: '과일', price: 6900, action: 'eaten', actionDate: `${m2YM}-17`, wasNearExpiry: true, viaRescueRecipe: false },

    { id: 'd-l-4', itemId: 'd-8', name: '서울우유 1L', category: '유제품', price: 2900, action: 'discarded', actionDate: `${m1YM}-15`, wasNearExpiry: true, viaRescueRecipe: false },
    { id: 'd-l-5', itemId: 'd-13', name: '콩나물 1봉', category: '채소', price: 1500, action: 'discarded', actionDate: `${m1YM}-29`, wasNearExpiry: true, viaRescueRecipe: false },
    { id: 'd-l-6', itemId: 'd-9', name: '찌개용 두부', category: '두부/가공식품', price: 1800, action: 'discarded', actionDate: `${m1YM}-18`, wasNearExpiry: true, viaRescueRecipe: false },
    { id: 'd-l-7', itemId: 'd-10', name: '양파', category: '채소', price: 2500, action: 'discarded', actionDate: `${m1YM}-25`, wasNearExpiry: true, viaRescueRecipe: false },
    { id: 'd-l-8', itemId: 'd-12', name: '생연어 슬라이스', category: '수산물', price: 15800, action: 'eaten', actionDate: `${m1YM}-26`, wasNearExpiry: true, viaRescueRecipe: false },

    { id: 'd-l-9', itemId: 'd-21', name: '팽이버섯 2봉', category: '채소', price: 1600, action: 'eaten', actionDate: todayStr, wasNearExpiry: true, viaRescueRecipe: true },
    { id: 'd-l-10', itemId: 'd-22', name: '그릭요거트', category: '유제품', price: 5400, action: 'eaten', actionDate: todayStr, wasNearExpiry: true, viaRescueRecipe: false },
    { id: 'd-l-11', itemId: 'd-23', name: '훈제오리 슬라이스', category: '육류', price: 8900, action: 'eaten', actionDate: todayStr, wasNearExpiry: true, viaRescueRecipe: true },
    { id: 'd-l-12', itemId: 'd-24', name: '콩나물 1봉', category: '채소', price: 1500, action: 'discarded', actionDate: todayStr, wasNearExpiry: true, viaRescueRecipe: false },
  ];

  return { demoPurchases, demoLogs };
};

export const resizeImageToMax1600 = (file: File): Promise<{ base64Data: string; mimeType: string; previewUrl: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIDE = 1600;
        let { width, height } = img;
        if (width > MAX_SIDE || height > MAX_SIDE) {
          if (width >= height) {
            height = Math.round((height * MAX_SIDE) / width);
            width = MAX_SIDE;
          } else {
            width = Math.round((width * MAX_SIDE) / height);
            height = MAX_SIDE;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64Data = dataUrl.split(',')[1];
        resolve({ base64Data, mimeType: 'image/jpeg', previewUrl: dataUrl });
      };
      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
};

export interface AnalyzeReceiptParams {
  base64ImageData: string;
  mimeType?: string;
  todayYMD: string;
}

export const callGeminiReceiptAnalysis = async ({
  base64ImageData,
  mimeType = 'image/jpeg',
  todayYMD
}: AnalyzeReceiptParams) => {
  const delays = [1000, 2000];
  let lastErr: any = null;

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const res = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64ImageData,
          mimeType,
          todayYMD
        })
      });

      if (!res.ok) {
        let errData: any = null;
        try {
          errData = await res.json();
        } catch {
          // non-JSON response
        }
        const message = errData?.message || errData?.error || `서버 오류 (${res.status})`;
        const error: any = new Error(message);
        error.status = res.status;
        throw error;
      }

      const parsed = await res.json();
      return parsed;
    } catch (err: any) {
      lastErr = err;
      // Do not retry on client errors (400, 413, 429)
      if (err?.status && (err.status === 400 || err.status === 413 || err.status === 429)) {
        throw err;
      }
      if (attempt < delays.length) {
        await new Promise(r => setTimeout(r, delays[attempt]));
      }
    }
  }

  throw lastErr;
};

