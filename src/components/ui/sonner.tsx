"use client";

import { Toaster as Sonner } from "sonner";

function Toaster() {
  return (
    <Sonner
      closeButton
      position="top-right"
      toastOptions={{
        className: "border border-slate-950 bg-slate-900 text-white",
        duration: 3000,
      }}
    />
  );
}

export { Toaster };
