import { cn } from "@/lib/utils";
import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-chrome-900 text-white hover:bg-chrome-800 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_6px_16px_-6px_rgba(20,20,25,0.45)] border border-chrome-900",
  secondary:
    "bg-accent text-white hover:bg-accent-dark shadow-[0_6px_16px_-6px_rgba(166,138,82,0.55)] border border-accent-dark/40",
  outline:
    "bg-white text-chrome-800 border border-chrome-300 hover:bg-chrome-100 shadow-sm",
  ghost: "bg-transparent text-chrome-700 hover:bg-chrome-200",
  danger:
    "bg-white text-danger border border-danger/30 hover:bg-danger/5",
  success:
    "bg-success text-white hover:brightness-105 shadow-[0_6px_16px_-6px_rgba(15,157,88,0.5)]",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5 rounded-lg",
  md: "text-sm px-4 py-2.5 gap-2 rounded-xl",
  lg: "text-base px-6 py-3 gap-2 rounded-xl",
  icon: "p-2.5 rounded-lg",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children?: ReactNode;
  fullWidth?: boolean;
}

interface ButtonProps
  extends CommonProps,
    ButtonHTMLAttributes<HTMLButtonElement> {
  href?: undefined;
}

interface LinkButtonProps extends CommonProps {
  href: string;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  fullWidth,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] whitespace-nowrap",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  fullWidth,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] whitespace-nowrap",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
    >
      {children}
    </Link>
  );
}
