import { useState, useRef } from 'react';
import { Modal, Form, Input, Select, message, Button } from 'antd';
import { Users, Plus, Sparkles, Plane, Home, Heart, Utensils, PartyPopper, Briefcase, Tag, Camera, Check } from 'lucide-react';
import { useAppData, DEMO_MODE } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useFriends } from '../hooks/supabase/useProfileData';
import { createGroupWithMembers } from '../hooks/supabase/useMutations';
import { MOCK_CURRENT_USER, MOCK_GROUPS } from '../lib/mockData';
import { GROUP_COVER_PRESETS } from '../utils/groupCover';
import { compressImage } from '../utils/imageCompression';
import { UserAvatar } from './ui/UserAvatar';

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (groupId: string) => void;
}

const GROUP_TYPES = [
  { id: 'trip', label: 'Trip', icon: Plane, cover: GROUP_COVER_PRESETS[0].previewUrl },
  { id: 'home', label: 'Home', icon: Home, cover: GROUP_COVER_PRESETS[2].previewUrl },
  { id: 'couple', label: 'Couple', icon: Heart, cover: GROUP_COVER_PRESETS[1].previewUrl },
  { id: 'dining', label: 'Dining', icon: Utensils, cover: GROUP_COVER_PRESETS[3].previewUrl },
  { id: 'event', label: 'Event', icon: PartyPopper, cover: GROUP_COVER_PRESETS[4].previewUrl },
  { id: 'work', label: 'Work', icon: Briefcase, cover: GROUP_COVER_PRESETS[5].previewUrl },
  { id: 'other', label: 'Other', icon: Tag, cover: GROUP_COVER_PRESETS[0].previewUrl },
];

export function CreateGroupModal({ open, onClose, onSuccess }: CreateGroupModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('trip');
  const [coverUrl, setCoverUrl] = useState<string | null>(GROUP_COVER_PRESETS[0].previewUrl);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const { user } = useAuth();
  const { currentUser, refetchGroups } = useAppData();
  const userId = currentUser?.id ?? user?.id ?? (DEMO_MODE ? MOCK_CURRENT_USER.id : '');

  const { data: friends } = useFriends(userId);

  const handleTypeChange = (typeId: string) => {
    setSelectedType(typeId);
    const typeObj = GROUP_TYPES.find(t => t.id === typeId);
    if (typeObj) {
      setCoverUrl(typeObj.cover);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      messageApi.error('Please select an image file');
      return;
    }

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file, {
        maxWidth: 1000,
        maxHeight: 500,
        quality: 0.82,
        mimeType: 'image/webp',
      });
      setCoverUrl(compressed);
      messageApi.success('Cover photo uploaded!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process cover image';
      messageApi.error(msg);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (values: { name: string; memberIds?: string[] }) => {
    if (!values.name.trim()) return;
    setLoading(true);

    try {
      if (DEMO_MODE) {
        const newGroup = {
          id: `group-${Date.now()}`,
          name: values.name.trim(),
          cover_image_url: coverUrl,
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
          cover_image_url: coverUrl,
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
        width={520}
        className="rounded-2xl overflow-hidden"
        title={
          <div className="flex items-center gap-3 pb-3 border-b border-border-base">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-base mb-0">Create New Group</h3>
              <p className="text-xs text-text-muted font-normal">Organize shared expenses with friends or roommates</p>
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
          {/* Cover Photo Preview & Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide">
              Group Cover Photo
            </label>
            <div className="relative h-28 w-full rounded-2xl overflow-hidden border border-border-base bg-bg-subtle group">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-primary-600 to-indigo-600 flex items-center justify-center" />
              )}
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="small"
                  icon={<Camera className="w-3.5 h-3.5" />}
                  onClick={() => fileInputRef.current?.click()}
                  loading={isCompressing}
                  className="bg-white/90 text-black border-none font-semibold rounded-lg text-xs"
                >
                  Upload Custom
                </Button>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCoverUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Cover Presets Carousel / Row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
              {GROUP_COVER_PRESETS.map((preset) => {
                const isSelected = coverUrl === preset.previewUrl;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setCoverUrl(preset.previewUrl)}
                    className={`relative w-14 h-9 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                      isSelected
                        ? 'border-primary-500 ring-2 ring-primary-500/30 scale-105'
                        : 'border-border-subtle hover:border-primary-500/50'
                    }`}
                  >
                    <img
                      src={preset.previewUrl}
                      alt={preset.name}
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary-500/40 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              Group Category
            </label>
            <div className="flex flex-wrap gap-2">
              {GROUP_TYPES.map(({ id, label, icon: Icon }) => {
                const isSelected = selectedType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleTypeChange(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-primary-500 text-white shadow-sm font-semibold scale-105'
                        : 'bg-bg-subtle text-text-muted hover:bg-bg-subtle'
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
            label={<span className="font-semibold text-text-base">Group Name</span>}
            name="name"
            rules={[{ required: true, message: 'Please enter a group name' }]}
          >
            <Input
              prefix={<Sparkles className="h-4 w-4 text-primary-500 mr-1" />}
              placeholder="e.g. Miami Trip 2026, Apartment 4B, Office Lunch"
              size="large"
              className="rounded-xl border-border-base hover:border-primary-500 focus:border-primary-500"
            />
          </Form.Item>

          <Form.Item
            label={<span className="font-semibold text-text-base">Add Members (Optional)</span>}
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
                    <UserAvatar user={f} size={24} />
                    <span className="text-sm font-medium text-text-base">{f.full_name}</span>
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
