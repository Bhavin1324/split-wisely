import { DEMO_MODE } from '../../context/AppDataContext';
import { supabase } from '../../lib/supabase';
import { MOCK_EXPENSES, MOCK_SETTLEMENTS, MOCK_GROUP_ACTIVITIES, getProfileById } from '../../lib/mockData';
import type { Expense, GroupActivityItem } from '../../types';
import { dispatchPushNotification } from '../../utils/pushDispatcher';
import { formatCents } from '../../utils/currency';

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
  if (DEMO_MODE) {
    const newId = `exp-${Date.now()}`;
    const payer = getProfileById(params.payer_id)!;
    const newExpense: Expense = {
      id: newId,
      group_id: params.group_id,
      category_id: params.category_id,
      description: params.description,
      total_amount: params.total_amount,
      base_currency_amount: params.total_amount,
      currency_code: params.currency_code,
      exchange_rate: params.exchange_rate,
      payer_id: params.payer_id,
      created_by: params.created_by,
      receipt_image_url: params.receipt_image_url,
      expense_date: params.expense_date ?? new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payer,
      splits: params.splits.map((s) => ({
        id: `split-${Math.random()}`,
        expense_id: newId,
        user_id: s.user_id,
        amount_owed: s.amount_owed,
        user: getProfileById(s.user_id)!,
      })),
    };
    MOCK_EXPENSES.unshift(newExpense);

    if (params.group_id) {
      const activity: GroupActivityItem = {
        id: `act-${Date.now()}`,
        group_id: params.group_id,
        actor_id: params.created_by,
        action_type: 'EXPENSE_CREATED',
        description: `${payer.full_name} added expense "${params.description}"`,
        metadata: {
          expense_id: newId,
          amount: params.total_amount,
          description: params.description,
          payer_id: params.payer_id,
          payer_name: payer.full_name,
        },
        created_at: new Date().toISOString(),
        actor: payer,
      };
      MOCK_GROUP_ACTIVITIES.unshift(activity);
    }
    return newId;
  }

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

  // Insert notifications for all users involved (except the creator)
  const notificationUsers = params.splits.filter(s => s.user_id !== params.created_by).map(s => s.user_id);
  if (notificationUsers.length > 0) {
    const formattedTotal = formatCents(params.total_amount, params.currency_code);
    const messageText = `An expense "${params.description}" (${formattedTotal}) was added.`;

    const notificationsToInsert = notificationUsers.map(uid => ({
      user_id: uid,
      actor_id: params.created_by,
      type: 'EXPENSE_ADDED',
      title: 'New Expense Added',
      message: messageText,
      link: params.group_id ? `/groups/${params.group_id}` : '/dashboard'
    }));
    await supabase.from('notifications').insert(notificationsToInsert);

    // Trigger Web Push Notification
    dispatchPushNotification({
      userIds: notificationUsers,
      title: 'New Expense Added',
      message: messageText,
      url: params.group_id ? `/groups/${params.group_id}` : '/dashboard',
    });
  }

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
  if (DEMO_MODE) {
    const idx = MOCK_EXPENSES.findIndex((e) => e.id === params.expense_id);
    const payer = getProfileById(params.payer_id)!;
    if (idx !== -1) {
      MOCK_EXPENSES[idx] = {
        ...MOCK_EXPENSES[idx],
        description: params.description,
        total_amount: params.total_amount,
        base_currency_amount: params.total_amount,
        currency_code: params.currency_code,
        exchange_rate: params.exchange_rate,
        payer_id: params.payer_id,
        category_id: params.category_id,
        receipt_image_url: params.receipt_image_url,
        expense_date: params.expense_date,
        updated_at: new Date().toISOString(),
        payer,
        splits: params.splits.map((s) => ({
          id: `split-${Math.random()}`,
          expense_id: params.expense_id,
          user_id: s.user_id,
          amount_owed: s.amount_owed,
          user: getProfileById(s.user_id)!,
        })),
      };

      if (params.group_id) {
        const activity: GroupActivityItem = {
          id: `act-${Date.now()}`,
          group_id: params.group_id,
          actor_id: params.payer_id,
          action_type: 'EXPENSE_UPDATED',
          description: `${payer.full_name} updated expense "${params.description}"`,
          metadata: {
            expense_id: params.expense_id,
            amount: params.total_amount,
            description: params.description,
            payer_id: params.payer_id,
          },
          created_at: new Date().toISOString(),
          actor: payer,
        };
        MOCK_GROUP_ACTIVITIES.unshift(activity);
      }
    }
    return;
  }

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

  // Insert notifications and trigger push for involved users
  const notificationUsers = params.splits.filter((s) => s.user_id !== params.payer_id).map((s) => s.user_id);
  if (notificationUsers.length > 0) {
    const formattedTotal = formatCents(params.total_amount, params.currency_code);
    const messageText = `Expense "${params.description}" (${formattedTotal}) was updated.`;

    const notificationsToInsert = notificationUsers.map((uid) => ({
      user_id: uid,
      actor_id: params.payer_id,
      type: 'EXPENSE_UPDATED',
      title: 'Expense Updated',
      message: messageText,
      link: params.group_id ? `/groups/${params.group_id}` : '/dashboard',
    }));
    await supabase.from('notifications').insert(notificationsToInsert);

    // Trigger Web Push Notification
    dispatchPushNotification({
      userIds: notificationUsers,
      title: 'Expense Updated ✏️',
      message: messageText,
      url: params.group_id ? `/groups/${params.group_id}` : '/dashboard',
    });
  }
}

