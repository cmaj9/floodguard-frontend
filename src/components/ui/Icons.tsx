import type { SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

const defaultProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": "true" as const,
};

export function CheckCircleIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function AlertTriangleIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function XCircleIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

export function InfoIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export function TrendingUpIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

export function TrendingDownIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  );
}

export function DropletsIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

export function ActivityIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function MapPinIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function ClockIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function RefreshCwIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

export function ShieldCheckIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

export function RadioIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
    </svg>
  );
}

export function BarChart3Icon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export function LineChartIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M3 3v18h18" />
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
    </svg>
  );
}

export function LayersIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function BellIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function UsersIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function UserIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function Building2Icon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}

export function ClipboardListIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}

export function LogOutIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function PlusIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function SearchIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function Edit3Icon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

export function Trash2Icon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function KeyIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M21 2l-2 2m-1.5 1.5L14 9a5 5 0 1 0 3 3l5-5V2h-4.5z" />
    </svg>
  );
}

export function MessageSquareIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function MailIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

export function PhoneIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function SaveIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

export function DownloadIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function BatteryChargingIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
      <line x1="23" y1="13" x2="23" y2="11" />
      <polyline points="11 8 8 12 12 12 9 16" />
    </svg>
  );
}

export function BatteryLowIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
      <line x1="23" y1="13" x2="23" y2="11" />
      <line x1="5" y1="10" x2="5" y2="14" />
    </svg>
  );
}

export function ThermometerIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  );
}

export function RulerIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z" />
      <line x1="14.5" y1="4.5" x2="16.5" y2="6.5" />
      <line x1="11" y1="8" x2="14" y2="11" />
      <line x1="7.5" y1="11.5" x2="9.5" y2="13.5" />
      <line x1="4" y1="15" x2="7" y2="18" />
    </svg>
  );
}

export function WifiIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

export function SettingsIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function ShieldIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function XIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function CheckIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function MapIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

export function TableIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export function FlagIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

export function InboxIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

export function WavesIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </svg>
  );
}

export function GaugeIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function GlobeIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function CompassIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

export function CpuIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}

export function ZapIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function SlidersIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

export function PowerIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}

export function ToggleLeftIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <rect x="1" y="5" width="22" height="14" rx="7" ry="7" />
      <circle cx="8" cy="12" r="3" />
    </svg>
  );
}

export function ToggleRightIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <rect x="1" y="5" width="22" height="14" rx="7" ry="7" />
      <circle cx="16" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

export function EyeIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function MenuIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export function MaximizeIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

export function MinimizeIcon({ size = 18, className = '', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} {...props}>
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  );
}
