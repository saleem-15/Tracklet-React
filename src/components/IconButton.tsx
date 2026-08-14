import React from 'react';
import { Trash2, Copy, Mail, Check, X, LucideIcon } from 'lucide-react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  variant?: 'default' | 'danger' | 'primary' | 'subtle';
  size?: 'sm' | 'md';
  title?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  variant = 'default',
  size = 'sm',
  title,
  className = '',
  onClick,
  disabled,
  ...props
}) => {
  const variantStyles = {
    default: 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100',
    primary: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 active:bg-blue-100',
    danger: 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100',
    subtle: 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200',
  };

  const sizeStyles = {
    sm: 'p-1.5 rounded-lg',
    md: 'p-2 rounded-xl',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      <Icon className={iconSizes[size]} />
    </button>
  );
};

export interface DeleteIconButtonProps extends Omit<IconButtonProps, 'icon' | 'variant'> {}

export const DeleteIconButton: React.FC<DeleteIconButtonProps> = (props) => (
  <IconButton icon={Trash2} variant="danger" size="sm" {...props} />
);

export interface CloseIconButtonProps extends Omit<IconButtonProps, 'icon'> {}

export const CloseIconButton: React.FC<CloseIconButtonProps> = ({
  title = 'Close (Esc)',
  size = 'md',
  variant = 'subtle',
  className = '',
  ...props
}) => (
  <IconButton
    icon={X}
    variant={variant}
    size={size}
    title={title}
    className={`hover:bg-slate-200/70 hover:text-slate-900 ${className}`}
    {...props}
  />
);

export interface CopyIconButtonProps extends Omit<IconButtonProps, 'icon'> {
  isCopied?: boolean;
}

export const CopyIconButton: React.FC<CopyIconButtonProps> = ({
  isCopied = false,
  title = isCopied ? 'Copied' : 'Copy',
  variant = isCopied ? 'primary' : 'default',
  size = 'sm',
  ...props
}) => (
  <IconButton
    icon={isCopied ? Check : Copy}
    variant={variant}
    size={size}
    title={title}
    className={isCopied ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50' : props.className}
    {...props}
  />
);

export interface EmailIconButtonProps extends Omit<IconButtonProps, 'icon'> {
  email: string;
}

export const EmailIconButton: React.FC<EmailIconButtonProps> = ({
  email,
  title = `Send email to ${email}`,
  size = 'sm',
  className = '',
}) => (
  <a
    href={`mailto:${email}`}
    target="_blank"
    rel="noopener noreferrer"
    title={title}
    aria-label={title}
    className={`inline-flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-lg ${
      size === 'md' ? 'p-2' : 'p-1.5'
    } ${className}`}
  >
    <Mail className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
  </a>
);