export async function deleteExpense(expenseId: string): Promise<void> {
  if (DEMO_MODE) {
    const idx = MOCK_EXPENSES.findIndex((e) => e.id === expenseId);
    if (idx !== -1) {
      const exp = MOCK_EXPENSES[idx];
      MOCK_EXPENSES.splice(idx, 1);
      if (exp.group_id) {
        const activity: GroupActivityItem = {
          id: `act-${Date.now()}`,
          group_id: exp.group_id,
          actor_id: exp.payer_id,
          action_type: 'EXPENSE_DELETED',
          description: `Expense "${exp.description}" was deleted`,
          metadata: {
            expense_id: exp.id,
            amount: exp.total_amount,
            description: exp.description,
          },
          created_at: new Date().toISOString(),
          actor: exp.payer,
        };
        MOCK_GROUP_ACTIVITIES.unshift(activity);
      }
    }
    return;
  }

  const { error } = await supabase.rpc('delete_expense', { p_expense_id: expenseId });
  if (error) throw error;
}

export async function createSettlement(params: { 
  group_id: string | null; 
  payer_id: string; 
  payee_id: string; 
  amount: number; 
  currency_code: string;
  payer_name?: string;
}): Promise<void> {
  if (DEMO_MODE) {
    if (params.group_id) {
      const payer = getProfileById(params.payer_id);
      const payee = getProfileById(params.payee_id);
      const activity: GroupActivityItem = {
        id: `act-${Date.now()}`,
        group_id: params.group_id,
        actor_id: params.payer_id,
        action_type: 'SETTLEMENT_RECORDED',
        description: `${payer?.full_name || 'Someone'} paid ${payee?.full_name || 'someone'}`,
        metadata: {
          amount: params.amount,
          payer_id: params.payer_id,
          payee_id: params.payee_id,
          payer_name: payer?.full_name,
          payee_name: payee?.full_name,
        },
        created_at: new Date().toISOString(),
        actor: payer,
      };
      MOCK_GROUP_ACTIVITIES.unshift(activity);
    }
    return;
  }
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

  // Notify the payee with rich details
  if (params.payer_id !== params.payee_id) {
    const formattedAmount = formatCents(params.amount, params.currency_code);
    const payerDisplay = params.payer_name || 'A friend';
    const messageText = `${payerDisplay} recorded a payment of ${formattedAmount} to you.`;
    const targetUrl = params.group_id ? `/groups/${params.group_id}` : `/friends/${params.payer_id}`;

    await supabase.from('notifications').insert([{
      user_id: params.payee_id,
      actor_id: params.payer_id,
      type: 'SETTLEMENT_RECORDED',
      title: 'Payment Received',
      message: messageText,
      link: targetUrl
    }]);

    // Trigger Web Push Notification
    dispatchPushNotification({
      userIds: [params.payee_id],
      title: 'Payment Received 💰',
      message: messageText,
      url: targetUrl,
    });
  }
}

