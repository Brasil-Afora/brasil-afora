/**
 * Groups points that would overlap on screen, so a place with many
 * opportunities reads as one marker with a count instead of a pile of dots.
 *
 * Greedy and heaviest-first: the point with the most opportunities founds a
 * cluster and takes in every unclaimed point within `radius`, then the next
 * heaviest unclaimed point founds the next one. Distances are in whatever
 * space `position` returns — screen pixels on the Leaflet map, degrees on the
 * static SVG maps — so the caller picks a radius that means "would touch" in
 * that space. A cluster sits at the weighted centre of its members, so it
 * leans toward where most of its opportunities are.
 *
 * Quadratic, which is fine: it runs over places (cities), not opportunities,
 * and even a catalog of several hundred opportunities has a few hundred
 * places at most.
 */
export interface Cluster<T> {
  /** Members, heaviest first. */
  items: T[];
  weight: number;
  x: number;
  y: number;
}

interface Placed<T> {
  item: T;
  weight: number;
  x: number;
  y: number;
}

export const clusterByDistance = <T>(
  items: T[],
  position: (item: T) => { x: number; y: number },
  weight: (item: T) => number,
  radius: number
): Cluster<T>[] => {
  const placed: Placed<T>[] = items
    .map((item) => ({ item, weight: weight(item), ...position(item) }))
    .sort((a, b) => b.weight - a.weight);
  const claimed = new Set<number>();
  const clusters: Cluster<T>[] = [];

  for (let founder = 0; founder < placed.length; founder++) {
    if (claimed.has(founder)) {
      continue;
    }
    const origin = placed[founder];
    const members: Placed<T>[] = [];
    for (let index = founder; index < placed.length; index++) {
      if (claimed.has(index)) {
        continue;
      }
      const candidate = placed[index];
      if (
        Math.hypot(candidate.x - origin.x, candidate.y - origin.y) <= radius
      ) {
        claimed.add(index);
        members.push(candidate);
      }
    }
    const total = members.reduce((sum, member) => sum + member.weight, 0);
    clusters.push({
      items: members.map((member) => member.item),
      weight: total,
      x: members.reduce((sum, m) => sum + m.x * m.weight, 0) / total,
      y: members.reduce((sum, m) => sum + m.y * m.weight, 0) / total,
    });
  }
  return clusters;
};
