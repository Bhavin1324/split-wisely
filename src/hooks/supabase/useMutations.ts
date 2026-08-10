import { DEMO_MODE } from '../../context/AppDataContext';
import { supabase } from '../../lib/supabase';


export async function createExpenseWithSplits(params: { 
  group_id: string | null; 
  category_id: string | null; 
  description: string; 
  total_amount: number; 
  currency_code: string; 
  exchange_rate: number; 
  payer_id: string; 
  receipt_image_url: string | null; 
  created_by: string; 
  expense_date?: string;
  splits: { user_id: string; amount_owed: number }[] 
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_expense_with_splits', {
    p_group_id: params.group_id,
    p_category_id: params.category_id,
    p_description: params.description,
    p_total_amount: params.total_amount,
    p_currency_code: params.currency_code,
    p_exchange_rate: params.exchange_rate,
    p_payer_id: params.payer_id,
    p_receipt_image_url: params.receipt_image_url,
    p_created_by: params.created_by,
    p_expense_date: params.expense_date ?? new Date().toISOString(),
    p_splits: params.splits
  });

  if (error) throw error;
  return data as string;
}

export async function updateExpenseWithSplits(params: {
  expense_id: string;
  group_id: string | null;
  category_id: string | null;
  description: string;
  total_amount: number;
  currency_code: string;
  exchange_rate: number;
  payer_id: string;
  receipt_image_url: string | null;
  expense_date: string;
  splits: { user_id: string; amount_owed: number }[];
}): Promise<void> {
  const { error } = await supabase.rpc('update_expense_with_splits', {
    p_expense_id: params.expense_id,
    p_group_id: params.group_id,
    p_category_id: params.category_id,
    p_description: params.description,
    p_total_amount: params.total_amount,
    p_currency_code: params.currency_code,
    p_exchange_rate: params.exchange_rate,
    p_payer_id: params.payer_id,
    p_receipt_image_url: params.receipt_image_url,
    p_expense_date: params.expense_date,
    p_splits: params.splits,
  });

  if (error) throw error;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_expense', { p_expense_id: expenseId });
  if (error) throw error;
}

export async function createSettlement(params: { 
  group_id: string | null; 
  payer_id: string; 
  payee_id: string; 
  amount: number; 
  currency_code: string 
}): Promise<void> {
  const { error } = await supabase
    .from('settlements')
    .insert([{
      group_id: params.group_id,
      payer_id: params.payer_id,
      payee_id: params.payee_id,
      amount: params.amount,
      currency_code: params.currency_code
    }]);
    
  if (error) throw error;
}

export async function createGroup(params: { name: string; created_by: string }): Promise<string> {
  const { data: group, error: groupErr } = await supabase
    .from('groups')
    .insert([{ name: params.name, created_by: params.created_by }])
    .select()
    .single();

  if (groupErr) throw groupErr;

  const { error: memberErr } = await supabase
    .from('group_members')
    .insert([{ group_id: group.id, user_id: params.created_by }]);

  if (memberErr) throw memberErr;

  return group.id;
}

export async function createGroupWithMembers(params: {
  name: string;
  created_by: string;
  member_user_ids?: string[];
}): Promise<string> {
  const groupId = await createGroup({ name: params.name, created_by: params.created_by });

  if (params.member_user_ids && params.member_user_ids.length > 0) {
    const toInsert = params.member_user_ids
      .filter((uid) => uid !== params.created_by)
      .map((uid) => ({ group_id: groupId, user_id: uid }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from('group_members').insert(toInsert);
      if (error) console.error('Error adding initial members:', error);
    }
  }

  return groupId;
}

export async function addMemberToGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .insert([{ group_id: groupId, user_id: userId }]);

  if (error && !error.message.includes('duplicate')) {
    throw error;
  }
}

