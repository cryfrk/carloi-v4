import type { ReactNode } from 'react';

type IconProps = {
  className?: string;
  filled?: boolean;
};

function Svg({
  className,
  children,
  viewBox = '0 0 24 24',
}: {
  className?: string;
  children: ReactNode;
  viewBox?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox={viewBox}
    >
      {children}
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13V10.5" />
    </Svg>
  );
}

export function CarIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 15.5 6.8 9.7a2 2 0 0 1 1.9-1.4h6.6a2 2 0 0 1 1.9 1.4l1.8 5.8" />
      <path d="M4 15h16" />
      <path d="M6.5 18.5h0" />
      <path d="M17.5 18.5h0" />
      <path d="M5.5 15v4" />
      <path d="M18.5 15v4" />
    </Svg>
  );
}

export function MessageIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 6.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H11l-4.5 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
    </Svg>
  );
}

export function SparkIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m12 2 1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7Z" />
      <path d="m18 15 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7Z" />
    </Svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M15.5 18H8.5" />
      <path d="M6 16h12l-1.4-1.8c-.7-.8-1.1-1.8-1.1-2.9V10a3.5 3.5 0 1 0-7 0v1.3c0 1-.4 2.1-1.1 2.9Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function GarageIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 10.5 12 4l8 6.5V20H4Z" />
      <path d="M9 20v-5h6v5" />
    </Svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" />
      <path d="m4.8 14.6-.9-1.5 1.6-2.8-1.6-2.8.9-1.5 3.2.2 2-1.7h1.8l2 1.7 3.2-.2.9 1.5-1.6 2.8 1.6 2.8-.9 1.5-3.2-.2-2 1.7H11l-2-1.7Z" />
    </Svg>
  );
}

export function HeartIcon({ className, filled }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M12 20.5 4.8 13.7A4.7 4.7 0 0 1 11.5 7l.5.5.5-.5a4.7 4.7 0 0 1 6.7 6.7Z" />
    </svg>
  );
}

export function CommentIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 6.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-5 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
    </Svg>
  );
}

export function ShareIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m21 3-9.5 9.5" />
      <path d="M21 3 14 21l-3.5-7.5L3 10Z" />
    </Svg>
  );
}

export function SaveIcon({ className, filled }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M6.5 4.5h11a1 1 0 0 1 1 1V20l-6.5-4.5L5.5 20V5.5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
