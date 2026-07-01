import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const Label = ({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("mb-1.5 block text-sm font-medium text-chrome-700", className)} {...props} />
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-chrome-300 bg-white px-3.5 py-2.5 text-sm text-chrome-900 shadow-sm outline-none transition placeholder:text-chrome-500 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:bg-chrome-100 disabled:text-chrome-500",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-chrome-300 bg-white px-3.5 py-2.5 text-sm text-chrome-900 shadow-sm outline-none transition placeholder:text-chrome-500 focus:border-accent focus:ring-2 focus:ring-accent/20",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-chrome-300 bg-white px-3.5 py-2.5 text-sm text-chrome-900 shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
