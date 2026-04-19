import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

export function Card({ className, children, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border bg-white p-5 dark:bg-neutral-900 dark:border-neutral-800",
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
    >
      {children}
    </div>
  );
}
