const DEFAULT_BACKEND_URL = "http://localhost:3333";
const TRAILING_SLASHES_REGEX = /\/+$/;

const normalizeBaseUrl = (value: string | undefined): string => {
  const normalized = value?.trim();

  if (!normalized) {
    return DEFAULT_BACKEND_URL;
  }

  return normalized.replace(TRAILING_SLASHES_REGEX, "");
};

export const BACKEND_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.BACKEND_URL ??
    process.env.VITE_BACKEND_URL
);

export const buildBackendUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BACKEND_BASE_URL}${normalizedPath}`;
};
