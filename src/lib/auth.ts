import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { admin } from "better-auth/plugins";
import { db } from "@/db/client";
import { env } from "@/lib/env";
import { sendEmail } from "@/mail/client";
import { ResetPasswordTemplate } from "@/mail/templates/reset-password-template";
import { VerificationEmailTemplate } from "@/mail/templates/verification-email-template";

const trustedOrigins = Array.from(
  new Set([env.BETTER_AUTH_URL, ...env.CORS_ORIGIN])
);

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    camelCase: false,
    usePlural: true,
  }),
  advanced: {
    database: {
      generateId: false,
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    password: {
      hash: (password) => hashPassword(password),
      verify: ({ password, hash }) => verifyPassword({ password, hash }),
    },
    sendResetPassword: async ({ url, user }) => {
      await sendEmail({
        to: user.email,
        subject: "Redefinição de senha",
        react: ResetPasswordTemplate({
          url,
          name: user.name,
        }),
      });
    },
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendOnSignUp: true,
    sendOnSignIn: false,
    sendVerificationEmail: async ({ url, user }) => {
      await sendEmail({
        to: user.email,
        subject: "Verifique seu email",
        react: VerificationEmailTemplate({
          url,
          name: user.name,
        }),
      });
    },
  },
  socialProviders: {
    google: {
      enabled: true,
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    cookieCache: {
      enabled: process.env.NODE_ENV === "production",
      maxAge: 60 * 5,
    },
  },
  plugins: [admin()],
});
