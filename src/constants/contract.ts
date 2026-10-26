import { ContractInfo, MoveChecklistItem, ContractTimelineItem, MoveSection } from '../types/contract';
import { formatDateYMD, addDaysToDateStr, calcDiffDaysFromToday } from '../utils/dateUtils';

export const DEFAULT_MOVE_CHECKLIST: MoveChecklistItem[] = [
  // 이사 전
  { id: 'm-before-1', section: 'before', title: '이사 업체 견적·예약', completed: false, relativeLabel: '이사 4주 전' },
  { id: 'm-before-2', section: 'before', title: '새 집 상태 사진 촬영·확인', completed: false, relativeLabel: '이사 3주 전' },
  { id: 'm-before-3', section: 'before', title: '현재 집 관리비·공과금 정산', completed: false, relativeLabel: '이사 1주 전' },
  { id: 'm-before-4', section: 'before', title: '인터넷·가스·전기 이전/해지 신청', completed: false, relativeLabel: '이사 1주 전' },
  { id: 'm-before-5', section: 'before', title: '우편물·택배 주소 변경', completed: false, relativeLabel: '이사 3일 전' },
  { id: 'm-before-6', section: 'before', title: '폐기물/대형 쓰레기 배출 신청', completed: false, relativeLabel: '이사 2일 전' },

  // 이사 당일
  { id: 'm-day-1', section: 'day', title: '현재 집 계량기(전기·수도·가스) 사진 기록', completed: false, relativeLabel: '이사 당일' },
  { id: 'm-day-2', section: 'day', title: '퇴실 시 집 상태 사진 촬영', completed: false, relativeLabel: '이사 당일' },
  { id: 'm-day-3', section: 'day', title: '열쇠·카드키 반납', completed: false, relativeLabel: '이사 당일' },
  { id: 'm-day-4', section: 'day', title: '보증금 반환 계좌 확인', completed: false, relativeLabel: '이사 당일' },

  // 이사 후
  { id: 'm-after-1', section: 'after', title: '전입신고 (이사 후 14일 이내)', completed: false, relativeLabel: '이사 즉시' },
  { id: 'm-after-2', section: 'after', title: '확정일자 받기', completed: false, relativeLabel: '이사 즉시' },
  { id: 'm-after-3', section: 'after', title: '운전면허·차량 등 주소 변경', completed: false, relativeLabel: '이사 14일 이내' },
  {
    id: 'm-after-4',
    section: 'after',
    title: '새 집 분리수거 요일·배출 방법 확인',
    completed: false,
    relativeLabel: '이사 첫 주',
    actionKey: 'recycle'
  },
];

/**
 * 만료일 기준 D-day 계산 (순수 함수)
 */
export function calcContractDDay(endDate: string | undefined | null, todayYMD: string): number | null {
  if (!endDate) return null;
  const parts = endDate.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0])) return null;

  const [ty, tm, td] = todayYMD.split('-').map(Number);
  const todayMs = new Date(ty, tm - 1, td).getTime();
  const targetMs = new Date(parts[0], parts[1] - 1, parts[2]).getTime();

  return Math.round((targetMs - todayMs) / (1000 * 60 * 60 * 24));
}

/**
 * 계약 기간 진행률 계산 (0 ~ 100%)
 */
export function calcContractProgress(startDate: string | undefined | null, endDate: string | undefined | null, todayYMD: string): number {
  if (!startDate || !endDate) return 0;
  const startParts = startDate.split('-').map(Number);
  const endParts = endDate.split('-').map(Number);
  const todayParts = todayYMD.split('-').map(Number);

  const startMs = new Date(startParts[0], startParts[1] - 1, startParts[2]).getTime();
  const endMs = new Date(endParts[0], endParts[1] - 1, endParts[2]).getTime();
  const todayMs = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]).getTime();

  const totalDuration = endMs - startMs;
  if (totalDuration <= 0) return 100;

  const elapsed = todayMs - startMs;
  if (elapsed <= 0) return 0;
  if (elapsed >= totalDuration) return 100;

  return Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
}

/**
 * 만료일 기준 계약 일정 타임라인 자동 계산 (순수 함수)
 */
