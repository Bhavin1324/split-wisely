import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Card, message } from 'antd';
import { CheckCircle2, XCircle, Users, Receipt, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * JoinGroupPage handles the /join?token=... invitation flow.
 * When a user clicks an invite link (from email), this page:
 * 1. Validates the token against group_invitations table
 * 2. If the user is authenticated, adds them to the group
 * 3. If not authenticated, redirects to login with returnTo
 */
export function JoinGroupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'auth_required'>('loading');
  const [groupName, setGroupName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setStatus('error');
      setErrorMsg('Invalid invitation link. No token provided.');
      return;
    }

    const processInvitation = async () => {
      try {
        // 1. Look up the invitation
        const { data: invitation, error: invErr } = await supabase
          .from('group_invitations')
          .select('*, groups(name)')
          .eq('token', token)
          .single();

        if (invErr || !invitation) {
          setStatus('error');
          setErrorMsg('This invitation link is invalid or has expired.');
          return;
        }

        if (invitation.status === 'accepted') {
          setGroupName((invitation as any).groups?.name ?? 'Group');
          setGroupId(invitation.group_id);
          setStatus('success');
          return;
        }

        // 2. Check if user is logged in
        if (!user) {
          setGroupName((invitation as any).groups?.name ?? 'Group');
          setStatus('auth_required');
          return;
        }

        // 3. Add user to the group
        const { error: memberErr } = await supabase
          .from('group_members')
          .insert([{ group_id: invitation.group_id, user_id: user.id }]);

        if (memberErr && !memberErr.message.includes('duplicate')) {
          throw memberErr;
        }

        // 4. Mark invitation as accepted
        await supabase
          .from('group_invitations')
          .update({ status: 'accepted' })
          .eq('id', invitation.id);

        setGroupName((invitation as any).groups?.name ?? 'Group');
        setGroupId(invitation.group_id);
        setStatus('success');
        messageApi.success(`You've joined "${(invitation as any).groups?.name}"!`);
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err?.message || 'Something went wrong processing your invitation.');
      }
    };

    processInvitation();
  }, [token, user, authLoading, messageApi]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-teal-700 p-4">
      {contextHolder}

      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <Receipt className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SplitWisely</h1>
        </div>

        <Card className="rounded-2xl shadow-2xl">
          {status === 'loading' && (
            <div className="text-center py-12">
              <Spin size="large" />
              <p className="mt-4 text-gray-500">Processing your invitation...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">You're In!</h2>
              <p className="text-gray-500 mb-1">
                You've successfully joined
              </p>
              <p className="text-lg font-semibold text-primary-500 mb-6 flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                {groupName}
              </p>
              <Button
                type="primary"
                size="large"
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="end"
                onClick={() => navigate(groupId ? `/groups/${groupId}` : '/dashboard')}
                className="bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold border-none"
              >
                Go to Group
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation Error</h2>
              <p className="text-gray-500 mb-6">{errorMsg}</p>
              <Button
                type="primary"
                size="large"
                onClick={() => navigate('/dashboard')}
                className="bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold border-none"
              >
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === 'auth_required' && (
            <div className="text-center py-8">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mx-auto mb-4">
                <Users className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Sign In to Join</h2>
              <p className="text-gray-500 mb-2">
                You've been invited to join
              </p>
              <p className="text-lg font-semibold text-primary-500 mb-6">
                {groupName}
              </p>
              <Button
                type="primary"
                size="large"
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="end"
                onClick={() => navigate(`/login?returnTo=${encodeURIComponent(`/join?token=${token}`)}`)}
                className="bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold border-none"
              >
                Sign In to Continue
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
