import React from 'react';

interface CentfolioLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * CentfolioLogo
 * Pure vector outline representation of the Centfolio ledger book,
 * designed for high contrast on dynamic primary background containers.
 */
export function CentfolioLogo({ className = "w-6 h-6", ...props }: CentfolioLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Top Orange Triangle Tab */}
      <polygon points="21.5,4.5 25,9.5 19.5,9.5" strokeWidth="1.5" />

      {/* Top Ribbon Bookmark with Notched End */}
      <path d="M19.5 7 L19.5 14.5 L21.75 12.5 L24 14.5 L24 7" strokeWidth="1.5" />

      {/* Side Bookmark Tab */}
      <path d="M25 15.5 L27.5 16.8 L25.5 20.2 L23 18.9" strokeWidth="1.5" />

      {/* Main Ledger Outer Spine & Perspective Cover */}
      <path d="M14.5 5.5 L24 10.5 L17.5 26.5 L7.5 21 L14.5 5.5 Z" />

      {/* Page Thickness / Depth Layers */}
      <path d="M7.5 21 L6 20 L13 4.5 L14.5 5.5" />
      <path d="M7.5 21 L8.5 23 L18.5 28.5 L17.5 26.5" />
      <path d="M6 20 L7 22 L8.5 23" />

      {/* Ledger Balance Sheet Header Row */}
      <line x1="13.5" y1="10" x2="21.5" y2="14" strokeWidth="1.4" />
      <line x1="12" y1="13" x2="20" y2="17" strokeWidth="1.4" />

      {/* Vertical Column Divider */}
      <line x1="17" y1="11.8" x2="13.5" y2="20.5" strokeWidth="1.2" />

      {/* Mini Financial Bar Charts & Balance Metrics */}
      <line x1="11.5" y1="16" x2="13.5" y2="17" strokeWidth="1.3" />
      <line x1="10.5" y1="18.5" x2="12.5" y2="19.5" strokeWidth="1.3" />
      <line x1="15.5" y1="18" x2="18.5" y2="19.5" strokeWidth="1.3" />
      <line x1="14.5" y1="20.5" x2="17.5" y2="22" strokeWidth="1.3" />
    </svg>
  );
}
