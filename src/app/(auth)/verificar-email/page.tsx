import { Suspense } from "react";
import VerifyEmailPage from "@/components/auth/verify-email-page";

export default function VerifyEmailRoutePage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPage />
    </Suspense>
  );
}
