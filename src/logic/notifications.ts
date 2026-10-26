/**
 * notifications.ts
 * 유통기한 로컬 알림 대상 계산 순수 함수 및 발송 유틸리티
 * (향후 Firebase Cloud Messaging 또는 서버리스 푸시로도 100% 동일 로직 재사용 가능)
 */

export interface FridgeNotificationItem {
  id: string | number;
  name: string;
  category?: string;
  expiryDate: string; // YYYY-MM-DD
}

export interface NotificationTarget {
  id: string | number;
  name: string;
  category: string;
  expiryDate: string;
  diffDays: number;
  statusText: string;
  type?: 'fridge' | 'contract' | 'rent';
}

/**
 * 날짜 문자열(YYYY-MM-DD) 기준 일 수 차이 계산 (순수 함수)
 */
export function calcDaysDiff(targetYMD: string, todayYMD: string): number {
  const [ty, tm, td] = todayYMD.split('-').map(Number);
  const [ey, em, ed] = targetYMD.split('-').map(Number);
  const todayMs = new Date(ty, tm - 1, td).getTime();
  const expMs = new Date(ey, em - 1, ed).getTime();
  return Math.ceil((expMs - todayMs) / (1000 * 60 * 60 * 24));
}

/**
 * 오늘 알림을 발송해야 하는 식재료, 계약 체크포인트, 월세 납부일 목록을 계산하는 순수 함수
 */
export function getNotificationTargets(params: {
  fridgeItems: FridgeNotificationItem[];
  daysBefore: number;
  todayYMD: string;
  alreadyNotifiedMap: Record<string, string>; // itemId -> lastNotifiedYMD
  contractInfo?: {
    endDate?: string;
    monthlyRent?: number;
    paymentDay?: number;
  } | null;
}): NotificationTarget[] {
  const { fridgeItems, daysBefore, todayYMD, alreadyNotifiedMap, contractInfo } = params;

  const targets: NotificationTarget[] = [];

  // 1. 식재료 유통기한 알림 계산
  if (fridgeItems && fridgeItems.length > 0) {
    for (const item of fridgeItems) {
      if (!item.expiryDate) continue;

      const lastNotified = alreadyNotifiedMap[String(item.id)];
      if (lastNotified === todayYMD) {
        continue;
      }

      const diffDays = calcDaysDiff(item.expiryDate, todayYMD);

      if (diffDays <= daysBefore) {
        let statusText = '';
        if (diffDays < 0) {
          statusText = `유통기한 지남 (D+${Math.abs(diffDays)})`;
        } else if (diffDays === 0) {
          statusText = '오늘 만료 (D-Day)';
        } else if (diffDays === 1) {
          statusText = '내일 만료 (D-1)';
        } else {
          statusText = `만료 ${diffDays}일 전 (D-${diffDays})`;
        }

        targets.push({
          id: item.id,
          name: item.name,
          category: item.category || '기타',
          expiryDate: item.expiryDate,
          diffDays,
          statusText,
          type: 'fridge'
        });
      }
    }
  }

  // 2. 계약 일정 체크포인트 알림 (만료 6개월, 2개월, 1개월 전, 만료 당일)
  if (contractInfo?.endDate) {
    const parts = contractInfo.endDate.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0])) {
      const [ey, em, ed] = parts;
      const checkpoints = [
        { id: 'contract_6m', months: 6, label: '만료 6개월 전', title: '계약 갱신·이사 검토' },
        { id: 'contract_2m', months: 2, label: '만료 2개월 전', title: '임차인 갱신·퇴거 의사 전달 마감' },
        { id: 'contract_1m', months: 1, label: '만료 1개월 전', title: '이사 일정·보증금 반환 확정' },
        { id: 'contract_0m', months: 0, label: '계약 만료일', title: '계약 만료일 당일' }
      ];

      for (const cp of checkpoints) {
        const cpDateObj = cp.months === 0 ? new Date(ey, em - 1, ed) : new Date(ey, em - 1 - cp.months, ed);
        const y = cpDateObj.getFullYear();
        const m = String(cpDateObj.getMonth() + 1).padStart(2, '0');
        const d = String(cpDateObj.getDate()).padStart(2, '0');
        const cpDateStr = `${y}-${m}-${d}`;

        const diffFromCp = calcDaysDiff(cpDateStr, todayYMD);

        // 체크포인트 당일이거나 오늘 날짜와 일치할 때 알림 (당일 또는 D-0~1)
        if (diffFromCp === 0 || diffFromCp === 1) {
          const notifKey = `notif_${cp.id}_${cpDateStr}`;
          if (alreadyNotifiedMap[notifKey] !== todayYMD) {
            targets.push({
              id: notifKey,
              name: cp.title,
              category: '우리집',
              expiryDate: cpDateStr,
              diffDays: diffFromCp,
              statusText: cp.label,
              type: 'contract'
            });
          }
        }
      }
    }
  }

  // 3. 월세 납부일 알림 (납부일 3일 전 ~ 당일)
  if (contractInfo?.monthlyRent && contractInfo.monthlyRent > 0 && contractInfo.paymentDay) {
    const [ty, tm, td] = todayYMD.split('-').map(Number);
    let dueTarget = new Date(ty, tm - 1, contractInfo.paymentDay);
    const todayObj = new Date(ty, tm - 1, td);

    if (dueTarget < todayObj) {
      dueTarget = new Date(ty, tm, contractInfo.paymentDay);
    }

    const diffDaysToRent = Math.round((dueTarget.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDaysToRent <= 3 && diffDaysToRent >= 0) {
      const ymKey = `${dueTarget.getFullYear()}-${String(dueTarget.getMonth() + 1).padStart(2, '0')}`;
      const notifKey = `rent_due_${ymKey}_d${diffDaysToRent}`;
      if (alreadyNotifiedMap[notifKey] !== todayYMD) {
        targets.push({
          id: notifKey,
          name: '월세 납부일',
          category: '정산',
          expiryDate: todayYMD,
          diffDays: diffDaysToRent,
          statusText: diffDaysToRent === 0 ? '오늘 납부일 (D-Day)' : `납부 ${diffDaysToRent}일 전 (D-${diffDaysToRent})`,
          type: 'rent'
        });
      }
    }
  }

  return targets.sort((a, b) => a.diffDays - b.diffDays);
}

