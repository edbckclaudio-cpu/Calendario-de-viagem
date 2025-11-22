"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const variants: Record<string, string> = {
      default:
        "bg-slate-700 text-white hover:bg-slate-800 focus:ring-2 focus:ring-slate-400",
      secondary:
        "bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-2 focus:ring-slate-300",
      ghost:
        "bg-transparent hover:bg-slate-100 text-slate-900 focus:ring-2 focus:ring-slate-300",
      outline:
        "border border-slate-300 bg-white hover:bg-slate-50 text-slate-900",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-400",
    };
    const sizes: Record<string, string> = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-5 py-2.5 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";