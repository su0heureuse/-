import { formatDateYMD, addDaysToDateStr, DAY_NAMES } from '../utils/dateUtils';

export { DAY_NAMES };

/**
 * 카테고리별 기본 유통기한 테이블 (단위: 일)
 * 모든 이모지를 제거하고 Lucide 1.5px 라인 아이콘 키로 통일
 */
export const CATEGORY_EXPIRY_DAYS_TABLE: Record<
  string,
  { defaultDays: number; freezeDays?: number; defaultStorage: string; iconKey: string; color: string }
> = {
  '채소': { defaultDays: 7, defaultStorage: '냉장', iconKey: 'leaf', color: '#2F7D5B' },
  '과일': { defaultDays: 7, defaultStorage: '냉장', iconKey: 'apple', color: '#47B283' },
  '육류': { defaultDays: 3, freezeDays: 90, defaultStorage: '냉장', iconKey: 'beef', color: '#DC4A3F' },
  '수산물': { defaultDays: 2, freezeDays: 60, defaultStorage: '냉장', iconKey: 'fish', color: '#3B82F6' },
  '유제품': { defaultDays: 7, defaultStorage: '냉장', iconKey: 'milk', color: '#60A5FA' },
  '계란': { defaultDays: 21, defaultStorage: '냉장', iconKey: 'egg', color: '#E39B1B' },
  '두부/가공식품': { defaultDays: 7, defaultStorage: '냉장', iconKey: 'package', color: '#F59E0B' },
  '반찬/김치': { defaultDays: 14, defaultStorage: '냉장', iconKey: 'soup', color: '#EA580C' },
  '냉동식품': { defaultDays: 90, defaultStorage: '냉동', iconKey: 'snowflake', color: '#6366F1' },
  '음료': { defaultDays: 14, defaultStorage: '냉장', iconKey: 'coffee', color: '#14B8A6' },
  '양념/소스': { defaultDays: 90, defaultStorage: '실온', iconKey: 'flask', color: '#8B5CF6' },
  '기타': { defaultDays: 7, defaultStorage: '실온', iconKey: 'box', color: '#9CA39E' },
};

export const FOOD_CATEGORIES = Object.keys(CATEGORY_EXPIRY_DAYS_TABLE);

export const getRecommendedExpiryDays = (category: string, storage?: string): number => {
  const entry = CATEGORY_EXPIRY_DAYS_TABLE[category] || CATEGORY_EXPIRY_DAYS_TABLE['기타'];
  if (storage === '냉동' && entry.freezeDays) return entry.freezeDays;
  if (storage === '냉동' && category !== '냉동식품') return 60;
  return entry.defaultDays;
};

export const STORAGE_PREFIX = 'najhonja_';
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// 초기 샘플 식재료 데이터 (이모지 제거, 카테고리 아이콘 사용)
export const createInitialFridgeItems = () => {
  const todayStr = formatDateYMD(new Date());
  return [
    { id: 'item-1', name: '서울우유 1L', quantity: '1/2개', price: 2900, category: '유제품', storage: '냉장', purchaseDate: todayStr, expiryDate: addDaysToDateStr(todayStr, 1), expiryDays: 1, source: 'receipt' },
    { id: 'item-2', name: '찌개용 두부', quantity: '1모', price: 1800, category: '두부/가공식품', storage: '냉장', purchaseDate: todayStr, expiryDate: addDaysToDateStr(todayStr, 2), expiryDays: 2, source: 'receipt' },
    { id: 'item-3', name: '계란 (대란)', quantity: '6구', price: 4500, category: '계란', storage: '냉장', purchaseDate: todayStr, expiryDate: addDaysToDateStr(todayStr, 5), expiryDays: 5, source: 'manual' },
    { id: 'item-4', name: '한돈 삼겹살', quantity: '300g', price: 9800, category: '육류', storage: '냉동', purchaseDate: todayStr, expiryDate: addDaysToDateStr(todayStr, 18), expiryDays: 18, source: 'receipt' },
    { id: 'item-5', name: '양파', quantity: '2개', price: 2500, category: '채소', storage: '실온', purchaseDate: todayStr, expiryDate: addDaysToDateStr(todayStr, -1), expiryDays: -1, source: 'manual' },
    { id: 'item-6', name: '대파', quantity: '1단', price: 2200, category: '채소', storage: '냉장', purchaseDate: todayStr, expiryDate: addDaysToDateStr(todayStr, 3), expiryDays: 3, source: 'receipt' },
    { id: 'item-7', name: '배추김치', quantity: '1통', price: 11500, category: '반찬/김치', storage: '냉장', purchaseDate: todayStr, expiryDate: addDaysToDateStr(todayStr, 30), expiryDays: 30, source: 'manual' },
    { id: 'item-8', name: '햇반', quantity: '4개', price: null, category: '두부/가공식품', storage: '실온', purchaseDate: todayStr, expiryDate: addDaysToDateStr(todayStr, 90), expiryDays: 90, source: 'receipt' },
  ];
};

export const createInitialPurchaseHistory = (fridgeItems: any[]) => {
  return fridgeItems.map(item => ({
    id: `pur-${item.id}`,
    itemId: item.id,
    name: item.name,
    category: item.category,
    price: item.price !== undefined && item.price !== null && item.price !== '' ? Number(item.price) : null,
    purchaseDate: item.purchaseDate,
    source: item.source || 'manual'
  }));
};