/**
 * 브라우저 서비스 워커 또는 Notification API를 통해 로컬 알림 발송
 */
export async function sendLocalExpiryNotification(
  targets: NotificationTarget[],
  swRegistration?: ServiceWorkerRegistration | null
): Promise<boolean> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }
  if (!targets || targets.length === 0) {
    return false;
  }

  let title = '';
  let body = '';

  if (targets.length === 1) {
    const item = targets[0];
    if (item.type === 'contract') {
      title = `[나혼자 잘산다] 계약 일정: ${item.name}`;
      body = `${item.statusText} 시점이에요. 임대차 계약 일정을 앱에서 확인해보세요!`;
    } else if (item.type === 'rent') {
      title = `[나혼자 잘산다] 월세 납부일 알림 (${item.statusText})`;
      body = `월세 납부일이 다가왔어요. 송금 계좌 잔액과 일정을 점검해주세요.`;
    } else {
      title = `[나혼자 잘산다] ${item.name} ${item.statusText}`;
      body = `냉장고의 '${item.name}' 유통기한이 다가왔어요. 상하기 전에 소비해보세요!`;
    }
  } else {
    const topItem = targets[0];
    title = `[나혼자 잘산다] 오늘 챙길 일정 ${targets.length}건`;
    body = `${topItem.name}(${topItem.statusText}) 외 ${targets.length - 1}건의 챙길 일정이 있어요.`;
  }

  const notifOptions: NotificationOptions = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/icon.svg',
    tag: `najhonja-alert-${new Date().toISOString().slice(0, 10)}`,
    data: {
      url: '/',
      itemIds: targets.map(t => t.id)
    }
  };

  try {
    if (swRegistration && swRegistration.showNotification) {
      await swRegistration.showNotification(title, notifOptions);
      return true;
    } else {
      new Notification(title, notifOptions);
      return true;
    }
  } catch (err) {
    console.warn('[Notification] Failed to trigger notification:', err);
    return false;
  }
}
