# SplitWisely Debt Calculation & Balance Aggregation Engine Architecture

## 1. Overview & Core Architecture

SplitWisely employs a dual-layered balance architecture designed to provide both **isolated group financial tracking** and **global 1-on-1 friend relationship tracking**.

```
+-----------------------------------------------------------------------------------+
|                                 GLOBAL USER SCOPE                                 |
|                                                                                   |
|  +-------------------------------------+   +-----------------------------------+  |
|  |     Shared Group 1 ("Flat exp")     |   |          Shared Group 2            |  |
|  |  Group-level Net Balance Engine     |   |  Group-level Net Balance Engine   |  |
|  |  (DebtSimplifier + simplify_debts)  |   |  (DebtSimplifier + simplify_debts)|  |
|  +------------------+------------------+   +-----------------+-----------------+  |
|                     |                                        |                    |
|                     +-------------------+--------------------+                    |
|                                         |                                         |
|                                         v                                         |
|  +-----------------------------------------------------------------------------+  |
|  |                    Global Friend Balance Aggregator                         |  |
|  |             (computeFriendNetBalance in friendCalculations.ts)              |  |
|  |                                                                             |  |
|  |  Net Balance = Sum(Group Net Debts) + Non-Group Direct Expenses/Settlements   |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### Key Distinction: Group Ledger vs. Friend Aggregate
- **Group Ledger Scope (`GroupDetailPage.tsx`, `useGroupCalculations.ts`)**: Calculates net debt strictly bounded within a single group $G$. Transactions from other groups or non-group settlements are isolated and ignored.
- **Global Friend Scope (`FriendsPage.tsx`, `FriendDetailPage.tsx`, `computeFriendNetBalance`)**: Computes the true total 1-on-1 net financial position across **all shared groups** plus **direct non-group transactions**.

---

## 2. Calculation Engines

### A. Group Debt Engine (`DebtSimplifier.ts`)
For a given group $G$:
1. **Raw Bilateral Debts (`calculateIndividualDebts`)**:
   Sums direct pairwise expense splits and group-specific settlements.
2. **Simplified Debts (`simplifyDebts`)**:
   Runs a greedy net-balance minimization algorithm:
   - Calculates each participant's total net balance in the group:
     $$\text{Net Balance}_i = \sum \text{Paid}_i - \sum \text{Owed}_i + \sum \text{Received Settlements}_i - \sum \text{Paid Settlements}_i$$
   - Matches debtors ($\text{Net Balance} < 0$) with creditors ($\text{Net Balance} > 0$) to minimize the total number of transactions.

### B. Global Friend Balance Engine (`computeFriendNetBalance`)
Computes the net balance between user $U$ and friend $F$ as:

$$\text{Global Friend Net Balance}(F) = \sum_{G \in \text{Shared Groups}} \text{Net Debt}(U, F, G) + \text{Net Debt}_{\text{Non-Group}}(U, F)$$

Where:
- $\text{Net Debt}(U, F, G)$ is derived by executing `DebtSimplifier` on group $G$ (respecting $G.\text{simplify\_debts}$).
- $\text{Net Debt}_{\text{Non-Group}}(U, F)$ sums direct expenses (`group_id IS NULL`) and direct settlements (`group_id IS NULL`).
- All calculations are performed in integer cents/paise (`Math.round`) to prevent floating-point precision issues.

---

## 3. Concrete Case Study: User Jigar Patel

A real-world audit of user **Jigar Patel** (`6b83bd72-e1ab-45b3-946f-6f2bdb55987a`) and logged-in user **Barberrion King** (`3069d317-c51a-40b2-b268-428e663c61f1`) demonstrates why the numbers differ between views:

### Step 1: Group Ledger ("Flat expenses")
- **Expenses in Group**:
  1. *Dinner* (₹320.00 paid by Barberrion): Jigar owes Barberrion **₹106.66**.
  2. *Premvati Dinner* (₹240.00 paid by Barberrion): Jigar owes Barberrion **₹120.00**.
  3. *Bataka (Potatoes)* (₹30.00 paid by Jigar): Barberrion owes Jigar **₹10.00**.
- **Raw Bilateral Debt**: ₹106.66 + ₹120.00 - ₹10.00 = **₹216.66** (Jigar owes Barberrion).
- **Simplified Debt**: Graph minimization across 3 group members (Barberrion +₹251.66, Jaimin -₹45.00, Jigar -₹206.66) simplifies Jigar's debt to **₹206.66**.

### Step 2: Standalone Non-Group Settlement Audit Trace
- **Settlement Record ID**: `942d400a-f8bc-4368-ab8f-bc90005f34ec`
- **Scope**: `group_id: NULL` (Direct 1-on-1 settlement outside any group)
- **Payer**: Barberrion King (`3069d317-c51a-40b2-b268-428e663c61f1`)
- **Payee**: Jigar Patel (`6b83bd72-e1ab-45b3-946f-6f2bdb55987a`)
- **Amount**: `66001` cents (**₹660.01**)
- **Created At**: `2026-08-10 10:05:44.603414+00`

### Step 3: Reconciling Group vs. Friends View

| View Scope | Formula Applied | Calculated Amount | Explanation |
| :--- | :--- | :--- | :--- |
| **Group Detail Page** ("Flat expenses") | `DebtSimplifier` inside group | **₹206.66** (Simplified ON)<br>**₹216.66** (Simplified OFF) | Only includes expenses created within "Flat expenses". |
| **Friends Page / Friend Detail** | $\text{Group Debt} + \text{Non-Group Settlement}$ | **₹866.67** (₹206.66 + ₹660.01) | Combines group debt (₹206.66) + direct payment transferred (₹660.01). |

**Conclusion**: The figure of **₹866.67** displayed in the Friends Tab is **mathematically exact and correct**. It accurately reflects that Jigar owes ₹206.66 from group expenses plus ₹660.01 from direct transfers.

---

## 4. SQL Audit Queries & Database Verification

To re-verify the non-group balance flow at any time in Postgres:

```sql
-- 1. Check all non-group expenses (group_id IS NULL)
SELECT 
  e.id AS expense_id,
  e.description,
  e.total_amount,
  e.payer_id,
  es.user_id AS split_user_id,
  es.amount_owed