export async function createGroup(params: { name: string; created_by: string; cover_image_url?: string | null }): Promise<string> {
  const { data: group, error: groupErr } = await supabase
    .from('groups')
    .insert([{ 
      name: params.name, 
      created_by: params.created_by,
      cover_image_url: params.cover_image_url || null
    }])
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
  cover_image_url?: string | null;
  member_user_ids?: string[];
  creator_name?: string;
}): Promise<string> {
  const groupId = await createGroup({ 
    name: params.name, 
    created_by: params.created_by,
    cover_image_url: params.cover_image_url
  });

  if (params.member_user_ids && params.member_user_ids.length > 0) {
    const initialMembers = params.member_user_ids.filter((uid) => uid !== params.created_by);
    const toInsert = initialMembers.map((uid) => ({ group_id: groupId, user_id: uid }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from('group_members').insert(toInsert);
      if (error) console.error('Error adding initial members:', error);

      if (!DEMO_MODE) {
        const creatorName = params.creator_name || 'A friend';
        try {
          const notifs = initialMembers.map((uid) => ({
            user_id: uid,
            actor_id: params.created_by,
            type: 'GROUP_MEMBER_ADDED',
            title: 'Added to Group',
            message: `${creatorName} added you to the new group "${params.name}".`,
            link: `/groups/${groupId}`,
          }));
          await supabase.from('notifications').insert(notifs);

          dispatchPushNotification({
            userIds: initialMembers,
            title: 'Added to Group 👥',
            message: `${creatorName} added you to the new group "${params.name}".`,
            url: `/groups/${groupId}`,
          });
        } catch (notifErr) {
          console.warn('Initial members notification note:', notifErr);
        }
      }
    }
  }

  return groupId;
}

export async function addMemberToGroup(
  groupId: string, 
  userId: string,
  options?: { adderId?: string; adderName?: string; groupName?: string }
): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .insert([{ group_id: groupId, user_id: userId }]);

  if (error && !error.message.includes('duplicate')) {
    throw error;
  }

  if (!DEMO_MODE && options?.adderId && options.adderId !== userId) {
    const adderName = options.adderName || 'A friend';
    const gName = options.groupName || 'a group';
    try {
      await supabase.from('notifications').insert([{
        user_id: userId,
        actor_id: options.adderId,
        type: 'GROUP_MEMBER_ADDED',
        title: 'Added to Group',
        message: `${adderName} added you to the group "${gName}".`,
        link: `/groups/${groupId}`,
      }]);

      dispatchPushNotification({
        userIds: [userId],
        title: 'Added to Group 👥',
        message: `${adderName} added you to the group "${gName}".`,
        url: `/groups/${groupId}`,
      });
    } catch (notifErr) {
      console.warn('Group member push notification dispatch note:', notifErr);
    }
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
        subject: `${params.inviterName} has invited you to Centfolio!`,
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

export async function deleteSettlement(
  settlementId: string,
  activityMetadata?: {
    group_id?: string | null;
    actor_id?: string;
    payer_id?: string;
    payee_id?: string;
    amount?: number;
    payer_name?: string;
    payee_name?: string;
  }
): Promise<void> {
  if (DEMO_MODE) {
    const idx = MOCK_SETTLEMENTS.findIndex((s) => s.id === settlementId);
    if (idx !== -1) {
      MOCK_SETTLEMENTS.splice(idx, 1);
    }
    if (activityMetadata?.group_id) {
      const payerName = activityMetadata.payer_name || (activityMetadata.payer_id ? getProfileById(activityMetadata.payer_id)?.full_name : null) || 'Someone';
      const payeeName = activityMetadata.payee_name || (activityMetadata.payee_id ? getProfileById(activityMetadata.payee_id)?.full_name : null) || 'someone';
      const actor = activityMetadata.actor_id ? getProfileById(activityMetadata.actor_id) : undefined;
      const activity: GroupActivityItem = {
        id: `act-${Date.now()}`,
        group_id: activityMetadata.group_id,
        actor_id: activityMetadata.actor_id || null,
        action_type: 'SETTLEMENT_DELETED',
        description: `Payment from ${payerName} to ${payeeName} was deleted`,
        metadata: {
          settlement_id: settlementId,
          amount: activityMetadata.amount,
          payer_id: activityMetadata.payer_id,
          payee_id: activityMetadata.payee_id,
          payer_name: payerName,
          payee_name: payeeName,
        },
        created_at: new Date().toISOString(),
        actor,
      };
      MOCK_GROUP_ACTIVITIES.unshift(activity);
    }
    return;
  }

  const { error } = await supabase.from('settlements').delete().eq('id', settlementId);
  if (error) throw error;

  if (activityMetadata?.group_id) {
    const payerName = activityMetadata.payer_name || 'Someone';
    const payeeName = activityMetadata.payee_name || 'someone';
    const description = `Payment from ${payerName} to ${payeeName} was deleted`;
    try {
      await supabase.from('group_activities').insert([{
        group_id: activityMetadata.group_id,
        actor_id: activityMetadata.actor_id || null,
        action_type: 'SETTLEMENT_DELETED',
        description,
        metadata: {
          settlement_id: settlementId,
          amount: activityMetadata.amount,
          payer_id: activityMetadata.payer_id,
          payee_id: activityMetadata.payee_id,
          payer_name: payerName,
          payee_name: payeeName,
        }
      }]);
    } catch (actErr) {
      console.warn('Failed to insert group activity for settlement deletion:', actErr);
    }
  }
}

export async function addDirectFriend(
  userId: string, 
  friendId: string, 
  status: 'PENDING' | 'ACCEPTED' = 'ACCEPTED',
  adderName?: string
): Promise<void> {
  if (DEMO_MODE) {
    const { MOCK_USER_FRIENDS } = await import('../../lib/mockData');
    const exists = MOCK_USER_FRIENDS.some(
      f => (f.user_id === userId && f.friend_id === friendId) || (f.user_id === friendId && f.friend_id === userId)
    );
    if (!exists) {
      MOCK_USER_FRIENDS.push({ user_id: userId, friend_id: friendId, status });
    }
    return;
  }

  const { error } = await supabase
    .from('user_friends')
    .upsert([{ user_id: userId, friend_id: friendId, status }]);

  if (error && !error.message.includes('duplicate')) {
    throw error;
  }

  if (!DEMO_MODE && userId !== friendId) {
    const name = adderName || 'A friend';
    try {
      await supabase.from('notifications').insert([{
        user_id: friendId,
        actor_id: userId,
        type: 'FRIEND_ADDED',
        title: 'New Friend Added',
        message: `${name} added you as a friend on Centfolio.`,
        link: '/friends',
      }]);

      dispatchPushNotification({
        userIds: [friendId],
        title: 'New Friend Added 🤝',
        message: `${name} added you as a friend on Centfolio.`,
        url: '/friends',
      });
    } catch (notifErr) {
      console.warn('Friend notification dispatch note:', notifErr);
    }
  }
}

export async function inviteDirectFriend(userId: string, friendId: string, adderName?: string): Promise<void> {
  return addDirectFriend(userId, friendId, 'PENDING', adderName);
}

export async function acceptFriendRequest(userId: string, friendId: string, adderName?: string): Promise<void> {
  return addDirectFriend(userId, friendId, 'ACCEPTED', adderName);
}

