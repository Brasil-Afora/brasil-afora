"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import useTheme from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

/** Sun/moon switch for the dark default and the academic light theme. */
const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { mounted, theme, toggleTheme } = useTheme();

  if (!mounted) {
    return <span aria-hidden="true" className={cn("h-9 w-9", className)} />;
  }

  const isLight = theme === "light";

  return (
    <button
      aria-label={
        isLight ? "Alternar para o modo escuro" : "Alternar para o modo claro"
      }
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-navy-700 text-slate-100 transition-colors duration-200 hover:border-signal/60 hover:text-signal focus-visible:outline-2 focus-visible:outline-signal",
        className
      )}
      onClick={toggleTheme}
      title={isLight ? "Modo escuro" : "Modo claro"}
      type="button"
    >
      {isLight ? (
        <MoonIcon aria-hidden="true" className="h-[18px] w-[18px]" />
      ) : (
        <SunIcon aria-hidden="true" className="h-[18px] w-[18px]" />
      )}
    </button>
  );
};

export default ThemeToggle;
