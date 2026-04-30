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

export function HomeIcon({ className, filled }: IconProps) {
  if (filled) {
    return (
      <svg
        aria-hidden="true"
        className={className}
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path
          d="M4.2 10.7 11.2 4.9a1.2 1.2 0 0 1 1.6 0l7 5.8a.8.8 0 0 1-.5 1.4H18v6.8a1 1 0 0 1-1 1h-3.2a1 1 0 0 1-1-1v-3.5h-1.6v3.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-6.8H4.7a.8.8 0 0 1-.5-1.4Z"
          fillRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <Svg className={className}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13V10.5" />
    </Svg>
  );
}

export function CarIcon({ className, filled }: IconProps) {
  if (filled) {
    return (
      <svg
        aria-hidden="true"
        className={className}
        fill="currentColor"
        stroke="none"
        viewBox="0 0 24 24"
      >
        <path d="M7.7 7.7a2.3 2.3 0 0 1 2.1-1.4h4.4a2.3 2.3 0 0 1 2.1 1.4l1.4 3.4h1.1a1.8 1.8 0 0 1 1.8 1.8v3.7a1 1 0 0 1-1 1h-.9a2.3 2.3 0 0 1-4.4 0H9.7a2.3 2.3 0 0 1-4.4 0h-.9a1 1 0 0 1-1-1v-3.7a1.8 1.8 0 0 1 1.8-1.8h1.1Zm1.2 0-1.1 2.7h8.4l-1.1-2.7a.7.7 0 0 0-.7-.5H9.6a.7.7 0 0 0-.7.5Zm-.9 8.6a1 1 0 1 0 0 2.1 1 1 0 0 0 0-2.1Zm8 0a1 1 0 1 0 0 2.1 1 1 0 0 0 0-2.1Z" />
      </svg>
    );
  }

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

export function MessageIcon({ className, filled }: IconProps) {
  if (filled) {
    return (
      <svg
        aria-hidden="true"
        className={className}
        fill="currentColor"
        stroke="none"
        viewBox="0 0 24 24"
      >
        <path d="M5.3 5.8h13.4a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5h-7L6 21.2v-3.4H5.3a2.5 2.5 0 0 1-2.5-2.5v-7a2.5 2.5 0 0 1 2.5-2.5Z" />
      </svg>
    );
  }

  return (
    <Svg className={className}>
      <path d="M5 6.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H11l-4.5 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
    </Svg>
  );
}

export function SparkIcon({ className, filled }: IconProps) {
  if (filled) {
    return (
      <svg
        aria-hidden="true"
        className={className}
        fill="currentColor"
        stroke="none"
        viewBox="0 0 24 24"
      >
        <path d="m11.9 2.6 1.9 5.7 5.7 1.9-5.7 1.9-1.9 5.7-1.9-5.7-5.7-1.9L10 8.3Z" />
        <path d="m18 14.7.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8Z" />
      </svg>
    );
  }

  return (
    <Svg className={className}>
      <path d="m12 2 1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7Z" />
      <path d="m18 15 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7Z" />
    </Svg>
  );
}

export function PlusIcon({ className, filled }: IconProps) {
  if (filled) {
    return (
      <svg
        aria-hidden="true"
        className={className}
        fill="currentColor"
        stroke="none"
        viewBox="0 0 24 24"
      >
        <path d="M12.9 5.2a.9.9 0 1 0-1.8 0V11H5.3a.9.9 0 1 0 0 1.8h5.8v5.9a.9.9 0 1 0 1.8 0v-5.9h5.8a.9.9 0 1 0 0-1.8h-5.8Z" />
      </svg>
    );
  }

  return (
    <Svg className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  );
}

export function BellIcon({ className, filled }: IconProps) {
  if (filled) {
    return (
      <svg
        aria-hidden="true"
        className={className}
        fill="currentColor"
        stroke="none"
        viewBox="0 0 24 24"
      >
        <path d="M12 4.6a4.7 4.7 0 0 0-4.7 4.7v1.2c0 1-.4 2-1.1 2.8L4.7 15a1 1 0 0 0 .8 1.6h13a1 1 0 0 0 .8-1.6l-1.5-1.7a4.3 4.3 0 0 1-1.1-2.8V9.3A4.7 4.7 0 0 0 12 4.6Zm-2 13.6a2 2 0 0 0 4 0Z" />
      </svg>
    );
  }

  return (
    <Svg className={className}>
      <path d="M15.5 18H8.5" />
      <path d="M6 16h12l-1.4-1.8c-.7-.8-1.1-1.8-1.1-2.9V10a3.5 3.5 0 1 0-7 0v1.3c0 1-.4 2.1-1.1 2.9Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function GarageIcon({ className, filled }: IconProps) {
  if (filled) {
    return (
      <svg
        aria-hidden="true"
        className={className}
        fill="currentColor"
        stroke="none"
        viewBox="0 0 24 24"
      >
        <path d="M11.4 4.4a1 1 0 0 1 1.2 0l8 6.2a1 1 0 0 1-.6 1.8h-1v6.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-6.5H4a1 1 0 0 1-.6-1.8ZM9 19h6v-4.2a.8.8 0 0 0-.8-.8H9.8a.8.8 0 0 0-.8.8Z" />
      </svg>
    );
  }

  return (
    <Svg className={className}>
      <path d="M4 10.5 12 4l8 6.5V20H4Z" />
      <path d="M9 20v-5h6v5" />
    </Svg>
  );
}

export function SettingsIcon({ className, filled }: IconProps) {
  if (filled) {
    return (
      <svg
        aria-hidden="true"
        className={className}
        fill="currentColor"
        stroke="none"
        viewBox="0 0 24 24"
      >
        <path d="m9.7 3.9 1.2-.9h2.2l1.2.9 1.9-.1 1.3 2.1-.9 1.7.9 1.6-.9 1.6.9 1.7-1.3 2.1-1.9-.1-1.2.9H10.9l-1.2-.9-1.9.1-1.3-2.1.9-1.7-.9-1.6.9-1.6-.9-1.7 1.3-2.1Zm2.3 3a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2Zm0 2.2a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8Z" />
      </svg>
    );
  }

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
