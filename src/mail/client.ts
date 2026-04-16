import "server-only";

import { Resend } from "resend";
import { env } from "@/lib/env";

const resend = new Resend(env.RESEND_API_KEY);

interface SendEmailParams {
  react: React.ReactNode;
  subject: string;
  to: string;
}

export const sendEmail = async ({
  react,
  subject,
  to,
}: SendEmailParams): Promise<void> => {
  const result = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject,
    react,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
};
