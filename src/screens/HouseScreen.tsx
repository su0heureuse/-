import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  Phone,
  Copy,
  Edit3,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  X,
  Check
} from 'lucide-react';
import { ContractInfo, MoveChecklistItem, ContractTimelineItem, MoveSection } from '../types/contract';
import {
  calcContractDDay,
  calcContractProgress,
  calculateContractTimeline,
  DEFAULT_MOVE_CHECKLIST
} from '../constants/contract';

interface HouseScreenProps {
  contract: ContractInfo | null;
  onSaveContract: (contract: ContractInfo | null) => void;
  timelineDone: Record<string, boolean>;
  onToggleTimelineItem: (id: string) => void;
  moveDate: string;
  onChangeMoveDate: (date: string) => void;
  moveChecklist: MoveChecklistItem[];
  onToggleMoveItem: (id: string) => void;
  onAddMoveItem: (item: Omit<MoveChecklistItem, 'id' | 'completed'>) => void;
  onDeleteMoveItem: (id: string) => void;
  onResetMoveChecklist: () => void;
  onSwitchToRecycleSchedule: () => void;
  todayYMD: string;
  showToast: (msg: string, actionOption?: any) => void;
  copyToClipboard: (text: string, successMsg?: string) => void;
}

export function HouseScreen({
  contract,
  onSaveContract,
  timelineDone,
  onToggleTimelineItem,
  moveDate,
  onChangeMoveDate,
  moveChecklist,
  onToggleMoveItem,
  onAddMoveItem,
  onDeleteMoveItem,
  onResetMoveChecklist,
  onSwitchToRecycleSchedule,
  todayYMD,
  showToast,
  copyToClipboard
}: HouseScreenProps) {
  const [houseSubTab, setHouseSubTab] = useState<'contract' | 'emergency'>('contract');
  const [showEditModal, setShowEditModal] = useState(false);

  // 이사 항목 추가 입력 상태
  const [showAddMoveInput, setShowAddMoveInput] = useState(false);
  const [newMoveTitle, setNewMoveTitle] = useState('');
  const [newMoveSection, setNewMoveSection] = useState<MoveSection>('before');

  // 계약 정보 파생 계산
  const dDay = contract ? calcContractDDay(contract.endDate, todayYMD) : null;
  const progressPct = contract ? calcContractProgress(contract.startDate, contract.endDate, todayYMD) : 0;
  const timelineItems = calculateContractTimeline(contract, timelineDone, todayYMD);

  // D-Day 상태 칩 (180일 초과 초록 / 180~60일 앰버 / 60일 이하 레드)
  const getDDayBadge = (diff: number | null) => {
    if (diff === null) return null;
    if (diff < 0) {
      return { variant: 'urgent', label: `만료 경과 (D+${Math.abs(diff)})` };
    }
    if (diff === 0) {
      return { variant: 'urgent', label: '오늘 계약 만료' };
    }
    if (diff <= 60) {
      return { variant: 'urgent', label: `만료 임박 (D-${diff})` };
    }
    if (diff <= 180) {
      return { variant: 'warning', label: `D-${diff} 갱신 준비기` };
    }
    return { variant: 'normal', label: `D-${diff}` };
  };

  const dDayBadge = getDDayBadge(dDay);

  // 이사 체크리스트 진행률 계산
  const totalMoveItems = moveChecklist.length;
  const completedMoveItems = moveChecklist.filter(item => item.completed).length;
  const moveProgressPct = totalMoveItems > 0 ? Math.round((completedMoveItems / totalMoveItems) * 100) : 0;

  // 이사 예정일 기준 D-day 라벨 계산
  const getMoveDateDDayLabel = () => {
    if (!moveDate) return null;
    const diff = calcContractDDay(moveDate, todayYMD);
    if (diff === null) return null;
    if (diff < 0) return `이사 완료 (D+${Math.abs(diff)})`;
    if (diff === 0) return '오늘 이사 (D-Day)';
    return `이사 D-${diff}`;
  };

  const handleAddNewMoveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMoveTitle.trim()) return;
    onAddMoveItem({
      section: newMoveSection,
      title: newMoveTitle.trim(),
      relativeLabel: '사용자 추가',
      isCustom: true
    });
    setNewMoveTitle('');
    setShowAddMoveInput(false);
    showToast('이사 체크리스트에 항목이 추가되었습니다.');
  };

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-6)' }}>
      {/* ──────────────── 상단 탭 헤더 & 세그먼트 전환 ──────────────── */}
      <div className="flex flex-wrap items-center justify-between" style={{ gap: 'var(--space-3)' }}>
        <div>
          <h1 className="t-title" style={{ margin: 0 }}>우리집 · 계약 / 비상정보</h1>
          <p className="t-sub" style={{ margin: '2px 0 0 0' }}>
            임대차 계약 만료 일정과 이사 준비를 놓치지 않게 챙겨드려요
          </p>
        </div>

        {/* 상단 2개 세그먼트 (계약·이사 / 비상 정보함) */}
        <div
          className="flex items-center"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            padding: '3px',
            borderRadius: 'var(--radius-btn)'
          }}
        >
          <button
            type="button"
            onClick={() => setHouseSubTab('contract')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-btn)',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: houseSubTab === 'contract' ? 'var(--bg-card)' : 'transparent',
              color: houseSubTab === 'contract' ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontWeight: houseSubTab === 'contract' ? 600 : 400,
              fontSize: 'var(--fs-body)',
              boxShadow: houseSubTab === 'contract' ? 'var(--shadow-card)' : 'none',
              transition: 'all 200ms ease-out'
            }}
          >
            계약 · 이사
          </button>
          <button
            type="button"
            onClick={() => setHouseSubTab('emergency')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-btn)',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: houseSubTab === 'emergency' ? 'var(--bg-card)' : 'transparent',
              color: houseSubTab === 'emergency' ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontWeight: houseSubTab === 'emergency' ? 600 : 400,
              fontSize: 'var(--fs-body)',
              boxShadow: houseSubTab === 'emergency' ? 'var(--shadow-card)' : 'none',
              transition: 'all 200ms ease-out'
            }}
          >
            비상 정보함
          </button>
        </div>
      </div>

      {/* ──────────────── [세그먼트 2: 비상 정보함 (준비 중)] ──────────────── */}
      {houseSubTab === 'emergency' && (
        <div className="ui-card">
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{ padding: 'var(--space-8) var(--space-4)' }}
          >
            <ShieldCheck
              className="w-10 h-10 mb-3"
              strokeWidth={1.5}
              style={{ color: 'var(--color-primary)' }}
            />
            <p className="t-body-semibold" style={{ margin: '0 0 6px 0', fontSize: '18px' }}>
              비상 정보함 준비 중
            </p>
            <p className="t-sub" style={{ margin: '0 0 16px 0', maxWidth: '420px', lineHeight: 1.6 }}>
              임대차 계약서 사본 사진, 열쇠 보관 위치, 비상 연락망, 도어락 배터리 교체 주기를
              안전하게 기록해두는 기능이 준비 중이에요.
            </p>
            <span className="ui-chip ui-chip-subtle">업데이트 예정</span>
          </div>
        </div>
      )}

      {/* ──────────────── [세그먼트 1: 계약 · 이사] ──────────────── */}
      {houseSubTab === 'contract' && (
        <>
          {/* 1. 계약 정보 요약 카드 */}
          {!contract ? (
            <div className="ui-card">
              <div
                className="flex flex-col items-center justify-center text-center"
                style={{ padding: 'var(--space-8) var(--space-4)' }}
              >
                <Building2
                  className="w-8 h-8 mb-3"
                  strokeWidth={1.5}
                  style={{ color: 'var(--text-disabled)' }}
                />
                <p className="t-body-semibold" style={{ margin: '0 0 4px 0' }}>
                  계약 정보를 등록하면 만료 일정을 챙겨드려요
                </p>
                <p className="t-sub" style={{ margin: '0 0 16px 0', maxWidth: '400px' }}>
                  보증금, 월세, 만료일을 등록해두면 D-day 타임라인과 정산 알림을 자동으로 정리해드려요.
                </p>
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="ui-btn ui-btn-primary"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  <span>계약 정보 입력하기</span>
                </button>
              </div>
            </div>
          ) : (
            <section className="ui-card flex flex-col" style={{ gap: 'var(--space-4)' }}>
              {/* 상단: 상태 칩 & 편집 버튼 */}
              <div className="flex items-center justify-between" style={{ gap: 'var(--space-3)' }}>
                <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                  <span className="ui-chip ui-chip-subtle">{contract.contractType}</span>
                  {dDayBadge && (
                    <span className={`ui-chip ui-chip-${dDayBadge.variant}`}>
                      {dDayBadge.label}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="ui-btn ui-btn-outline"
                  style={{ minHeight: '34px', padding: '0 12px', fontSize: '13px' }}
                >
                  <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>편집</span>
                </button>
              </div>

              {/* D-day 38px 큰 숫자 & 주소 */}
              <div>
                <div className="flex flex-wrap items-baseline justify-between" style={{ gap: 'var(--space-2)' }}>
                  <div>
                    <span className="t-sub block" style={{ marginBottom: '2px' }}>계약 만료까지</span>
                    <div className="t-hero-num" style={{ fontSize: 'var(--fs-hero-num)' }}>
                      {dDay !== null ? (
                        dDay < 0 ? `D+${Math.abs(dDay)}` : dDay === 0 ? 'D-Day' : `D-${dDay}`
                      ) : (
                        '일정 미정'
                      )}
                    </div>
                  </div>
                  {contract.addressMemo && (
                    <div className="text-right">
                      <span className="t-sub block">우리집 주소</span>
                      <span className="t-body-semibold">{contract.addressMemo}</span>
                    </div>
                  )}
                </div>

                {/* 계약 기간 진행률 바 (Primary 초록) */}
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <div className="flex items-center justify-between t-caption tabular-nums" style={{ marginBottom: '4px', color: 'var(--text-secondary)' }}>
                    <span>{contract.startDate || '시작일'}</span>
                    <span>{progressPct}% 경과</span>
                    <span>{contract.endDate || '만료일'}</span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: '999px',
                      backgroundColor: 'var(--bg-subtle)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${progressPct}%`,
                        height: '100%',
                        backgroundColor: 'var(--color-primary)',
                        transition: 'width 300ms ease-out'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 세부 정보 그리드: 보증금, 월세, 임대인 연락처 */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                style={{
                  gap: 'var(--space-3)',
                  paddingTop: 'var(--space-3)',
                  borderTop: '1px solid var(--border-hairline)'
                }}
              >
                <div>
                  <span className="t-sub block">보증금</span>
                  <span className="t-card-title tabular-nums">
                    {contract.deposit ? `${contract.deposit.toLocaleString()}원` : '미입력'}
                  </span>
                </div>

                {contract.contractType !== '전세' && (
                  <div>
                    <span className="t-sub block">월세 (납부일)</span>
                    <span className="t-card-title tabular-nums">
                      {contract.monthlyRent
                        ? `${contract.monthlyRent.toLocaleString()}원 (매월 ${contract.paymentDay || 25}일)`
                        : '미입력'}
                    </span>
                  </div>
                )}

                <div className="sm:col-span-2 lg:col-span-1">
                  <span className="t-sub block">집주인 / 중개사</span>
                  <div className="flex items-center justify-between" style={{ gap: 'var(--space-2)' }}>
                    <span className="t-card-title truncate">
                      {contract.landlordName || '연락처 미등록'}
                    </span>
                    {contract.landlordPhone && (
                      <div className="flex items-center shrink-0" style={{ gap: '4px' }}>
                        <a
                          href={`tel:${contract.landlordPhone}`}
                          className="ui-btn ui-btn-outline"
                          title="전화 걸기"
                          style={{ minHeight: '32px', padding: '0 8px', fontSize: '12px' }}
                        >
                          <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>통화</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(contract.landlordPhone, '집주인 연락처가 복사되었습니다!')}
                          className="ui-btn ui-btn-outline"
                          title="연락처 복사"
                          style={{ minHeight: '32px', padding: '0 8px', fontSize: '12px' }}
                        >
                          <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>복사</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {contract.memo && (
                <div
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-btn)',
                    backgroundColor: 'var(--bg-subtle)',
                    fontSize: 'var(--fs-caption)',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5
                  }}
                >
                  <strong className="block" style={{ color: 'var(--text-primary)', marginBottom: '2px' }}>계약 메모</strong>
                  {contract.memo}
                </div>
              )}
            </section>
          )}

          {/* 2. 계약 일정 타임라인 (자동 생성) */}
          <section className="ui-card flex flex-col" style={{ gap: 'var(--space-4)' }}>
            <div>
              <h2 className="t-card-title" style={{ margin: 0 }}>계약 일정 타임라인</h2>
              <p className="t-sub" style={{ margin: '2px 0 0 0' }}>
                만료일을 기준으로 갱신 요구권 및 퇴거 통지 시점을 자동으로 계산해드려요
              </p>
            </div>

            {!contract || !contract.endDate ? (
              <p className="t-sub" style={{ margin: 'var(--space-2) 0' }}>
                계약 정보를 등록하면 만료 6개월, 2개월, 1개월 전 핵심 일정이 자동 생성됩니다.
              </p>
            ) : (
              <div className="flex flex-col" style={{ gap: '0px', position: 'relative' }}>
                {timelineItems.map((item, idx) => {
                  const isLast = idx === timelineItems.length - 1;

                  return (
                    <div
                      key={item.id}
                      className="flex items-start"
                      style={{
                        position: 'relative',
                        paddingBottom: isLast ? '0px' : 'var(--space-5)',
                        opacity: item.isPassed ? 0.55 : 1
                      }}
                    >
                      {/* 세로 구분선 커넥터 */}
                      {!isLast && (
                        <div
                          style={{
                            position: 'absolute',
                            left: '11px',
                            top: '24px',
                            bottom: '0px',
                            width: '2px',
                            backgroundColor: 'var(--border-hairline)'
                          }}
                        />
                      )}

                      {/* 체크 / 점 인디케이터 */}
                      <button
                        type="button"
                        onClick={() => onToggleTimelineItem(item.id)}
                        className="shrink-0 flex items-center justify-center cursor-pointer"
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: item.completed
                            ? 'var(--color-primary)'
                            : item.isNext
                            ? 'var(--color-primary-soft)'
                            : 'var(--bg-subtle)',
                          border: item.isNext && !item.completed ? '2px solid var(--color-primary)' : '1px solid var(--border-hairline)',
                          color: item.completed ? '#FFFFFF' : 'var(--color-primary)',
                          marginRight: 'var(--space-3)',
                          zIndex: 2,
                          transition: 'all 200ms ease-out'
                        }}
                      >
                        {item.completed ? (
                          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                        ) : item.isNext ? (
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
                        ) : null}
                      </button>

                      {/* 타임라인 내용 */}
                      <div
                        className="flex-1"
                        style={{
                          padding: '2px 0 0 0',
                          minWidth: 0
                        }}
                      >
                        <div className="flex flex-wrap items-center justify-between" style={{ gap: '6px' }}>
                          <div className="flex items-center" style={{ gap: '6px' }}>
                            <span
                              className={`t-body-semibold ${item.completed ? 'strike-animated is-done' : ''}`}
                              style={{ color: item.isNext ? 'var(--color-primary)' : 'var(--text-primary)' }}
                            >
                              {item.title}
                            </span>
                            <span className={`ui-chip ${item.isNext ? 'ui-chip-normal' : 'ui-chip-subtle'}`}>
                              {item.label}
                            </span>
                          </div>
                          <span className="t-caption tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                            {item.targetDate}
                          </span>
                        </div>
                        <p
                          className="t-sub"
                          style={{
                            margin: '4px 0 0 0',
                            lineHeight: 1.5,
                            fontSize: '13px'
                          }}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p
              className="t-caption"
              style={{
                color: 'var(--text-disabled)',
                margin: 'var(--space-2) 0 0 0',
                paddingTop: 'var(--space-2)',
                borderTop: '1px solid var(--border-hairline)',
                lineHeight: 1.4
              }}
            >
              ※ 일반적인 안내이며 법률 자문이 아니에요. 정확한 내용은 계약서와 전문가를 통해 확인하세요.
            </p>
          </section>

          {/* 3. 이사 체크리스트 */}
          <section className="ui-card flex flex-col" style={{ gap: 'var(--space-4)' }}>
            <div className="flex flex-wrap items-end justify-between" style={{ gap: 'var(--space-3)' }}>
              <div>
                <h2 className="t-card-title" style={{ margin: 0 }}>이사 체크리스트</h2>
                <p className="t-sub" style={{ margin: '2px 0 0 0' }}>
                  이사 전, 당일, 이사 후에 꼭 확인해야 할 절차들을 체크해보세요
                </p>
              </div>

              {/* 이사 예정일 입력 */}
              <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                <span className="t-sub">이사 예정일</span>
                <input
                  type="date"
                  value={moveDate}
                  onChange={(e) => onChangeMoveDate(e.target.value)}
                  className="tabular-nums"
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-btn)',
                    border: '1px solid var(--border-hairline)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
                {moveDate && (
                  <button
                    type="button"
                    onClick={() => onChangeMoveDate('')}
                    className="ui-btn-icon"
                    title="이사 예정일 삭제"
                    style={{ minWidth: '32px', minHeight: '32px' }}
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>

            {/* 진행률 바 & D-day */}
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                <span className="t-body-semibold">
                  전체 {totalMoveItems}개 중 {completedMoveItems}개 완료 ({moveProgressPct}%)
                </span>
                {moveDate && getMoveDateDDayLabel() && (
                  <span className="ui-chip ui-chip-normal">{getMoveDateDDayLabel()}</span>
                )}
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '999px',
                  backgroundColor: 'var(--bg-subtle)',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${moveProgressPct}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-primary)',
                    transition: 'width 200ms ease-out'
                  }}
                />
              </div>
            </div>

            {/* 조작 버튼: 항목 추가 / 기본값 초기화 */}
            <div className="flex items-center justify-between" style={{ gap: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => setShowAddMoveInput(!showAddMoveInput)}
                className="ui-btn ui-btn-outline"
                style={{ minHeight: '34px', padding: '0 12px', fontSize: '13px' }}
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>항목 추가</span>
              </button>

              <button
                type="button"
                onClick={onResetMoveChecklist}
                className="ui-btn ui-btn-text"
                style={{ minHeight: '34px', padding: '0 8px', fontSize: '13px' }}
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>기본 항목으로 초기화</span>
              </button>
            </div>

            {/* 항목 추가 인라인 입력창 */}
            {showAddMoveInput && (
              <form
                onSubmit={handleAddNewMoveItem}
                className="flex flex-wrap items-center"
                style={{
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-btn)',
                  backgroundColor: 'var(--bg-subtle)'
                }}
              >
                <select
                  value={newMoveSection}
                  onChange={(e) => setNewMoveSection(e.target.value as MoveSection)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-chip)',
                    border: '1px solid var(--border-hairline)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                >
                  <option value="before">이사 전</option>
                  <option value="day">이사 당일</option>
                  <option value="after">이사 후</option>
                </select>

                <input
                  type="text"
                  required
                  placeholder="추가할 체크리스트 항목 입력"
                  value={newMoveTitle}
                  onChange={(e) => setNewMoveTitle(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: '160px',
                    minHeight: '36px',
                    padding: '0 var(--space-3)',
                    borderRadius: 'var(--radius-chip)',
                    border: '1px solid var(--border-hairline)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />

                <button
                  type="submit"
                  className="ui-btn ui-btn-primary"
                  style={{ minHeight: '36px', padding: '0 12px', fontSize: '13px' }}
                >
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMoveInput(false)}
                  className="ui-btn ui-btn-outline"
                  style={{ minHeight: '36px', padding: '0 10px', fontSize: '13px' }}
                >
                  취소
                </button>
              </form>
            )}

            {/* 섹션 3개 (이사 전 / 이사 당일 / 이사 후) */}
            <div className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
              {[
                { key: 'before', label: '이사 전', desc: '견적·공과금·주소 이전' },
                { key: 'day', label: '이사 당일', desc: '계량기·상태 촬영·열쇠 반납' },
                { key: 'after', label: '이사 후', desc: '전입신고·확정일자·분리수거' }
              ].map((sec) => {
                const items = moveChecklist.filter(i => i.section === sec.key);
                if (items.length === 0) return null;

                const secCompleted = items.filter(i => i.completed).length;

                return (
                  <div
                    key={sec.key}
                    style={{
                      borderRadius: 'var(--radius-btn)',
                      border: '1px solid var(--border-hairline)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      className="flex items-center justify-between"
                      style={{
                        padding: '10px var(--space-4)',
                        backgroundColor: 'var(--bg-subtle)',
                        borderBottom: '1px solid var(--border-hairline)'
                      }}
                    >
                      <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                        <span className="t-body-semibold">{sec.label}</span>
                        <span className="t-caption" style={{ color: 'var(--text-secondary)' }}>
                          {sec.desc}
                        </span>
                      </div>
                      <span className="t-caption tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {secCompleted} / {items.length}
                      </span>
                    </div>

                    <div style={{ padding: '0 var(--space-4)' }}>
                      {items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="thin-row"
                          style={{
                            padding: '12px 0',
                            borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--border-hairline)'
                          }}
                        >
                          <div className="flex items-center" style={{ gap: 'var(--space-3)', minWidth: 0, flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => onToggleMoveItem(item.id)}
                              style={{
                                width: '18px',
                                height: '18px',
                                accentColor: 'var(--color-primary)',
                                cursor: 'pointer'
                              }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div className="flex items-center flex-wrap" style={{ gap: '6px' }}>
                                <span className={`t-body ${item.completed ? 'strike-animated is-done' : ''}`}>
                                  {item.title}
                                </span>
                                {moveDate && item.relativeLabel && (
                                  <span className="ui-chip ui-chip-subtle" style={{ fontSize: '11px', padding: '1px 6px' }}>
                                    {item.relativeLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center shrink-0" style={{ gap: '6px' }}>
                            {item.actionKey === 'recycle' && (
                              <button
                                type="button"
                                onClick={onSwitchToRecycleSchedule}
                                className="ui-btn ui-btn-outline"
                                style={{
                                  minHeight: '28px',
                                  padding: '0 8px',
                                  fontSize: '11px',
                                  color: 'var(--color-primary)',
                                  borderColor: 'var(--color-primary-soft)'
                                }}
                              >
                                <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                                <span>분리수거 요일 확인</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDeleteMoveItem(item.id)}
                              className="ui-btn-icon"
                              title="삭제"
                              style={{ minWidth: '32px', minHeight: '32px' }}
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* ──────────────── 계약 정보 수정 / 등록 모달 ──────────────── */}
      {showEditModal && (
        <ContractEditModal
          initialContract={contract}
          onClose={() => setShowEditModal(false)}
          onSave={(updated) => {
            onSaveContract(updated);
            setShowEditModal(false);
            showToast(updated ? '계약 정보가 저장되었습니다.' : '계약 정보가 삭제되었습니다.');
          }}
          todayYMD={todayYMD}
        />
      )}
    </div>
  );
}

interface ContractEditModalProps {
  initialContract: ContractInfo | null;
  onClose: () => void;
  onSave: (contract: ContractInfo | null) => void;
  todayYMD: string;
}

function ContractEditModal({ initialContract, onClose, onSave, todayYMD }: ContractEditModalProps) {
  const [contractType, setContractType] = useState<ContractInfo['contractType']>(initialContract?.contractType || '월세');
  const [deposit, setDeposit] = useState<string>(initialContract?.deposit ? String(initialContract.deposit) : '');
  const [monthlyRent, setMonthlyRent] = useState<string>(initialContract?.monthlyRent ? String(initialContract.monthlyRent) : '');
  const [paymentDay, setPaymentDay] = useState<number>(initialContract?.paymentDay || 25);
  const [startDate, setStartDate] = useState<string>(initialContract?.startDate || '');
  const [endDate, setEndDate] = useState<string>(initialContract?.endDate || '');
  const [landlordName, setLandlordName] = useState<string>(initialContract?.landlordName || '');
  const [landlordPhone, setLandlordPhone] = useState<string>(initialContract?.landlordPhone || '');
  const [addressMemo, setAddressMemo] = useState<string>(initialContract?.addressMemo || '');
  const [memo, setMemo] = useState<string>(initialContract?.memo || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ContractInfo = {
      contractType,
      deposit: Number(deposit) || 0,
      monthlyRent: contractType === '전세' ? 0 : (Number(monthlyRent) || 0),
      paymentDay: Number(paymentDay) || 25,
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      landlordName: landlordName.trim(),
      landlordPhone: landlordPhone.trim(),
      addressMemo: addressMemo.trim(),
      memo: memo.trim()
    };
    onSave(updated);
  };

  const handleDelete = () => {
    if (window.confirm('등록된 계약 정보를 삭제할까요? 정산 목록에 자동 등록된 월세도 함께 정리됩니다.')) {
      onSave(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-y-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: 'var(--space-3)' }}
    >
      <div
        className="w-full max-w-lg flex flex-col"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-sheet)',
          maxHeight: '90vh',
          boxShadow: 'var(--shadow-floating)',
          overflow: 'hidden'
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--border-hairline)'
          }}
        >
          <h3 className="t-card-title" style={{ margin: 0 }}>
            {initialContract ? '계약 정보 수정' : '계약 정보 등록'}
          </h3>
          <button onClick={onClose} className="ui-btn-icon">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 flex flex-col" style={{ padding: 'var(--space-5)', gap: 'var(--space-4)' }}>
          {/* 계약 유형 (월세 / 전세 / 반전세) */}
          <div>
            <label className="t-sub block" style={{ marginBottom: '6px' }}>계약 유형</label>
            <div className="grid grid-cols-3" style={{ gap: 'var(--space-2)' }}>
              {(['월세', '전세', '반전세'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setContractType(type)}
                  style={{
                    minHeight: '40px',
                    borderRadius: 'var(--radius-btn)',
                    border: '1px solid',
                    borderColor: contractType === type ? 'var(--color-primary)' : 'var(--border-hairline)',
                    backgroundColor: contractType === type ? 'var(--color-primary-soft)' : 'var(--bg-subtle)',
                    color: contractType === type ? 'var(--color-primary)' : 'var(--text-secondary)',
                    fontWeight: contractType === type ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: 'var(--fs-body)'
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 보증금 및 월세 */}
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--space-3)' }}>
            <div>
              <label className="t-sub block" style={{ marginBottom: '4px' }}>보증금 (원)</label>
              <input
                type="number"
                placeholder="예: 10000000"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-min)',
                  padding: '0 var(--space-3)',
                  borderRadius: 'var(--radius-btn)',
                  border: '1px solid var(--border-hairline)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {contractType !== '전세' && (
              <div>
                <label className="t-sub block" style={{ marginBottom: '4px' }}>월세 (원)</label>
                <input
                  type="number"
                  placeholder="예: 650000"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 'var(--touch-min)',
                    padding: '0 var(--space-3)',
                    borderRadius: 'var(--radius-btn)',
                    border: '1px solid var(--border-hairline)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            )}
          </div>

          {/* 월세 납부일 */}
          {contractType !== '전세' && (
            <div>
              <label className="t-sub block" style={{ marginBottom: '4px' }}>월세 납부일 (매월)</label>
              <select
                value={paymentDay}
                onChange={(e) => setPaymentDay(Number(e.target.value))}
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-min)',
                  padding: '0 var(--space-3)',
                  borderRadius: 'var(--radius-btn)',
                  border: '1px solid var(--border-hairline)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)'
                }}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>매월 {day}일</option>
                ))}
              </select>
            </div>
          )}

          {/* 계약 시작일 / 만료일 */}
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--space-3)' }}>
            <div>
              <label className="t-sub block" style={{ marginBottom: '4px' }}>계약 시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-min)',
                  padding: '0 var(--space-3)',
                  borderRadius: 'var(--radius-btn)',
                  border: '1px solid var(--border-hairline)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div>
              <label className="t-sub block" style={{ marginBottom: '4px' }}>계약 만료일 (D-Day 기준)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-min)',
                  padding: '0 var(--space-3)',
                  borderRadius: 'var(--radius-btn)',
                  border: '1px solid var(--border-hairline)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          {/* 집주인 / 중개사 정보 */}
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 'var(--space-3)' }}>
            <div>
              <label className="t-sub block" style={{ marginBottom: '4px' }}>집주인(또는 중개사) 성명</label>
              <input
                type="text"
                placeholder="예: 김은숙 (임대인)"
                value={landlordName}
                onChange={(e) => setLandlordName(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-min)',
                  padding: '0 var(--space-3)',
                  borderRadius: 'var(--radius-btn)',
                  border: '1px solid var(--border-hairline)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div>
              <label className="t-sub block" style={{ marginBottom: '4px' }}>연락처</label>
              <input
                type="tel"
                placeholder="예: 010-1234-5678"
                value={landlordPhone}
                onChange={(e) => setLandlordPhone(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-min)',
                  padding: '0 var(--space-3)',
                  borderRadius: 'var(--radius-btn)',
                  border: '1px solid var(--border-hairline)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          {/* 주소 메모 */}
          <div>
            <label className="t-sub block" style={{ marginBottom: '4px' }}>주소 메모 (한 줄)</label>
            <input
              type="text"
              placeholder="예: 마포구 독막로 42길 302호"
              value={addressMemo}
              onChange={(e) => setAddressMemo(e.target.value)}
              style={{
                width: '100%',
                minHeight: 'var(--touch-min)',
                padding: '0 var(--space-3)',
                borderRadius: 'var(--radius-btn)',
                border: '1px solid var(--border-hairline)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* 자유 메모 */}
          <div>
            <label className="t-sub block" style={{ marginBottom: '4px' }}>메모</label>
            <textarea
              rows={2}
              placeholder="특약 사항, 보증금 반환 조건, 반려동물 조항 등"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-btn)',
                border: '1px solid var(--border-hairline)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                resize: 'none'
              }}
            />
          </div>

          {/* 하단 버튼 */}
          <div className="flex items-center justify-between" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            {initialContract ? (
              <button
                type="button"
                onClick={handleDelete}
                className="ui-btn ui-btn-outline"
                style={{ color: 'var(--color-status-urgent)' }}
              >
                삭제
              </button>
            ) : <div />}

            <div className="flex" style={{ gap: 'var(--space-2)' }}>
              <button type="button" onClick={onClose} className="ui-btn ui-btn-outline">
                취소
              </button>
              <button type="submit" className="ui-btn ui-btn-primary">
                저장하기
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
