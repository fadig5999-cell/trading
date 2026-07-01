import { clsx } from 'clsx';
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-zinc-700">{label}</label>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-900',
            'placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 focus:border-zinc-400',
            'transition-all duration-200',
            error && 'border-red-300 focus:ring-red-200 focus:border-red-400',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-zinc-700">{label}</label>
        )}
        <select
          ref={ref}
          className={clsx(
            'w-full px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-900',
            'focus:outline-none focus:ring-2 focus:ring-zinc-400/30 focus:border-zinc-400',
            'transition-all duration-200',
            className
          )}
          {...props}
        >
          <option value="">הכל</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }
);
Select.displayName = 'Select';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-zinc-700">{label}</label>
        )}
        <textarea
          ref={ref}
          className={clsx(
            'w-full px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-900',
            'placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 focus:border-zinc-400',
            'transition-all duration-200 resize-none',
            className
          )}
          rows={3}
          {...props}
        />
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