FROM public.expenses e
JOIN public.expense_splits es ON e.id = es.expense_id
WHERE e.group_id IS NULL
  AND (
    (e.payer_id = '6b83bd72-e1ab-45b3-946f-6f2bdb55987a' AND es.user_id = '3069d317-c51a-40b2-b268-428e663c61f1') OR
    (e.payer_id = '3069d317-c51a-40b2-b268-428e663c61f1' AND es.user_id = '6b83bd72-e1ab-45b3-946f-6f2bdb55987a')
  );

-- 2. Check direct settlements/payments between the two users
SELECT 
  s.id AS settlement_id,
  s.group_id,
  s.payer_id,
  s.payee_id,
  s.amount,
  s.created_at
FROM public.settlements s
WHERE (s.payer_id = '3069d317-c51a-40b2-b268-428e663c61f1' AND s.payee_id = '6b83bd72-e1ab-45b3-946f-6f2bdb55987a')
   OR (s.payer_id = '6b83bd72-e1ab-45b3-946f-6f2bdb55987a' AND s.payee_id = '3069d317-c51a-40b2-b268-428e663c61f1');
```

---

## 5. UI Representation Guidelines

To ensure transparent UX for users:
1. **Group Detail Page** displays the group-isolated balance and badge ("Simplified View" / "Direct Balances View").
2. **Friend Detail Page** displays:
   - Header Card: Global aggregate net balance (e.g. `₹866.67`).
   - Shared Group Balances Card: Breakdown per shared group (e.g. `Flat expenses: +₹206.66`), allowing users to trace how their global total is composed.
