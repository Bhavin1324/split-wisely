import { useState, useRef, useMemo } from 'react';
import { Modal, Button, Segmented, message, Spin } from 'antd';
import { Upload, Dices, Trash2, Camera, Check } from 'lucide-react';
import { compressImage } from '../../utils/imageCompression';
import { 
  CARTOON_AVATAR_PRESETS, 
  CHARACTER_SUBCATEGORIES,
  getRandomCartoonAvatarUrl, 
  getUserAvatarUrl,
  type CharacterSubCategory
} from '../../utils/avatar';
import type { Profile } from '../../types';

interface AvatarPickerModalProps {
  open: boolean;
  onClose: () => void;
  currentUser: Profile;
  onSave: (avatarUrl: string | null) => Promise<void>;
}

export function AvatarPickerModal({
  open,
  onClose,
  currentUser,
  onSave,
}: AvatarPickerModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'cartoons'>('cartoons');
  const [selectedSubCategory, setSelectedSubCategory] = useState<CharacterSubCategory>('all');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(
    currentUser.avatar_url || getUserAvatarUrl(currentUser)
  );
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const filteredPresets = useMemo(() => {
    if (selectedSubCategory === 'all') {
      return CARTOON_AVATAR_PRESETS;
    }
    return CARTOON_AVATAR_PRESETS.filter((p) => p.category === selectedSubCategory);
  }, [selectedSubCategory]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      messageApi.error('Please upload an image file (PNG, JPG, WebP)');
      return;
    }

    // Limit upload source file to 10MB before compression
    if (file.size > 10 * 1024 * 1024) {
      messageApi.error('Image is too large. Please select an image under 10MB.');
      return;
    }

    setIsCompressing(true);
    try {
      const compressedDataUrl = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.82,
        mimeType: 'image/webp',
      });
      setSelectedAvatar(compressedDataUrl);
      messageApi.success('Photo compressed successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to compress image';
      messageApi.error(msg);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRollRandomCartoon = () => {
    const randomUrl = getRandomCartoonAvatarUrl(selectedSubCategory);
    setSelectedAvatar(randomUrl);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      await onSave(selectedAvatar);
      messageApi.success('Avatar updated successfully!');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update avatar';
      messageApi.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    const defaultUrl = getUserAvatarUrl({ id: currentUser.id, full_name: currentUser.full_name, avatar_url: null });
    setSelectedAvatar(defaultUrl);
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={560}
        destroyOnClose
        centered
        title={
          <div className="flex items-center gap-2.5 pb-2 border-b border-border-base">
            <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-500">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-base mb-0">Choose Profile Photo</h3>
              <p className="text-xs text-text-muted mb-0">Select from curated Character presets or upload your own</p>
            </div>
          </div>
        }
        className="rounded-2xl overflow-hidden"
      >
        <div className="space-y-4 pt-2">
          {/* Current Avatar Preview */}
          <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-bg-subtle border border-border-subtle">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary-500 shadow-md bg-bg-surface flex items-center justify-center">
                {isCompressing ? (
                  <Spin size="small" />
                ) : selectedAvatar ? (
                  <img
                    src={selectedAvatar}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-primary-500">
                    {currentUser.full_name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
            </div>
            <p className="text-[11px] text-text-muted mt-1.5 mb-0 font-medium">
              Live Preview
            </p>
          </div>

          {/* Mode Switcher */}
          <Segmented
            block
            value={activeTab}
            onChange={(val) => setActiveTab(val as 'upload' | 'cartoons')}
            options={[
              {
                label: (
                  <span className={`px-2 py-0.5 font-semibold text-xs transition-colors ${activeTab === 'cartoons' ? 'text-primary-500 font-bold' : 'text-text-muted'}`}>
                    Avatars ({CARTOON_AVATAR_PRESETS.length})
                  </span>
                ),
                value: 'cartoons',
              },
              {
                label: (
                  <span className={`px-2 py-0.5 font-semibold text-xs transition-colors ${activeTab === 'upload' ? 'text-primary-500 font-bold' : 'text-text-muted'}`}>
                    Photo
                  </span>
                ),
                value: 'upload',
              },
            ]}
            className="w-full bg-bg-subtle p-1 rounded-xl border border-border-subtle"
          />

          {activeTab === 'cartoons' ? (
            <div className="space-y-2.5 mt-2">
              {/* Category Pills Header & Randomizer */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Filter Category
                </span>
                <Button
                  type="text"
                  icon={<Dices className="w-4 h-4 text-primary-500" />}
                  onClick={handleRollRandomCartoon}
                  className="text-xs font-semibold text-primary-500 hover:text-primary-600 hover:bg-primary-500/10 rounded-lg"
                >
                  🎲 Roll Random
                </Button>
              </div>

              {/* Sub-Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none">
                {CHARACTER_SUBCATEGORIES.map((cat) => {
                  const isSelected = selectedSubCategory === cat.id;
                  const count = cat.id === 'all' 
                    ? CARTOON_AVATAR_PRESETS.length 
                    : CARTOON_AVATAR_PRESETS.filter(p => p.category === cat.id).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedSubCategory(cat.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary-500 text-white shadow-sm scale-102'
                          : 'bg-bg-subtle text-text-muted hover:text-text-base hover:bg-bg-surface border border-border-subtle'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-bg-base text-text-muted'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Preset Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-56 overflow-y-auto p-1 border border-border-subtle rounded-xl bg-bg-surface/50">
                {filteredPresets.map((preset) => {
                  const isSelected = selectedAvatar === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.name}
                      aria-label={preset.name}
                      onClick={() => setSelectedAvatar(preset.url)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 p-1 bg-bg-surface flex flex-col items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'border-primary-500 shadow-md ring-2 ring-primary-500/30'
                          : 'border-border-subtle hover:border-primary-500/50'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-contain rounded-lg"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-primary-500 text-white rounded-full flex items-center justify-center shadow">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border-base hover:border-primary-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-bg-subtle/50 hover:bg-bg-subtle flex flex-col items-center justify-center gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-base mb-0.5">
                    Click to browse or drop an image
                  </p>
                  <p className="text-xs text-text-muted mb-0">
                    PNG, JPG, WebP · Automatically compressed to &le; 25 KB
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-border-base gap-2">
            <Button
              type="text"
              size="small"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={handleResetDefault}
              className="text-xs text-text-muted hover:text-error-text"
            >
              Reset Default
            </Button>

            <div className="flex items-center gap-2">
              <Button onClick={onClose} className="rounded-xl">
                Cancel
              </Button>
              <Button
                type="primary"
                loading={isSaving}
                onClick={handleConfirmSave}
                className="rounded-xl bg-primary-500 hover:bg-primary-600 font-semibold"
              >
                Save Photo
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
