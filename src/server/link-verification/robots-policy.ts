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

/**
 * Total character comparisons allowed while evaluating one robots.txt against
 * one path. robots.txt is untrusted: the old approach compiled each rule into
 * a regex where every "*" became ".*", so a rule like "/*a*a*a*a*a*b" backtracks
 * exponentially. The matcher below is at most O(path × rule) per rule, and this
 * budget bounds the whole file; a file that exhausts it is treated as
 * disallowing the path, so a hostile robots.txt can cost a fetch but never
 * the web's CPU.
 */
const ROBOTS_MATCH_BUDGET = 2_000_000;

class RobotsBudgetExceeded extends Error {}

interface MatchBudget {
  remaining: number;
}

/**
 * robots.txt path matching: the rule matches a prefix of the path, "*" matches
 * any sequence, and a trailing "$" anchors the end. Greedy with backtracking to
 * the most recent "*", so it never revisits earlier wildcards.
 */
const pathMatches = (
  pathname: string,
  rule: string,
  budget: MatchBudget
): boolean => {
  const anchored = rule.endsWith("$");
  const pattern = anchored ? rule.slice(0, -1) : rule;
  let patternIndex = 0;
  let pathIndex = 0;
  let starIndex = -1;
  let starPathIndex = 0;
  while (pathIndex < pathname.length) {
    budget.remaining -= 1;
    if (budget.remaining < 0) {
      throw new RobotsBudgetExceeded();
    }
    if (pattern[patternIndex] === "*") {
      starIndex = patternIndex;
      patternIndex += 1;
      starPathIndex = pathIndex;
    } else if (
      patternIndex < pattern.length &&
      pattern[patternIndex] === pathname[pathIndex]
    ) {
      patternIndex += 1;
      pathIndex += 1;
    } else if (patternIndex === pattern.length && !anchored) {
      return true;
    } else if (starIndex >= 0) {
      patternIndex = starIndex + 1;
      starPathIndex += 1;
      pathIndex = starPathIndex;
    } else {
      return false;
    }
  }
  while (pattern[patternIndex] === "*") {
    patternIndex += 1;
  }
  return patternIndex === pattern.length;
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
  const budget: MatchBudget = { remaining: ROBOTS_MATCH_BUDGET };
  let matchingRules: RobotsRule[];
  try {
    matchingRules = rules.filter((rule) =>
      pathMatches(path, rule.path, budget)
    );
  } catch (error) {
    if (error instanceof RobotsBudgetExceeded) {
      return false;
    }
    throw error;
  }
  const matching = matchingRules.sort(
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