export function calculateContractTimeline(
  contract: ContractInfo | null,
  completedMap: Record<string, boolean>,
  todayYMD: string
): ContractTimelineItem[] {
  if (!contract || !contract.endDate) return [];

  const parts = contract.endDate.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0])) return [];

  const [ey, em, ed] = parts;
  const [ty, tm, td] = todayYMD.split('-').map(Number);
  const todayDate = new Date(ty, tm - 1, td);

  const getCheckpointDateStr = (monthsBefore: number): string => {
    if (monthsBefore === 0) return contract.endDate;
    const d = new Date(ey, em - 1 - monthsBefore, ed);
    return formatDateYMD(d);
  };

  const checkpoints: Array<{ id: string; monthsBefore: number; label: string; title: string; description: string }> = [
    {
      id: 'timeline-6m',
      monthsBefore: 6,
      label: '만료 6개월 전',
      title: '갱신 및 이사 계획 검토',
      description: '갱신 여부와 이사 계획을 정해볼 시기예요'
    },
    {
      id: 'timeline-2m',
      monthsBefore: 2,
      label: '만료 2개월 전',
      title: '임차인 의사 전달 마감',
      description: '집주인에게 갱신·퇴거 의사를 전달하는 시기예요 (임차인의 갱신요구권은 일반적으로 만료 6개월 전부터 2개월 전까지 행사하므로, 이 기간이 지나기 전에 확인하세요)'
    },
    {
      id: 'timeline-1m',
      monthsBefore: 1,
      label: '만료 1개월 전',
      title: '이사·보증금 일정 확정',
      description: '이사 일정, 보증금 반환 일정을 확정해요'
    },
    {
      id: 'timeline-0m',
      monthsBefore: 0,
      label: '계약 만료일',
      title: '계약 만료일',
      description: '보증금 반환 및 퇴거/재계약 체결'
    }
  ];

  let foundNext = false;

  return checkpoints.map((cp) => {
    const targetDate = getCheckpointDateStr(cp.monthsBefore);
    const [cy, cm, cd] = targetDate.split('-').map(Number);
    const cpDate = new Date(cy, cm - 1, cd);

    const isPassed = cpDate < todayDate;
    let isNext = false;

    if (!isPassed && !foundNext) {
      isNext = true;
      foundNext = true;
    }

    return {
      id: cp.id,
      monthsBefore: cp.monthsBefore,
      label: cp.label,
      title: cp.title,
      description: cp.description,
      targetDate,
      isPassed,
      isNext,
      completed: Boolean(completedMap[cp.id])
    };
  });
}

/**
 * 이번 달 또는 다음 달의 월세 납부일까지 남은 일수 계산
 */
export function calcDaysUntilPaymentDay(paymentDay: number, todayYMD: string): number {
  if (!paymentDay || paymentDay < 1 || paymentDay > 31) return 999;
  const [ty, tm, td] = todayYMD.split('-').map(Number);

  let targetDate = new Date(ty, tm - 1, paymentDay);
  const today = new Date(ty, tm - 1, td);

  // 이미 이번 달 납부일이 지난 경우 다음 달 납부일로 계산
  if (targetDate < today) {
    targetDate = new Date(ty, tm, paymentDay);
  }

  const diffMs = targetDate.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * 샘플 계약 데이터 생성 (만료일: 현재 기준 약 5개월 = 150일 뒤)
 */
export function createSampleContract(todayYMD: string): ContractInfo {
  const [ty, tm, td] = todayYMD.split('-').map(Number);
  const startObj = new Date(ty - 1, tm - 1 - 7, td); // 19개월 전 시작
  const endObj = new Date(ty, tm - 1, td + 150); // 약 5개월(150일) 뒤 만료

  return {
    contractType: '월세',
    deposit: 10000000, // 1,000만원
    monthlyRent: 650000, // 65만원
    paymentDay: 25,
    startDate: formatDateYMD(startObj),
    endDate: formatDateYMD(endObj),
    landlordName: '김은숙 (임대인)',
    landlordPhone: '010-8765-4321',
    addressMemo: '마포구 독막로 42길 302호',
    memo: '반려동물 허용 특약 완료, 퇴실 시 청소비 10만원 정산 조건'
  };
}
