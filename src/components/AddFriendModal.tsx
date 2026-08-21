import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Button } from 'antd';
import { UserPlus, Search, CheckCircle2 } from 'lucide-react';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { getStoredCurrency } from '../utils/currency';
import { addMemberToGroup, createGroupInvitation, createAppInvitation, addDirectFriend } from '../hooks/supabase/useMutations';
import { searchProfiles } from '../hooks/supabase/useProfileData';
import { MOCK_PROFILES, MOCK_GROUP_MEMBERS, MOCK_USER_FRIENDS } from '../lib/mockData';
import type { Profile } from '../types';
import { UserAvatar } from './ui/UserAvatar';

interface AddFriendModalProps {
  open: boolean;
  onClose: () => void;
  defaultGroupId?: string;
  onSuccess?: () => void;
}

export function AddFriendModal({ open, onClose, defaultGroupId, onSuccess }: AddFriendModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const { groups, refetchGroups, currentUser } = useAppData();
  const { user } = useAuth();
  const currentUserId = currentUser?.id ?? user?.id ?? 'current-user';

  const handleInputChange = async (value: string) => {
    if (!value || value.trim().length < 2) {
      setMatchedProfile(null);
      return;
    }

    if (DEMO_MODE) {
      const match = MOCK_PROFILES.find(
        (p) =>
          p.full_name.toLowerCase().includes(value.toLowerCase()) ||
          p.id.toLowerCase().includes(value.toLowerCase()),
      );
      setMatchedProfile(match || null);
    } else {
      setSearching(true);
      try {
        const matches = await searchProfiles(value.trim());
        setMatchedProfile(matches.length > 0 ? matches[0] : null);
      } catch {
        setMatchedProfile(null);
      } finally {
        setSearching(false);
      }
    }
  };

  useEffect(() => {
    if (!open) {
      setMatchedProfile(null);
      form.resetFields();
    }
  }, [open, form]);

  const handleSubmit = async (values: { emailOrName: string; groupId?: string }) => {
    if (!values.emailOrName.trim()) return;
    setLoading(true);

    try {
      if (DEMO_MODE) {
        const targetGroup = values.groupId || defaultGroupId;
        const profileToAdd = matchedProfile || {
          id: `user-${Date.now()}`,
          full_name: values.emailOrName.includes('@') ? values.emailOrName.split('@')[0] : values.emailOrName,
          avatar_url: null,
          default_currency: getStoredCurrency(),
          created_at: new Date().toISOString(),
        };
        
        if (!MOCK_PROFILES.some((p) => p.id === profileToAdd.id)) {
          MOCK_PROFILES.push(profileToAdd);
        }

        if (targetGroup) {
          const existingMember = MOCK_GROUP_MEMBERS.find(
            (gm) => gm.group_id === targetGroup && gm.user_id === profileToAdd.id,
          );

          if (!existingMember) {
            MOCK_GROUP_MEMBERS.push({
              group_id: targetGroup,
              user_id: profileToAdd.id,
              joined_at: new Date().toISOString(),
              profile: profileToAdd,
            });
          }
        } else {
          // Direct friend in demo mode
          MOCK_USER_FRIENDS.push({ user_id: currentUserId, friend_id: profileToAdd.id });
        }
        messageApi.success(`Invited ${matchedProfile?.full_name || values.emailOrName} successfully!`);
        refetchGroups();
        form.resetFields();
        setMatchedProfile(null);
        onClose();
        if (onSuccess) onSuccess();
      } else {
        const matches = matchedProfile ? [matchedProfile] : await searchProfiles(values.emailOrName);
        const targetGroup = values.groupId || defaultGroupId;

        if (matches.length > 0 && targetGroup) {
          await addMemberToGroup(targetGroup, matches[0].id);
          messageApi.success(`Added ${matches[0].full_name} to the group!`);
        } else if (matches.length > 0 && !targetGroup) {
          // Added as a general friend (not in a specific group yet)
          await addDirectFriend(currentUserId, matches[0].id);
          messageApi.success(`Added ${matches[0].full_name} as a friend!`);
        } else {
          // No user found. Before inviting, we must ensure the input is a valid email address.
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(values.emailOrName)) {
             messageApi.error("No user found. Please enter a valid email address to send an invite.");
             setLoading(false);
             return;
          }

          if (!targetGroup) {
            // General app invite
            const result = await createAppInvitation({
              email: values.emailOrName,
              inviterName: currentUser?.full_name || 'A friend',
            });
            try { await navigator.clipboard.writeText(result.joinUrl); } catch { /* clipboard may fail in some envs */ }
            messageApi.success(`App invitation sent! Join link copied to clipboard.`);
          } else {
            // Group invite
            const result = await createGroupInvitation({
              groupId: targetGroup,
              email: values.emailOrName,
              invitedBy: currentUserId,
            });
            try { await navigator.clipboard.writeText(result.joinUrl); } catch { /* clipboard may fail in some envs */ }
            messageApi.success(`Group invitation sent! Join link copied to clipboard.`);
          }
        }
        refetchGroups();
        form.resetFields();
        setMatchedProfile(null);
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add friend';
      messageApi.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        destroyOnClose
        centered
        width={480}
        className="rounded-2xl overflow-hidden"
        title={
          <div className="flex items-center gap-3 pb-3 border-b border-border-base">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-base mb-0">Add / Invite Friend</h3>
              <p className="text-xs text-text-muted font-normal">Connect with friends by name or email address</p>
            </div>
          </div>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ groupId: defaultGroupId }}
          className="mt-4 space-y-4"
        >
          <Form.Item
            label={<span className="font-semibold text-gray-700">Friend's Email or Name</span>}
            name="emailOrName"
            rules={[{ required: true, message: 'Please enter an email or name' }]}
          >
            <Input
              prefix={<Search className="h-4 w-4 text-primary-500 mr-1" />}
              placeholder="e.g. sarah@example.com or Sarah Chen"
              size="large"
              className="rounded-xl border-border-base hover:border-primary-500 focus:border-primary-500"
              onChange={(e) => handleInputChange(e.target.value)}
            />
          </Form.Item>

          {/* Matched Profile Preview */}
          {matchedProfile && (
            <div className="p-3 bg-bg-base rounded-xl border border-primary-200/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar user={matchedProfile} size={36} />
                <div>
                  <div className="text-sm font-bold text-text-base">{matchedProfile.full_name}</div>
                  <div className="text-xs text-primary-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Registered SplitWisely User
                  </div>
                </div>
              </div>
            </div>
          )}

          <Form.Item
            label={<span className="font-semibold text-gray-700">Add to Group (Optional)</span>}
            name="groupId"
          >
            <Select
              placeholder="Select a group to add friend to"
              size="large"
              className="rounded-xl"
              allowClear
              optionLabelProp="label"
              options={(groups || []).map((g) => ({
                label: g.name,
                value: g.id,
                children: (
                  <div className="flex items-center gap-2 py-0.5">
                    <div className="w-5 h-5 rounded bg-primary-500/20 text-primary-700 text-xs font-bold flex items-center justify-center">
                      {g.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium">{g.name}</span>
                  </div>
                ),
              }))}
            />
          </Form.Item>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-base">
            <Button size="large" onClick={onClose} className="rounded-xl text-text-muted">
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading || searching}
              size="large"
              icon={<UserPlus className="h-4 w-4" />}
              className="bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold border-none text-white shadow-sm"
            >
              {matchedProfile ? 'Add Friend' : 'Send Invite'}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}

