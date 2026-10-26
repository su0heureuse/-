import {
  STORAGE_PREFIX,
  SEVEN_DAYS_MS,
  CATEGORY_EXPIRY_DAYS_TABLE,
  getRecommendedExpiryDays,
  createInitialFridgeItems,
  createInitialPurchaseHistory,
  createInitialActionLogs,
  createInitialShoppingList
} from '../constants';
import {
  formatDateYMD,
  addDaysToDateStr,
  calcDiffDaysFromToday,
  incrementQuantityStr
} from '../utils/dateUtils';

export const safeLocalStorage = {
  get: <T,>(key: string, fallback: T): T => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return fallback;
      const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
      if (raw === null || raw === undefined) return fallback;
      const parsed = JSON.parse(raw);
      return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch (e) {
      console.warn(`[safeLocalStorage get error: ${key}]`, e);
      return fallback;
    }
  },
  set: <T,>(key: string, value: T): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn(`[safeLocalStorage set error: ${key}]`, e);
    }
  },
  remove: (key: string): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (e) {
      console.warn(`[safeLocalStorage remove error: ${key}]`, e);
    }
  },
  clearAll: (): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => window.localStorage.removeItem(k));
    } catch (e) {
      console.warn('[safeLocalStorage clearAll error]', e);
    }
  }
};

export const FridgeStorageRepository = {
  getAll: () => {
    const raw = safeLocalStorage.get('fridge', createInitialFridgeItems());
    const items = Array.isArray(raw) ? raw : createInitialFridgeItems();
    return items.map(item => ({
      ...item,
      price: item.price !== undefined && item.price !== null && (item.price as any) !== '' ? Number(item.price) : null,
      expiryDays: calcDiffDaysFromToday(item.expiryDate)
    }));
  },
  getPurchaseHistory: () => {
    const raw = safeLocalStorage.get('purchase_history', createInitialPurchaseHistory(createInitialFridgeItems()));
    return Array.isArray(raw) ? raw : createInitialPurchaseHistory(createInitialFridgeItems());
  },
  saveAll: (items: any[]) => {
    const normalized = items.map(item => ({
      ...item,
      price: item.price !== undefined && item.price !== null && (item.price as any) !== '' ? Number(item.price) : null,
      expiryDays: calcDiffDaysFromToday(item.expiryDate)
    }));
    safeLocalStorage.set('fridge', normalized);
    return normalized;
  },
  setPurchaseHistory: (historyList: any[]) => {
    safeLocalStorage.set('purchase_history', historyList);
    return historyList;
  },
  addBatch: (newItems: any[]) => {
    const normalized = newItems.map((item, idx) => {
      const catInfo = CATEGORY_EXPIRY_DAYS_TABLE[item.category] || CATEGORY_EXPIRY_DAYS_TABLE['기타'];
      const purchaseDate = item.purchaseDate || formatDateYMD(new Date());
      const expiryDate = item.expiryDate || addDaysToDateStr(purchaseDate, getRecommendedExpiryDays(item.category, item.storage));
      const parsedPrice = item.price !== undefined && item.price !== null && item.price !== '' && !isNaN(Number(item.price))
        ? Number(item.price)
        : null;
      return {
        id: item.id || `item-${Date.now()}-${idx}`,
        name: item.name,
        quantity: String(item.quantity || '1개'),
        price: parsedPrice,
        category: item.category || '기타',
        storage: item.storage || catInfo.defaultStorage || '냉장',
        purchaseDate,
        expiryDate,
        expiryDays: calcDiffDaysFromToday(expiryDate),
        source: item.source || 'manual',
        isNewHighlight: true
      };
    });
    const currentFridge = FridgeStorageRepository.getAll();
    const updatedFridge = [...normalized, ...currentFridge];
    safeLocalStorage.set('fridge', updatedFridge);

    const newPurchases = normalized.map(n => ({
      id: `pur-${n.id}`,
      itemId: n.id,
      name: n.name,
      category: n.category,
      price: n.price,
      purchaseDate: n.purchaseDate,
      source: n.source
    }));
    const currentPurchases = FridgeStorageRepository.getPurchaseHistory();
    const updatedPurchases = [...newPurchases, ...currentPurchases];
    safeLocalStorage.set('purchase_history', updatedPurchases);

    return updatedFridge;
  },
  removeById: (id: string | number) => {
    const current = FridgeStorageRepository.getAll();
    const filtered = current.filter(item => item.id !== id);
    safeLocalStorage.set('fridge', filtered);
    return filtered;
  }
};

