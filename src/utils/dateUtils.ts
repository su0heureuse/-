/**
 * 날짜 및 수량 계산 유틸리티 함수들
 */

export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 날짜 계산 헬퍼 함수 (YYYY-MM-DD)
export const formatDateYMD = (dateObj: Date): string => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const formatYearMonth = (dateObj: Date): string => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export const addMonthsToYM = (ymStr: string, diffMonths: number): string => {
  const [y, m] = ymStr.split('-').map(Number);
  const d = new Date(y, m - 1 + diffMonths, 1);
  return formatYearMonth(d);
};

export const addDaysToDateStr = (baseDateStr: string | null | undefined, daysToAdd: number): string => {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  if (isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + Number(daysToAdd || 7));
    return formatDateYMD(fallback);
  }
  base.setDate(base.getDate() + Number(daysToAdd || 7));
  return formatDateYMD(base);
};

export const calcDiffDaysFromToday = (expiryDateStr: string | null | undefined): number => {
  if (!expiryDateStr) return 7;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const parts = expiryDateStr.split('-').map(Number);
  if (parts.length !== 3) return 7;
  const targetMidnight = new Date(parts[0], parts[1] - 1, parts[2]);
  const diffTime = targetMidnight.getTime() - todayMidnight.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

export const incrementQuantityStr = (qtyStr: string | null | undefined, addStr: string = '1개'): string => {
  const match1 = String(qtyStr || '1개').match(/^(\d+)(.*)$/);
  const match2 = String(addStr || '1개').match(/^(\d+)(.*)$/);
  if (match1) {
    const num1 = parseInt(match1[1], 10);
    const num2 = match2 ? parseInt(match2[1], 10) : 1;
    const unit = match1[2] || (match2 ? match2[2] : '개') || '개';
    return `${num1 + num2}${unit}`;
  }
  return `${qtyStr} + 1`;
};

export const getTodayInfoPure = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const dayIdx = now.getDay();
  const dayName = DAY_NAMES[dayIdx];
  const hour = now.getHours();
  let timeGreeting = '좋은 하루예요';
  if (hour >= 5 && hour < 12) timeGreeting = '상쾌한 아침이에요';
  else if (hour >= 12 && hour < 18) timeGreeting = '편안한 오후예요';
  else timeGreeting = '좋은 저녁이에요';

  return {
    month,
    date,
    dayIdx,
    dayName,
    todayYMD: formatDateYMD(now),
    thisYearMonth: formatYearMonth(now),
    fullLabel: `${month}월 ${date}일 (${dayName})`,
    dayFull: `${dayName}요일`,
    greetingLine: `${dayName}요일, ${timeGreeting}`
  };
};
