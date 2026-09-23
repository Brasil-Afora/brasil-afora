import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import SignInPage from "./sign-in-page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/auth-client", () => ({ signIn: {} }));
vi.mock("./auth-layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

it("renders login on the server without a browser window", () => {
  expect(renderToString(createElement(SignInPage))).toContain(
    "Entrar com Google"
  );
});
