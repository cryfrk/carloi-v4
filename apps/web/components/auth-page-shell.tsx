'use client';

import Link from 'next/link';

export function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
  backHref = '/login',
  backLabel = 'Giris ekranina don',
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="auth-layout">
      <section className="auth-splash">
        <div className="hero-kicker">{eyebrow}</div>
        <h1 className="hero-title auth-title">{title}</h1>
        <p className="hero-description">{description}</p>
      </section>
      <section className="auth-card-shell">
        {children}
        <Link className="secondary-cta center-link" href={backHref}>
          {backLabel}
        </Link>
      </section>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  placeholder: string;
}) {
  return (
    <label className="input-label">
      <span>{label}</span>
      <input
        className="text-input"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function PrimaryCta({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button className="primary-cta" type="button" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}

export function SecondaryCta({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  return (
    <Link className="secondary-cta" href={href}>
      {label}
    </Link>
  );
}

export function ChoiceToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`choice-toggle${active ? ' active' : ''}`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function FormMessage({
  tone = 'neutral',
  message,
}: {
  tone?: 'neutral' | 'error' | 'success';
  message: string;
}) {
  return <div className={`auth-message ${tone}`}>{message}</div>;
}
