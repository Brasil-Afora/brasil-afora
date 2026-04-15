import { Suspense } from "react";
import ResetPasswordPage from "@/components/auth/reset-password-page";

export default function ResetPasswordRoutePage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPage />
    </Suspense>
  );
}