export async function removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
  // 1. Delete all settlements where the user is either the payer or payee in this group
  const { error: errSettlements } = await supabase
    .from('settlements')
    .delete()
    .eq('group_id', groupId)
    .or(`payer_id.eq.${userId},payee_id.eq.${userId}`);
  
  if (errSettlements) throw errSettlements;

  // 2. Fetch all expenses for this group to handle payer/split logic
  const { data: expenses, error: errExp } = await supabase
    .from('expenses')
    .select('id, total_amount, base_currency_amount, payer_id, splits:expense_splits(user_id, amount_owed)')
    .eq('group_id', groupId);

  if (errExp) throw errExp;

  if (expenses && expenses.length > 0) {
    // 3. Delete expenses entirely where this user was the payer
    const expensesToDelete = expenses.filter(e => e.payer_id === userId);
    for (const exp of expensesToDelete) {
      await supabase.from('expenses').delete().eq('id', exp.id);
    }

    // 4. For expenses paid by OTHERS, where this user owes a split, remove their split and shrink the total
    const expensesToUpdate = expenses.filter(e => 
      e.payer_id !== userId && e.splits?.some((s: any) => s.user_id === userId)
    );

    for (const exp of expensesToUpdate) {
      const userSplit = exp.splits.find((s: any) => s.user_id === userId);
      if (userSplit) {
        const newTotal = Math.max(0, exp.total_amount - userSplit.amount_owed);
        const newBase = Math.max(0, exp.base_currency_amount - userSplit.amount_owed);
        
        // Delete the split first
        await supabase.from('expense_splits').delete().eq('expense_id', exp.id).eq('user_id', userId);

        // Update the parent expense to reflect the removed share
        await supabase.from('expenses').update({
          total_amount: newTotal,
          base_currency_amount: newBase
        }).eq('id', exp.id);
      }
    }
  }

  // 5. Finally, remove the user from the group members table
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  // 6. Trigger global refresh to update UI instantly
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('expenseAdded'));
  }
}

export async function updateGroupSettings(groupId: string, settings: { simplify_debts?: boolean; name?: string; cover_image_url?: string }): Promise<void> {
  const { error } = await supabase
    .from('groups')
    .update(settings)
    .eq('id', groupId);

  if (error) {
    throw error;
  }
}

export async function createGroupInvitation(params: {
  groupId: string;
  email: string;
  invitedBy: string;
}): Promise<{ invitationId: string; token: string; joinUrl: string }> {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const joinUrl = `${window.location.origin}/join?token=${token}`;
  try {
    const { data } = await supabase
      .from('group_invitations')
      .insert([{
        group_id: params.groupId,
        email: params.email,
        invited_by: params.invitedBy,
        token,
        status: 'pending'
      }])
      .select()
      .single();

    return { invitationId: data?.id ?? `inv-${Date.now()}`, token, joinUrl };
  } catch {
    return { invitationId: `inv-${Date.now()}`, token, joinUrl };
  }
}

export async function createAppInvitation(params: { email: string, inviterName: string }): Promise<{ joinUrl: string }> {
  if (DEMO_MODE) {
    return { joinUrl: `${window.location.origin}/login` };
  }

  try {
    const { error } = await supabase
      .from('email_notifications')
      .insert([{
        recipient_email: params.email,
        subject: `${params.inviterName} has invited you to SplitWisely!`,
        body_json: {
          inviter_name: params.inviterName,
          token: null
        },
        notification_type: 'app_invitation',
        sent: false
      }]);

    if (error) throw error;

    return { joinUrl: `${window.location.origin}/login` };
  } catch (error) {
    console.error('Failed to create app invitation:', error);
    return { joinUrl: `${window.location.origin}/login` };
  }
}

export async function updateProfile(userId: string, updates: { full_name?: string; default_currency?: string; avatar_url?: string; upi_id?: string }): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .match({ group_id: groupId, user_id: userId });

  if (error) throw error;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) throw error;
}

export async function deleteSettlement(settlementId: string): Promise<void> {
  const { error } = await supabase.from('settlements').delete().eq('id', settlementId);
  if (error) throw error;
}
