import Image from "next/image";
import { CatalogMap } from "@/components/opportunities/catalog-header";
import { WORLD_MAP } from "@/components/opportunities/map-windows";
import type { GeoPoint } from "@/lib/geo";

export interface ProfileUser {
  createdAt: string | null;
  email: string;
  image: string | null;
  isAdmin: boolean;
  name: string;
}

export interface ProfileStat {
  href: string;
  label: string;
  value: number | null;
}

const INITIALS_COUNT = 2;
const WORD_SEPARATOR_REGEX = /\s+/;

const initialsOf = (name: string): string =>
  name
    .split(WORD_SEPARATOR_REGEX)
    .filter(Boolean)
    .slice(0, INITIALS_COUNT)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

export const Avatar = ({
  className,
  user,
}: {
  className: string;
  user: ProfileUser;
}) =>
  user.image ? (
    <Image
      alt=""
      className={`rounded-full object-cover ${className}`}
      height={96}
      src={user.image}
      unoptimized
      width={96}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`flex items-center justify-center rounded-full bg-navy-800 font-bold text-white ${className}`}
    >
      {initialsOf(user.name) || "?"}
    </span>
  );

/**
 * Greeting over the night map, pinned where the student's own opportunities
 * are (the same map the catalogs use, but theirs).
 */
const ProfileHeader = ({
  pins,
  stats,
  user,
}: {
  pins: GeoPoint[];
  stats: ProfileStat[];
  user: ProfileUser;
}) => {
  const firstName = user.name.split(WORD_SEPARATOR_REGEX)[0] || user.name;
  return (
    <section className="relative isolate overflow-hidden border-navy-700/50 border-b">
      <div
        aria-hidden="true"
        className="relative h-32 overflow-hidden sm:h-40 lg:absolute lg:inset-y-0 lg:right-0 lg:-z-10 lg:h-auto lg:w-[58%]"
      >
        <CatalogMap map={WORLD_MAP} pins={pins} />
      </div>

      <div className="mx-auto w-full max-w-[84rem] px-5 pt-2 pb-8 sm:px-8 lg:flex lg:min-h-[19rem] lg:flex-col lg:justify-center lg:py-10">
        <div className="flex items-center gap-5">
          <Avatar
            className="h-16 w-16 shrink-0 text-[20px] ring-2 ring-navy-600 sm:h-20 sm:w-20 sm:text-[1.375rem]"
            user={user}
          />
          <div className="min-w-0">
            <h1 className="text-balance font-bold text-[clamp(2rem,1.3rem+2vw,3rem)] text-white leading-[1.05] tracking-[-0.02em]">
              Olá, {firstName}
            </h1>
            <p className="mt-2 max-w-[34rem] text-[16px] text-mist leading-relaxed">
              As oportunidades que você salvou e as inscrições que está
              acompanhando.
            </p>
          </div>
        </div>

        <ul className="mt-7 grid max-w-[40rem] grid-cols-3 divide-x divide-navy-700/70 rounded-xl border border-navy-700 bg-navy-950/70">
          {stats.map((stat) => (
            <li key={stat.label}>
              <a
                className="block rounded-xl px-4 py-3 transition-colors hover:bg-navy-900 focus-visible:outline-2 focus-visible:outline-signal focus-visible:-outline-offset-2 sm:px-5"
                href={stat.href}
              >
                <span className="block font-bold text-[2rem] text-white tabular-nums leading-none">
                  {stat.value ?? "–"}
                </span>
                <span className="mt-1.5 block text-[13px] text-mist leading-snug">
                  {stat.label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default ProfileHeader;
