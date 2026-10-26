import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Home, 
  Refrigerator, 
  Receipt, 
  CheckSquare, 
  Recycle, 
  Plus, 
  ArrowUpDown, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Copy, 
  Sparkles, 
  ChevronRight, 
  Flame, 
  Droplets, 
  Zap, 
  Wifi, 
  Building, 
  Check, 
  Utensils, 
  ShoppingBag, 
  X, 
  Sun, 
  Moon, 
  Send, 
  CreditCard, 
  Camera, 
  Image as ImageIcon, 
  Edit3, 
  Settings, 
  LayoutGrid, 
  Download, 
  RefreshCw, 
  RotateCcw, 
  Code, 
  ShoppingCart, 
  BarChart3, 
  ChevronLeft, 
  Share2, 
  Award, 
  Database, 
  Leaf, 
  Apple, 
  Beef, 
  Fish, 
  Milk, 
  Egg, 
  Package, 
  Soup, 
  Snowflake, 
  Coffee, 
  FlaskConical, 
  Box,
  Building2 
} from 'lucide-react';

import { DesignTokensStyle } from './tokens/designTokens';
import {
  CATEGORY_EXPIRY_DAYS_TABLE,
  FOOD_CATEGORIES,
  getRecommendedExpiryDays,
  DAY_NAMES,
  INITIAL_BILLS,
  INITIAL_ROOMMATES,
  INITIAL_RECYCLE_SCHEDULE,
  RECYCLE_DICTIONARY,
  INITIAL_ROUTINES,
  INITIAL_SUPPLIES,
  createInitialFridgeItems,
  createInitialPurchaseHistory,
  createInitialActionLogs,
  createInitialShoppingList
} from './constants';
import {
  formatDateYMD,
  formatYearMonth,
  addMonthsToYM,
  addDaysToDateStr,
  calcDiffDaysFromToday,
  incrementQuantityStr,
  getTodayInfoPure
} from './utils/dateUtils';
import {
  safeLocalStorage,
  FridgeStorageRepository,
  FoodActionLogRepository,
  ShoppingListRepository
} from './repositories';
import { calculateFoodStatsPure } from './logic/foodStats';
import {
  MOCK_RECEIPT_RESULT,
  generateThreeMonthsDemoData,
  resizeImageToMax1600,
  callGeminiReceiptAnalysis
} from './services/receiptAnalyzer';
import {
  getNotificationTargets,
  sendLocalExpiryNotification
} from './logic/notifications';
import { ContractInfo, MoveChecklistItem } from './types/contract';
import {
  DEFAULT_MOVE_CHECKLIST,
  createSampleContract,
  calcContractDDay,
  calcDaysUntilPaymentDay
} from './constants/contract';
import { HouseScreen } from './screens/HouseScreen';



// 카테고리별 1.5px 라인 아이콘 렌더링 컴포넌트 (이모지 완전 대체)
function CategoryLineIcon({ category = '기타', className = 'w-5 h-5', style = {} }: { category?: string; className?: string; style?: React.CSSProperties }) {
  const entry = CATEGORY_EXPIRY_DAYS_TABLE[category] || CATEGORY_EXPIRY_DAYS_TABLE['기타'];
  const props = { className, strokeWidth: 1.5, style };
  switch (entry.iconKey) {
    case 'leaf': return <Leaf {...props} />;
    case 'apple': return <Apple {...props} />;
    case 'beef': return <Beef {...props} />;
    case 'fish': return <Fish {...props} />;
    case 'milk': return <Milk {...props} />;
    case 'egg': return <Egg {...props} />;
    case 'package': return <Package {...props} />;
    case 'soup': return <Soup {...props} />;
    case 'snowflake': return <Snowflake {...props} />;
    case 'coffee': return <Coffee {...props} />;
    case 'flask': return <FlaskConical {...props} />;
    default: return <Box {...props} />;
  }
}


// ==================== 2. 공통 프리미엄 컴포넌트 ====================

interface StatusChipProps {
  variant?: string;
  children?: React.ReactNode;
}
function StatusChip({ variant = 'subtle', children }: StatusChipProps) {
  const clsMap: Record<string, string> = {
    normal: 'ui-chip ui-chip-normal',
    warning: 'ui-chip ui-chip-warning',
    urgent: 'ui-chip ui-chip-urgent',
    subtle: 'ui-chip ui-chip-subtle',
  };
  return <span className={clsMap[variant] || clsMap.subtle}>{children}</span>;
}

interface ButtonProps {
  variant?: string;
  onClick?: (e?: any) => void;
  children?: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}
function Button({ variant = 'primary', onClick, children, className = '', type = 'button', title }: ButtonProps) {
  const base =
    variant === 'primary'
      ? 'ui-btn ui-btn-primary'
      : variant === 'text'
      ? 'ui-btn ui-btn-text'
      : 'ui-btn ui-btn-outline';
  return (
    <button type={type} onClick={onClick} title={title} className={`${base} ${className}`}>
      {children}
    </button>
  );
}