export const FoodActionLogRepository = {
  getAll: () => {
    const raw = safeLocalStorage.get('logs', createInitialActionLogs());
    return Array.isArray(raw) ? raw : createInitialActionLogs();
  },
  saveAll: (logs: any[]) => {
    safeLocalStorage.set('logs', logs);
    return logs;
  },
  addLog: ({ itemId, name, category, price, action, actionDate, wasNearExpiry, viaRescueRecipe }: any) => {
    const newEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemId: itemId || `item-${Date.now()}`,
      name,
      category: category || '기타',
      price: price !== undefined && price !== null && price !== '' && !isNaN(Number(price)) ? Number(price) : null,
      action: action === 'discarded' ? 'discarded' : 'eaten',
      actionDate: actionDate || formatDateYMD(new Date()),
      wasNearExpiry: Boolean(wasNearExpiry),
      viaRescueRecipe: Boolean(viaRescueRecipe),
    };
    const currentLogs = FoodActionLogRepository.getAll();
    const updated = [newEntry, ...currentLogs];
    safeLocalStorage.set('logs', updated);
    return updated;
  }
};

export const ShoppingListRepository = {
  getAll: () => {
    const raw = safeLocalStorage.get('shopping', createInitialShoppingList());
    return Array.isArray(raw) ? raw : createInitialShoppingList();
  },
  saveAll: (list: any[]) => {
    safeLocalStorage.set('shopping', list);
    return list;
  },
  isDismissedWithin7Days: (name: string) => {
    const key = String(name || '').trim();
    const dismissedMap = safeLocalStorage.get<Record<string, number>>('dismissed', {});
    const ts = dismissedMap[key];
    if (!ts) return false;
    if (Date.now() - ts < SEVEN_DAYS_MS) return true;
    delete dismissedMap[key];
    safeLocalStorage.set('dismissed', dismissedMap);
    return false;
  },
  markDismissedFor7Days: (name: string) => {
    const key = String(name || '').trim();
    if (key) {
      const dismissedMap = safeLocalStorage.get<Record<string, number>>('dismissed', {});
      dismissedMap[key] = Date.now();
      safeLocalStorage.set('dismissed', dismissedMap);
    }
  },
  addOrIncrementItem: ({ name, quantity = '1개', section = 'custom', category = '기타', reasonTag = '직접 추가', supplyId = null, isAuto = false }: any) => {
    const cleanName = String(name || '').trim();
    const currentList = ShoppingListRepository.getAll();
    if (!cleanName) return currentList;
    if (isAuto && ShoppingListRepository.isDismissedWithin7Days(cleanName)) return currentList;

    const existingIdx = currentList.findIndex(item => item.name.trim() === cleanName && !item.checked);
    if (existingIdx !== -1) {
      if (!isAuto) {
        const current = currentList[existingIdx];
        currentList[existingIdx] = {
          ...current,
          quantity: incrementQuantityStr(current.quantity, quantity),
        };
        safeLocalStorage.set('shopping', currentList);
      }
      return [...currentList];
    }

    const newItem = {
      id: `shop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      quantity: String(quantity || '1개'),
      section,
      category: category || '기타',
      reasonTag: reasonTag || '직접 추가',
      checked: false,
      supplyId
    };
    const updated = [newItem, ...currentList];
    safeLocalStorage.set('shopping', updated);
    return updated;
  },
  syncSuppliesToShoppingList: (suppliesArray: any[]) => {
    const currentList = ShoppingListRepository.getAll();
    let changed = false;
    suppliesArray.forEach(sup => {
      if (sup.needBuy && !ShoppingListRepository.isDismissedWithin7Days(sup.name)) {
        const alreadyExists = currentList.some(item => item.name.trim() === sup.name.trim());
        if (!alreadyExists) {
          currentList.push({
            id: `shop-sup-${sup.id}-${Date.now()}`,
            name: sup.name,
            quantity: '1개',
            section: 'supply',
            category: '기타',
            reasonTag: '교체 시기',
            checked: false,
            supplyId: sup.id
          });
          changed = true;
        }
      }
    });
    if (changed) {
      safeLocalStorage.set('shopping', currentList);
    }
    return [...currentList];
  },
  removeItem: (id: string | number) => {
    const currentList = ShoppingListRepository.getAll();
    const target = currentList.find(i => i.id === id);
    if (target && (target.reasonTag === '교체 시기' || target.reasonTag === '다 먹었어요' || target.reasonTag === '유통기한 지남')) {
      ShoppingListRepository.markDismissedFor7Days(target.name);
    }
    const filtered = currentList.filter(i => i.id !== id);
    safeLocalStorage.set('shopping', filtered);
    return filtered;
  }
};
