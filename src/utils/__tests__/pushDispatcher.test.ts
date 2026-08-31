import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchPushNotification } from '../pushDispatcher';
import { formatCents } from '../currency';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { sent: 1 }, error: null }),
    },
  },
}));

describe('pushDispatcher and currency formatting for notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly formats integer cents into rupees for settlement push messages', async () => {
    const amountCents = 50000; // ₹500.00
    const formattedAmount = formatCents(amountCents, 'INR');
    expect(formattedAmount).toBe('₹500.00');

    const payerName = 'Jaimin Bhatt';
    const message = `${payerName} recorded a payment of ${formattedAmount} to you.`;

    await dispatchPushNotification({
      userIds: ['user-123'],
      title: 'Payment Received 💰',
      message,
      url: '/friends/user-123',
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('send-push', {
      body: {
        user_ids: ['user-123'],
        title: 'Payment Received 💰',
        message: 'Jaimin Bhatt recorded a payment of ₹500.00 to you.',
        url: '/friends/user-123',
        tag: 'centfolio-update',
      },
    });
  });

  it('correctly formats integer cents for expense addition push messages', async () => {
    const totalAmountCents = 27800; // ₹278.00
    const formattedTotal = formatCents(totalAmountCents, 'INR');
    expect(formattedTotal).toBe('₹278.00');

    const message = `An expense "Chole + manchurian" (${formattedTotal}) was added.`;

    await dispatchPushNotification({
      userIds: ['user-456'],
      title: 'New Expense Added',
      message,
      url: '/groups/group-1',
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('send-push', {
      body: {
        user_ids: ['user-456'],
        title: 'New Expense Added',
        message: 'An expense "Chole + manchurian" (₹278.00) was added.',
        url: '/groups/group-1',
        tag: 'centfolio-update',
      },
    });
  });

  it('skips dispatch when userIds array is empty', async () => {
    await dispatchPushNotification({
      userIds: [],
      title: 'Test',
      message: 'Test message',
    });

    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });
});