export const createInitialActionLogs = () => {
  const todayStr = formatDateYMD(new Date());
  const threeDaysAgo = addDaysToDateStr(todayStr, -3);
  const fiveDaysAgo = addDaysToDateStr(todayStr, -5);
  return [
    { id: 'log-init-1', itemId: 'old-1', name: '팽이버섯', category: '채소', price: 1200, action: 'eaten', actionDate: threeDaysAgo, wasNearExpiry: true, viaRescueRecipe: true },
    { id: 'log-init-2', itemId: 'old-2', name: '슬라이스 치즈', category: '유제품', price: 3800, action: 'eaten', actionDate: fiveDaysAgo, wasNearExpiry: true, viaRescueRecipe: false },
    { id: 'log-init-3', itemId: 'old-3', name: '콩나물 1봉', category: '채소', price: 1500, action: 'discarded', actionDate: fiveDaysAgo, wasNearExpiry: true, viaRescueRecipe: false },
  ];
};

export const createInitialShoppingList = () => [
  { id: 'shop-init-1', name: '대파', quantity: '1단', section: 'food', category: '채소', reasonTag: '다 먹었어요', checked: false, supplyId: null },
  { id: 'shop-init-2', name: '팽이버섯', quantity: '2봉', section: 'food', category: '채소', reasonTag: '다 먹었어요', checked: false, supplyId: null },
];

export const INITIAL_BILLS = [
  { id: 1, type: '관리비', name: '오피스텔 관리비', amount: 85000, prevAmount: 82000, dueDate: '오늘 마감', dDay: 0, isPaid: false, icon: 'building' },
  { id: 2, type: '수도세', name: '상하수도 요금', amount: 8400, prevAmount: 8400, dueDate: '3일 남음', dDay: 3, isPaid: false, icon: 'droplets' },
  { id: 3, type: '통신/구독', name: '인터넷 + OTT 결합', amount: 33000, prevAmount: 33000, dueDate: '7일 남음', dDay: 7, isPaid: false, icon: 'wifi' },
  { id: 4, type: '전기세', name: '한국전력 전기요금', amount: 24500, prevAmount: 31000, dueDate: '납부완료', dDay: 21, isPaid: true, icon: 'zap' },
  { id: 5, type: '가스비', name: '도시가스 요금', amount: 18200, prevAmount: 14500, dueDate: '납부완료', dDay: 26, isPaid: true, icon: 'flame' },
];

export const INITIAL_ROOMMATES = [
  { id: 1, name: '민수 (룸메이트)', shareRatio: 1, isPaid: false },
  { id: 2, name: '지영 (하우스메이트)', shareRatio: 1, isPaid: true },
];

export const INITIAL_RECYCLE_SCHEDULE: Record<number, string[]> = {
  0: ['일반쓰레기', '음식물', '플라스틱', '캔/고철', '종이/박스'],
  1: ['일반쓰레기', '음식물', '플라스틱'],
  2: ['플라스틱', '비닐', '투명페트병'],
  3: ['일반쓰레기', '음식물', '종이/박스'],
  4: ['캔/고철', '유리병', '플라스틱'],
  5: ['일반쓰레기', '음식물', '플라스틱', '투명페트병'],
  6: ['비닐', '종이/박스', '캔/고철'],
};

export const RECYCLE_DICTIONARY = [
  { name: '치킨 뼈 / 돼지 뼈', category: '일반쓰레기 (종량제)', desc: '딱딱해서 동물이 먹을 수 없는 뼈류는 음식물이 아닌 일반쓰레기로 배출해요.' },
  { name: '양파 껍질 / 파 뿌리', category: '일반쓰레기 (종량제)', desc: '섬유질이 많아 분쇄기 고장의 원인이 되므로 일반쓰레기로 버려주세요.' },
  { name: '달걀 껍데기', category: '일반쓰레기 (종량제)', desc: '석회질 성분이 많아 사료나 비료로 쓸 수 없어요.' },
  { name: '배달 플라스틱 용기', category: '플라스틱 (세척 후)', desc: '음식물 자국을 설거지하거나 닦아낸 후 배출! 고추기름이 안 지워지면 일반쓰레기.' },
  { name: '택배 박스', category: '종이류 (테이프 제거)', desc: '운송장 스티커와 박스테이프를 반드시 제거한 후 납작하게 접어서 배출하세요.' },
  { name: '영수증 (감열지)', category: '일반쓰레기 (종량제)', desc: '코팅된 감열지라 종이 재활용이 불가능합니다.' },
];

export const INITIAL_ROUTINES = [
  { id: 1, title: '화장실 배수구 클리너 뿌리기', cycle: '2주마다', lastDone: '12일 전', urgent: true, completedToday: false },
  { id: 2, title: '세탁조 클리너 돌리기', cycle: '1개월마다', lastDone: '28일 전', urgent: true, completedToday: false },
  { id: 3, title: '침구류 먼지 털기 및 환기', cycle: '매주 주말', lastDone: '7일 전', urgent: true, completedToday: false },
  { id: 4, title: '에어컨/공기청정기 필터 먼지 제거', cycle: '2주마다', lastDone: '5일 전', urgent: false, completedToday: true },
  { id: 5, title: '냉장고 유통기한 지난 소스 정리', cycle: '1개월마다', lastDone: '10일 전', urgent: false, completedToday: false },
];

export const INITIAL_SUPPLIES = [
  { id: 1, name: '종량제 봉투 (10L)', status: '1장 남음', needBuy: true },
  { id: 2, name: '두루마리 휴지', status: '12롤 여유', needBuy: false },
  { id: 3, name: '음식물 쓰레기 봉투 (2L)', status: '2장 남음', needBuy: true },
  { id: 4, name: '세탁 세제', status: '보통', needBuy: false },
  { id: 5, name: '키친타올', status: '부족', needBuy: true },
];
