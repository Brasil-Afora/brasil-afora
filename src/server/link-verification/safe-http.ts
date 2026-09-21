import "server-only";

import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

const DEFAULT_MAX_BYTES = 512 * 1024;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT_MS = 10_000;
const TRAILING_DOT_PATTERN = /\.$/;
const ALLOWED_PORTS = new Set(["", "80", "443"]);
const BLOCKED_HOST_SUFFIXES = [
  ".internal",
  ".intranet",
  ".lan",
  ".local",
  ".localhost",
  ".test",
];

const blockedAddresses = new BlockList();
for (const [network, prefix, family] of [
  ["0.0.0.0", 8, "ipv4"],
  ["10.0.0.0", 8, "ipv4"],
  ["100.64.0.0", 10, "ipv4"],
  ["127.0.0.0", 8, "ipv4"],
  ["169.254.0.0", 16, "ipv4"],
  ["172.16.0.0", 12, "ipv4"],
  ["192.0.0.0", 24, "ipv4"],
  ["192.0.2.0", 24, "ipv4"],
  ["192.168.0.0", 16, "ipv4"],
  ["198.18.0.0", 15, "ipv4"],
  ["198.51.100.0", 24, "ipv4"],
  ["203.0.113.0", 24, "ipv4"],
  ["224.0.0.0", 4, "ipv4"],
  ["240.0.0.0", 4, "ipv4"],
  ["::", 128, "ipv6"],
  ["::1", 128, "ipv6"],
  ["64:ff9b::", 96, "ipv6"],
  ["100::", 64, "ipv6"],
  ["2001:2::", 48, "ipv6"],
  ["2001:10::", 28, "ipv6"],
  ["2001:db8::", 32, "ipv6"],
  ["fc00::", 7, "ipv6"],
  ["fe80::", 10, "ipv6"],
  ["ff00::", 8, "ipv6"],
] as const) {
  blockedAddresses.addSubnet(network, prefix, family);
}

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

export interface SafeHttpResponse {
  body: string;
  finalUrl: string;
  headers: Record<string, string>;
  redirectChain: string[];
  status: number;
}

interface PinnedHttpResponse {
  body: string;
  headers: Record<string, string>;
  status: number;
}

export interface SafeHttpOptions {
  maxBytes?: number;
  maxRedirects?: number;
  /** Socket idle limit. */
  timeoutMs?: number;
  /** Hard limit on one whole request; defaults to twice the idle limit. */
  totalTimeoutMs?: number;
}

export interface SafeHttpDependencies {
  requestPinned?: (
    url: URL,
    address: ResolvedAddress,
    options: Required<SafeHttpOptions>
  ) => Promise<PinnedHttpResponse>;
  resolveHost?: (hostname: string) => Promise<ResolvedAddress[]>;
}

export class SafeHttpError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SafeHttpError";
    this.code = code;
  }
}

const normalizeOptions = (
  options: SafeHttpOptions
): Required<SafeHttpOptions> => ({
  maxBytes: options.maxBytes ?? DEFAULT_MAX_BYTES,
  maxRedirects: options.maxRedirects ?? DEFAULT_MAX_REDIRECTS,
  timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  totalTimeoutMs:
    options.totalTimeoutMs ?? 2 * (options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
});

const assertSafeUrl = (value: string): URL => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SafeHttpError("INVALID_URL", "The link is not a valid URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new SafeHttpError(
      "UNSAFE_PROTOCOL",
      "Only HTTP and HTTPS links may be checked."
    );
  }
  if (url.username || url.password) {
    throw new SafeHttpError(
      "URL_CREDENTIALS_BLOCKED",
      "Links containing credentials are not allowed."
    );
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new SafeHttpError(
      "UNSAFE_PORT",
      "Only standard HTTP and HTTPS ports are allowed."
    );
  }
  const hostname = url.hostname.toLowerCase().replace(TRAILING_DOT_PATTERN, "");
  if (
    hostname === "localhost" ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new SafeHttpError(
      "PRIVATE_HOST_BLOCKED",
      "Private or local hostnames are not allowed."
    );
  }
  return url;
};

