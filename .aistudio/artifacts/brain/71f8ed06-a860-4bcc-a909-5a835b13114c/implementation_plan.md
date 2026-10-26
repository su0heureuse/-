# Fridge Item Multi-Criteria Sorting Feature

Enable users to effortlessly organize and prioritize their refrigerator inventory by sorting items according to **Expiry Date** (nearest first), **Purchase Date** (newest first), or **Price** (highest first), seamlessly integrated alongside existing storage filters.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during Phase 1 clarification:
> - **Sorting UI Placement**: A clean, compact dropdown `<select>` element situated directly alongside the storage filter buttons (`전체`, `냉장`, `냉동`, `실온`, `임박(D-3)`), preserving vertical real estate on both mobile and desktop.
> - **Default Sort Criterion**: **Expiry Date** (nearest first, ascending by `expiryDays` / `expiryDate`), ensuring perishable items requiring urgent consumption are naturally kept front and center to minimize food waste.

---

## 1. Overview & Core Concept

- **What It Does**: Adds an intuitive sorting dropdown in the Fridge tab ("재료" sub-tab) that sorts the active list of food items based on three key dimensions:
  1. **유통기한 임박순 (Expiry Date - Nearest first)**: Items expiring soonest appear at the top. Items with negative or 0 days remaining (expired/today) appear first.
  2. **최근 등록/구매순 (Purchase Date - Newest first)**: Items most recently purchased or logged appear first (descending by `purchaseDate`, with secondary sort on item ID/addition order).
  3. **높은 가격순 (Price - Highest first)**: Items with the highest cost appear at the top, allowing users to prioritize high-value ingredients (items without recorded prices appear gracefully at the end).
- **Target Audience / Persona**: Single-person household managers, roommates, and busy professionals who need to quickly locate high-value ingredients or immediately identify which groceries need cooking today.
- **Key Value**: Eliminates cognitive friction when inspecting large fridge inventories, preventing expensive ingredients from spoiling and allowing flexible inventory management.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Navigating to Refrigerator View**:
   - User taps the **냉장고** (Refrigerator) tab and remains on the **재료** (Ingredients) sub-segment.
2. **Viewing Controls**:
   - The filter toolbar displays category filter buttons (`전체`, `냉장`, `냉동`, `실온`, `임박(D-3)`) and an adjacent styled sorting dropdown selector with a clean 1.5px Lucide sort indicator or native styled `<select>`.
3. **Changing Sort Criteria**:
   - User changes the select option to "최근 구매순" (Purchase Date) or "높은 가격순" (Price).
   - The list immediately animates and reorders in place with smooth transition timing ($\le 200\text{ms}$), retaining active swipeable actions (`먹었어요`, `버렸어요`).
4. **Filtering Combined with Sorting**:
   - Sorting applies cleanly across whichever storage filter is active (e.g. "냉장" + "높은 가격순", or "임박(D-3)" + "유통기한순").

### Visual Identity & Theme
- **Surface & Typography**:
  - Matches the established design tokens: neutral background (`var(--bg-subtle)`), hairline border (`var(--border-hairline)`), rounded button geometry (`var(--radius-btn)`), and Pretendard 14px typography (`var(--fs-body)`).
- **Control Styling**:
  - Compact height ($38\text{px}$–$40\text{px}$), minimum touch target ($44\text{px}$ touch area), clear focus ring, and subtle arrow affordance.
  - Mobile responsive: Flows neatly into the filter bar on flex-wrap layouts without horizontal clipping or overflow.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dropdown Placement next to Storage Filter Bar**
  - *Chosen Approach*: Embed the sorting `<select>` element directly in the filter toolbar alongside the existing filter buttons and action buttons.
  - *Why*: Conserves vertical viewport space (adhering to mobile ergonomics and avoiding card clutter), keeping controls within one unified toolbar.
  - *Alternatives Considered*: A separate row of buttons (consumes valuable vertical viewport space) or a modal bottom sheet (adds extra tap steps for a simple 3-way choice).

- **Decision 2: Null and Missing Price Sorting Behavior**
  - *Chosen Approach*: When sorting by "높은 가격순" (Price - Highest first), items without price data (`price === null` or `0`) are sorted to the bottom rather than failing or showing up unpredictably at the top.
  - *Why*: Ensures users immediately see their actual high-value purchases first, with unpriced items tucked neatly at the end.

