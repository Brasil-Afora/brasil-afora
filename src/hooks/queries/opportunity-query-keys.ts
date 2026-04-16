export const opportunityQueryKeys = {
  all: ["opportunities"] as const,
  internationalList: () =>
    [...opportunityQueryKeys.all, "international"] as const,
  internationalById: (id: string) =>
    [...opportunityQueryKeys.internationalList(), id] as const,
  internationalFavorites: () =>
    [...opportunityQueryKeys.internationalList(), "favorites"] as const,
  nationalList: () => [...opportunityQueryKeys.all, "national"] as const,
  nationalById: (id: string) =>
    [...opportunityQueryKeys.nationalList(), id] as const,
  nationalFavorites: () =>
    [...opportunityQueryKeys.nationalList(), "favorites"] as const,
  profileFavorites: () =>
    [...opportunityQueryKeys.all, "profile-favorites"] as const,
};