export const isPublicAddress = (value: string): boolean => {
  const family = isIP(value);
  if (family === 0) {
    return false;
  }
  if (family === 6 && value.toLowerCase().startsWith("::ffff:")) {
    return false;
  }
  return !blockedAddresses.check(value, family === 4 ? "ipv4" : "ipv6");
};

const defaultResolveHost = async (
  hostname: string
): Promise<ResolvedAddress[]> => {
  const directFamily = isIP(hostname);
  if (directFamily !== 0) {
    return [
      {
        address: hostname,
        family: directFamily === 6 ? 6 : 4,
      },
    ];
  }
  const addresses = await dnsLookup(hostname, {
    all: true,
    verbatim: true,
  });
  return addresses.map((entry) => ({
    address: entry.address,
    family: entry.family === 6 ? 6 : 4,
  }));
};

const headerRecord = (
  headers: NodeJS.Dict<string | string[]>
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers).flatMap(([name, value]) => {
      if (value === undefined) {
        return [];
      }
      return [
        [name.toLowerCase(), Array.isArray(value) ? value.join(", ") : value],
      ];
    })
  );

const defaultPinnedRequest = (
  url: URL,
  address: ResolvedAddress,
  options: Required<SafeHttpOptions>
): Promise<PinnedHttpResponse> =>
  new Promise((resolve, reject) => {
    const pinnedLookup: LookupFunction = (
      _hostname,
      lookupOptions,
      callback
    ) => {
      if (
        typeof lookupOptions === "object" &&
        "all" in lookupOptions &&
        lookupOptions.all
      ) {
        (
          callback as unknown as (
            error: NodeJS.ErrnoException | null,
            addresses: ResolvedAddress[]
          ) => void
        )(null, [address]);
        return;
      }
      (
        callback as unknown as (
          error: NodeJS.ErrnoException | null,
          resolvedAddress: string,
          family: number
        ) => void
      )(null, address.address, address.family);
    };
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        headers: {
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
          "Cache-Control": "no-cache",
          "User-Agent":
            "BrasilAforaBot/1.0 (+https://brasilafora.com.br/crawler-policy)",
        },
        lookup: pinnedLookup,
        method: "GET",
      },
      (response) => {
        const chunks: Buffer[] = [];
        let receivedBytes = 0;
        response.on("data", (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          receivedBytes += buffer.byteLength;
          if (receivedBytes > options.maxBytes) {
            response.destroy(
              new SafeHttpError(
                "RESPONSE_TOO_LARGE",
                `Response exceeded the ${options.maxBytes}-byte safety limit.`
              )
            );
            return;
          }
          chunks.push(buffer);
        });
        response.on("error", reject);
        response.on("end", () => {
          resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            headers: headerRecord(response.headers),
            status: response.statusCode ?? 0,
          });
        });
      }
    );
    request.setTimeout(options.timeoutMs, () => {
      request.destroy(
        new SafeHttpError(
          "REQUEST_TIMEOUT",
          `Request exceeded the ${options.timeoutMs}ms timeout.`
        )
      );
    });
    // setTimeout above is a socket *idle* timer: a server that sends one byte
    // every few seconds never trips it and can hold a request for as long as it
    // takes to trickle out maxBytes. This timer bounds the whole exchange.
    const totalTimer = setTimeout(() => {
      request.destroy(
        new SafeHttpError(
          "REQUEST_TIMEOUT",
          `Request exceeded the ${options.totalTimeoutMs}ms total time limit.`
        )
      );
    }, options.totalTimeoutMs);
    request.on("close", () => clearTimeout(totalTimer));
    request.on("error", reject);
    request.end();
  });

