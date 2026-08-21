import { useState, useRef } from 'react';
import { Modal, Button, message } from 'antd';
import { Camera, Check, Upload, Trash2 } from 'lucide-react';
import { GROUP_COVER_PRESETS } from '../../utils/groupCover';
import { compressImage } from '../../utils/imageCompression';
import { updateGroupSettings } from '../../hooks/supabase/useMutations';
import { useAppData, DEMO_MODE } from '../../context/AppDataContext';
import type { Group } from '../../types';

interface GroupCoverModalProps {
  open: boolean;
  onClose: () => void;
  group: Group;
}

export function GroupCoverModal({ open, onClose, group }: GroupCoverModalProps) {
  const [selectedCover, setSelectedCover] = useState<string | null>(group.cover_image_url);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const { refetchGroups } = useAppData();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      messageApi.error('Please select an image file');
      return;
    }

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 600,
        quality: 0.82,
        mimeType: 'image/webp',
      });
      setSelectedCover(compressed);
      messageApi.success('Photo ready!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to compress photo';
      messageApi.error(msg);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (DEMO_MODE) {
        group.cover_image_url = selectedCover;
        messageApi.success('Cover photo updated in Demo Mode');
      } else {
        await updateGroupSettings(group.id, { cover_image_url: selectedCover || '' });
        messageApi.success('Cover photo updated!');
      }
      refetchGroups();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update cover photo';
      messageApi.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={480}
        destroyOnClose
        centered
        title={
          <div className="flex items-center gap-2.5 pb-2 border-b border-border-base">
            <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-500">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-base mb-0">Group Cover Photo</h3>
              <p className="text-xs text-text-muted mb-0">Choose a scenic theme or upload your own</p>
            </div>
          </div>
        }
        className="rounded-2xl overflow-hidden"
      >
        <div className="space-y-4 pt-3">
          {/* Live Preview */}
          <div className="relative h-32 w-full rounded-2xl overflow-hidden border border-border-base bg-bg-subtle shadow-inner">
            {selectedCover ? (
              <img
                src={selectedCover}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary-600 to-indigo-600 flex items-center justify-center text-white font-medium text-sm">
                No Cover Image
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Upload Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border-base hover:border-primary-500 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-bg-subtle/50 hover:bg-bg-subtle flex items-center justify-center gap-3"
          >
            <div className="w-9 h-9 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-text-base mb-0">
                Upload from device
              </p>
              <p className="text-[11px] text-text-muted mb-0">
                Compressed to &le; 50 KB WebP
              </p>
            </div>
          </div>

          {/* Presets */}
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-2">
              Preset Themes
            </span>
            <div className="grid grid-cols-3 gap-2">
              {GROUP_COVER_PRESETS.map((preset) => {
                const isSelected = selectedCover === preset.previewUrl;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedCover(preset.previewUrl)}
                    className={`relative h-16 rounded-xl overflow-hidden border-2 transition-all group ${
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
                    <div className="absolute inset-0 bg-black/30 flex items-end p-1.5">
                      <span className="text-[10px] text-white font-bold truncate">
                        {preset.name}
                      </span>
                    </div>
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

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-border-base gap-2">
            <Button
              type="text"
              size="small"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => setSelectedCover(null)}
              className="text-xs text-text-muted hover:text-error-text"
            >
              Remove Cover
            </Button>

            <div className="flex items-center gap-2">
              <Button onClick={onClose} className="rounded-xl">
                Cancel
              </Button>
              <Button
                type="primary"
                loading={isSaving || isCompressing}
                onClick={handleSave}
                className="rounded-xl bg-primary-500 hover:bg-primary-600 font-semibold"
              >
                Save Cover
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