interface SectionCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}
function SectionCard({ title, subtitle, rightAction, children, className = '' }: SectionCardProps) {
  return (
    <section className={`ui-card flex flex-col ${className}`} style={{ gap: 'var(--space-4)' }}>
      {(title || rightAction) && (
        <div className="flex items-center justify-between" style={{ gap: 'var(--space-3)' }}>
          <div style={{ minWidth: 0 }}>
            {title && <h3 className="t-card-title truncate" style={{ margin: 0 }}>{title}</h3>}
            {subtitle && <p className="t-sub truncate" style={{ margin: '2px 0 0 0' }}>{subtitle}</p>}
          </div>
          {rightAction && <div className="shrink-0 flex items-center" style={{ gap: 'var(--space-2)' }}>{rightAction}</div>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}

interface ThinListRowProps {
  icon?: any;
  iconColor?: string;
  title: React.ReactNode;
  statusText?: React.ReactNode;
  badge?: React.ReactNode;
  rightElement?: React.ReactNode;
  onClick?: (e?: any) => void;
  index?: number;
  isCollapsing?: boolean;
}
function ThinListRow({ icon: Icon, iconColor, title, statusText, badge, rightElement, onClick, index = 0, isCollapsing = false }: ThinListRowProps) {
  return (
    <div
      onClick={onClick}
      style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}
      className={`thin-row stagger-item ${onClick ? 'thin-row-clickable' : ''} ${isCollapsing ? 'collapsing-item' : ''}`}
    >
      <div className="flex items-center" style={{ gap: 'var(--space-3)', minWidth: 0, flex: 1 }}>
        {Icon && (
          <Icon
            className="w-5 h-5 shrink-0"
            strokeWidth={1.5}
            style={{ color: iconColor || 'var(--text-secondary)' }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
            <span className="t-body-semibold truncate">{title}</span>
            {badge}
          </div>
          {statusText && (
            <p className="t-sub truncate" style={{ margin: '2px 0 0 0' }}>
              {statusText}
            </p>
          )}
        </div>
      </div>
      <div className="shrink-0 flex items-center" style={{ gap: 'var(--space-2)' }}>
        {rightElement || (onClick && <ChevronRight className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--text-disabled)' }} />)}
      </div>
    </div>
  );
}

interface SwipeableListRowProps {
  children?: React.ReactNode;
  onComplete?: (e?: any) => void;
  onDelete?: (e?: any) => void;
  completeLabel?: string;
  deleteLabel?: string;
  isCollapsing?: boolean;
  index?: number;
}
function SwipeableListRow({ children, onComplete, onDelete, completeLabel = '먹었어요', deleteLabel = '버렸어요', isCollapsing = false, index = 0 }: SwipeableListRowProps) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = e.touches[0].clientX - touchStartX;
    if (diff < 0 && diff > -140) setOffsetX(diff);
    else if (diff > 0) setOffsetX(0);
  };
  const handleTouchEnd = () => {
    if (offsetX < -45) setOffsetX(-128);
    else setOffsetX(0);
    setTouchStartX(null);
  };

  return (
    <div
      style={{
        borderBottom: '1px solid var(--border-hairline)',
        animationDelay: `${Math.min(index * 40, 240)}ms`
      }}
      className={`relative overflow-hidden stagger-item ${isCollapsing ? 'collapsing-item' : ''}`}
    >
      <div className="absolute inset-y-0 right-0 flex items-center" style={{ gap: '6px' }}>
        <button
          onClick={onComplete}
          style={{
            minHeight: '34px',
            padding: '0 10px',
            borderRadius: 'var(--radius-chip)',
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {completeLabel}
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            style={{
              minHeight: '34px',
              padding: '0 10px',
              borderRadius: 'var(--radius-chip)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {deleteLabel}
          </button>
        )}
      </div>

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: touchStartX === null ? 'transform 200ms ease-out' : 'none',
          backgroundColor: 'var(--bg-card)',
          padding: '14px 0',
          minHeight: 'var(--touch-min)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)'
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface ChecklistRowProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  checked: boolean;
  badgeVariant?: string;
  badgeText?: string | null;
  onToggle: (e?: any) => void;
  index?: number;
}
function ChecklistRow({ title, subtitle, checked, badgeVariant, badgeText, onToggle, index = 0 }: ChecklistRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}
      className="thin-row thin-row-clickable w-full text-left bg-transparent border-x-0 border-t-0 stagger-item"
    >
      <div className="flex items-center" style={{ gap: 'var(--space-3)', minWidth: 0 }}>
        <div
          className={`flex items-center justify-center shrink-0 ${checked ? 'check-box-pop' : ''}`}
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '6px',
            backgroundColor: checked ? 'var(--color-primary)' : 'transparent',
            border: checked ? 'none' : '1.5px solid var(--text-disabled)',
            color: '#FFFFFF',
            transition: 'background-color 200ms ease-out'
          }}
        >
          {checked && <Check className="w-3.5 h-3.5" strokeWidth={2} />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className={`t-body-semibold strike-animated ${checked ? 'is-done' : ''}`}>
            {title}
          </div>
          {subtitle && (
            <p className="t-sub" style={{ margin: '2px 0 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {badgeText && !checked && (
        <StatusChip variant={badgeVariant || 'warning'}>{badgeText}</StatusChip>
      )}
    </button>
  );
}

interface EmptyStateProps {
  icon?: any;
  title: React.ReactNode;
  description?: React.ReactNode;
  actionLabel?: string;
  onAction?: (e?: any) => void;
}
function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ padding: 'var(--space-6) var(--space-4)' }}
    >
      {Icon && (
        <Icon
          className="w-7 h-7 mb-3"
          strokeWidth={1.5}
          style={{ color: 'var(--text-disabled)' }}
        />
      )}
      <p className="t-body-semibold" style={{ margin: '0 0 4px 0' }}>{title}</p>
      <p className="t-sub" style={{ margin: '0 0 16px 0' }}>{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          <span>{actionLabel}</span>
        </Button>
      )}
    </div>
  );
}

interface BillItem {
  id: number | string;
  type: string;
  name: string;
  amount: number;
  prevAmount: number;
  dueDate: string;
  dDay: number;
  isPaid: boolean;
  icon: string;
  fromContract?: boolean;
}

// ==================== 3. 메인 애플리케이션 ====================
export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isDark, setIsDark] = useState<boolean>(() => safeLocalStorage.get('dark_mode', false));

  // 오늘 날짜/요일 및 시간대별 따뜻한 인사말 계산
  const todayInfo = useMemo(() => {
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
  }, []);

  const [fridgeItems, setFridgeItems] = useState(() => FridgeStorageRepository.getAll());
  const [purchaseHistory, setPurchaseHistory] = useState(() => FridgeStorageRepository.getPurchaseHistory());
  const [actionLogs, setActionLogs] = useState(() => FoodActionLogRepository.getAll());
  const [bills, setBills] = useState<BillItem[]>(() => safeLocalStorage.get('bills', INITIAL_BILLS));
  const [roommates, setRoommates] = useState(() => safeLocalStorage.get('roommates', INITIAL_ROOMMATES));
  const [recycleSchedule, setRecycleSchedule] = useState(() => safeLocalStorage.get('recycle_schedule', INITIAL_RECYCLE_SCHEDULE));
  const [routines, setRoutines] = useState(() => safeLocalStorage.get('routines', INITIAL_ROUTINES));
  const [supplies, setSupplies] = useState(() => safeLocalStorage.get('supplies', INITIAL_SUPPLIES));
  const [shoppingList, setShoppingList] = useState(() =>
    ShoppingListRepository.syncSuppliesToShoppingList(safeLocalStorage.get('supplies', INITIAL_SUPPLIES))
  );

  // 완료 후 부드럽게 높이가 줄어들며 사라지는 애니메이션용 ID 세트
  const [collapsingIds, setCollapsingIds] = useState<Record<string | number, boolean>>({});

  const [toastState, setToastState] = useState<{ message: string; actionLabel?: string | null; onAction?: (() => void) | null } | null>(null);
  const toastTimerRef = useRef<any>(null);

  const [fridgeSubTab, setFridgeSubTab] = useState('ingredients');
  const [fridgeFilter, setFridgeFilter] = useState('전체');
  const [fridgeSortOrder, setFridgeSortOrder] = useState<'expiry_asc' | 'purchase_desc' | 'price_desc'>(() => safeLocalStorage.get('fridge_sort', 'expiry_asc'));
  const [showAddFridgeModal, setShowAddFridgeModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('채소');
  const [newItemStorage, setNewItemStorage] = useState('냉장');
  const [newItemExpiryDate, setNewItemExpiryDate] = useState(() => addDaysToDateStr(formatDateYMD(new Date()), 7));
  const [newItemQty, setNewItemQty] = useState('1개');
  const [newItemPrice, setNewItemPrice] = useState('');

  const [shoppingInputName, setShoppingInputName] = useState('');
  const [shoppingInputQty, setShoppingInputQty] = useState('1개');
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const [statsYearMonth, setStatsYearMonth] = useState(() => formatYearMonth(new Date()));

  const [showFabMenu, setShowFabMenu] = useState(false);
  const [receiptFlowStep, setReceiptFlowStep] = useState<string | null>(null);
  const [reviewSourceMode, setReviewSourceMode] = useState('receipt');
  const [receiptErrorMsg, setReceiptErrorMsg] = useState('');
  const [receiptStoreName, setReceiptStoreName] = useState('');
  const [receiptPurchaseDate, setReceiptPurchaseDate] = useState(() => formatDateYMD(new Date()));
  const [receiptTotalAmount, setReceiptTotalAmount] = useState(0);
  const [recognizedFoodItems, setRecognizedFoodItems] = useState<any[]>([]);
  const [excludedNonFoodItems, setExcludedNonFoodItems] = useState<any[]>([]);
  const [pendingCompletedSupplies, setPendingCompletedSupplies] = useState<any[]>([]);
  const [showExcludedSection, setShowExcludedSection] = useState(false);
  const [lastUploadedBase64, setLastUploadedBase64] = useState<any>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);

  const [showNotificationPromptAfterAdd, setShowNotificationPromptAfterAdd] = useState(false);
  const [notifDaysBefore, setNotifDaysBefore] = useState<number>(() => safeLocalStorage.get('notif_config', { daysBefore: 2, time: '08:00' })?.daysBefore ?? 2);
  const [notifTime, setNotifTime] = useState<string>(() => safeLocalStorage.get('notif_config', { daysBefore: 2, time: '08:00' })?.time ?? '08:00');
  const [notifPermissionState, setNotifPermissionState] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [widgetSize, setWidgetSize] = useState('medium');
  const [widgetVisibleConfig, setWidgetVisibleConfig] = useState({
    recycle: true,
    fridge: true,
    bills: true,
    routines: true,
  });
  const [showNativeSpecDoc, setShowNativeSpecDoc] = useState(false);
  const [showPwaBanner, setShowPwaBanner] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const [showIosInstallModal, setShowIosInstallModal] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const [splitPeople, setSplitPeople] = useState<number>(() => safeLocalStorage.get('split_people', 3));
  const [selectedBillsForSplit, setSelectedBillsForSplit] = useState<(number | string)[]>([1, 2, 3]);
  const [extraSplitAmount, setExtraSplitAmount] = useState(0);
  const [extraSplitMemo, setExtraSplitMemo] = useState('공동 생필품 구입');
  const [bankAccount, setBankAccount] = useState<string>(() => safeLocalStorage.get('bank_account', ''));
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [newBillName, setNewBillName] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [newBillDue, setNewBillDue] = useState('매월 25일');

  // 우리집 (계약 · 이사) 상태
  const [contract, setContract] = useState<ContractInfo | null>(() => safeLocalStorage.get('contract', null));
  const [contractTimelineDone, setContractTimelineDone] = useState<Record<string, boolean>>(() => safeLocalStorage.get('contract_timeline_done', {}));
  const [moveDate, setMoveDate] = useState<string>(() => safeLocalStorage.get('move_date', ''));
  const [moveChecklist, setMoveChecklist] = useState<MoveChecklistItem[]>(() => safeLocalStorage.get('move_checklist', DEFAULT_MOVE_CHECKLIST));

  const [selectedDayIdx, setSelectedDayIdx] = useState(todayInfo.dayIdx);
  const [recycleSearch, setRecycleSearch] = useState('');
  const [todayRecycleDone, setTodayRecycleDone] = useState(false);

  // localStorage 동기화
  useEffect(() => { safeLocalStorage.set('bills', bills); }, [bills]);
  useEffect(() => { safeLocalStorage.set('roommates', roommates); }, [roommates]);
  useEffect(() => { safeLocalStorage.set('recycle_schedule', recycleSchedule); }, [recycleSchedule]);
  useEffect(() => { safeLocalStorage.set('routines', routines); }, [routines]);
  useEffect(() => { safeLocalStorage.set('supplies', supplies); }, [supplies]);
  useEffect(() => { safeLocalStorage.set('dark_mode', isDark); }, [isDark]);
  useEffect(() => { safeLocalStorage.set('notif_config', { daysBefore: notifDaysBefore, time: notifTime }); }, [notifDaysBefore, notifTime]);
  useEffect(() => { safeLocalStorage.set('bank_account', bankAccount); }, [bankAccount]);
  useEffect(() => { safeLocalStorage.set('split_people', splitPeople); }, [splitPeople]);
  useEffect(() => { safeLocalStorage.set('fridge_sort', fridgeSortOrder); }, [fridgeSortOrder]);
  useEffect(() => { safeLocalStorage.set('contract', contract); }, [contract]);
  useEffect(() => { safeLocalStorage.set('contract_timeline_done', contractTimelineDone); }, [contractTimelineDone]);
  useEffect(() => { safeLocalStorage.set('move_date', moveDate); }, [moveDate]);
  useEffect(() => { safeLocalStorage.set('move_checklist', moveChecklist); }, [moveChecklist]);

  // 계약 정보(월세/납부일)와 정산 탭 공과금 목록 자동 연동
  useEffect(() => {
    if (contract && contract.monthlyRent && contract.monthlyRent > 0 && contract.paymentDay) {
      setBills(prev => {
        const existingIdx = prev.findIndex(b => b.fromContract || b.id === 'contract_rent' || b.name === '월세');
        const rentDDay = calcDaysUntilPaymentDay(contract.paymentDay, todayInfo.todayYMD);
        const dueText = rentDDay === 0 ? '오늘 마감' : rentDDay <= 3 ? `${rentDDay}일 남음` : `매월 ${contract.paymentDay}일`;

        if (existingIdx >= 0) {
          const current = prev[existingIdx];
          if (current.amount === contract.monthlyRent && current.dueDate === dueText && current.fromContract) {
            return prev;
          }
          const updated = [...prev];
          updated[existingIdx] = {
            ...current,
            name: '월세',
            amount: contract.monthlyRent,
            prevAmount: current.amount || contract.monthlyRent,
            dueDate: dueText,
            dDay: rentDDay,
            fromContract: true
          };
          return updated;
        } else {
          const newRentBill = {
            id: 'contract_rent',
            type: '월세',
            name: '월세',
            amount: contract.monthlyRent,
            prevAmount: contract.monthlyRent,
            dueDate: dueText,
            dDay: rentDDay,
            isPaid: false,
            icon: 'building',
            fromContract: true
          };
          return [newRentBill, ...prev];
        }
      });
    } else {
      setBills(prev => {
        const hasContractBill = prev.some(b => b.fromContract);
        if (!hasContractBill) return prev;
        return prev.filter(b => !b.fromContract);
      });
    }
  }, [contract, todayInfo.todayYMD]);

  useEffect(() => {
    setSelectedDayIdx(todayInfo.dayIdx);
  }, [todayInfo.dayIdx]);

  useEffect(() => {
    const synced = ShoppingListRepository.syncSuppliesToShoppingList(supplies);
    setShoppingList(synced);
  }, [supplies]);

  // PWA standalone 및 플랫폼 감지 & beforeinstallprompt 핸들러
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandaloneApp(isStandalone);

      const ua = window.navigator.userAgent.toLowerCase();
      const isIos = /iphone|ipad|ipod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
      setIsIosDevice(isIos);

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      const handleAppInstalled = () => {
        setDeferredPrompt(null);
        setShowPwaBanner(false);
        showToast('앱이 성공적으로 홈 화면에 설치되었습니다!');
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    } catch (e) {
      // ignore
    }
  }, []);

  // 서비스 워커 등록 및 새 버전 배포 감지
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          setSwRegistration(reg);

          // 이미 대기 중인 새 워커가 있는 경우
          if (reg.waiting) {
            setSwUpdateAvailable(true);
            setWaitingWorker(reg.waiting);
          }

          // 새 버전 워커 설치 감지
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setSwUpdateAvailable(true);
                  setWaitingWorker(newWorker);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[SW Registration Notice]:', err);
        });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    } catch (err) {
      console.warn('[SW Exception]:', err);
    }
  }, []);

  // 유통기한 알림 점검 (앱 실행 및 visibilitychange 포그라운드 복귀 시)
  const checkAndTriggerExpiryNotifications = useCallback(async () => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    try {
      const todayYMD = formatDateYMD(new Date());
      const notifiedHistory = safeLocalStorage.get<Record<string, string>>('notified_expiry', {});

      const targets = getNotificationTargets({
        fridgeItems,
        daysBefore: notifDaysBefore,
        todayYMD,
        alreadyNotifiedMap: notifiedHistory,
        contractInfo: contract
      });

      if (targets.length > 0) {
        const sent = await sendLocalExpiryNotification(targets, swRegistration);
        if (sent) {
          const updated = { ...notifiedHistory };
          targets.forEach((t) => {
            updated[String(t.id)] = todayYMD;
          });
          safeLocalStorage.set('notified_expiry', updated);
        }
      }
    } catch (err) {
      console.warn('[Expiry Notification Check Failed]:', err);
    }
  }, [fridgeItems, notifDaysBefore, swRegistration, contract]);

  useEffect(() => {
    checkAndTriggerExpiryNotifications();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndTriggerExpiryNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkAndTriggerExpiryNotifications]);


  useEffect(() => {
    const hasHighlighted = fridgeItems.some((i: any) => i.isNewHighlight);
    if (!hasHighlighted) return;
    const timer = setTimeout(() => {
      setFridgeItems(prev => {
        const updated = prev.map((item: any) => ({ ...item, isNewHighlight: false }));
        FridgeStorageRepository.saveAll(updated);
        return updated;
      });
    }, 2200);
    return () => clearTimeout(timer);
  }, [fridgeItems]);

  const showToast = (msg, actionOption = null) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastState({
      message: msg,
      actionLabel: actionOption?.label || null,
      onAction: actionOption?.onClick || null,
    });
    toastTimerRef.current = setTimeout(() => {
      setToastState(null);
    }, actionOption ? 5000 : 3200);
  };

  const copyToClipboard = (text, successMsg) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(successMsg || '클립보드에 복사되었습니다!');
    } catch (err) {
      showToast('복사에 실패했습니다.');
    }
    document.body.removeChild(textArea);
  };

  // --- 파생 데이터 계산 ---
  const urgentFridgeItems = useMemo(() => {
    return fridgeItems
      .filter(item => item.expiryDays <= 3)
      .sort((a, b) => a.expiryDays - b.expiryDays);
  }, [fridgeItems]);

  const displayedFridgeItems = useMemo(() => {
    return fridgeItems
      .filter(item => {
        if (fridgeFilter === '전체') return true;
        if (fridgeFilter === '임박(D-3)') return item.expiryDays <= 3;
        return item.storage === fridgeFilter;
      })
      .sort((a, b) => {
        if (fridgeSortOrder === 'expiry_asc') {
          const diff = a.expiryDays - b.expiryDays;
          if (diff !== 0) return diff;
          return (b.purchaseDate || '').localeCompare(a.purchaseDate || '');
        }
        if (fridgeSortOrder === 'purchase_desc') {
          const diff = (b.purchaseDate || '').localeCompare(a.purchaseDate || '');
          if (diff !== 0) return diff;
          return a.expiryDays - b.expiryDays;
        }
        if (fridgeSortOrder === 'price_desc') {
          const priceA = a.price !== null && a.price !== undefined && !isNaN(Number(a.price)) ? Number(a.price) : -1;
          const priceB = b.price !== null && b.price !== undefined && !isNaN(Number(b.price)) ? Number(b.price) : -1;
          const diff = priceB - priceA;
          if (diff !== 0) return diff;
          return a.expiryDays - b.expiryDays;
        }
        return 0;
      });
  }, [fridgeItems, fridgeFilter, fridgeSortOrder]);

  const unpaidBills = useMemo(() => bills.filter(b => !b.isPaid), [bills]);
  const totalMonthlyBills = useMemo(() => bills.reduce((acc, cur) => acc + cur.amount, 0), [bills]);
  const totalPrevBills = useMemo(() => bills.reduce((acc, cur) => acc + cur.prevAmount, 0), [bills]);

  const splitTargetTotal = useMemo(() => {
    const billsSum = bills
      .filter(b => selectedBillsForSplit.includes(b.id))
      .reduce((sum, b) => sum + b.amount, 0);
    return billsSum + (Number(extraSplitAmount) || 0);
  }, [bills, selectedBillsForSplit, extraSplitAmount]);

  const perPersonAmount = useMemo(() => {
    return Math.ceil(splitTargetTotal / Math.max(1, splitPeople));
  }, [splitTargetTotal, splitPeople]);

  const todayRecycleList = useMemo(() => {
    return recycleSchedule[todayInfo.dayIdx] || [];
  }, [recycleSchedule, todayInfo.dayIdx]);

  const homeSummaryCounts = useMemo(() => {
    const recycleTask = !todayRecycleDone && todayRecycleList.length > 0 ? 1 : 0;
    const unpaidCount = unpaidBills.length;
    const pendingRoutines = routines.filter(r => !r.completedToday).length;
    const totalTodo = recycleTask + unpaidCount + pendingRoutines;

    const todayDueBills = unpaidBills.filter(b => b.dDay <= 0).length;
    const expiredOrTodayFridge = urgentFridgeItems.filter(i => i.expiryDays <= 1).length;
    const urgentTotal = todayDueBills + expiredOrTodayFridge;

    return { totalTodo, urgentTotal };
  }, [todayRecycleDone, todayRecycleList, unpaidBills, routines, urgentFridgeItems]);

  const contractDDay = useMemo(() => {
    return contract?.endDate ? calcContractDDay(contract.endDate, todayInfo.todayYMD) : null;
  }, [contract, todayInfo.todayYMD]);

  // 홈 화면 주인공 카드(Hero Card): 지금 가장 급한 할 일 1개 자동 선정
  const heroTask = useMemo(() => {
    const todayBill = unpaidBills.find(b => b.dDay <= 0);
    if (todayBill) {
      return {
        type: 'bill' as const,
        targetId: todayBill.id,
        targetName: todayBill.name,
        statusVariant: 'urgent' as const,
        statusLabel: '오늘 마감',
        title: `${todayBill.name} 납부일이에요`,
        metric: `${todayBill.amount.toLocaleString()}원`,
        sub: splitPeople === 1
          ? `전월 대비 ${Math.abs(todayBill.amount - todayBill.prevAmount).toLocaleString()}원 변동`
          : `1/${splitPeople} 정산 시 1인당 ${perPersonAmount.toLocaleString()}원`,
        ctaLabel: '송금 완료 처리하기'
      };
    }
    // 월세 납부일 3일 전이면 홈 주인공 카드 후보에 "월세 납부일 D-3" 노출
    if (contract && contract.monthlyRent > 0 && contract.paymentDay) {
      const daysUntilRent = calcDaysUntilPaymentDay(contract.paymentDay, todayInfo.todayYMD);
      if (daysUntilRent <= 3 && daysUntilRent >= 0) {
        return {
          type: 'bill' as const,
          targetId: 'contract_rent',
          targetName: '월세',
          statusVariant: daysUntilRent === 0 ? ('urgent' as const) : ('warning' as const),
          statusLabel: daysUntilRent === 0 ? '오늘 납부일' : `납부 D-${daysUntilRent}`,
          title: daysUntilRent === 0 ? '오늘 월세 납부일이에요' : `월세 납부일이 ${daysUntilRent}일 남았어요 (D-${daysUntilRent})`,
          metric: `${contract.monthlyRent.toLocaleString()}원`,
          sub: `매월 ${contract.paymentDay}일 납부 예정 · ${contract.landlordName || '집주인'} 계좌 잔액 확인`,
          ctaLabel: '정산 탭에서 확인하기'
        };
      }
    }
    if (urgentFridgeItems.length > 0 && urgentFridgeItems[0].expiryDays <= 1) {
      const target = urgentFridgeItems[0];
      const dLabel = target.expiryDays < 0 ? `D+${Math.abs(target.expiryDays)}` : target.expiryDays === 0 ? 'D-Day' : `D-${target.expiryDays}`;
      return {
        type: 'fridge' as const,
        targetId: target.id,
        targetName: target.name,
        statusVariant: target.expiryDays <= 0 ? 'urgent' : 'warning',
        statusLabel: '유통기한 임박',
        title: `${target.name} 먼저 소비해보세요`,
        metric: dLabel,
        sub: `${target.storage} 보관 중 · 수량 ${target.quantity} 외 임박 재료 ${Math.max(0, urgentFridgeItems.length - 1)}개`,
        ctaLabel: '먹었어요 처리하기'
      };
    }
    if (!todayRecycleDone && todayRecycleList.length > 0) {
      return {
        type: 'recycle' as const,
        statusVariant: 'normal' as const,
        statusLabel: '오후 8시 배출',
        title: `오늘은 ${todayRecycleList[0]} 배출일이에요`,
        metric: `${todayRecycleList.length}종`,
        sub: `배출 품목: ${todayRecycleList.join(' · ')}`,
        ctaLabel: '배출 완료 체크하기'
      };
    }
    return {
      type: 'clear' as const,
      statusVariant: 'normal' as const,
      statusLabel: '모두 완료',
      title: '오늘 급한 집안일을 모두 끝냈어요',
      metric: '0건',
      sub: '영수증을 스캔하거나 이번 달 식비 리포트를 가볍게 확인해보세요',
      ctaLabel: '영수증 촬영으로 식재료 등록'
    };
  }, [unpaidBills, urgentFridgeItems, todayRecycleDone, todayRecycleList, splitPeople, perPersonAmount, contract, todayInfo.todayYMD]);

  const recommendedRecipes = useMemo(() => {
    const names = fridgeItems.map(i => i.name).join(' ');
    const recipes = [];
    if (names.includes('두부') || names.includes('김치') || names.includes('삼겹살')) {
      recipes.push({
        title: '참치/삼겹 두부 김치짜글이',
        time: '15분',
        difficulty: '초간단',
        usingItems: ['찌개용 두부', '배추김치', '양파', '대파'],
        desc: '유통기한 임박한 두부와 양파를 한 번에 해결하는 메뉴'
      });
    }
    if (names.includes('우유') || names.includes('계란')) {
      recipes.push({
        title: '초촉촉 프렌치 토스트 & 스크램블',
        time: '10분',
        difficulty: '초간단',
        usingItems: ['서울우유 1L', '계란 (대란)'],
        desc: '하루 남은 우유와 계란을 듬뿍 풀어 브런치로 즐기세요'
      });
    }
    recipes.push({
      title: '대파 듬뿍 간장 계란밥',
      time: '5분',
      difficulty: '자취생 필수',
      usingItems: ['계란 (대란)', '대파', '햇반'],
      desc: '설거지 귀찮은 날, 파기름 내서 5분 만에 완성하는 한 끼'
    });
    return recipes;
  }, [fridgeItems]);

  const shoppingStats = useMemo(() => {
    const total = shoppingList.length;
    const remaining = shoppingList.filter(i => !i.checked).length;
    const checkedCount = total - remaining;
    const progressPct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
    return { total, remaining, checkedCount, progressPct };
  }, [shoppingList]);

  const autocompleteSuggestions = useMemo(() => {
    const q = shoppingInputName.trim().toLowerCase();
    if (!q) return [];
    const poolSet = new Set([
      ...fridgeItems.map(i => i.name),
      ...purchaseHistory.map(p => p.name),
      ...actionLogs.map(l => l.name),
      ...supplies.map(s => s.name),
      '서울우유 1L', '찌개용 두부', '계란 10구', '한돈 삼겹살', '대파 1단', '양파 1망', '콩나물 1봉', '팽이버섯', '배추김치', '햇반', '종량제 봉투 (10L)', '두루마리 휴지'
    ]);
    return Array.from(poolSet)
      .filter(name => name.toLowerCase().includes(q) && name.toLowerCase() !== q)
      .slice(0, 5);
  }, [shoppingInputName, fridgeItems, purchaseHistory, actionLogs, supplies]);

  const selectedMonthStats = useMemo(() => {
    return calculateFoodStatsPure(actionLogs, purchaseHistory, fridgeItems, statsYearMonth);
  }, [actionLogs, purchaseHistory, fridgeItems, statsYearMonth]);

  const currentMonthHomeStats = useMemo(() => {
    return calculateFoodStatsPure(actionLogs, purchaseHistory, fridgeItems, todayInfo.thisYearMonth);
  }, [actionLogs, purchaseHistory, fridgeItems, todayInfo.thisYearMonth]);

  // --- 핸들러 함수 (완료 시 200ms 축소 애니메이션 후 제거) ---
  const handleConsumeItem = (id, name, actionType = 'eat') => {
    setCollapsingIds(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      const targetItem = fridgeItems.find(i => i.id === id);
      const updated = FridgeStorageRepository.removeById(id);
      setFridgeItems(updated);
      setCollapsingIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      const isEat = actionType === 'eat';
      const wasNearExpiry = targetItem ? targetItem.expiryDays <= 2 : false;
      const reasonTag = isEat ? '다 먹었어요' : '유통기한 지남';

      const updatedLogs = FoodActionLogRepository.addLog({
        itemId: id,
        name: targetItem ? targetItem.name : name,
        category: targetItem ? targetItem.category : '기타',
        price: targetItem ? targetItem.price : null,
        action: isEat ? 'eaten' : 'discarded',
        actionDate: todayInfo.todayYMD,
        wasNearExpiry,
        viaRescueRecipe: false,
      });
      setActionLogs(updatedLogs);

      showToast(
        isEat ? `'${name}' 먹었어요 완료! 다시 살까요?` : `'${name}' 비우기 완료. 다시 살까요?`,
        {
          label: '+ 장보기에 담기',
          onClick: () => {
            const nextShopping = ShoppingListRepository.addOrIncrementItem({
              name: targetItem ? targetItem.name : name,
              quantity: targetItem ? targetItem.quantity : '1개',
              section: 'food',
              category: targetItem ? targetItem.category : '기타',
              reasonTag,
              isAuto: false
            });
            setShoppingList(nextShopping);
            showToast(`'${name}' 항목을 장보기 리스트에 담았어요!`);
          }
        }
      );
    }, 200);
  };

  const handleCookWithRescueRecipe = (recipe) => {
    const matchedItems = fridgeItems.filter(item =>
      recipe.usingItems.some(u => item.name.includes(u) || u.includes(item.name))
    );
    if (matchedItems.length === 0) {
      showToast(`현재 냉장고에 '${recipe.title}'에 해당하는 식재료가 이미 모두 소진되었어요.`);
      return;
    }

    let latestFridge = fridgeItems;
    let latestLogs = actionLogs;
    matchedItems.forEach(item => {
      latestFridge = FridgeStorageRepository.removeById(item.id);
      latestLogs = FoodActionLogRepository.addLog({
        itemId: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        action: 'eaten',
        actionDate: todayInfo.todayYMD,
        wasNearExpiry: item.expiryDays <= 2,
        viaRescueRecipe: true,
      });
    });

    setFridgeItems(latestFridge);
    setActionLogs(latestLogs);
    const savedSum = matchedItems.reduce((acc, cur) => acc + (cur.price ? Number(cur.price) : 0), 0);
    showToast(
      `요리 완료! 재료 ${matchedItems.length}개를 구출해 ${savedSum > 0 ? `${savedSum.toLocaleString()}원을 아꼈어요!` : '식비를 아꼈어요!'}`,
      {
        label: '통계 보기',
        onClick: () => {
          setActiveTab('fridge');
          setFridgeSubTab('stats');
        }
      }
    );
  };

  const handleAddFridgeItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const parsedPrice = newItemPrice !== '' && !isNaN(Number(newItemPrice)) ? Number(newItemPrice) : null;
    const updated = FridgeStorageRepository.addBatch([
      {
        name: newItemName.trim(),
        quantity: newItemQty || '1개',
        price: parsedPrice,
        category: newItemCategory,
        storage: newItemStorage,
        purchaseDate: todayInfo.todayYMD,
        expiryDate: newItemExpiryDate,
        source: 'manual'
      }
    ]);
    setFridgeItems(updated);
    setPurchaseHistory(FridgeStorageRepository.getPurchaseHistory());
    setNewItemName('');
    setNewItemPrice('');
    setShowAddFridgeModal(false);
    setShowNotificationPromptAfterAdd(true);
    showToast(`'${newItemName.trim()}' 식재료가 냉장고에 등록되었습니다.`);
  };

  const handleQuickAddFridge = (preset) => {
    const expiryDate = addDaysToDateStr(todayInfo.todayYMD, preset.expiryDays);
    const updated = FridgeStorageRepository.addBatch([
      {
        name: preset.name,
        quantity: preset.quantity,
        price: preset.price || null,
        category: preset.foodCategory || '기타',
        storage: preset.category || '냉장',
        purchaseDate: todayInfo.todayYMD,
        expiryDate,
        source: 'manual'
      }
    ]);
    setFridgeItems(updated);
    setPurchaseHistory(FridgeStorageRepository.getPurchaseHistory());
    showToast(`'${preset.name}' 빠른 등록 완료!`);
  };

  const handleAddShoppingManual = (e) => {
    if (e) e.preventDefault();
    if (!shoppingInputName.trim()) return;
    const next = ShoppingListRepository.addOrIncrementItem({
      name: shoppingInputName.trim(),
      quantity: shoppingInputQty || '1개',
      section: 'custom',
      category: '기타',
      reasonTag: '직접 추가',
      isAuto: false
    });
    setShoppingList(next);
    setShoppingInputName('');
    setShoppingInputQty('1개');
    setShowAutocomplete(false);
    showToast(`'${shoppingInputName.trim()}' 항목을 장보기 리스트에 추가했어요.`);
  };

  const handleToggleShoppingCheck = (id) => {
    const updated = shoppingList.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    ShoppingListRepository.saveAll(updated);
    setShoppingList(updated);
  };

  const handleDeleteShoppingItem = (id) => {
    setCollapsingIds(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      const target = shoppingList.find(i => i.id === id);
      const updated = ShoppingListRepository.removeItem(id);
      setShoppingList(updated);
      setCollapsingIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (target) {
        showToast(`'${target.name}' 항목이 삭제되었습니다. (자동 추가 항목은 7일간 제외)`);
      }
    }, 200);
  };

  const handleShareShoppingList = async () => {
    const lines = shoppingList.map(i => `${i.checked ? '☑' : '□'} ${i.name} (${i.quantity})`);
    const shareText = `[장보기]\n${lines.join('\n')}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: '나혼자 잘산다 · 장보기 리스트', text: shareText });
        return;
      } catch (e) {
        // fallback
      }
    }
    copyToClipboard(shareText, '장보기 리스트가 클립보드에 복사되었습니다!');
  };

  const handleOpenShoppingCompleteReview = () => {
    const checkedItems = shoppingList.filter(i => i.checked);
    if (checkedItems.length === 0) return;

    const foodItemsToReview = [];
    const suppliesToComplete = [];

    checkedItems.forEach((item, idx) => {
      if (item.section === 'supply' || item.supplyId) {
        suppliesToComplete.push(item);
      } else {
        const cat = FOOD_CATEGORIES.includes(item.category) ? item.category : '기타';
        const catEntry = CATEGORY_EXPIRY_DAYS_TABLE[cat] || CATEGORY_EXPIRY_DAYS_TABLE['기타'];
        const storage = catEntry.defaultStorage || '냉장';
        const recDays = getRecommendedExpiryDays(cat, storage);
        foodItemsToReview.push({
          tempId: `shop-rev-${Date.now()}-${idx}`,
          shoppingItemId: item.id,
          checked: true,
          name: item.name,
          quantity: item.quantity || '1개',
          price: '',
          category: cat,
          storage,
          expiryDate: addDaysToDateStr(todayInfo.todayYMD, recDays),
          expiryLabelType: 'auto',
          is_food: true
        });
      }
    });

    if (foodItemsToReview.length === 0 && suppliesToComplete.length > 0) {
      const completedSupplyIds = suppliesToComplete.map(s => s.supplyId).filter(Boolean);
      const completedSupplyNames = suppliesToComplete.map(s => s.name);
      setSupplies(prev =>
        prev.map(sup =>
          completedSupplyIds.includes(sup.id) || completedSupplyNames.includes(sup.name)
            ? { ...sup, needBuy: false, status: '재고 채움 (교체주기 리셋)' }
            : sup
        )
      );
      const remainingList = shoppingList.filter(i => !i.checked);
      ShoppingListRepository.saveAll(remainingList);
      setShoppingList(remainingList);
      showToast(`생필품 ${suppliesToComplete.length}개 재고 채움 완료!`);
      return;
    }

    setReviewSourceMode('shopping_complete');
    setReceiptStoreName('장보기 구매 완료');
    setReceiptPurchaseDate(todayInfo.todayYMD);
    setReceiptTotalAmount(0);
    setRecognizedFoodItems(foodItemsToReview);
    setExcludedNonFoodItems([]);
    setPendingCompletedSupplies(suppliesToComplete);
    setShowExcludedSection(false);
    setReceiptFlowStep('review');
  };

  const populateReceiptReviewData = (parsedData) => {
    if (!parsedData || parsedData.is_valid_receipt === false || !Array.isArray(parsedData.items) || parsedData.items.length === 0) {
      setReceiptErrorMsg('영수증을 인식하지 못했어요. 밝은 곳에서 평평하게 다시 찍어주세요.');
      setReceiptFlowStep('error');
      return;
    }

    setReviewSourceMode('receipt');
    setPendingCompletedSupplies([]);
    const basePurchaseDate = parsedData.purchase_date || todayInfo.todayYMD;
    setReceiptStoreName(parsedData.store || '마트 영수증');
    setReceiptPurchaseDate(basePurchaseDate);
    setReceiptTotalAmount(Number(parsedData.total_amount) || 0);

    const foods = [];
    const nonFoods = [];

    parsedData.items.forEach((rawItem, idx) => {
      const cat = FOOD_CATEGORIES.includes(rawItem.category) ? rawItem.category : '기타';
      const catEntry = CATEGORY_EXPIRY_DAYS_TABLE[cat] || CATEGORY_EXPIRY_DAYS_TABLE['기타'];
      const storage = ['냉장', '냉동', '실온'].includes(rawItem.storage) ? rawItem.storage : catEntry.defaultStorage;
      const recDays = getRecommendedExpiryDays(cat, storage);
      const hasPrintedExpiry = Boolean(rawItem.printed_expiry_date && /^\d{4}-\d{2}-\d{2}$/.test(rawItem.printed_expiry_date));
      const computedExpiryDate = hasPrintedExpiry
        ? rawItem.printed_expiry_date
        : addDaysToDateStr(basePurchaseDate, recDays);

      const parsedPrice = rawItem.price !== undefined && rawItem.price !== null && !isNaN(Number(rawItem.price))
        ? Number(rawItem.price)
        : '';

      const rowObj = {
        tempId: `rec-${Date.now()}-${idx}`,
        checked: true,
        name: rawItem.name || '인식된 품목',
        quantity: String(rawItem.quantity || '1개'),
        price: parsedPrice,
        category: cat,
        storage,
        expiryDate: computedExpiryDate,
        expiryLabelType: hasPrintedExpiry ? 'printed' : 'auto',
        is_food: rawItem.is_food !== false
      };

      if (rowObj.is_food) foods.push(rowObj);
      else nonFoods.push(rowObj);
    });

    if (foods.length === 0 && nonFoods.length === 0) {
      setReceiptErrorMsg('영수증을 인식하지 못했어요. 밝은 곳에서 평평하게 다시 찍어주세요.');
      setReceiptFlowStep('error');
      return;
    }

    setRecognizedFoodItems(foods);
    setExcludedNonFoodItems(nonFoods);
    setShowExcludedSection(false);
    setReceiptFlowStep('review');
  };

  const handleStartDemoReceipt = () => {
    setShowFabMenu(false);
    setReceiptFlowStep('analyzing');
    setTimeout(() => {
      populateReceiptReviewData(MOCK_RECEIPT_RESULT);
    }, 900);
  };

  const analyzeReceiptWithGemini = async (base64ImageData, mimeType = 'image/jpeg') => {
    setReceiptFlowStep('analyzing');
    setReceiptErrorMsg('');

    try {
      const parsed = await callGeminiReceiptAnalysis({
        base64ImageData,
        mimeType,
        todayYMD: todayInfo.todayYMD
      });
      populateReceiptReviewData(parsed);
    } catch (err: any) {
      const customMsg = err?.message || '영수증을 인식하지 못했어요. 밝은 곳에서 평평하게 다시 찍어주세요.';
      setReceiptErrorMsg(customMsg);
      setReceiptFlowStep('error');
    }
  };

  const handleReceiptFileChange = async (e) => {
    const file = e.target.files?.[0];
    setShowFabMenu(false);
    if (!file) return;
    try {
      setReceiptFlowStep('analyzing');
      const { base64Data, mimeType } = (await resizeImageToMax1600(file)) as any;
      setLastUploadedBase64({ base64Data, mimeType });
      await analyzeReceiptWithGemini(base64Data, mimeType);
    } catch (err) {
      setReceiptErrorMsg('이미지 처리 중 오류가 발생했어요. 다른 사진으로 다시 시도해주세요.');
      setReceiptFlowStep('error');
    } finally {
      e.target.value = '';
    }
  };

  const updateRecognizedItem = (tempId, field, value) => {
    setRecognizedFoodItems(prev =>
      prev.map(item => {
        if (item.tempId !== tempId) return item;
        const updated = { ...item, [field]: value };
        if ((field === 'storage' || field === 'category') && item.expiryLabelType === 'auto') {
          const days = getRecommendedExpiryDays(
            field === 'category' ? value : item.category,
            field === 'storage' ? value : item.storage
          );
          updated.expiryDate = addDaysToDateStr(receiptPurchaseDate, days);
        }
        if (field === 'expiryDate') updated.expiryLabelType = 'manual';
        return updated;
      })
    );
  };

  const deleteRecognizedItem = (tempId) => {
    setRecognizedFoodItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  const restoreExcludedItem = (tempId) => {
    const target = excludedNonFoodItems.find(i => i.tempId === tempId);
    if (!target) return;
    setExcludedNonFoodItems(prev => prev.filter(i => i.tempId !== tempId));
    setRecognizedFoodItems(prev => [...prev, { ...target, is_food: true, checked: true }]);
    showToast(`'${target.name}' 항목이 식재료 목록으로 복구되었습니다.`);
  };

  const handleConfirmReceiptItems = () => {
    const selected = recognizedFoodItems.filter(i => i.checked && i.name.trim());
    if (selected.length === 0 && pendingCompletedSupplies.length === 0) {
      showToast('등록할 식재료를 1개 이상 선택해주세요.');
      return;
    }

    if (selected.length > 0) {
      const batchPayload = selected.map(item => ({
        name: item.name.trim(),
        quantity: item.quantity || '1개',
        price: item.price !== '' && item.price !== null && !isNaN(Number(item.price)) ? Number(item.price) : null,
        category: item.category,
        storage: item.storage,
        purchaseDate: receiptPurchaseDate,
        expiryDate: item.expiryDate,
        source: reviewSourceMode === 'receipt' ? 'receipt' : 'manual'
      }));

      const updated = FridgeStorageRepository.addBatch(batchPayload);
      setFridgeItems(updated);
      setPurchaseHistory(FridgeStorageRepository.getPurchaseHistory());
    }

    if (reviewSourceMode === 'shopping_complete') {
      if (pendingCompletedSupplies.length > 0) {
        const supIds = pendingCompletedSupplies.map(s => s.supplyId).filter(Boolean);
        const supNames = pendingCompletedSupplies.map(s => s.name);
        setSupplies(prev =>
          prev.map(sup =>
            supIds.includes(sup.id) || supNames.includes(sup.name)
              ? { ...sup, needBuy: false, status: '재고 채움 (교체주기 리셋)' }
              : sup
          )
        );
      }
      const remainingShopping = shoppingList.filter(i => !i.checked);
      ShoppingListRepository.saveAll(remainingShopping);
      setShoppingList(remainingShopping);
    } else {
      const registeredNames = selected.map(s => s.name.trim());
      const cleanedShopping = shoppingList.filter(
        shopItem => !registeredNames.some(rName => rName.includes(shopItem.name) || shopItem.name.includes(rName))
      );
      if (cleanedShopping.length !== shoppingList.length) {
        ShoppingListRepository.saveAll(cleanedShopping);
        setShoppingList(cleanedShopping);
      }
    }

    setReceiptFlowStep(null);
    setPendingCompletedSupplies([]);
    setActiveTab('fridge');
    setFridgeSubTab('ingredients');
    setFridgeFilter('전체');
    setShowNotificationPromptAfterAdd(true);
    showToast(`${selected.length}개를 냉장고에 등록했어요`);
  };

  const handleLoadThreeMonthsDemoData = () => {
    const { demoPurchases, demoLogs } = generateThreeMonthsDemoData();
    const initialFridge = createInitialFridgeItems();
    FridgeStorageRepository.saveAll(initialFridge);
    FridgeStorageRepository.setPurchaseHistory(demoPurchases);
    FoodActionLogRepository.saveAll(demoLogs);

    setFridgeItems(FridgeStorageRepository.getAll());
    setPurchaseHistory(FridgeStorageRepository.getPurchaseHistory());
    setActionLogs(FoodActionLogRepository.getAll());
    setShowSettingsModal(false);
    setActiveTab('fridge');
    setFridgeSubTab('stats');
    showToast('최근 3개월치 식비·소비·폐기 데모 데이터를 불러왔어요!');
  };

  const handleResetAllData = () => {
    safeLocalStorage.clearAll();
    const initialFridge = createInitialFridgeItems();
    FridgeStorageRepository.saveAll(initialFridge);
    const initialPurchases = createInitialPurchaseHistory(initialFridge);
    FridgeStorageRepository.setPurchaseHistory(initialPurchases);
    const initialLogs = createInitialActionLogs();
    FoodActionLogRepository.saveAll(initialLogs);
    const initialShopping = createInitialShoppingList();
    ShoppingListRepository.saveAll(initialShopping);

    setFridgeItems(initialFridge);
    setPurchaseHistory(initialPurchases);
    setActionLogs(initialLogs);
    setBills(INITIAL_BILLS);
    setRoommates(INITIAL_ROOMMATES);
    setRecycleSchedule(INITIAL_RECYCLE_SCHEDULE);
    setRoutines(INITIAL_ROUTINES);
    setSupplies(INITIAL_SUPPLIES);
    setShoppingList(ShoppingListRepository.syncSuppliesToShoppingList(INITIAL_SUPPLIES));
    setIsDark(false);
    setNotifDaysBefore(2);
    setNotifTime('08:00');
    setBankAccount('');
    setSplitPeople(3);
    setFridgeSortOrder('expiry_asc');
    setContract(null);
    setContractTimelineDone({});
    setMoveDate('');
    setMoveChecklist(DEFAULT_MOVE_CHECKLIST);

    setShowResetConfirmModal(false);
    setShowSettingsModal(false);
    showToast('모든 데이터가 초기 샘플 상태로 초기화되었습니다.');
  };

  const handleLoadSampleContractData = () => {
    const sample = createSampleContract(todayInfo.todayYMD);
    setContract(sample);
    setMoveChecklist(DEFAULT_MOVE_CHECKLIST);
    const moveDateObj = new Date();
    moveDateObj.setDate(moveDateObj.getDate() + 143);
    setMoveDate(formatDateYMD(moveDateObj));
    setShowSettingsModal(false);
    setActiveTab('house');
    showToast('계약·이사 샘플 데이터를 불러왔습니다!');
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      showToast('이 브라우저는 웹 알림을 지원하지 않습니다.');
      setShowNotificationPromptAfterAdd(false);
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifPermissionState(perm);
      if (perm === 'granted') {
        showToast(`알림 설정 완료! 만료 ${notifDaysBefore}일 전 ${notifTime}에 알려드릴게요.`);
        checkAndTriggerExpiryNotifications();
      } else if (perm === 'denied') {
        showToast('알림 권한이 차단되었습니다. 브라우저 설정에서 알림을 허용해주세요.');
      }
    } catch (e) {
      showToast(`알림 시간(만료 ${notifDaysBefore}일 전 ${notifTime})이 저장되었습니다.`);
    }
    setShowNotificationPromptAfterAdd(false);
  };

  const isInstallable = !isStandaloneApp && (deferredPrompt !== null || isIosDevice);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setDeferredPrompt(null);
          setShowPwaBanner(false);
          showToast('앱이 성공적으로 홈 화면에 추가되었습니다!');
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else if (isIosDevice) {
      setShowIosInstallModal(true);
    }
  };


  const toggleBillPaid = (id) => {
    setBills(prev => prev.map(b => {
      if (b.id === id) {
        const nextState = !b.isPaid;
        showToast(`${b.name} ${nextState ? '납부 완료 처리되었습니다.' : '미납 상태로 변경되었습니다.'}`);
        return { ...b, isPaid: nextState };
      }
      return b;
    }));
  };

  const handleHeroCta = useCallback(() => {
    if (heroTask.type === 'bill' && heroTask.targetId) {
      if (heroTask.targetId === 'contract_rent') {
        setActiveTab('bills');
        toggleBillPaid(heroTask.targetId);
      } else {
        toggleBillPaid(heroTask.targetId);
      }
    } else if (heroTask.type === 'fridge' && heroTask.targetId) {
      handleConsumeItem(heroTask.targetId, heroTask.targetName || '', 'eat');
    } else if (heroTask.type === 'recycle') {
      setTodayRecycleDone(true);
      showToast('오늘 분리수거 배출 완료! 수고하셨어요.');
    } else if (heroTask.type === 'clear') {
      handleStartDemoReceipt();
    }
  }, [heroTask, toggleBillPaid, handleConsumeItem, handleStartDemoReceipt, setActiveTab]);

  const handleAddBill = (e) => {
    e.preventDefault();
    if (!newBillName.trim() || !newBillAmount) return;
    const amountNum = Number(newBillAmount);
    const newBill = {
      id: Date.now(),
      type: '기타',
      name: newBillName.trim(),
      amount: amountNum,
      prevAmount: amountNum,
      dueDate: newBillDue,
      dDay: 5,
      isPaid: false,
      icon: 'building'
    };
    setBills(prev => [...prev, newBill]);
    setSelectedBillsForSplit(prev => [...prev, newBill.id]);
    setNewBillName('');
    setNewBillAmount('');
    setShowAddBillModal(false);
    showToast(`'${newBill.name}' 항목이 추가되었습니다.`);
  };

  const toggleRoommatePaid = (id) => {
    setRoommates(prev => prev.map(r => {
      if (r.id === id) {
        const next = !r.isPaid;
        showToast(`${r.name} 상태가 '${next ? '송금 완료' : '미송금'}'으로 변경되었습니다.`);
        return { ...r, isPaid: next };
      }
      return r;
    }));
  };

  const handleSendReminderMessage = () => {
    const selectedBillDetails = bills
      .filter(b => selectedBillsForSplit.includes(b.id))
      .map(b => `- ${b.name}: ${b.amount.toLocaleString()}원`)
      .join('\n');

    const extraLine = Number(extraSplitAmount) > 0
      ? `- ${extraSplitMemo || '기타 고정 지출'}: ${Number(extraSplitAmount).toLocaleString()}원\n`
      : '';

    const trimmedAccount = bankAccount.trim();

    if (splitPeople === 1) {
      const accountLine = trimmedAccount ? `\n출금/납부 계좌: ${trimmedAccount}` : '';
      const soloMsg = `[나혼자 잘산다 · ${todayInfo.month}월 내 단독 공과금 메모]\n` +
        `납부 내역:\n${selectedBillDetails}\n${extraLine}` +
        `─────────────────\n` +
        `총 납부할 금액: ${splitTargetTotal.toLocaleString()}원` +
        accountLine;
      copyToClipboard(soloMsg, '이번 달 단독 공과금 내역 메모가 복사되었습니다!');
      return;
    }

    const unpaidNames = roommates.filter(r => !r.isPaid).map(r => r.name.split(' ')[0]).join(', ');
    const accountLine = trimmedAccount ? `계좌: ${trimmedAccount}\n` : '';
    const message = `[나혼자 잘산다 · ${todayInfo.month}월 공과금 정산 알림]\n` +
      (unpaidNames ? `받는 분: ${unpaidNames}님\n\n` : '\n') +
      `정산 내역:\n${selectedBillDetails}\n${extraLine}` +
      `─────────────────\n` +
      `총 합계: ${splitTargetTotal.toLocaleString()}원\n` +
      `1인당 송금액 (1/${splitPeople}): ${perPersonAmount.toLocaleString()}원\n\n` +
      accountLine +
      `오늘 마감분이 있으니 확인 후 송금 부탁해요!`;

    copyToClipboard(message, '독촉 및 정산 안내 메시지가 복사되었습니다!');
  };

  const toggleRecycleItemForDay = (dayIdx, itemType) => {
    setRecycleSchedule(prev => {
      const currentList = prev[dayIdx] || [];
      const exists = currentList.includes(itemType);
      const updated = exists
        ? currentList.filter(i => i !== itemType)
        : [...currentList, itemType];
      return { ...prev, [dayIdx]: updated };
    });
    showToast(`${DAY_NAMES[dayIdx]}요일 분리수거 알림 설정이 변경되었습니다.`);
  };

  const toggleRoutineDone = (id) => {
    setRoutines(prev => prev.map(r => {
      if (r.id === id) {
        const next = !r.completedToday;
        if (next) showToast(`'${r.title}' 완료!`);
        return { ...r, completedToday: next, lastDone: next ? '방금 전' : r.lastDone, urgent: next ? false : r.urgent };
      }
      return r;
    }));
  };

  const toggleSupplyStatus = (id) => {
    setSupplies(prev => prev.map(s => {
      if (s.id === id) {
        const nextNeed = !s.needBuy;
        return { ...s, needBuy: nextNeed, status: nextNeed ? '구매 필요' : '여유 있음' };
      }
      return s;
    }));
  };

  const getExpiryBadge = (days) => {
    if (days < 0) return { variant: 'urgent', label: `D+${Math.abs(days)}` };
    if (days === 0) return { variant: 'urgent', label: '오늘 마감' };
    if (days <= 2) return { variant: 'warning', label: `D-${days}` };
    return { variant: 'normal', label: `D-${days}` };
  };

  const NAV_ITEMS = [
    { id: 'home', label: '오늘', desktopLabel: '오늘의 브리핑', icon: Home },
    { id: 'fridge', label: '냉장고', desktopLabel: '냉장고 · 식비', icon: Refrigerator },
    { id: 'bills', label: '정산', desktopLabel: '공과금 · 정산', icon: Receipt },
    { id: 'chores', label: '집안일', desktopLabel: '분리수거 · 루틴', icon: CheckSquare },
    { id: 'house', label: '우리집', desktopLabel: '우리집 · 계약/비상정보', icon: Building2 },
  ];

  return (
    <div className={`app-shell ${isDark ? 'dark-theme' : ''}`}>
      <DesignTokensStyle />

      {/* 숨겨진 카메라 / 앨범 파일 인풋 */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleReceiptFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={albumInputRef}
        type="file"
        accept="image/*"
        onChange={handleReceiptFileChange}
        style={{ display: 'none' }}
      />

      {/* 상단 플로팅 토스트 알림 */}
      {toastState && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-between"
          style={{
            top: 'var(--space-4)',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-btn)',
            boxShadow: 'var(--shadow-floating)',
            border: '1px solid var(--border-hairline)',
            gap: 'var(--space-3)',
            fontSize: 'var(--fs-body)',
            fontWeight: 600,
            maxWidth: '92vw',
            minHeight: '46px'
          }}
        >
          <div className="flex items-center" style={{ gap: 'var(--space-2)', minWidth: 0 }}>
            <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
            <span className="truncate">{toastState.message}</span>
          </div>
          {toastState.actionLabel && toastState.onAction && (
            <button
              onClick={toastState.onAction}
              style={{
                padding: '5px 10px',
                borderRadius: 'var(--radius-chip)',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {toastState.actionLabel}
            </button>
          )}
        </div>
      )}

      {/* ==================== 데스크톱 좌측 사이드바 (1200px~) ==================== */}
      <aside className="desktop-sidebar">
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 180 180"
                width="36"
                height="36"
                className="shrink-0"
                aria-label="나혼자 잘산다 로고"
              >
                <rect width="180" height="180" rx="42" fill="#2F7D5B"/>
                <path d="M90 38 L140 80 L130 80 L130 138 L50 138 L50 80 L40 80 Z" fill="#FFFFFF"/>
                <circle cx="90" cy="100" r="11" fill="#F6B93B"/>
              </svg>
              <div>
                <h1 className="t-card-title" style={{ margin: 0 }}>나혼자 잘산다</h1>
                <p className="t-caption" style={{ margin: 0, color: 'var(--text-secondary)' }}>1인 가구 생활 관리</p>
              </div>
            </div>
          </div>

          <nav className="flex flex-col" style={{ gap: '4px' }}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="flex items-center justify-between w-full text-left"
                  style={{
                    minHeight: 'var(--touch-min)',
                    padding: '0 var(--space-4)',
                    borderRadius: 'var(--radius-btn)',
                    backgroundColor: isActive ? 'var(--color-primary-soft)' : 'transparent',
                    color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 400,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 'var(--fs-body)',
                    transition: 'all 200ms ease-out'
                  }}
                >
                  <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                    <span>{item.desktopLabel}</span>
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="flex flex-col" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-6)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--border-hairline)' }}>
            <Button
              variant="primary"
              onClick={() => {
                setActiveTab('fridge');
                setShowFabMenu(true);
              }}
              className="w-full"
            >
              <Camera className="w-4 h-4" strokeWidth={1.5} />
              <span>영수증 촬영 등록</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowWidgetModal(true)}
              className="w-full"
            >
              <LayoutGrid className="w-4 h-4" strokeWidth={1.5} />
              <span>위젯 미리보기</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between" style={{ paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-hairline)' }}>
          <Button variant="text" onClick={() => setIsDark(!isDark)}>
            {isDark ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
            <span>{isDark ? '라이트' : '다크'}</span>
          </Button>
          <Button variant="text" onClick={() => setShowSettingsModal(true)}>
            <Settings className="w-4 h-4" strokeWidth={1.5} />
            <span>설정</span>
          </Button>
        </div>
      </aside>

      {/* ==================== 우측 메인 영역 ==================== */}
      <main className="main-area">
        {/* 새 버전 배포 알림 토스트/배너 */}
        {swUpdateAvailable && (
          <div
            className="flex items-center justify-between"
            style={{
              backgroundColor: '#2F7D5B',
              color: '#FFFFFF',
              padding: 'var(--space-2) var(--space-4)',
              gap: 'var(--space-2)'
            }}
          >
            <div className="flex items-center" style={{ gap: 'var(--space-2)', minWidth: 0 }}>
              <RefreshCw className="w-4 h-4 shrink-0 text-emerald-200" strokeWidth={1.5} />
              <span className="t-caption-semibold truncate">
                새 버전이 있어요 · 새로고침
              </span>
            </div>
            <button
              onClick={() => {
                if (waitingWorker) {
                  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
                } else {
                  window.location.reload();
                }
              }}
              style={{
                padding: '3px 10px',
                borderRadius: 'var(--radius-chip)',
                backgroundColor: '#FFFFFF',
                color: '#2F7D5B',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              새로고침
            </button>
          </div>
        )}

        {/* PWA 설치 가능 시(beforeinstallprompt 또는 iOS Safari)에만 표시되는 배너 */}
        {showPwaBanner && isInstallable && (
          <div
            className="flex items-center justify-between"
            style={{
              backgroundColor: 'var(--color-primary-soft)',
              color: 'var(--color-primary)',
              padding: 'var(--space-2) var(--space-4)',
              gap: 'var(--space-2)'
            }}
          >
            <div className="flex items-center" style={{ gap: 'var(--space-2)', minWidth: 0 }}>
              <Download className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span className="t-caption-semibold truncate">
                홈 화면에 추가하면 앱처럼 쓸 수 있어요
              </span>
            </div>
            <div className="flex items-center shrink-0" style={{ gap: 'var(--space-2)' }}>
              <button
                onClick={handleInstallClick}
                style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-chip)',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {isIosDevice ? '설치 안내' : '앱 설치'}
              </button>
              <button
                onClick={() => setShowPwaBanner(false)}
                aria-label="배너 닫기"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}


        {/* 상단 헤더 (절제된 여백 + 우측에 작은 연속일수 배지 & 아이콘) */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--bg-app)',
            borderBottom: '1px solid var(--border-hairline)',
            padding: 'var(--space-3) var(--space-4)',
            minHeight: '56px'
          }}
        >
          <div className="flex items-center" style={{ gap: 'var(--space-2)', minWidth: 0 }}>
            <h2 className="t-card-title truncate" style={{ margin: 0 }}>
              {activeTab === 'home' && '나혼자 잘산다'}
              {activeTab === 'fridge' && '냉장고 · 식비'}
              {activeTab === 'bills' && '공과금 · 정산'}
              {activeTab === 'chores' && '분리수거 · 집안일'}
              {activeTab === 'house' && '우리집 · 계약 / 비상정보'}
            </h2>
          </div>

          <div className="flex items-center shrink-0" style={{ gap: '4px' }}>
            {/* 게이미피케이션 작은 배지 (이모지 대신 라인 아이콘 + 숫자) */}
            <div
              className="flex items-center tabular-nums"
              title="연속 관리 일수 · 레벨 12"
              style={{
                padding: '4px 8px',
                borderRadius: 'var(--radius-chip)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                gap: '4px',
                marginRight: '4px'
              }}
            >
              <Flame className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
              <span>14</span>
            </div>

            <button
              onClick={() => setShowWidgetModal(true)}
              className="ui-btn-icon"
              title="위젯 미리보기"
              aria-label="위젯 미리보기"
            >
              <LayoutGrid className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="ui-btn-icon"
              title="설정"
              aria-label="설정"
            >
              <Settings className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              className="ui-btn-icon"
              title={isDark ? '라이트 모드' : '다크 모드'}
              aria-label="테마 전환"
            >
              {isDark ? <Sun className="w-5 h-5" strokeWidth={1.5} /> : <Moon className="w-5 h-5" strokeWidth={1.5} />}
            </button>
            <button
              onClick={() => showToast(`유통기한 알림(만료 ${notifDaysBefore}일 전 ${notifTime})이 켜져 있습니다.`)}
              className="ui-btn-icon relative"
              title="알림"
              aria-label="알림"
            >
              <Bell className="w-5 h-5" strokeWidth={1.5} />
              {homeSummaryCounts.urgentTotal > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '11px',
                    right: '11px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-status-urgent)'
                  }}
                />
              )}
            </button>
          </div>
        </header>

        {/* 메인 콘텐츠 영역 */}
        <div className="content-container">

          {/* ==================== 1. 홈 "오늘" 화면 (주인공 카드 1개 + 얇은 리스트 구조) ==================== */}
          {activeTab === 'home' && (
            <div className="flex flex-col" style={{ gap: 'var(--space-6)' }}>
              {/* 상단 인사 + 날짜 한 줄 & 오늘 할 일 요약 */}
              <div className="flex flex-wrap items-end justify-between" style={{ gap: 'var(--space-3)' }}>
                <div>
                  <p className="t-sub" style={{ margin: '0 0 4px 0' }}>
                    {todayInfo.fullLabel} · 오늘 할 일 {homeSummaryCounts.totalTodo}개
                  </p>
                  <h1 className="t-title" style={{ margin: 0 }}>
                    {todayInfo.greetingLine}
                  </h1>
                </div>
                <Button variant="outline" onClick={handleStartDemoReceipt}>
                  <Camera className="w-4 h-4" strokeWidth={1.5} />
                  <span>영수증 스캔</span>
                </Button>
              </div>

              {/* 주인공 카드 (Hero Card 1개): 지금 가장 급한 할 일 1개를 크게 (제목 24px semibold, 대형 숫자 38px, CTA 하나) */}
              <div className="ui-card stagger-item" style={{ padding: 'var(--space-6)' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
                  <StatusChip variant={heroTask.statusVariant}>{heroTask.statusLabel}</StatusChip>
                  <span className="t-sub">지금 가장 먼저 챙겨보세요</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end justify-between" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                  <div>
                    <h2 className="t-hero-title" style={{ margin: '0 0 6px 0' }}>
                      {heroTask.title}
                    </h2>
                    <p className="t-sub" style={{ margin: 0 }}>
                      {heroTask.sub}
                    </p>
                  </div>
                  <div className="t-hero-num shrink-0" style={{ color: heroTask.statusVariant === 'urgent' ? 'var(--color-status-urgent)' : 'var(--text-primary)' }}>
                    {heroTask.metric}
                  </div>
                </div>

                <Button variant="primary" onClick={handleHeroCta} className="w-full sm:w-auto">
                  <Check className="w-4 h-4" strokeWidth={1.5} />
                  <span>{heroTask.ctaLabel}</span>
                </Button>
              </div>

              {/* 나머지 항목: 박스 중첩 없는 얇은 행 단위 리스트 (구분선 #EEEAE4) */}
              <div className="section-grid-2">
                {/* 좌측 컬럼: 오늘의 생활 브리핑 리스트 */}
                <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
                  <div className="flex items-center justify-between" style={{ padding: '0 4px' }}>
                    <span className="t-card-title">오늘 챙길 일</span>
                    <span className="t-sub">탭하여 바로 이동</span>
                  </div>

                  <div className="thin-list-container">
                    {/* 계약 만료 D-day 180일 이하 알림 행 */}
                    {contractDDay !== null && contractDDay <= 180 && (
                      <ThinListRow
                        index={0}
                        icon={Building2}
                        iconColor={contractDDay <= 60 ? 'var(--color-status-urgent)' : 'var(--color-status-warning)'}
                        title="임대차 계약 만료 일정"
                        badge={
                          <StatusChip variant={contractDDay <= 60 ? 'urgent' : 'warning'}>
                            {contractDDay < 0 ? `D+${Math.abs(contractDDay)}` : contractDDay === 0 ? '오늘 만료' : `계약 만료 D-${contractDDay}`}
                          </StatusChip>
                        }
                        statusText={
                          contractDDay <= 60
                            ? '임차인 갱신 거절 또는 퇴거 통지 마감 임박 · 일정 확인'
                            : '만료 6개월 전 · 갱신 여부와 이사 계획을 정해볼 시기예요'
                        }
                        rightElement={
                          <Button variant="text" onClick={() => setActiveTab('house')}>
                            <span>확인하기 →</span>
                          </Button>
                        }
                        onClick={() => setActiveTab('house')}
                      />
                    )}

                    {/* 행 1: 오늘의 분리수거 */}
                    <ThinListRow
                      index={1}
                      icon={Recycle}
                      iconColor={todayRecycleDone ? 'var(--text-disabled)' : 'var(--color-primary)'}
                      title={`오늘 분리수거 (${todayInfo.dayFull})`}
                      statusText={
                        todayRecycleDone
                          ? '오늘 배출 완료됨'
                          : todayRecycleList.length > 0
                          ? `오후 8시 배출 · ${todayRecycleList.join(', ')}`
                          : '오늘은 배출 품목이 없어요'
                      }
                      rightElement={
                        <Button
                          variant={todayRecycleDone ? 'text' : 'outline'}
                          onClick={(e) => {
                            e.stopPropagation();
                            setTodayRecycleDone(!todayRecycleDone);
                            showToast(!todayRecycleDone ? '오늘 분리수거 배출 완료!' : '배출 완료가 해제되었습니다.');
                          }}
                        >
                          <span>{todayRecycleDone ? '완료됨' : '배출 완료'}</span>
                        </Button>
                      }
                      onClick={() => setActiveTab('chores')}
                    />

                    {/* 행 2: 공과금 및 1/N 정산 */}
                    <ThinListRow
                      index={2}
                      icon={Receipt}
                      iconColor={unpaidBills.some(b => b.dDay <= 0) ? 'var(--color-status-urgent)' : 'var(--text-secondary)'}
                      title="이달의 공과금 · 고정비"
                      badge={
                        unpaidBills.some(b => b.dDay <= 0) ? (
                          <StatusChip variant="urgent">오늘 마감</StatusChip>
                        ) : unpaidBills.length > 0 ? (
                          <StatusChip variant="warning">미납 {unpaidBills.length}</StatusChip>
                        ) : null
                      }
                      statusText={
                        splitPeople === 1
                          ? `총 ${totalMonthlyBills.toLocaleString()}원 · 1인 단독`
                          : `총 ${totalMonthlyBills.toLocaleString()}원 · 1인당 ${perPersonAmount.toLocaleString()}원`
                      }
                      onClick={() => setActiveTab('bills')}
                    />

                    {/* 행 3: 장보기 (N개) */}
                    <ThinListRow
                      index={3}
                      icon={ShoppingCart}
                      title={`장보기 리스트 (${shoppingStats.remaining}개)`}
                      statusText={
                        shoppingStats.remaining > 0
                          ? shoppingList.filter(i => !i.checked).slice(0, 3).map(i => i.name).join(', ') +
                            (shoppingStats.remaining > 3 ? ` 외 ${shoppingStats.remaining - 3}개` : '')
                          : '사야 할 품목이 모두 준비되었어요'
                      }
                      rightElement={
                        <Button
                          variant="text"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareShoppingList();
                          }}
                        >
                          <Copy className="w-4 h-4" strokeWidth={1.5} />
                          <span>복사</span>
                        </Button>
                      }
                      onClick={() => {
                        setActiveTab('fridge');
                        setFridgeSubTab('shopping');
                      }}
                    />

                    {/* 행 4: 이번 달 식비 & 버린 음식 요약 */}
                    <ThinListRow
                      index={4}
                      icon={BarChart3}
                      title={`이번 달 식비 ${currentMonthHomeStats.thisMonthSpend.toLocaleString()}원`}
                      statusText={`버린 음식 ${currentMonthHomeStats.discardedCount}개 · 구출로 아낀 금액 ${currentMonthHomeStats.savedAmount.toLocaleString()}원`}
                      onClick={() => {
                        setActiveTab('fridge');
                        setFridgeSubTab('stats');
                      }}
                    />
                  </div>
                </div>

                {/* 우측 컬럼: 유통기한 임박 식재료 얇은 리스트 */}
                <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
                  <div className="flex items-center justify-between" style={{ padding: '0 4px' }}>
                    <span className="t-card-title">유통기한 임박 식재료</span>
                    <button
                      onClick={() => {
                        setActiveTab('fridge');
                        setFridgeSubTab('ingredients');
                      }}
                      className="t-sub bg-transparent border-0 cursor-pointer"
                    >
                      전체 {fridgeItems.length}개 보기
                    </button>
                  </div>

                  <div className="thin-list-container">
                    {urgentFridgeItems.length > 0 ? (
                      urgentFridgeItems.slice(0, 4).map((item, idx) => {
                        const badge = getExpiryBadge(item.expiryDays);
                        return (
                          <SwipeableListRow
                            key={item.id}
                            index={idx}
                            isCollapsing={Boolean(collapsingIds[item.id])}
                            onComplete={() => handleConsumeItem(item.id, item.name, 'eat')}
                            onDelete={() => handleConsumeItem(item.id, item.name, 'trash')}
                          >
                            <div className="flex items-center" style={{ gap: 'var(--space-3)', minWidth: 0 }}>
                              <CategoryLineIcon
                                category={item.category}
                                style={{
                                  color: item.expiryDays <= 0
                                    ? 'var(--color-status-urgent)'
                                    : item.expiryDays <= 2
                                    ? 'var(--color-status-warning)'
                                    : 'var(--text-secondary)'
                                }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <span className="t-body-semibold truncate block">{item.name}</span>
                                <span className="t-sub">{item.storage} · {item.quantity}</span>
                              </div>
                            </div>
                            <div className="flex items-center shrink-0" style={{ gap: 'var(--space-2)' }}>
                              <StatusChip variant={badge.variant}>{badge.label}</StatusChip>
                              <button
                                onClick={() => handleConsumeItem(item.id, item.name, 'eat')}
                                className="ui-btn-icon"
                                title="먹었어요"
                                style={{ minWidth: '34px', minHeight: '34px' }}
                              >
                                <Check className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
                              </button>
                            </div>
                          </SwipeableListRow>
                        );
                      })
                    ) : (
                      <EmptyState
                        icon={Refrigerator}
                        title="임박한 식재료가 없어요"
                        description="냉장고 속 재료들이 모두 신선하게 보관되고 있어요"
                        actionLabel="식재료 등록하기"
                        onAction={() => {
                          setActiveTab('fridge');
                          setShowFabMenu(true);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* 하단 2열: 구출 레시피 리스트 & 이번 주 청소 루틴 리스트 */}
              <div className="section-grid-2">
                {/* 구출 레시피 */}
                <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
                  <div className="flex items-center justify-between" style={{ padding: '0 4px' }}>
                    <span className="t-card-title">임박 재료 구출 레시피</span>
                    <span className="t-sub">요리 완료 시 식비 절약 기록</span>
                  </div>
                  <div className="thin-list-container">
                    {recommendedRecipes.map((recipe, idx) => (
                      <div key={idx} className="thin-row flex-col items-stretch" style={{ gap: 'var(--space-2)' }}>
                        <div className="flex items-center justify-between" style={{ gap: 'var(--space-2)' }}>
                          <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                            <Utensils className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
                            <span className="t-body-semibold">{recipe.title}</span>
                          </div>
                          <StatusChip variant="subtle">{recipe.time}</StatusChip>
                        </div>
                        <p className="t-sub" style={{ margin: 0 }}>
                          {recipe.desc} · 재료: {recipe.usingItems.join(', ')}
                        </p>
                        <div className="flex justify-end" style={{ marginTop: '4px' }}>
                          <Button variant="outline" onClick={() => handleCookWithRescueRecipe(recipe)}>
                            <Check className="w-4 h-4" strokeWidth={1.5} />
                            <span>이 레시피로 요리했어요</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 청소 루틴 체크리스트 */}
                <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
                  <div className="flex items-center justify-between" style={{ padding: '0 4px' }}>
                    <span className="t-card-title">이번 주 집안일 루틴</span>
                    <button
                      onClick={() => setActiveTab('chores')}
                      className="t-sub bg-transparent border-0 cursor-pointer"
                    >
                      전체 보기
                    </button>
                  </div>
                  <div className="thin-list-container">
                    {routines.slice(0, 4).map((routine, idx) => (
                      <ChecklistRow
                        key={routine.id}
                        index={idx}
                        title={routine.title}
                        subtitle={`${routine.cycle} · 마지막 완료 ${routine.lastDone}`}
                        checked={routine.completedToday}
                        badgeVariant={routine.urgent ? 'warning' : 'subtle'}
                        badgeText={routine.urgent ? '권장일' : null}
                        onToggle={() => toggleRoutineDone(routine.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 2. 냉장고 탭 (재료 / 장보기 / 통계) ==================== */}
          {activeTab === 'fridge' && (
            <div className="flex flex-col" style={{ gap: 'var(--space-6)' }}>
              {/* 상단 세그먼트 바 (절제된 탭 전환) */}
              <div
                className="grid grid-cols-3"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '4px',
                  borderRadius: 'var(--radius-btn)',
                  gap: '4px'
                }}
              >
                {[
                  { id: 'ingredients', label: '재료', count: fridgeItems.length },
                  { id: 'shopping', label: '장보기', count: shoppingStats.remaining },
                  { id: 'stats', label: '식비 통계', count: null },
                ].map(seg => {
                  const isActive = fridgeSubTab === seg.id;
                  return (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => setFridgeSubTab(seg.id)}
                      className="flex items-center justify-center tabular-nums"
                      style={{
                        minHeight: '40px',
                        borderRadius: '10px',
                        backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: isActive ? 600 : 400,
                        boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                        border: 'none',
                        cursor: 'pointer',
                        gap: '6px',
                        fontSize: 'var(--fs-body)',
                        transition: 'all 200ms ease-out'
                      }}
                    >
                      <span>{seg.label}</span>
                      {seg.count !== null && (
                        <span style={{ color: isActive ? 'var(--color-primary)' : 'var(--text-disabled)', fontWeight: 600 }}>
                          {seg.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ──────────────── [세그먼트 1: 재료] ──────────────── */}
              {fridgeSubTab === 'ingredients' && (
                <div className="flex flex-col" style={{ gap: 'var(--space-5)' }}>
                  {showNotificationPromptAfterAdd && (
                    <SectionCard
                      title="방금 등록한 식재료, 유통기한 알림 시간을 설정할까요?"
                      subtitle="기본값: 만료 2일 전 오전 8시"
                      rightAction={
                        <Button variant="text" onClick={() => setShowNotificationPromptAfterAdd(false)}>
                          <span>닫기</span>
                        </Button>
                      }
                    >
                      <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-2)' }}>
                        <select
                          value={notifDaysBefore}
                          onChange={(e) => setNotifDaysBefore(Number(e.target.value))}
                          style={{
                            minHeight: 'var(--touch-min)',
                            padding: '0 var(--space-3)',
                            borderRadius: 'var(--radius-btn)',
                            border: '1px solid var(--border-hairline)',
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--text-primary)'
                          }}
                        >
                          <option value={1}>만료 1일 전</option>
                          <option value={2}>만료 2일 전 (권장)</option>
                          <option value={3}>만료 3일 전</option>
                        </select>
                        <input
                          type="time"
                          value={notifTime}
                          onChange={(e) => setNotifTime(e.target.value)}
                          style={{
                            minHeight: 'var(--touch-min)',
                            padding: '0 var(--space-3)',
                            borderRadius: 'var(--radius-btn)',
                            border: '1px solid var(--border-hairline)',
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--text-primary)'
                          }}
                        />
                        <Button variant="primary" onClick={handleRequestNotificationPermission}>
                          <Check className="w-4 h-4" strokeWidth={1.5} />
                          <span>알림 켜기</span>
                        </Button>
                      </div>
                    </SectionCard>
                  )}

                  {/* 필터 & 정렬 & 영수증 스캔 바 */}
                  <div className="flex flex-wrap items-center justify-between" style={{ gap: 'var(--space-3)' }}>
                    <div className="flex flex-wrap items-center" style={{ gap: '8px' }}>
                      <div className="flex flex-wrap items-center" style={{ gap: '6px' }}>
                        {['전체', '냉장', '냉동', '실온', '임박(D-3)'].map(cat => (
                          <Button
                            key={cat}
                            variant={fridgeFilter === cat ? 'primary' : 'outline'}
                            onClick={() => setFridgeFilter(cat)}
                          >
                            {cat}
                          </Button>
                        ))}
                      </div>

                      {/* 정렬 드롭다운 (유통기한순 / 최근 구매순 / 높은 가격순) */}
                      <div
                        className="flex items-center"
                        style={{
                          minHeight: 'var(--touch-min)',
                          padding: '0 var(--space-3)',
                          borderRadius: 'var(--radius-btn)',
                          border: '1px solid var(--border-hairline)',
                          backgroundColor: 'var(--bg-card)',
                          gap: '6px'
                        }}
                      >
                        <ArrowUpDown className="w-4 h-4 shrink-0" strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
                        <select
                          value={fridgeSortOrder}
                          onChange={(e) => setFridgeSortOrder(e.target.value as any)}
                          aria-label="식재료 정렬 기준"
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: 'var(--text-primary)',
                            fontSize: 'var(--fs-sub)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none',
                            fontFamily: 'inherit'
                          }}
                        >
                          <option value="expiry_asc">유통기한 임박순</option>
                          <option value="purchase_desc">최근 구매순</option>
                          <option value="price_desc">높은 가격순</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                      <Button variant="outline" onClick={handleStartDemoReceipt}>
                        <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                        <span>영수증 데모</span>
                      </Button>
                      <Button variant="primary" onClick={() => setShowFabMenu(true)}>
                        <Camera className="w-4 h-4" strokeWidth={1.5} />
                        <span>영수증 촬영 / 등록</span>
                      </Button>
                    </div>
                  </div>

                  {/* 자주 사는 식재료 1초 등록 */}
                  <div className="flex items-center flex-wrap" style={{ gap: 'var(--space-2)' }}>
                    <span className="t-sub" style={{ marginRight: '4px' }}>빠른 추가:</span>
                    {[
                      { name: '서울우유 1L', category: '냉장', foodCategory: '유제품', expiryDays: 7, quantity: '1개', price: 2900 },
                      { name: '두부 1모', category: '냉장', foodCategory: '두부/가공식품', expiryDays: 7, quantity: '1모', price: 1800 },
                      { name: '콩나물 1봉', category: '냉장', foodCategory: '채소', expiryDays: 7, quantity: '1봉', price: 1500 },
                      { name: '계란 한 판', category: '냉장', foodCategory: '계란', expiryDays: 21, quantity: '30구', price: 7900 },
                      { name: '한돈 삼겹살', category: '냉장', foodCategory: '육류', expiryDays: 3, quantity: '300g', price: 9800 },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuickAddFridge(preset)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-chip)',
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-hairline)',
                          color: 'var(--text-secondary)',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        + {preset.name}
                      </button>
                    ))}
                  </div>

                  {/* 식재료 행 리스트 (단일 컨테이너 내 얇은 구분선) */}
                  <div className="thin-list-container">
                    {displayedFridgeItems.length > 0 ? (
                      displayedFridgeItems.map((item, idx) => {
                          const badge = getExpiryBadge(item.expiryDays);
                          return (
                            <SwipeableListRow
                              key={item.id}
                              index={idx}
                              isCollapsing={Boolean(collapsingIds[item.id])}
                              onComplete={() => handleConsumeItem(item.id, item.name, 'eat')}
                              onDelete={() => handleConsumeItem(item.id, item.name, 'trash')}
                            >
                              <div className="flex items-center" style={{ gap: 'var(--space-3)', minWidth: 0 }}>
                                <CategoryLineIcon
                                  category={item.category}
                                  style={{
                                    color: item.expiryDays <= 0
                                      ? 'var(--color-status-urgent)'
                                      : item.expiryDays <= 2
                                      ? 'var(--color-status-warning)'
                                      : 'var(--text-secondary)'
                                  }}
                                />
                                <div style={{ minWidth: 0 }}>
                                  <div className="flex items-center" style={{ gap: '6px' }}>
                                    <span className="t-body-semibold truncate">{item.name}</span>
                                    <StatusChip variant={badge.variant}>{badge.label}</StatusChip>
                                  </div>
                                  <p className="t-sub tabular-nums" style={{ margin: '2px 0 0 0' }}>
                                    {item.storage} · {item.quantity} · {item.price ? `${item.price.toLocaleString()}원` : '금액 미입력'} · 만료 {item.expiryDate}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center shrink-0" style={{ gap: 'var(--space-2)' }}>
                                <Button
                                  variant="primary"
                                  onClick={() => handleConsumeItem(item.id, item.name, 'eat')}
                                >
                                  <Check className="w-4 h-4" strokeWidth={1.5} />
                                  <span>먹었어요</span>
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => handleConsumeItem(item.id, item.name, 'trash')}
                                  className="ui-btn-icon"
                                  title="버렸어요"
                                >
                                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                                </button>
                              </div>
                            </SwipeableListRow>
                          );
                        })
                    ) : (
                      <EmptyState
                        icon={Refrigerator}
                        title="등록된 식재료가 없어요"
                        description="영수증을 촬영하거나 직접 입력해 유통기한을 관리해보세요"
                        actionLabel="식재료 추가하기"
                        onAction={() => setShowFabMenu(true)}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ──────────────── [세그먼트 2: 장보기 리스트] ──────────────── */}
              {fridgeSubTab === 'shopping' && (
                <div className="flex flex-col" style={{ gap: 'var(--space-5)' }}>
                  {/* 진행률 요약 */}
                  <div className="ui-card">
                    <div className="flex flex-wrap items-end justify-between" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                      <div>
                        <span className="t-sub block" style={{ marginBottom: '4px' }}>사야 할 품목</span>
                        <div className="t-hero-num">
                          {shoppingStats.remaining}개 <span className="t-sub">/ 전체 {shoppingStats.total}개</span>
                        </div>
                      </div>
                      <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                        <Button variant="outline" onClick={handleStartDemoReceipt}>
                          <Camera className="w-4 h-4" strokeWidth={1.5} />
                          <span>영수증으로 등록</span>
                        </Button>
                        <Button variant="outline" onClick={handleShareShoppingList}>
                          <Share2 className="w-4 h-4" strokeWidth={1.5} />
                          <span>공유</span>
                        </Button>
                      </div>
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
                          width: `${shoppingStats.progressPct}%`,
                          height: '100%',
                          backgroundColor: 'var(--color-primary)',
                          transition: 'width 200ms ease-out'
                        }}
                      />
                    </div>
                  </div>

                  {/* 직접 추가 입력창 + 자동완성 */}
                  <div className="ui-card relative" style={{ padding: 'var(--space-4) var(--space-5)' }}>
                    <form onSubmit={handleAddShoppingManual} className="flex flex-wrap items-center" style={{ gap: 'var(--space-2)' }}>
                      <div className="relative flex-1" style={{ minWidth: '180px' }}>
                        <input
                          type="text"
                          placeholder="무엇을 사야 하나요?"
                          value={shoppingInputName}
                          onFocus={() => setShowAutocomplete(true)}
                          onBlur={() => setTimeout(() => setShowAutocomplete(false), 180)}
                          onChange={(e) => {
                            setShoppingInputName(e.target.value);
                            setShowAutocomplete(true);
                          }}
                          style={{
                            width: '100%',
                            minHeight: 'var(--touch-min)',
                            padding: '0 var(--space-3)',
                            borderRadius: 'var(--radius-btn)',
                            border: '1px solid var(--border-hairline)',
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--text-primary)',
                            fontSize: 'var(--fs-body)'
                          }}
                        />
                        {showAutocomplete && autocompleteSuggestions.length > 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '48px',
                              left: 0,
                              right: 0,
                              backgroundColor: 'var(--bg-card)',
                              borderRadius: 'var(--radius-btn)',
                              boxShadow: 'var(--shadow-floating)',
                              border: '1px solid var(--border-hairline)',
                              zIndex: 35,
                              padding: '4px'
                            }}
                          >
                            {autocompleteSuggestions.map((sug, i) => (
                              <button
                                key={i}
                                type="button"
                                onMouseDown={() => {
                                  setShoppingInputName(sug);
                                  setShowAutocomplete(false);
                                }}
                                className="w-full text-left flex items-center justify-between"
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 'var(--radius-chip)',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer',
                                  fontSize: 'var(--fs-body)'
                                }}
                              >
                                <span>{sug}</span>
                                <span className="t-caption-semibold" style={{ color: 'var(--color-primary)' }}>선택</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="수량"
                        value={shoppingInputQty}
                        onChange={(e) => setShoppingInputQty(e.target.value)}
                        style={{
                          width: '76px',
                          minHeight: 'var(--touch-min)',
                          padding: '0 var(--space-2)',
                          borderRadius: 'var(--radius-btn)',
                          border: '1px solid var(--border-hairline)',
                          backgroundColor: 'var(--bg-subtle)',
                          color: 'var(--text-primary)',
                          textAlign: 'center',
                          fontSize: 'var(--fs-body)'
                        }}
                      />
                      <Button variant="primary" type="submit">
                        <Plus className="w-4 h-4" strokeWidth={1.5} />
                        <span>추가</span>
                      </Button>
                    </form>
                  </div>

                  {/* 섹션 3개 (식재료 / 생필품 / 직접 추가) */}
                  {shoppingList.length === 0 ? (
                    <div className="ui-card">
                      <EmptyState
                        icon={ShoppingCart}
                        title="사야 할 게 없어요"
                        description="냉장고 재료를 다 먹거나 생필품이 부족해지면 이곳에 자동으로 모여요"
                        actionLabel="직접 추가하기"
                        onAction={() => {
                          const next = ShoppingListRepository.addOrIncrementItem({
                            name: '서울우유 1L',
                            quantity: '1개',
                            section: 'custom',
                            reasonTag: '직접 추가'
                          });
                          setShoppingList(next);
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="section-grid-3">
                        {[
                          { key: 'food', title: '식재료', desc: '다 먹었거나 기한 지난 재료' },
                          { key: 'supply', title: '생필품', desc: '교체 주기 도래 품목' },
                          { key: 'custom', title: '직접 추가', desc: '수동 입력 메모' },
                        ].map(sec => {
                          const sectionItems = shoppingList.filter(i => i.section === sec.key && !i.checked);
                          return (
                            <SectionCard
                              key={sec.key}
                              title={sec.title}
                              subtitle={sec.desc}
                              rightAction={<span className="t-sub tabular-nums">{sectionItems.length}개</span>}
                            >
                              {sectionItems.length > 0 ? (
                                <div>
                                  {sectionItems.map((item, idx) => (
                                    <SwipeableListRow
                                      key={item.id}
                                      index={idx}
                                      isCollapsing={Boolean(collapsingIds[item.id])}
                                      completeLabel="체크"
                                      deleteLabel="삭제"
                                      onComplete={() => handleToggleShoppingCheck(item.id)}
                                      onDelete={() => handleDeleteShoppingItem(item.id)}
                                    >
                                      <div
                                        onClick={() => handleToggleShoppingCheck(item.id)}
                                        className="flex items-center cursor-pointer flex-1"
                                        style={{ gap: 'var(--space-3)', minWidth: 0 }}
                                      >
                                        <div
                                          style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '6px',
                                            border: '1.5px solid var(--text-disabled)'
                                          }}
                                        />
                                        <div style={{ minWidth: 0 }}>
                                          <span className="t-body-semibold truncate block">{item.name}</span>
                                          <span className="t-sub">{item.quantity} · {item.reasonTag}</span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteShoppingItem(item.id)}
                                        className="ui-btn-icon"
                                        style={{ minWidth: '34px', minHeight: '34px' }}
                                      >
                                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                                      </button>
                                    </SwipeableListRow>
                                  ))}
                                </div>
                              ) : (
                                <p className="t-sub" style={{ margin: 0 }}>남은 품목이 없어요.</p>
                              )}
                            </SectionCard>
                          );
                        })}
                      </div>

                      {/* 하단 구매 완료 영역 */}
                      {shoppingList.some(i => i.checked) && (
                        <SectionCard
                          title={`구매 완료 (${shoppingStats.checkedCount})`}
                          subtitle="체크된 품목들을 냉장고에 한 번에 등록할 수 있어요"
                        >
                          <div>
                            {shoppingList.filter(i => i.checked).map((item, idx) => (
                              <ChecklistRow
                                key={item.id}
                                index={idx}
                                title={`${item.name} (${item.quantity})`}
                                subtitle={item.reasonTag}
                                checked={true}
                                onToggle={() => handleToggleShoppingCheck(item.id)}
                              />
                            ))}
                          </div>
                        </SectionCard>
                      )}

                      {shoppingStats.checkedCount > 0 && (
                        <div
                          className="sticky z-30"
                          style={{
                            bottom: '88px',
                            backgroundColor: 'var(--bg-card)',
                            padding: 'var(--space-3)',
                            borderRadius: 'var(--radius-card)',
                            boxShadow: 'var(--shadow-floating)'
                          }}
                        >
                          <Button
                            variant="primary"
                            onClick={handleOpenShoppingCompleteReview}
                            className="w-full"
                          >
                            <Check className="w-4 h-4" strokeWidth={1.5} />
                            <span>{shoppingStats.checkedCount}개 구매 완료하고 냉장고에 등록하기</span>
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ──────────────── [세그먼트 3: 식비 통계] ──────────────── */}
              {fridgeSubTab === 'stats' && (
                <div className="flex flex-col" style={{ gap: 'var(--space-6)' }}>
                  {/* 월 선택기 */}
                  <div className="flex flex-wrap items-center justify-between" style={{ gap: 'var(--space-3)' }}>
                    <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                      <button
                        type="button"
                        onClick={() => setStatsYearMonth(prev => addMonthsToYM(prev, -1))}
                        className="ui-btn-icon"
                        aria-label="이전 달"
                      >
                        <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                      <h3 className="t-title tabular-nums" style={{ margin: 0, minWidth: '110px', textAlign: 'center' }}>
                        {statsYearMonth.split('-')[0]}년 {parseInt(statsYearMonth.split('-')[1], 10)}월
                      </h3>
                      <button
                        type="button"
                        onClick={() => setStatsYearMonth(prev => addMonthsToYM(prev, 1))}
                        className="ui-btn-icon"
                        aria-label="다음 달"
                      >
                        <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
                      </button>
                    </div>

                    <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                      <Button variant="outline" onClick={handleLoadThreeMonthsDemoData}>
                        <Database className="w-4 h-4" strokeWidth={1.5} />
                        <span>3개월 데모 데이터</span>
                      </Button>
                      <Button variant="primary" onClick={handleStartDemoReceipt}>
                        <Camera className="w-4 h-4" strokeWidth={1.5} />
                        <span>영수증 등록</span>
                      </Button>
                    </div>
                  </div>

                  {!selectedMonthStats.hasAnyData ? (
                    <div className="ui-card">
                      <EmptyState
                        icon={BarChart3}
                        title="영수증을 등록하면 식비가 자동으로 정리돼요"
                        description="구매 금액과 아낀 금액을 한눈에 확인해보세요"
                        actionLabel="영수증 등록하기"
                        onAction={handleStartDemoReceipt}
                      />
                    </div>
                  ) : (
                    <>
                      {/* 요약 카드 3개 (대형 숫자 38px + 13px 부가 설명) */}
                      <div className="section-grid-3">
                        <div className="ui-card flex flex-col justify-between" style={{ gap: 'var(--space-2)' }}>
                          <span className="t-sub">이번 달 식비</span>
                          <div className="t-hero-num">{selectedMonthStats.thisMonthSpend.toLocaleString()}원</div>
                          <span className="t-sub">
                            {selectedMonthStats.spendDiffPercent !== null
                              ? `지난달 대비 ${selectedMonthStats.spendDiffPercent > 0 ? `+${selectedMonthStats.spendDiffPercent}%` : `${selectedMonthStats.spendDiffPercent}%`}`
                              : `구매 ${selectedMonthStats.thisMonthItemCount}건 합계`}
                          </span>
                        </div>

                        <div className="ui-card flex flex-col justify-between" style={{ gap: 'var(--space-2)' }}>
                          <span className="t-sub">버린 음식</span>
                          <div className="t-hero-num" style={{ color: selectedMonthStats.discardedCount > 0 ? 'var(--color-status-warning)' : 'var(--text-primary)' }}>
                            {selectedMonthStats.discardedCount}개
                          </div>
                          <span className="t-sub">
                            추정 금액 {selectedMonthStats.discardedAmount.toLocaleString()}원
                          </span>
                        </div>

                        <div className="ui-card flex flex-col justify-between" style={{ gap: 'var(--space-2)' }}>
                          <span className="t-sub">아낀 금액</span>
                          <div className="t-hero-num" style={{ color: 'var(--color-primary)' }}>
                            +{selectedMonthStats.savedAmount.toLocaleString()}원
                          </div>
                          <span className="t-sub">
                            임박 재료 소비 · 구출 레시피 {selectedMonthStats.savedCount}건
                          </span>
                        </div>
                      </div>

                      {/* 차트 영역 2열 */}
                      <div className="section-grid-2">
                        <SectionCard title="월별 식비 추이" subtitle="최근 6개월 식비(초록)와 버린 금액(앰버)">
                          {(() => {
                            const trend = selectedMonthStats.sixMonthsTrend;
                            const maxAmt = Math.max(...trend.map(t => t.spendAmount), 30000);
                            return (
                              <div>
                                <div
                                  className="grid grid-cols-6 items-end"
                                  style={{ height: '160px', gap: 'var(--space-2)', paddingTop: 'var(--space-4)' }}
                                >
                                  {trend.map(m => {
                                    const barHeightPct = maxAmt > 0 ? Math.max((m.spendAmount / maxAmt) * 100, m.spendAmount > 0 ? 8 : 2) : 2;
                                    const isCurrent = m.yearMonth === statsYearMonth;
                                    return (
                                      <div key={m.yearMonth} className="flex flex-col items-center justify-end h-full">
                                        <span className="t-caption tabular-nums" style={{ color: isCurrent ? 'var(--color-primary)' : 'var(--text-secondary)', marginBottom: '6px' }}>
                                          {m.spendAmount > 0 ? `${Math.round(m.spendAmount / 1000)}k` : '0'}
                                        </span>
                                        <div className="w-full flex items-end justify-center" style={{ height: '108px' }}>
                                          <div
                                            style={{
                                              width: '20px',
                                              height: `${barHeightPct}%`,
                                              backgroundColor: m.spendAmount > 0 ? 'var(--color-primary)' : 'var(--bg-subtle)',
                                              opacity: isCurrent ? 1 : 0.45,
                                              borderRadius: '6px 6px 2px 2px',
                                              transition: 'height 200ms ease-out'
                                            }}
                                          />
                                        </div>
                                        <span className="t-sub" style={{ marginTop: '8px', fontWeight: isCurrent ? 600 : 400 }}>
                                          {m.monthLabel}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </SectionCard>

                        <SectionCard title="카테고리별 비중" subtitle="이번 달 지출 구성">
                          {selectedMonthStats.categoryBreakdown.length > 0 ? (
                            <div className="flex flex-col sm:flex-row items-center" style={{ gap: 'var(--space-5)' }}>
                              <div className="relative flex items-center justify-center shrink-0" style={{ width: '140px', height: '140px' }}>
                                <svg viewBox="0 0 42 42" className="w-full h-full">
                                  <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="var(--bg-subtle)" strokeWidth="5" />
                                  {(() => {
                                    let cumulativePct = 0;
                                    return selectedMonthStats.categoryBreakdown.map((seg, idx) => {
                                      const dashArray = `${seg.percentage} ${100 - seg.percentage}`;
                                      const dashOffset = 25 - cumulativePct;
                                      cumulativePct += seg.percentage;
                                      return (
                                        <circle
                                          key={idx}
                                          cx="21"
                                          cy="21"
                                          r="15.9155"
                                          fill="transparent"
                                          stroke={seg.color}
                                          strokeWidth="5"
                                          strokeDasharray={dashArray}
                                          strokeDashoffset={dashOffset}
                                        />
                                      );
                                    });
                                  })()}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                  <span className="t-body-semibold">{selectedMonthStats.categoryBreakdown[0].category}</span>
                                  <span className="t-sub tabular-nums">{selectedMonthStats.categoryBreakdown[0].percentage}%</span>
                                </div>
                              </div>

                              <div className="flex-1 w-full">
                                {selectedMonthStats.categoryBreakdown.map((cat, idx) => (
                                  <div key={idx} className="thin-row" style={{ padding: '10px 0' }}>
                                    <div className="flex items-center" style={{ gap: '8px' }}>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cat.color }} />
                                      <span className="t-body">{cat.category}</span>
                                    </div>
                                    <span className="t-body-semibold tabular-nums">
                                      {cat.amount.toLocaleString()}원 ({cat.percentage}%)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="t-sub" style={{ margin: 0 }}>가격이 입력된 내역이 없습니다.</p>
                          )}
                        </SectionCard>
                      </div>

                      {/* 자주 버리는 식재료 TOP 3 & 이번 달 한 줄 평 */}
                      <div className="section-grid-2">
                        <SectionCard title="자주 버리는 식재료 TOP 3" subtitle="다음 장보기 참고용 소분 팁">
                          {selectedMonthStats.discardedTop3.length > 0 ? (
                            <div>
                              {selectedMonthStats.discardedTop3.map((item, idx) => (
                                <div key={idx} className="thin-row flex-col items-stretch" style={{ gap: '4px' }}>
                                  <div className="flex items-center justify-between">
                                    <span className="t-body-semibold">{idx + 1}. {item.name}</span>
                                    <span className="t-sub tabular-nums">{item.count}회 · {item.totalAmount.toLocaleString()}원</span>
                                  </div>
                                  <p className="t-sub" style={{ margin: 0 }}>{item.tip}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="t-sub" style={{ margin: 0 }}>버린 식재료 기록이 없어요.</p>
                          )}
                        </SectionCard>

                        <SectionCard title="이번 달 한 줄 평" subtitle="칭찬 리포트">
                          <div className="flex items-start" style={{ gap: 'var(--space-3)' }}>
                            <Award className="w-6 h-6 shrink-0" strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
                            <p className="t-card-title" style={{ margin: 0 }}>
                              {selectedMonthStats.praiseComment}
                            </p>
                          </div>
                        </SectionCard>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 플로팅 버튼(+) */}
              <div className="fridge-fab-wrapper">
                {showFabMenu && (
                  <div
                    className="hidden xl:flex flex-col"
                    style={{
                      position: 'absolute',
                      bottom: '64px',
                      right: 0,
                      width: '220px',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: 'var(--radius-card)',
                      boxShadow: 'var(--shadow-floating)',
                      border: '1px solid var(--border-hairline)',
                      padding: 'var(--space-2)',
                      gap: '4px',
                      zIndex: 50
                    }}
                  >
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center w-full text-left"
                      style={{
                        minHeight: 'var(--touch-min)',
                        padding: '0 var(--space-3)',
                        borderRadius: 'var(--radius-btn)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-primary)',
                        border: 'none',
                        cursor: 'pointer',
                        gap: 'var(--space-3)'
                      }}
                    >
                      <Camera className="w-4 h-4" strokeWidth={1.5} />
                      <span>영수증 촬영</span>
                    </button>
                    <button
                      onClick={() => albumInputRef.current?.click()}
                      className="flex items-center w-full text-left"
                      style={{
                        minHeight: 'var(--touch-min)',
                        padding: '0 var(--space-3)',
                        borderRadius: 'var(--radius-btn)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-primary)',
                        border: 'none',
                        cursor: 'pointer',
                        gap: 'var(--space-3)'
                      }}
                    >
                      <ImageIcon className="w-4 h-4" strokeWidth={1.5} />
                      <span>앨범에서 선택</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowFabMenu(false);
                        setShowAddFridgeModal(true);
                      }}
                      className="flex items-center w-full text-left"
                      style={{
                        minHeight: 'var(--touch-min)',
                        padding: '0 var(--space-3)',
                        borderRadius: 'var(--radius-btn)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-primary)',
                        border: 'none',
                        cursor: 'pointer',
                        gap: 'var(--space-3)'
                      }}
                    >
                      <Edit3 className="w-4 h-4" strokeWidth={1.5} />
                      <span>직접 입력</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setShowFabMenu(prev => !prev)}
                  aria-label="식재료 등록 메뉴"
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '999px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFFFFF',
                    boxShadow: 'var(--shadow-floating)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'transform 200ms ease-out'
                  }}
                >
                  {showFabMenu ? <X className="w-6 h-6" strokeWidth={1.5} /> : <Plus className="w-6 h-6" strokeWidth={1.5} />}
                </button>
              </div>
            </div>
          )}

          {/* ==================== 3. 정산 탭 (대형 금액 표시 + 얇은 리스트) ==================== */}
          {activeTab === 'bills' && (
            <div className="section-grid-2">
              <SectionCard
                title={`${todayInfo.month}월 공과금 · 고정비`}
                subtitle={`전월(${totalPrevBills.toLocaleString()}원) 대비 ${Math.abs(totalMonthlyBills - totalPrevBills).toLocaleString()}원 ${totalMonthlyBills <= totalPrevBills ? '절약' : '증가'}`}
                rightAction={
                  <Button variant="outline" onClick={() => setShowAddBillModal(true)}>
                    <Plus className="w-4 h-4" strokeWidth={1.5} />
                    <span>항목 추가</span>
                  </Button>
                }
              >
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <span className="t-sub block" style={{ marginBottom: '4px' }}>총 청구 금액</span>
                  <div className="t-hero-num">{totalMonthlyBills.toLocaleString()}원</div>
                </div>

                <div>
                  {bills.map((bill, idx) => (
                    <ThinListRow
                      key={bill.id}
                      index={idx}
                      icon={
                        bill.icon === 'zap' ? Zap :
                        bill.icon === 'flame' ? Flame :
                        bill.icon === 'droplets' ? Droplets :
                        bill.icon === 'wifi' ? Wifi : Building
                      }
                      iconColor={!bill.isPaid && bill.dDay === 0 ? 'var(--color-status-urgent)' : 'var(--text-secondary)'}
                      title={
                        <div className="flex items-center" style={{ gap: '6px' }}>
                          <span>{bill.name}</span>
                          {bill.fromContract && (
                            <span className="t-caption" style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 400 }}>
                              · 계약 정보에서 가져옴
                            </span>
                          )}
                        </div>
                      }
                      badge={
                        !bill.isPaid && bill.dDay === 0 ? (
                          <StatusChip variant="urgent">오늘 마감</StatusChip>
                        ) : null
                      }
                      statusText={`${bill.amount.toLocaleString()}원 · ${bill.isPaid ? '납부 완료' : bill.dueDate}`}
                      rightElement={
                        <Button
                          variant={bill.isPaid ? 'outline' : 'primary'}
                          onClick={() => toggleBillPaid(bill.id)}
                        >
                          <span>{bill.isPaid ? '완료됨' : '송금하기'}</span>
                        </Button>
                      }
                    />
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="1/N 분할 정산기"
                subtitle={splitPeople === 1 ? '룸메 없음 (1인 단독 모드)' : `${splitPeople}명 분할 정산`}
              >
                <div className="flex flex-col" style={{ gap: 'var(--space-5)' }}>
                  <div>
                    <span className="t-sub block" style={{ marginBottom: '4px' }}>
                      {splitPeople === 1 ? '내가 납부할 총액' : `1인당 송금액 (1/${splitPeople})`}
                    </span>
                    <div className="t-hero-num" style={{ color: 'var(--color-primary)' }}>
                      {perPersonAmount.toLocaleString()}원
                    </div>
                  </div>

                  {/* 인원 선택 */}
                  <div className="grid grid-cols-5" style={{ gap: '6px' }}>
                    {[
                      { num: 1, label: '1인 단독' },
                      { num: 2, label: '2명' },
                      { num: 3, label: '3명' },
                      { num: 4, label: '4명' },
                      { num: 5, label: '5명' },
                    ].map(opt => (
                      <Button
                        key={opt.num}
                        variant={splitPeople === opt.num ? 'primary' : 'outline'}
                        onClick={() => setSplitPeople(opt.num)}
                        className="px-2"
                      >
                        <span className="truncate">{opt.label}</span>
                      </Button>
                    ))}
                  </div>

                  {splitPeople > 1 && (
                    <div>
                      <span className="t-sub block" style={{ marginBottom: '8px' }}>룸메이트 송금 현황 (탭하여 변경)</span>
                      {roommates.map((person, idx) => (
                        <ThinListRow
                          key={person.id}
                          index={idx}
                          title={person.name}
                          statusText={`${perPersonAmount.toLocaleString()}원`}
                          rightElement={
                            <StatusChip variant={person.isPaid ? 'normal' : 'urgent'}>
                              {person.isPaid ? '송금완료' : '미송금'}
                            </StatusChip>
                          }
                          onClick={() => toggleRoommatePaid(person.id)}
                        />
                      ))}
                    </div>
                  )}

                  <div>
                    <span className="t-sub block" style={{ marginBottom: '6px' }}>정산 계좌번호</span>
                    <input
                      type="text"
                      placeholder="정산 받을 계좌를 입력하세요"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: 'var(--touch-min)',
                        padding: '0 var(--space-3)',
                        borderRadius: 'var(--radius-btn)',
                        border: '1px solid var(--border-hairline)',
                        backgroundColor: 'var(--bg-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: 'var(--fs-body)'
                      }}
                    />
                  </div>

                  <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                    <Button
                      variant="primary"
                      onClick={() => {
                        if (unpaidBills.length > 0) toggleBillPaid(unpaidBills[0].id);
                        else showToast('모든 공과금이 이미 납부 완료되었습니다.');
                      }}
                      className="flex-1"
                    >
                      <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                      <span>송금하기</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSendReminderMessage}
                      className="flex-1"
                    >
                      <Send className="w-4 h-4" strokeWidth={1.5} />
                      <span>{splitPeople === 1 ? '내역 메모 복사' : '독촉 메시지 보내기'}</span>
                    </Button>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ==================== 4. 집안일 탭 ==================== */}
          {activeTab === 'chores' && (
            <div className="flex flex-col" style={{ gap: 'var(--space-6)' }}>
              <SectionCard
                title="요일별 분리수거 스케줄"
                subtitle={`오늘(${todayInfo.dayFull}) 배출: ${(recycleSchedule[todayInfo.dayIdx] || []).join(', ') || '없음'}`}
              >
                <div className="grid grid-cols-7" style={{ gap: '6px', marginBottom: 'var(--space-4)' }}>
                  {DAY_NAMES.map((dayName, idx) => {
                    const isSelected = selectedDayIdx === idx;
                    const isToday = idx === todayInfo.dayIdx;
                    const count = (recycleSchedule[idx] || []).length;
                    return (
                      <button
                        key={dayName}
                        onClick={() => setSelectedDayIdx(idx)}
                        className="flex flex-col items-center justify-center"
                        style={{
                          minHeight: '58px',
                          borderRadius: 'var(--radius-btn)',
                          backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--bg-subtle)',
                          color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 200ms ease-out'
                        }}
                      >
                        <span className="t-caption">{isToday ? '오늘' : dayName}</span>
                        <span className="t-body-semibold tabular-nums">{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
                  {['일반쓰레기', '음식물', '플라스틱', '투명페트병', '캔/고철', '종이/박스', '비닐', '유리병'].map(itemType => {
                    const active = (recycleSchedule[selectedDayIdx] || []).includes(itemType);
                    return (
                      <Button
                        key={itemType}
                        variant={active ? 'primary' : 'outline'}
                        onClick={() => toggleRecycleItemForDay(selectedDayIdx, itemType)}
                      >
                        {active && <Check className="w-4 h-4" strokeWidth={1.5} />}
                        <span>{itemType}</span>
                      </Button>
                    );
                  })}
                </div>
              </SectionCard>

              <div className="section-grid-2">
                <SectionCard title="주기별 청소 루틴" subtitle="체크 시 취소선과 함께 완료 처리됩니다">
                  <div>
                    {routines.map((routine, idx) => (
                      <ChecklistRow
                        key={routine.id}
                        index={idx}
                        title={routine.title}
                        subtitle={`${routine.cycle} · 마지막 ${routine.lastDone}`}
                        checked={routine.completedToday}
                        badgeVariant={routine.urgent ? 'warning' : 'subtle'}
                        badgeText={routine.urgent ? '권장일' : null}
                        onToggle={() => toggleRoutineDone(routine.id)}
                      />
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="생필품 재고 체크" subtitle="부족 시 장보기 리스트에 자동 추가됩니다">
                  <div>
                    {supplies.map((item, idx) => (
                      <ThinListRow
                        key={item.id}
                        index={idx}
                        icon={ShoppingBag}
                        title={item.name}
                        statusText={item.status}
                        rightElement={
                          <Button
                            variant={item.needBuy ? 'primary' : 'outline'}
                            onClick={() => toggleSupplyStatus(item.id)}
                          >
                            <span>{item.needBuy ? '구매 완료' : '부족 표시'}</span>
                          </Button>
                        }
                      />
                    ))}
                  </div>
                </SectionCard>
              </div>

              <SectionCard title="분리배출 1초 판독 사전" subtitle="헷갈리는 쓰레기 배출 기준">
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <input
                    type="text"
                    placeholder="예: 치킨뼈, 양파, 택배박스, 영수증 검색..."
                    value={recycleSearch}
                    onChange={(e) => setRecycleSearch(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: 'var(--touch-min)',
                      padding: '0 var(--space-4)',
                      borderRadius: 'var(--radius-btn)',
                      border: '1px solid var(--border-hairline)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  {RECYCLE_DICTIONARY.filter(
                    d => d.name.includes(recycleSearch) || d.category.includes(recycleSearch) || d.desc.includes(recycleSearch)
                  ).map((item, idx) => (
                    <ThinListRow
                      key={idx}
                      index={idx}
                      title={item.name}
                      statusText={item.desc}
                      rightElement={<StatusChip variant="subtle">{item.category}</StatusChip>}
                    />
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {/* ==================== 5. 우리집 탭 (계약 · 이사 / 비상 정보함) ==================== */}
          {activeTab === 'house' && (
            <HouseScreen
              contract={contract}
              onSaveContract={(updated) => setContract(updated)}
              timelineDone={contractTimelineDone}
              onToggleTimelineItem={(id) => {
                setContractTimelineDone(prev => {
                  const next = !prev[id];
                  showToast(next ? '체크리스트 완료!' : '체크가 해제되었습니다.');
                  return { ...prev, [id]: next };
                });
              }}
              moveDate={moveDate}
              onChangeMoveDate={(date) => setMoveDate(date)}
              moveChecklist={moveChecklist}
              onToggleMoveItem={(id) => {
                setMoveChecklist(prev => prev.map(item => {
                  if (item.id === id) {
                    const next = !item.completed;
                    showToast(next ? `'${item.title}' 완료!` : '완료가 해제되었습니다.');
                    return { ...item, completed: next };
                  }
                  return item;
                }));
              }}
              onAddMoveItem={(newItem) => {
                const item: MoveChecklistItem = {
                  id: `move-custom-${Date.now()}`,
                  completed: false,
                  ...newItem
                };
                setMoveChecklist(prev => [...prev, item]);
              }}
              onDeleteMoveItem={(id) => {
                setMoveChecklist(prev => prev.filter(i => i.id !== id));
                showToast('항목이 삭제되었습니다.');
              }}
              onResetMoveChecklist={() => {
                if (window.confirm('이사 체크리스트를 기본 항목으로 초기화할까요?')) {
                  setMoveChecklist(DEFAULT_MOVE_CHECKLIST);
                  showToast('이사 체크리스트가 기본 항목으로 초기화되었습니다.');
                }
              }}
              onSwitchToRecycleSchedule={() => {
                setActiveTab('chores');
              }}
              todayYMD={todayInfo.todayYMD}
              showToast={showToast}
              copyToClipboard={copyToClipboard}
            />
          )}

        </div>
      </main>

      {/* ==================== 모바일 하단 탭 (5개 탭 44px 터치 영역 유지) ==================== */}
      <nav className="mobile-bottom-nav" aria-label="하단 내비게이션">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center flex-1"
              style={{
                minWidth: '48px',
                minHeight: 'var(--touch-min)',
                padding: 'var(--space-1) 2px',
                color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 200ms ease-out'
              }}
            >
              <Icon className="w-5 h-5" strokeWidth={1.5} />
              <span className="t-caption" style={{ marginTop: '3px', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ==================== 모바일 바텀시트: 식재료 등록 메뉴 ==================== */}
      {showFabMenu && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center xl:hidden"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
          onClick={() => setShowFabMenu(false)}
        >
          <div
            className="w-full max-w-lg"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderTopLeftRadius: 'var(--radius-sheet)',
              borderTopRightRadius: 'var(--radius-sheet)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-floating)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
              <h3 className="t-card-title" style={{ margin: 0 }}>식재료 등록</h3>
              <button onClick={() => setShowFabMenu(false)} className="ui-btn-icon">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
              <Button variant="primary" onClick={() => cameraInputRef.current?.click()} className="w-full justify-start">
                <Camera className="w-5 h-5" strokeWidth={1.5} />
                <span>영수증 촬영</span>
              </Button>
              <Button variant="outline" onClick={() => albumInputRef.current?.click()} className="w-full justify-start">
                <ImageIcon className="w-5 h-5" strokeWidth={1.5} />
                <span>앨범에서 선택</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowFabMenu(false);
                  setShowAddFridgeModal(true);
                }}
                className="w-full justify-start"
              >
                <Edit3 className="w-5 h-5" strokeWidth={1.5} />
                <span>직접 입력</span>
              </Button>
              <Button variant="outline" onClick={handleStartDemoReceipt} className="w-full justify-start">
                <Sparkles className="w-5 h-5" strokeWidth={1.5} />
                <span>데모로 체험해보기</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 모달: 영수증 분석 / 확인·수정 ==================== */}
      {receiptFlowStep && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-y-auto"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: 'var(--space-3)' }}
        >
          <div
            className="w-full max-w-2xl flex flex-col"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-sheet)',
              maxHeight: '90vh',
              boxShadow: 'var(--shadow-floating)',
              overflow: 'hidden'
            }}
          >
            {receiptFlowStep === 'analyzing' && (
              <div style={{ padding: 'var(--space-6)' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
                  <h3 className="t-card-title" style={{ margin: 0 }}>영수증에서 식재료를 찾고 있어요</h3>
                  <button onClick={() => setReceiptFlowStep(null)} className="ui-btn-icon">
                    <X className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
                  <div className="skeleton-box" style={{ height: '56px', width: '100%' }} />
                  <div className="skeleton-box" style={{ height: '56px', width: '100%' }} />
                  <div className="skeleton-box" style={{ height: '56px', width: '100%' }} />
                </div>
              </div>
            )}

            {receiptFlowStep === 'error' && (
              <div style={{ padding: 'var(--space-6)' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
                  <h3 className="t-card-title" style={{ margin: 0 }}>영수증 인식 안내</h3>
                  <button onClick={() => setReceiptFlowStep(null)} className="ui-btn-icon">
                    <X className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
                <p className="t-body" style={{ margin: '0 0 var(--space-5) 0', color: 'var(--text-secondary)' }}>
                  {receiptErrorMsg}
                </p>
                <div className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
                  {lastUploadedBase64 && (
                    <Button variant="outline" onClick={() => analyzeReceiptWithGemini(lastUploadedBase64.base64Data, lastUploadedBase64.mimeType)}>
                      <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
                      <span>재시도</span>
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => cameraInputRef.current?.click()}>
                    <Camera className="w-4 h-4" strokeWidth={1.5} />
                    <span>다시 찍기</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReceiptFlowStep(null);
                      setShowAddFridgeModal(true);
                    }}
                  >
                    <Edit3 className="w-4 h-4" strokeWidth={1.5} />
                    <span>직접 입력으로 전환</span>
                  </Button>
                  <Button variant="primary" onClick={handleStartDemoReceipt} className="flex-1">
                    <span>데모로 체험해보기</span>
                  </Button>
                </div>
              </div>
            )}

            {receiptFlowStep === 'review' && (
              <>
                <div
                  className="flex items-center justify-between"
                  style={{
                    padding: 'var(--space-4) var(--space-5)',
                    borderBottom: '1px solid var(--border-hairline)'
                  }}
                >
                  <div>
                    <span className="t-sub block">
                      {recognizedFoodItems.filter(i => i.checked).length}개 인식됨 · {receiptStoreName}
                    </span>
                    <h3 className="t-card-title" style={{ margin: '2px 0 0 0' }}>
                      식재료 및 가격 확인 · 수정
                    </h3>
                  </div>
                  <button onClick={() => setReceiptFlowStep(null)} className="ui-btn-icon">
                    <X className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1" style={{ padding: 'var(--space-2) var(--space-5)' }}>
                  {recognizedFoodItems.map((item) => (
                    <div key={item.tempId} className="thin-row flex-col items-stretch" style={{ gap: 'var(--space-2)' }}>
                      <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-2)' }}>
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => updateRecognizedItem(item.tempId, 'checked', e.target.checked)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                        />
                        <CategoryLineIcon category={item.category} style={{ color: 'var(--text-secondary)' }} />
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateRecognizedItem(item.tempId, 'name', e.target.value)}
                          style={{
                            flex: 1,
                            minWidth: '120px',
                            minHeight: '36px',
                            padding: '0 var(--space-2)',
                            borderRadius: 'var(--radius-chip)',
                            border: '1px solid var(--border-hairline)',
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--text-primary)',
                            fontWeight: 600
                          }}
                        />
                        <input
                          type="text"
                          value={item.quantity}
                          onChange={(e) => updateRecognizedItem(item.tempId, 'quantity', e.target.value)}
                          style={{
                            width: '60px',
                            minHeight: '36px',
                            padding: '0 var(--space-2)',
                            borderRadius: 'var(--radius-chip)',
                            border: '1px solid var(--border-hairline)',
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--text-primary)',
                            textAlign: 'center'
                          }}
                        />
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateRecognizedItem(item.tempId, 'price', e.target.value)}
                          placeholder="가격(원)"
                          className="tabular-nums"
                          style={{
                            width: '88px',
                            minHeight: '36px',
                            padding: '0 var(--space-2)',
                            borderRadius: 'var(--radius-chip)',
                            border: '1px solid var(--border-hairline)',
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--text-primary)',
                            textAlign: 'right'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => deleteRecognizedItem(item.tempId)}
                          className="ui-btn-icon"
                          style={{ minWidth: '34px', minHeight: '34px' }}
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between" style={{ gap: 'var(--space-2)' }}>
                        <div className="flex items-center" style={{ gap: '6px' }}>
                          {['냉장', '냉동', '실온'].map(loc => (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => updateRecognizedItem(item.tempId, 'storage', loc)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-chip)',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                backgroundColor: item.storage === loc ? 'var(--color-primary)' : 'var(--bg-subtle)',
                                color: item.storage === loc ? '#FFFFFF' : 'var(--text-secondary)'
                              }}
                            >
                              {loc}
                            </button>
                          ))}
                          <select
                            value={item.category}
                            onChange={(e) => updateRecognizedItem(item.tempId, 'category', e.target.value)}
                            style={{
                              minHeight: '30px',
                              padding: '0 8px',
                              borderRadius: 'var(--radius-chip)',
                              border: '1px solid var(--border-hairline)',
                              backgroundColor: 'var(--bg-subtle)',
                              color: 'var(--text-primary)',
                              fontSize: '12px'
                            }}
                          >
                            {FOOD_CATEGORIES.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center" style={{ gap: '6px' }}>
                          <StatusChip variant="subtle">
                            {item.expiryLabelType === 'auto' ? '자동 추정' : '수정됨'}
                          </StatusChip>
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) => updateRecognizedItem(item.tempId, 'expiryDate', e.target.value)}
                            className="tabular-nums"
                            style={{
                              minHeight: '32px',
                              padding: '0 8px',
                              borderRadius: 'var(--radius-chip)',
                              border: '1px solid var(--border-hairline)',
                              backgroundColor: 'var(--bg-subtle)',
                              color: 'var(--text-primary)',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {excludedNonFoodItems.length > 0 && (
                    <div style={{ padding: 'var(--space-3) 0' }}>
                      <button
                        type="button"
                        onClick={() => setShowExcludedSection(!showExcludedSection)}
                        className="t-sub bg-transparent border-0 cursor-pointer"
                      >
                        제외된 비식재료 항목 ({excludedNonFoodItems.length}개) {showExcludedSection ? '▲' : '▼'}
                      </button>
                      {showExcludedSection && (
                        <div style={{ marginTop: 'var(--space-2)' }}>
                          {excludedNonFoodItems.map(ex => (
                            <div key={ex.tempId} className="thin-row" style={{ padding: '8px 0' }}>
                              <span className="t-sub">{ex.name} ({ex.quantity})</span>
                              <Button variant="text" onClick={() => restoreExcludedItem(ex.tempId)}>
                                <span>+ 복구</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div
                  className="flex items-center"
                  style={{
                    padding: 'var(--space-4) var(--space-5)',
                    borderTop: '1px solid var(--border-hairline)',
                    gap: 'var(--space-2)'
                  }}
                >
                  <Button variant="outline" onClick={() => setReceiptFlowStep(null)}>
                    <span>취소</span>
                  </Button>
                  <Button variant="primary" onClick={handleConfirmReceiptItems} className="flex-1">
                    <Check className="w-4 h-4" strokeWidth={1.5} />
                    <span>{recognizedFoodItems.filter(i => i.checked).length}개 냉장고에 등록하기</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== 모달: 위젯 미리보기 ==================== */}
      {showWidgetModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-y-auto"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: 'var(--space-3)' }}
        >
          <div
            className="w-full max-w-xl flex flex-col"
            style={{
              backgroundColor: 'var(--bg-app)',
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
                backgroundColor: 'var(--bg-card)',
                borderBottom: '1px solid var(--border-hairline)'
              }}
            >
              <h3 className="t-card-title" style={{ margin: 0 }}>홈 화면 위젯 미리보기</h3>
              <button onClick={() => setShowWidgetModal(false)} className="ui-btn-icon">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 flex flex-col" style={{ padding: 'var(--space-5)', gap: 'var(--space-4)' }}>
              <div className="flex items-center justify-between flex-wrap" style={{ gap: 'var(--space-2)' }}>
                <div className="flex" style={{ gap: '6px' }}>
                  {[
                    { id: 'small', label: '소형' },
                    { id: 'medium', label: '중형' },
                    { id: 'large', label: '대형' }
                  ].map(sz => (
                    <Button
                      key={sz.id}
                      variant={widgetSize === sz.id ? 'primary' : 'outline'}
                      onClick={() => setWidgetSize(sz.id)}
                    >
                      {sz.label}
                    </Button>
                  ))}
                </div>
                <Button variant="outline" onClick={() => setShowNativeSpecDoc(!showNativeSpecDoc)}>
                  <Code className="w-4 h-4" strokeWidth={1.5} />
                  <span>WidgetKit 스펙</span>
                </Button>
              </div>

              <div className="flex items-center justify-center" style={{ padding: 'var(--space-5)' }}>
                {widgetSize === 'small' && (
                  <div className="os-widget-card flex flex-col justify-between" style={{ width: '200px', height: '200px' }}>
                    <span className="t-caption-semibold" style={{ color: 'var(--color-primary)' }}>오늘 분리수거</span>
                    <div className="t-title">
                      {todayRecycleList.length > 0 ? todayRecycleList.slice(0, 2).join(' · ') : '오늘은 배출 없음'}
                    </div>
                    <span className="t-sub">{todayInfo.fullLabel}</span>
                  </div>
                )}

                {widgetSize === 'medium' && (
                  <div className="os-widget-card flex flex-col justify-between w-full" style={{ maxWidth: '420px', minHeight: '170px' }}>
                    <div className="flex items-center justify-between">
                      <span className="t-caption-semibold" style={{ color: 'var(--color-primary)' }}>{todayInfo.fullLabel}</span>
                      <StatusChip variant={homeSummaryCounts.urgentTotal > 0 ? 'urgent' : 'normal'}>
                        급한 일 {homeSummaryCounts.urgentTotal}
                      </StatusChip>
                    </div>
                    <div className="grid grid-cols-2" style={{ gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
                      <div>
                        <span className="t-sub block">오늘 분리수거</span>
                        <span className="t-card-title">{todayRecycleList.length > 0 ? todayRecycleList[0] : '배출 없음'}</span>
                      </div>
                      <div>
                        <span className="t-sub block">임박 식재료</span>
                        {urgentFridgeItems.length > 0 ? (
                          <span className="t-card-title">{urgentFridgeItems[0].name} (D-{urgentFridgeItems[0].expiryDays})</span>
                        ) : (
                          <span className="t-card-title">모두 신선</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {widgetSize === 'large' && (
                  <div className="os-widget-card flex flex-col w-full" style={{ maxWidth: '440px', gap: 'var(--space-3)' }}>
                    <div className="flex items-center justify-between">
                      <span className="t-card-title">{todayInfo.greetingLine}</span>
                      <StatusChip variant="normal">할 일 {homeSummaryCounts.totalTodo}</StatusChip>
                    </div>
                    <div className="thin-row" style={{ padding: '10px 0' }}>
                      <span className="t-sub">분리수거</span>
                      <span className="t-body-semibold">{todayRecycleList.join(', ') || '배출 없음'}</span>
                    </div>
                    <div className="thin-row" style={{ padding: '10px 0' }}>
                      <span className="t-sub">마감 공과금</span>
                      <span className="t-body-semibold">
                        {unpaidBills.length > 0 ? `${unpaidBills[0].name} (${unpaidBills[0].amount.toLocaleString()}원)` : '완납'}
                      </span>
                    </div>
                    {routines.slice(0, 2).map((r, i) => (
                      <ChecklistRow
                        key={r.id}
                        index={i}
                        title={r.title}
                        checked={r.completedToday}
                        onToggle={() => toggleRoutineDone(r.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {showNativeSpecDoc && (
                <pre
                  style={{
                    margin: 0,
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-btn)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    overflowX: 'auto'
                  }}
                >{`// iOS WidgetKit / Android Glance Shared Payload
{
  "updatedAt": "${todayInfo.todayYMD}T08:00:00+09:00",
  "recycle": ${JSON.stringify(todayRecycleList)},
  "urgentFoodCount": ${urgentFridgeItems.length}
}`}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 모달: 환경 설정 ==================== */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: 'var(--space-4)' }}
        >
          <div
            className="w-full max-w-md"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-sheet)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-floating)'
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
              <h3 className="t-card-title" style={{ margin: 0 }}>환경 및 알림 설정</h3>
              <button onClick={() => setShowSettingsModal(false)} className="ui-btn-icon">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
              {/* 식재료 유통기한 알림 설정 */}
              <div
                style={{
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-card)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-hairline)'
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <Bell className="w-4 h-4" style={{ color: 'var(--color-primary)' }} strokeWidth={1.5} />
                    <span className="t-body-semibold">식재료 유통기한 알림</span>
                  </div>
                  {notifPermissionState === 'granted' ? (
                    <StatusChip variant="normal">허용됨</StatusChip>
                  ) : notifPermissionState === 'denied' ? (
                    <StatusChip variant="urgent">차단됨</StatusChip>
                  ) : (
                    <StatusChip variant="subtle">미설정</StatusChip>
                  )}
                </div>

                {/* 알림 권한이 거부된 경우 안내 */}
                {notifPermissionState === 'denied' && (
                  <div
                    className="flex items-start"
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-card)',
                      backgroundColor: 'var(--color-status-urgent-soft)',
                      color: 'var(--color-status-urgent)',
                      gap: '8px',
                      marginBottom: 'var(--space-3)'
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
                    <div className="t-caption">
                      <strong className="block">브라우저 설정에서 알림을 허용해주세요</strong>
                      <p style={{ margin: '2px 0 0 0', opacity: 0.9 }}>
                        현재 브라우저 알림 권한이 차단되어 있습니다. 주소창 좌측의 설정/자물쇠 아이콘에서 알림을 &apos;허용&apos;으로 변경해주세요.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
                  <div className="flex items-center justify-between">
                    <span className="t-sub">알림 기준</span>
                    <select
                      value={notifDaysBefore}
                      onChange={(e) => setNotifDaysBefore(Number(e.target.value))}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-btn)',
                        border: '1px solid var(--border-hairline)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        fontSize: '13px'
                      }}
                    >
                      <option value={1}>만료 1일 전</option>
                      <option value={2}>만료 2일 전 (권장)</option>
                      <option value={3}>만료 3일 전</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="t-sub">알림 시간</span>
                    <input
                      type="time"
                      value={notifTime}
                      onChange={(e) => setNotifTime(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-btn)',
                        border: '1px solid var(--border-hairline)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <p className="t-caption" style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    ※ 앱이 닫혀 있을 때의 정시 푸시는 서버 연동 후 지원돼요
                  </p>
                </div>
              </div>

              <Button variant="outline" onClick={handleLoadThreeMonthsDemoData} className="w-full">
                <Database className="w-4 h-4" strokeWidth={1.5} />
                <span>최근 3개월 데모 데이터 불러오기</span>
              </Button>

              <Button variant="outline" onClick={handleLoadSampleContractData} className="w-full">
                <Building2 className="w-4 h-4" strokeWidth={1.5} />
                <span>계약·이사 샘플 데이터 불러오기</span>
              </Button>

              <div style={{ paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-hairline)' }}>
                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(true)}
                  className="w-full ui-btn ui-btn-outline"
                  style={{ color: 'var(--color-status-urgent)', borderColor: 'var(--border-hairline)' }}
                >
                  <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
                  <span>모든 데이터 초기화</span>
                </button>
              </div>

              <div className="flex" style={{ gap: 'var(--space-2)' }}>
                <Button
                  variant="outline"
                  onClick={handleRequestNotificationPermission}
                  className="flex-1"
                >
                  <Bell className="w-4 h-4" strokeWidth={1.5} />
                  <span>{notifPermissionState === 'granted' ? '알림 켜짐' : '알림 권한'}</span>
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowSettingsModal(false);
                    showToast('설정이 저장되었습니다.');
                  }}
                  className="flex-1"
                >
                  <span>저장</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 모달: iOS Safari 홈 화면 추가 안내 ==================== */}
      {showIosInstallModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', padding: 'var(--space-4)' }}
        >
          <div
            className="w-full max-w-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-sheet)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-floating)'
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                <Share2 className="w-5 h-5 text-emerald-600" strokeWidth={1.5} />
                <h3 className="t-card-title" style={{ margin: 0 }}>홈 화면에 앱 추가하기</h3>
              </div>
              <button onClick={() => setShowIosInstallModal(false)} className="ui-btn-icon">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <p className="t-body" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
              아이폰/아이패드 Safari에서는 아래 순서로 홈 화면에 앱을 추가할 수 있어요.
            </p>

            <div className="flex flex-col" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
              <div className="flex items-start" style={{ gap: 'var(--space-3)' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary-soft)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    flexShrink: 0
                  }}
                >
                  1
                </div>
                <div className="t-caption" style={{ lineHeight: 1.5 }}>
                  Safari 화면 하단(아이패드는 상단)의 <strong>공유 버튼(사각형에 화살표 <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-emerald-600" />)</strong>을 탭합니다.
                </div>
              </div>

              <div className="flex items-start" style={{ gap: 'var(--space-3)' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary-soft)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    flexShrink: 0
                  }}
                >
                  2
                </div>
                <div className="t-caption" style={{ lineHeight: 1.5 }}>
                  메뉴를 아래로 스크롤하여 <strong>[홈 화면에 추가]</strong>를 선택합니다.
                </div>
              </div>

              <div className="flex items-start" style={{ gap: 'var(--space-3)' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary-soft)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    flexShrink: 0
                  }}
                >
                  3
                </div>
                <div className="t-caption" style={{ lineHeight: 1.5 }}>
                  우측 상단의 <strong>[추가]</strong>를 누르면 홈 화면에 아이콘이 생성되어 전체 화면으로 앱처럼 실행됩니다.
                </div>
              </div>
            </div>

            <Button variant="primary" onClick={() => setShowIosInstallModal(false)} className="w-full">
              <span>확인 완료</span>
            </Button>
          </div>
        </div>
      )}


      {/* ==================== 모달: 데이터 초기화 확인 ==================== */}
      {showResetConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', padding: 'var(--space-4)' }}
        >
          <div
            className="w-full max-w-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-sheet)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-floating)'
            }}
          >
            <div className="flex items-center" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-status-urgent-soft)',
                  color: 'var(--color-status-urgent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <AlertTriangle className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="t-card-title" style={{ margin: 0 }}>모든 데이터 초기화</h3>
            </div>

            <p className="t-body" style={{ color: 'var(--text-secondary)', margin: '0 0 var(--space-5) 0', lineHeight: 1.6 }}>
              등록된 냉장고 식재료, 장보기, 식비 통계, 공과금, 루틴이 모두 처음 기본 상태로 되돌아갑니다.<br />
              <strong>이 작업은 되돌릴 수 없습니다.</strong> 계속할까요?
            </p>

            <div className="flex" style={{ gap: 'var(--space-2)' }}>
              <Button variant="outline" onClick={() => setShowResetConfirmModal(false)} className="flex-1">
                <span>취소</span>
              </Button>
              <button
                type="button"
                onClick={handleResetAllData}
                className="flex-1 ui-btn"
                style={{
                  backgroundColor: 'var(--color-status-urgent)',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-btn)',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                초기화 실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 모달: 식재료 직접 등록 ==================== */}
      {showAddFridgeModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: 'var(--space-4)' }}
        >
          <div
            className="w-full max-w-md"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-sheet)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-floating)'
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
              <h3 className="t-card-title" style={{ margin: 0 }}>식재료 직접 등록</h3>
              <button onClick={() => setShowAddFridgeModal(false)} className="ui-btn-icon">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleAddFridgeItem} className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
              <input
                type="text"
                required
                placeholder="식재료 이름 (예: 서울우유 1L)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
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
              <div className="grid grid-cols-2" style={{ gap: 'var(--space-2)' }}>
                <select
                  value={newItemCategory}
                  onChange={(e) => {
                    const nextCat = e.target.value;
                    setNewItemCategory(nextCat);
                    const recStorage = (CATEGORY_EXPIRY_DAYS_TABLE[nextCat] || CATEGORY_EXPIRY_DAYS_TABLE['기타']).defaultStorage;
                    setNewItemStorage(recStorage);
                    const recDays = getRecommendedExpiryDays(nextCat, recStorage);
                    setNewItemExpiryDate(addDaysToDateStr(todayInfo.todayYMD, recDays));
                  }}
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
                  {FOOD_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={newItemStorage}
                  onChange={(e) => {
                    const nextStorage = e.target.value;
                    setNewItemStorage(nextStorage);
                    const recDays = getRecommendedExpiryDays(newItemCategory, nextStorage);
                    setNewItemExpiryDate(addDaysToDateStr(todayInfo.todayYMD, recDays));
                  }}
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
                  <option value="냉장">냉장</option>
                  <option value="냉동">냉동</option>
                  <option value="실온">실온</option>
                </select>
              </div>
              <div className="grid grid-cols-2" style={{ gap: 'var(--space-2)' }}>
                <input
                  type="date"
                  value={newItemExpiryDate}
                  onChange={(e) => setNewItemExpiryDate(e.target.value)}
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
                <input
                  type="number"
                  placeholder="가격 (선택)"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
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
              <div className="flex" style={{ gap: 'var(--space-2)' }}>
                <Button variant="outline" onClick={() => setShowAddFridgeModal(false)} className="flex-1">
                  <span>취소</span>
                </Button>
                <Button variant="primary" type="submit" className="flex-1">
                  <span>등록하기</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 모달: 공과금 추가 ==================== */}
      {showAddBillModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: 'var(--space-4)' }}
        >
          <div
            className="w-full max-w-md"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-sheet)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-floating)'
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
              <h3 className="t-card-title" style={{ margin: 0 }}>고정비 · 공과금 추가</h3>
              <button onClick={() => setShowAddBillModal(false)} className="ui-btn-icon">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleAddBill} className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
              <input
                type="text"
                required
                placeholder="항목명 (예: 정수기 렌탈, 월세)"
                value={newBillName}
                onChange={(e) => setNewBillName(e.target.value)}
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
              <input
                type="number"
                required
                placeholder="청구 금액 (원)"
                value={newBillAmount}
                onChange={(e) => setNewBillAmount(e.target.value)}
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
              <div className="flex" style={{ gap: 'var(--space-2)' }}>
                <Button variant="outline" onClick={() => setShowAddBillModal(false)} className="flex-1">
                  <span>취소</span>
                </Button>
                <Button variant="primary" type="submit" className="flex-1">
                  <span>추가하기</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}