const selectPinnedAddress = async (
  hostname: string,
  resolveHost: NonNullable<SafeHttpDependencies["resolveHost"]>
): Promise<ResolvedAddress> => {
  let addresses: ResolvedAddress[];
  try {
    addresses = await resolveHost(hostname);
  } catch (error) {
    throw new SafeHttpError(
      "DNS_LOOKUP_FAILED",
      error instanceof Error ? error.message : "DNS lookup failed."
    );
  }
  if (addresses.length === 0) {
    throw new SafeHttpError("DNS_EMPTY", "The hostname has no addresses.");
  }
  if (addresses.some((entry) => !isPublicAddress(entry.address))) {
    throw new SafeHttpError(
      "PRIVATE_ADDRESS_BLOCKED",
      "The hostname resolves to a private or reserved address."
    );
  }
  const selected =
    addresses.find((entry) => entry.family === 4) ?? addresses[0];
  if (!selected) {
    throw new SafeHttpError("DNS_EMPTY", "The hostname has no addresses.");
  }
  return selected;
};

// Node reports a dead or misconfigured site as a raw error with an errno-style
// code. Left raw, it escapes the verifier as an unexpected exception, the
// link-check route answers 500, and the worker blames its own reachability —
// so a dead link is never recorded as broken. Every network failure therefore
// leaves this client as a classified SafeHttpError.
const TLS_ERROR_CODE =
  /CERT|TLS|SSL|SELF_SIGNED|UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER/;

const classifyNetworkError = (error: unknown): SafeHttpError => {
  if (error instanceof SafeHttpError) {
    return error;
  }
  const code =
    typeof (error as { code?: unknown })?.code === "string"
      ? (error as { code: string }).code
      : "";
  const message = error instanceof Error ? error.message : String(error);
  if (TLS_ERROR_CODE.test(code)) {
    return new SafeHttpError(
      "TLS_VERIFICATION_FAILED",
      `${code}: the site's TLS certificate could not be verified.`
    );
  }
  return new SafeHttpError(
    "CONNECTION_FAILED",
    `${code || "NETWORK"}: ${message}`.slice(0, 300)
  );
};

const isRedirect = (status: number): boolean =>
  [301, 302, 303, 307, 308].includes(status);

export const createSafeHttpClient = (
  dependencies: SafeHttpDependencies = {}
) => {
  const resolveHost = dependencies.resolveHost ?? defaultResolveHost;
  const requestPinned = dependencies.requestPinned ?? defaultPinnedRequest;

  return {
    async get(
      value: string,
      rawOptions: SafeHttpOptions = {}
    ): Promise<SafeHttpResponse> {
      const options = normalizeOptions(rawOptions);
      let currentUrl = assertSafeUrl(value);
      const redirectChain: string[] = [];

      for (
        let redirectCount = 0;
        redirectCount <= options.maxRedirects;
        redirectCount += 1
      ) {
        const address = await selectPinnedAddress(
          currentUrl.hostname,
          resolveHost
        );
        let response: PinnedHttpResponse;
        try {
          response = await requestPinned(currentUrl, address, options);
        } catch (error) {
          throw classifyNetworkError(error);
        }
        if (!isRedirect(response.status)) {
          return {
            ...response,
            finalUrl: currentUrl.toString(),
            redirectChain,
          };
        }
        const location = response.headers.location;
        if (!location) {
          throw new SafeHttpError(
            "REDIRECT_WITHOUT_LOCATION",
            "The server returned a redirect without a Location header."
          );
        }
        if (redirectCount === options.maxRedirects) {
          throw new SafeHttpError(
            "TOO_MANY_REDIRECTS",
            `The link exceeded ${options.maxRedirects} redirects.`
          );
        }
        redirectChain.push(currentUrl.toString());
        currentUrl = assertSafeUrl(new URL(location, currentUrl).toString());
      }
      throw new SafeHttpError(
        "TOO_MANY_REDIRECTS",
        `The link exceeded ${options.maxRedirects} redirects.`
      );
    },
  };
};

export type SafeHttpClient = ReturnType<typeof createSafeHttpClient>;
