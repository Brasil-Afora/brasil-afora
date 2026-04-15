import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    process.env.VITE_BACKEND_URL ??
    "http://localhost:3333",
  basePath: "/auth",
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