- **Decision 3: Multi-Criteria Tie-Breaking**
  - *Chosen Approach*: When two items have identical primary values (e.g., identical expiry dates or purchase dates), secondary tie-breaking applies:
    - Expiry sort: ties broken by purchase date (newest first), then name.
    - Purchase sort: ties broken by expiry date (nearest first).
    - Price sort: ties broken by expiry date (nearest first).
  - *Why*: Produces stable, predictable list ordering that never randomly flips positions upon state updates.

---

## 4. Technical Architecture & Data Strategy

### Component & Data Flow Architecture

```
┌────────────────────────────────────────────────────────┐
│                      App Component                     │
│  State: fridgeItems, fridgeFilter, fridgeSortOrder     │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
┌─────────────────────────────┐   ┌──────────────────────────────┐
│       Filter Toolbar        │   │       Sorting Selector       │
│  [전체] [냉장] [냉동] [실온] │   │  <select value={sortOrder}>  │
│         [임박(D-3)]         │   │   - 유통기한 임박순 (Default) │
└──────────────┬──────────────┘   │   - 최근 구매순              │
               │                  │   - 높은 가격순              │
               │                  └──────────────┬───────────────┘
               │                                 │
               └──────────────┬──────────────────┘
                              ▼
        ┌───────────────────────────────────────────┐
        │        sortedAndFilteredFridgeItems       │
        │  1. filter(storage === filter || ...)    │
        │  2. sort(compareFn based on sortOrder)    │
        └─────────────────────┬─────────────────────┘
                              ▼
        ┌───────────────────────────────────────────┐
        │            Thin List Container            │
        │  SwipeableListRow (reordered seamlessly)  │
        └───────────────────────────────────────────┘
```

### State & Sorting Logic Mapping

1. **New State**:
   ```typescript
   type FridgeSortOrder = 'expiry_asc' | 'purchase_desc' | 'price_desc';
   const [fridgeSortOrder, setFridgeSortOrder] = useState<FridgeSortOrder>('expiry_asc');
   ```

2. **Memoized Filter & Sort Pipeline**:
   ```typescript
   const displayedFridgeItems = useMemo(() => {
     return fridgeItems
       .filter(item => {
         if (fridgeFilter === '전체') return true;
         if (fridgeFilter === '임박(D-3)') return item.expiryDays <= 3;
         return item.storage === fridgeFilter;
       })
       .sort((a, b) => {
         if (fridgeSortOrder === 'expiry_asc') {
           // Primary: Expiry days ascending
           const diff = a.expiryDays - b.expiryDays;
           if (diff !== 0) return diff;
           return (b.purchaseDate || '').localeCompare(a.purchaseDate || '');
         }
         if (fridgeSortOrder === 'purchase_desc') {
           // Primary: Purchase date descending
           const diff = (b.purchaseDate || '').localeCompare(a.purchaseDate || '');
           if (diff !== 0) return diff;
           return a.expiryDays - b.expiryDays;
         }
         if (fridgeSortOrder === 'price_desc') {
           // Primary: Price descending (nulls/zeros last)
           const priceA = a.price && !isNaN(Number(a.price)) ? Number(a.price) : -1;
           const priceB = b.price && !isNaN(Number(b.price)) ? Number(b.price) : -1;
           const diff = priceB - priceA;
           if (diff !== 0) return diff;
           return a.expiryDays - b.expiryDays;
         }
         return 0;
       });
   }, [fridgeItems, fridgeFilter, fridgeSortOrder]);
   ```

3. **UI Integration**:
   - In `fridgeSubTab === 'ingredients'`, right next to the category filter buttons, place:
     ```tsx
     <div className="flex items-center" style={{ gap: '6px' }}>
       <ArrowUpDown className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
       <select
         value={fridgeSortOrder}
         onChange={(e) => setFridgeSortOrder(e.target.value as FridgeSortOrder)}
         className="t-sub"
         style={{ ...designTokens }}
       >
         <option value="expiry_asc">유통기한 임박순</option>
         <option value="purchase_desc">최근 구매순</option>
         <option value="price_desc">높은 가격순</option>
       </select>
     </div>
     ```

4. **Verification & Regression Checks**:
   - Verify sorting when switching criteria across all filters (`전체`, `냉동`, `실온`, `임박(D-3)`).
   - Verify unpriced items (`price: null`) sink to the bottom when sorting by price.
   - Verify sorting persists during item consumption (`먹었어요`, `버렸어요`) and newly registered items smoothly insert in sorted order.
   - Run `lint_applet` and `compile_applet`.
