"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { CatalogCard } from "@/components/opportunities/catalog-items";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import {
  useInternationalOpportunitiesQuery,
  useNationalOpportunitiesQuery,
} from "@/hooks/queries/use-opportunity-queries";
import useApplicationTracker from "@/hooks/use-application-tracker";
import type { LocationsById } from "@/server/geo/opportunity-locations";
import ProfileApplications from "./profile-applications";
import ProfileHeader, {
  type ProfileStat,
  type ProfileUser,
} from "./profile-header";
import {
  type ApplicationStatus,
  buildProfileView,
  type ProfileItem,
} from "./profile-model";
import ProfileSaved from "./profile-saved";
import { AccountCard, UpcomingDeadlines } from "./profile-sidebar";
import type { FavoriteOpportunity } from "./types";

const CELEBRATION_MS = 2800;
const CONFETTI_PIECES = 36;
const CONFETTI_COLORS = [
  "var(--color-signal)",
  "var(--color-white)",
  "var(--color-mist)",
  "var(--color-signal-strong)",
];

// Deterministic, so nothing random runs during render.
const confetti = Array.from({ length: CONFETTI_PIECES }, (_, index) => ({
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  delay: (index % 7) * 0.08,
  duration: 1.8 + (index % 5) * 0.22,
  left: (index * 37) % 100,
  rotate: (index * 47) % 360,
  size: 6 + (index % 4) * 2,
}));

/** A short burst of confetti for an approval (skipped under reduced motion). */
const Celebration = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none fixed inset-0 z-[70] overflow-hidden motion-reduce:hidden"
  >
    {confetti.map((piece) => (
      <span
        className="absolute top-[-6vh] rounded-[2px] [animation:profile-confetti_var(--fall)_ease-in_var(--wait)_forwards]"
        key={`${piece.left}:${piece.rotate}`}
        style={
          {
            "--fall": `${piece.duration}s`,
            "--wait": `${piece.delay}s`,
            backgroundColor: piece.color,
            height: `${piece.size * 1.4}px`,
            left: `${piece.left}%`,
            transform: `rotate(${piece.rotate}deg)`,
            width: `${piece.size}px`,
          } as React.CSSProperties
        }
      />
    ))}
  </div>
);

const subscribeNoop = () => () => undefined;

/** False during prerender and hydration, true once running in the browser. */
const useIsClient = (): boolean =>
  useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

export interface ProfileDashboardProps {
  favorites: FavoriteOpportunity[];
  favoritesFailed: boolean;
  favoritesLoading: boolean;
  onRemoveFavorite: (item: ProfileItem) => void;
  onRetryFavorites: () => void;
  user: ProfileUser;
  verifiedLocations: { international: LocationsById; national: LocationsById };
}

const ProfileDashboard = ({
  favorites,
  favoritesFailed,
  favoritesLoading,
  onRemoveFavorite,
  onRetryFavorites,
  user,
  verifiedLocations,
}: ProfileDashboardProps) => {
  const isClient = useIsClient();
  const internationalQuery = useInternationalOpportunitiesQuery();
  const nationalQuery = useNationalOpportunitiesQuery();
  const tracker = useApplicationTracker();
  const [pendingStop, setPendingStop] = useState<ProfileItem | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  const view = useMemo(
    () =>
      isClient
        ? buildProfileView({
            favorites,
            international: internationalQuery.data ?? [],
            national: nationalQuery.data ?? [],
            now: new Date(),
            pinned: tracker.pinned,
            statuses: tracker.statuses,
            steps: tracker.steps,
            tasks: tracker.tasks,
            verifiedLocations,
          })
        : null,
    [
      favorites,
      internationalQuery.data,
      isClient,
      nationalQuery.data,
      tracker.pinned,
      tracker.statuses,
      tracker.steps,
      tracker.tasks,
      verifiedLocations,
    ]
  );

  const loading = !view || favoritesLoading;
  const stats: ProfileStat[] = [
    {
      href: "#em-andamento",
      label: "em andamento",
      value: view ? view.started.length : null,
    },
    {
      href: "#salvas",
      label: favorites.length === 1 ? "salva na conta" : "salvas na conta",
      value: favoritesLoading ? null : favorites.length,
    },
    {
      href: "#prazos",
      label:
        view?.upcoming.length === 1 ? "prazo em 30 dias" : "prazos em 30 dias",
      value: view && !favoritesLoading ? view.upcoming.length : null,
    },
  ];

  const celebrate = useCallback(() => {
    setCelebrating(true);
    window.setTimeout(() => setCelebrating(false), CELEBRATION_MS);
  }, []);

  const changeStatus = (item: ProfileItem, status: ApplicationStatus) => {
    const wasApproved = tracker.statuses[item.id] === "Aprovado";
    tracker.setStatus(item.id, status);
    if (status === "Aprovado" && !wasApproved) {
      celebrate();
      toast(`Parabéns pela aprovação em ${item.name}!`);
    }
  };

  const start = (item: ProfileItem) => {
    tracker.setStatus(item.id, "Em preparação");
    toast(`${item.name} agora está em andamento.`);
  };

  return (
    <div className="min-h-screen bg-navy-950 pb-20 font-reading text-slate-100">
      <ProfileHeader pins={view?.pins ?? []} stats={stats} user={user} />

      <div className="mx-auto grid w-full max-w-[84rem] grid-cols-1 gap-10 px-5 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-14">
          <ProfileApplications
            items={view?.started ?? []}
            loading={loading}
            onStatusChange={changeStatus}
            onStop={setPendingStop}
            tracker={tracker}
          />
          <ProfileSaved
            failed={favoritesFailed}
            items={view?.saved ?? []}
            loading={loading && !favoritesFailed}
            onRemove={onRemoveFavorite}
            onRetry={onRetryFavorites}
            onStart={start}
          />
          {view && view.similar.length > 0 && (
            <section aria-labelledby="parecidas-titulo">
              <h2
                className="font-bold text-[1.375rem] text-white leading-tight"
                id="parecidas-titulo"
              >
                Parecidas com as suas
              </h2>
              <p className="mt-1 text-[14px] text-mist">
                Abertas agora, do mesmo tipo ou no mesmo país.
              </p>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {view.similar.map((item) => (
                  <li key={`${item.scope}:${item.id}`}>
                    <CatalogCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <UpcomingDeadlines items={view?.upcoming ?? []} loading={loading} />
          <AccountCard user={user} />
        </aside>
      </div>

      {celebrating && <Celebration />}

      <ConfirmationModal
        confirmText="Parar"
        isOpen={Boolean(pendingStop)}
        message={`Parar de acompanhar "${pendingStop?.name ?? ""}"? A situação, as etapas marcadas e as suas tarefas serão apagadas deste navegador.`}
        onCancel={() => setPendingStop(null)}
        onConfirm={() => {
          if (pendingStop) {
            tracker.stopTracking(pendingStop);
            toast(`${pendingStop.name} saiu de Em andamento.`);
          }
          setPendingStop(null);
        }}
      />
    </div>
  );
};

export default ProfileDashboard;
