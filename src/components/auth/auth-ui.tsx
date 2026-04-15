"use client";

import { LoaderCircleIcon } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface AuthInputProps {
  autoComplete?: string;
  errorMessage?: string;
  id: string;
  label: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  registration?: UseFormRegisterReturn;
  required?: boolean;
  rightElement?: ReactNode;
  type: string;
  value?: string;
}

export const AuthInput = ({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  registration,
  errorMessage,
  rightElement,
}: AuthInputProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    registration?.onChange(event);
    onChange?.(event.target.value);
  };

  return (
    <Field className="gap-1">
      <FieldLabel
        className="block font-medium text-slate-300 text-sm"
        htmlFor={id}
      >
        {label}
      </FieldLabel>
      <div className="relative">
        <Input
          {...(value === undefined ? {} : { value })}
          aria-invalid={errorMessage ? true : undefined}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          id={id}
          name={registration?.name}
          onBlur={registration?.onBlur}
          onChange={handleChange}
          placeholder={placeholder}
          ref={registration?.ref}
          required={required}
          type={type}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      <FieldError className="text-red-400">{errorMessage}</FieldError>
    </Field>
  );
};

interface AuthButtonProps {
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  onClick?: () => void;
  type?: "submit" | "button";
  variant?: "primary" | "outline";
}

export const AuthButton = ({
  children,
  isLoading,
  type = "submit",
  onClick,
  variant = "primary",
  className = "",
}: AuthButtonProps) => {
  const base =
    "w-full rounded-lg px-4 py-2.5 font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60";
  const variants = {
    primary: "bg-amber-500 text-slate-950 hover:bg-amber-400",
    outline:
      "border border-slate-700 bg-slate-800 text-white hover:border-slate-500 hover:bg-slate-700",
  };

  return (
    <Button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={isLoading}
      onClick={onClick}
      type={type}
      variant="ghost"
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <LoaderCircleIcon
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
          />
          Aguarde...
        </span>
      ) : (
        children
      )}
    </Button>
  );
};

interface AuthErrorProps {
  message: string | null;
}

export const AuthError = ({ message }: AuthErrorProps) => {
  if (!message) {
    return null;
  }
  return (
    <p className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-2.5 text-red-400 text-sm">
      {message}
    </p>
  );
};

interface AuthSuccessProps {
  message: string | null;
}

export const AuthSuccess = ({ message }: AuthSuccessProps) => {
  if (!message) {
    return null;
  }
  return (
    <p className="rounded-lg border border-green-800 bg-green-900/30 px-4 py-2.5 text-green-400 text-sm">
      {message}
    </p>
  );
};

export const GoogleIcon = () => (
  <svg
    aria-hidden="true"
    className="h-5 w-5"
    viewBox="0 0 533.5 544.3"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M533.5 278.4c0-18.5-1.5-37-4.7-55H272.1v104h147.6c-6.1 33.8-25.2 63.3-53.6 83.2v68h86.6c50.7-46.7 80.8-115.6 80.8-200.2Z"
      fill="#4285F4"
    />
    <path
      d="M272.1 544.3c73.4 0 135.2-24.1 180.3-65.7l-86.6-68c-24.1 16.4-55 25.8-93.7 25.8-71.2 0-131.5-48.1-153.1-112.8H29.5v70.1c46.1 91.5 140.1 150.6 242.6 150.6Z"
      fill="#34A853"
    />
    <path
      d="M119 323.6c-10.9-33.8-10.9-69.9 0-103.7V149.8H29.5c-38.5 76.7-38.5 167.9 0 244.6L119 323.6Z"
      fill="#FBBC04"
    />
    <path
      d="M272.1 107.7c40.9-.6 80.5 14.8 110.7 43.2l82.6-82.6C404.9 22.1 340.8-1.7 272.1 0 169.6 0 75.6 59.1 29.5 150.6l89.5 70.1c21.6-64.7 81.9-113 153.1-113Z"
      fill="#EA4335"
    />
  </svg>
);
