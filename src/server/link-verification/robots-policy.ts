import "server-only";

import type { SafeHttpClient } from "./safe-http";

const USER_AGENT = "brasilaforabot";
const ROBOTS_CACHE_TTL_MS = 30 * 60 * 1000;
const LINE_BREAK_PATTERN = /\r?\n/;
const COMMENT_PATTERN = /#.*$/;

interface RobotsRule {
  allow: boolean;
  path: string;
}

interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
}

interface CachedDecision {
  expiresAt: number;
  groups: RobotsGroup[] | null;
  inaccessible: boolean;
}

const cache = new Map<string, CachedDecision>();

const parseRobots = (body: string): RobotsGroup[] => {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let hasRules = false;

  for (const rawLine of body.split(LINE_BREAK_PATTERN)) {
    const line = rawLine.replace(COMMENT_PATTERN, "").trim();
    if (!line) {
      if (current?.agents.length && hasRules) {
        groups.push(current);
        current = null;
        hasRules = false;
      }
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const directive = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (directive === "user-agent") {
      if (current?.agents.length && hasRules) {
        groups.push(current);
        current = null;
        hasRules = false;
      }
      current ??= { agents: [], rules: [] };
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (
      current &&
      (directive === "allow" || directive === "disallow") &&
      value
    ) {
      current.rules.push({ allow: directive === "allow", path: value });
      hasRules = true;
    }
  }
  if (current?.agents.length) {
    groups.push(current);
  }
  return groups;
};

const pathMatches = (pathname: string, rule: string): boolean => {
  const withoutEndAnchor = rule.endsWith("$") ? rule.slice(0, -1) : rule;
  const escaped = withoutEndAnchor
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", ".*");
  const expression = new RegExp(`^${escaped}${rule.endsWith("$") ? "$" : ""}`);
  return expression.test(pathname);
};

const rulesForAgent = (groups: RobotsGroup[]): RobotsRule[] => {
  const exact = groups.filter((group) =>
    group.agents.some((agent) => agent === USER_AGENT)
  );
  const selected =
    exact.length > 0
      ? exact
      : groups.filter((group) => group.agents.some((agent) => agent === "*"));
  return selected.flatMap((group) => group.rules);
};

const rulesAllow = (rules: RobotsRule[], path: string): boolean => {
  const matching = rules
    .filter((rule) => pathMatches(path, rule.path))
    .sort(
      (left, right) =>
        right.path.length - left.path.length ||
        Number(right.allow) - Number(left.allow)
    );
  return matching[0]?.allow ?? true;
};

export const checkRobotsAllowed = async (
  client: SafeHttpClient,
  target: URL,
  now = new Date()
): Promise<{ allowed: boolean; reason: string }> => {
  const origin = target.origin;
  let cached = cache.get(origin);
  if (!cached || cached.expiresAt <= now.getTime()) {
    try {
      const response = await client.get(
        new URL("/robots.txt", origin).toString(),
        {
          maxBytes: 128 * 1024,
          maxRedirects: 2,
          timeoutMs: 5000,
        }
      );
      const inaccessible = response.status === 401 || response.status === 403;
      cached = {
        expiresAt: now.getTime() + ROBOTS_CACHE_TTL_MS,
        groups:
          response.status >= 200 && response.status < 300
            ? parseRobots(response.body)
            : null,
        inaccessible,
      };
    } catch {
      cached = {
        expiresAt: now.getTime() + ROBOTS_CACHE_TTL_MS,
        groups: null,
        inaccessible: false,
      };
    }
    cache.set(origin, cached);
  }
  if (cached.inaccessible) {
    return {
      allowed: false,
      reason: "robots.txt denied crawler access",
    };
  }
  if (!cached.groups) {
    return {
      allowed: true,
      reason: "robots.txt unavailable or not applicable",
    };
  }
  const allowed = rulesAllow(
    rulesForAgent(cached.groups),
    `${target.pathname}${target.search}`
  );
  return {
    allowed,
    reason: allowed
      ? "robots.txt allows this path"
      : "robots.txt disallows this path",
  };
};

export const clearRobotsCacheForTests = (): void => {
  cache.clear();
};
