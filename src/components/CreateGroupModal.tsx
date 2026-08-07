import { useState } from 'react';
import { Modal, Form, Input, Select, message, Button, Avatar } from 'antd';
import { Users, Plus, Sparkles, Plane, Home, Heart, Utensils, PartyPopper, Briefcase, Tag } from 'lucide-react';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../hooks/supabase/useProfileData';
import { createGroupWithMembers } from '../hooks/supabase/useMutations';
import { MOCK_CURRENT_USER, MOCK_GROUPS } from '../lib/mockData';

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (groupId: string) => void;
}

const GROUP_TYPES = [
  { id: 'trip', label: 'Trip', icon: Plane, color: 'bg-primary-50 text-primary-600 border-primary-200' },
  { id: 'home', label: 'Home', icon: Home, color: 'bg-primary-50 text-primary-600 border-primary-200' },
  { id: 'couple', label: 'Couple', icon: Heart, color: 'bg-primary-50 text-primary-600 border-primary-200' },
  { id: 'dining', label: 'Dining', icon: Utensils, color: 'bg-primary-50 text-primary-600 border-primary-200' },
  { id: 'event', label: 'Event', icon: PartyPopper, color: 'bg-primary-50 text-primary-600 border-primary-200' },
  { id: 'work', label: 'Work', icon: Briefcase, color: 'bg-primary-50 text-primary-600 border-primary-200' },
  { id: 'other', label: 'Other', icon: Tag, color: 'bg-primary-50 text-primary-600 border-primary-200' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function CreateGroupModal({ open, onClose, onSuccess }: CreateGroupModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('trip');
  const [messageApi, contextHolder] = message.useMessage();

  const { user } = useAuth();
  const { currentUser, refetchGroups } = useAppData();
  const userId = currentUser?.id ?? user?.id ?? (DEMO_MODE ? MOCK_CURRENT_USER.id : '');

  const { data: friends } = useFriends(userId);

  const handleSubmit = async (values: { name: string; memberIds?: string[] }) => {
    if (!values.name.trim()) return;
    setLoading(true);

    try {
      if (DEMO_MODE) {
        const newGroup = {
          id: `group-${Date.now()}`,
          name: values.name.trim(),
          cover_image_url: null,
          created_by: userId,
          created_at: new Date().toISOString(),
          member_count: (values.memberIds?.length ?? 0) + 1,
        };
        MOCK_GROUPS.push(newGroup);
        messageApi.success(`Group "${values.name}" created successfully!`);
        refetchGroups();
        form.resetFields();
        onClose();
        if (onSuccess) onSuccess(newGroup.id);
      } else {
        const groupId = await createGroupWithMembers({
          name: values.name.trim(),
          created_by: userId,
          member_user_ids: values.memberIds ?? [],
        });
        messageApi.success(`Group "${values.name}" created successfully!`);
        refetchGroups();
        form.resetFields();
        onClose();
        if (onSuccess) onSuccess(groupId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create group';
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
        width={500}
        className="rounded-2xl overflow-hidden"
        title={
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-0">Create New Group</h3>
              <p className="text-xs text-gray-400 font-normal">Organize shared expenses with friends or roommates</p>
            </div>
          </div>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mt-4 space-y-4"
        >
          {/* Group Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Group Type
            </label>
            <div className="flex flex-wrap gap-2">
              {GROUP_TYPES.map(({ id, label, icon: Icon }) => {
                const isSelected = selectedType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedType(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-primary-500 text-white shadow-sm font-semibold scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Form.Item
            label={<span className="font-semibold text-gray-700">Group Name</span>}
            name="name"
            rules={[{ required: true, message: 'Please enter a group name' }]}
          >
            <Input
              prefix={<Sparkles className="h-4 w-4 text-primary-500 mr-1" />}
              placeholder="e.g. Miami Trip 2026, Apartment 4B, Office Lunch"
              size="large"
              className="rounded-xl border-gray-200 hover:border-primary-500 focus:border-primary-500"
            />
          </Form.Item>

          <Form.Item
            label={<span className="font-semibold text-gray-700">Add Members (Optional)</span>}
            name="memberIds"
          >
            <Select
              mode="multiple"
              placeholder="Select friends to invite to this group"
              size="large"
              className="rounded-xl"
              optionLabelProp="label"
              options={(friends || []).map((f) => ({
                label: f.full_name,
                value: f.id,
                children: (
                  <div className="flex items-center gap-2 py-0.5">
                    <Avatar size={24} style={{ backgroundColor: 'var(--color-primary-500)' }}>
                      {getInitials(f.full_name)}
                    </Avatar>
                    <span className="text-sm font-medium text-gray-800">{f.full_name}</span>
                  </div>
                ),
              }))}
            />
          </Form.Item>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button size="large" onClick={onClose} className="rounded-xl text-gray-600">
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              icon={<Plus className="h-4 w-4" />}
              className="bg-primary-500 hover:bg-primary-600 rounded-xl font-semibold border-none text-white shadow-sm"
            >
              Create Group
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}

