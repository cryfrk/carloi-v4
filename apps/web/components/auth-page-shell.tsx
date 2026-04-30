'use client';

import Link from 'next/link';

export function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
  backHref = '/login',
  backLabel = 'Geri don',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="auth-screen">
      <section className="auth-card-shell minimal">
        <div className="auth-brand-lockup">
          <div className="auth-logo-mark">C</div>
          <div className="auth-brand-copy">
            <span className="auth-brand-name">Carloi</span>
            <span className="auth-brand-subtitle">Araclar, sosyal akis ve garaj tek yerde</span>
          </div>
        </div>

        <div className="auth-heading-block">
          {eyebrow ? <div className="auth-eyebrow">{eyebrow}</div> : null}
          <h1 className="auth-title">{title}</h1>
          {description ? <p className="auth-description">{description}</p> : null}
        </div>

        <div className="auth-form-stack">{children}</div>

        <Link className="secondary-cta auth-text-link center-link" href={backHref}>
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
    <Link className="secondary-cta auth-text-link" href={href}>
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
