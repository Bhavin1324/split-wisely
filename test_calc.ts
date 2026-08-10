import { MOCK_EXPENSES, MOCK_SETTLEMENTS, MOCK_GROUP_MEMBERS } from './src/lib/mockData';
import { DebtSimplifier } from './src/core/domain/DebtSimplifier';

const groupId = 'group-1'; // Beach Trip

const groupExpenses = MOCK_EXPENSES.filter(e => e.group_id === groupId);
const groupSettlements = MOCK_SETTLEMENTS.filter(s => s.group_id === groupId);
const groupMembers = MOCK_GROUP_MEMBERS.filter(m => m.group_id === groupId);

const simplifiedDebts = DebtSimplifier.simplifyDebts(
  groupExpenses.map(e => ({
    payer_id: e.payer_id,
    base_currency_amount: e.base_currency_amount,
    splits: (e.splits ?? []).map(s => ({
      user_id: s.user_id,
      amount_owed: s.amount_owed,
    })),
  })),
  groupSettlements.map(s => ({
    payer_id: s.payer_id,
    payee_id: s.payee_id,
    amount: s.amount,
  })),
  groupMembers.map(m => ({ user_id: m.user_id })),
);

console.log("SIMPLIFIED DEBTS:", JSON.stringify(simplifiedDebts, null, 2));
