import React, { useState } from 'react';
import { Avatar } from 'antd';
import { getUserAvatarUrl, getInitials } from '../../utils/avatar';

interface UserAvatarProps {
  user?: {
    id?: string;
    full_name?: string;
    avatar_url?: string | null;
  } | null;
  size?: number | 'small' | 'default' | 'large';
  className?: string;
  style?: React.CSSProperties;
  fallbackToInitials?: boolean;
}

export function UserAvatar({
  user,
  size = 40,
  className = '',
  style = {},
  fallbackToInitials = false,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const avatarUrl = !hasError ? getUserAvatarUrl(user) : null;
  const initials = getInitials(user?.full_name);

  // Deterministic fallback color for initials
  const getBackgroundColor = (name?: string) => {
    const colors = [
      '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
      '#ef4444', '#ec4899', '#14b8a6', '#6366f1',
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (!avatarUrl || fallbackToInitials) {
    return (
      <Avatar
        size={size}
        className={`font-semibold shrink-0 select-none ${className}`}
        style={{
          backgroundColor: getBackgroundColor(user?.full_name),
          color: '#ffffff',
          ...style,
        }}
      >
        {initials}
      </Avatar>
    );
  }

  return (
    <Avatar
      size={size}
      src={avatarUrl}
      onError={() => {
        setHasError(true);
        return false;
      }}
      className={`shrink-0 select-none bg-bg-subtle border border-border-subtle ${className}`}
      style={style}
    >
      {initials}
    </Avatar>
  );
}
