export type ContractType = '월세' | '전세' | '반전세';

export interface ContractInfo {
  contractType: ContractType;
  deposit: number; // 보증금 (원)
  monthlyRent: number; // 월세 (원)
  paymentDay: number; // 월세 납부일 (매월 1~31)
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  landlordName: string;
  landlordPhone: string;
  addressMemo: string;
  memo: string;
}

export interface ContractTimelineItem {
  id: string;
  monthsBefore: number;
  label: string;
  title: string;
  description: string;
  targetDate: string; // YYYY-MM-DD
  isPassed: boolean;
  isNext: boolean;
  completed: boolean;
}

export type MoveSection = 'before' | 'day' | 'after';

export interface MoveChecklistItem {
  id: string;
  section: MoveSection;
  title: string;
  completed: boolean;
  relativeLabel?: string;
  actionKey?: 'recycle';
  isCustom?: boolean;
}
