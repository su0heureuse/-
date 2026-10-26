import { formatYearMonth, addMonthsToYM } from '../utils/dateUtils';
import { CATEGORY_EXPIRY_DAYS_TABLE } from '../constants';

export function calculateFoodStatsPure(actionLogs: any[] = [], purchaseHistory: any[] = [], fridgeItems: any[] = [], targetYearMonth?: string) {
  const currentYM = targetYearMonth || formatYearMonth(new Date());
  const prevYM = addMonthsToYM(currentYM, -1);
  const sourcePurchases = purchaseHistory.length > 0 ? purchaseHistory : fridgeItems;

  const sumSpendingForYM = (ym: string) => {
    const monthItems = sourcePurchases.filter(p => String(p.purchaseDate || '').startsWith(ym));
    let total = 0;
    let missingPriceCount = 0;
    monthItems.forEach(item => {
      if (item.price !== null && item.price !== undefined && !isNaN(Number(item.price)) && Number(item.price) > 0) {
        total += Number(item.price);
      } else {
        missingPriceCount += 1;
      }
    });
    return { total, itemCount: monthItems.length, missingPriceCount, items: monthItems };
  };

  const thisMonthSpendInfo = sumSpendingForYM(currentYM);
  const prevMonthSpendInfo = sumSpendingForYM(prevYM);

  let spendDiffPercent: number | null = null;
  if (prevMonthSpendInfo.total > 0) {
    spendDiffPercent = Math.round(((thisMonthSpendInfo.total - prevMonthSpendInfo.total) / prevMonthSpendInfo.total) * 100);
  }

  const thisMonthLogs = actionLogs.filter(l => String(l.actionDate || '').startsWith(currentYM));
  const prevMonthLogs = actionLogs.filter(l => String(l.actionDate || '').startsWith(prevYM));

  const thisMonthDiscarded = thisMonthLogs.filter(l => l.action === 'discarded');
  const prevMonthDiscarded = prevMonthLogs.filter(l => l.action === 'discarded');

  const discardedCount = thisMonthDiscarded.length;
  const discardedAmount = thisMonthDiscarded.reduce((acc, cur) => acc + (cur.price && !isNaN(Number(cur.price)) ? Number(cur.price) : 0), 0);
  const discardedMissingPriceCount = thisMonthDiscarded.filter(l => !l.price).length;

  const savedItems = thisMonthLogs.filter(l => l.action === 'eaten' && (l.wasNearExpiry || l.viaRescueRecipe));
  const savedAmount = savedItems.reduce((acc, cur) => acc + (cur.price && !isNaN(Number(cur.price)) ? Number(cur.price) : 0), 0);
  const savedCount = savedItems.length;

  const sixMonthsTrend: Array<{ yearMonth: string; monthLabel: string; spendAmount: number; discardAmount: number }> = [];
  for (let i = -5; i <= 0; i++) {
    const ym = addMonthsToYM(currentYM, i);
    const [, mStr] = ym.split('-');
    const spend = sumSpendingForYM(ym).total;
    const monthDiscardAmt = actionLogs
      .filter(l => String(l.actionDate || '').startsWith(ym) && l.action === 'discarded')
      .reduce((s, c) => s + (c.price ? Number(c.price) : 0), 0);
    sixMonthsTrend.push({
      yearMonth: ym,
      monthLabel: `${parseInt(mStr, 10)}월`,
      spendAmount: spend,
      discardAmount: monthDiscardAmt
    });
  }

  const categoryTotalsMap: Record<string, number> = {};
  thisMonthSpendInfo.items.forEach(item => {
    const cat = item.category || '기타';
    const amt = item.price && !isNaN(Number(item.price)) ? Number(item.price) : 0;
    if (amt > 0) categoryTotalsMap[cat] = (categoryTotalsMap[cat] || 0) + amt;
  });
  const categoryBreakdown = Object.entries(categoryTotalsMap)
    .map(([category, amount]) => ({
      category,
      amount: Number(amount),
      percentage: thisMonthSpendInfo.total > 0 ? Math.round((Number(amount) / thisMonthSpendInfo.total) * 100) : 0,
      color: (CATEGORY_EXPIRY_DAYS_TABLE[category] || CATEGORY_EXPIRY_DAYS_TABLE['기타']).color
    }))
    .sort((a, b) => b.amount - a.amount);

  const targetDiscardPool = thisMonthDiscarded.length > 0 ? thisMonthDiscarded : actionLogs.filter(l => l.action === 'discarded');
  const discardGroupMap: Record<string, { name: string; category: string; count: number; totalAmount: number }> = {};
  targetDiscardPool.forEach(log => {
    const key = log.name.trim();
    if (!discardGroupMap[key]) discardGroupMap[key] = { name: key, category: log.category || '기타', count: 0, totalAmount: 0 };
    discardGroupMap[key].count += 1;
    discardGroupMap[key].totalAmount += log.price ? Number(log.price) : 0;
  });

  const getGentleTip = (name: string, category: string) => {
    if (name.includes('우유') || category === '유제품') return '1L 대신 500ml 소용량이나 멸균우유로 구매해보세요';
    if (name.includes('두부')) return '구매 후 절반은 바로 깍둑썰기해 냉동 보관하면 오래 먹어요';
    if (name.includes('콩나물') || name.includes('숙주') || category === '채소') return '봉지째 두지 말고 물에 잠기게 밀폐용기에 담으면 2배 오래 가요';
    if (category === '육류') return '사자마자 1회분씩 소분해 냉동실에 넣어보세요';
    return '다음 장보기 때는 소포장 제품으로 담아보는 건 어떨까요?';
  };

  const discardedTop3 = Object.values(discardGroupMap)
    .sort((a, b) => b.count - a.count || b.totalAmount - a.totalAmount)
    .slice(0, 3)
    .map(item => ({
      ...item,
      tip: getGentleTip(item.name, item.category)
    }));

  let praiseComment = '영수증을 등록하고 유통기한 내에 요리하며 알뜰한 자취 식생활을 만들어가고 있어요.';
  const discardDiff = prevMonthDiscarded.length - discardedCount;
  if (discardedCount === 0 && (thisMonthSpendInfo.total > 0 || savedCount > 0)) {
    praiseComment = `이번 달은 버린 음식이 0개예요. 냉장고 파먹기로 ${savedAmount.toLocaleString()}원이나 아꼈어요!`;
  } else if (discardDiff > 0) {
    praiseComment = `지난달보다 버린 음식이 ${discardDiff}개 줄었어요. 잘하고 있어요!`;
  } else if (savedAmount > 0) {
    praiseComment = `유통기한 임박 재료와 구출 레시피로 이번 달 ${savedAmount.toLocaleString()}원을 아꼈어요.`;
  }

  const hasAnyData = thisMonthSpendInfo.itemCount > 0 || thisMonthLogs.length > 0 || sixMonthsTrend.some(m => m.spendAmount > 0);

  return {
    yearMonth: currentYM,
    thisMonthSpend: thisMonthSpendInfo.total,
    thisMonthItemCount: thisMonthSpendInfo.itemCount,
    missingPriceCount: thisMonthSpendInfo.missingPriceCount,
    prevMonthSpend: prevMonthSpendInfo.total,
    spendDiffPercent,
    discardedCount,
    discardedAmount,
    discardedMissingPriceCount,
    savedAmount,
    savedCount,
    sixMonthsTrend,
    categoryBreakdown,
    discardedTop3,
    praiseComment,
    hasAnyData
  };
}
