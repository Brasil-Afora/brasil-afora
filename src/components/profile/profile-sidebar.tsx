"use client";

import { LogOutIcon, ShieldIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { URGENT_DAYS } from "@/components/opportunities/catalog-model";
import { SideCard } from "@/components/opportunities/detail-parts";
import { signOut } from "@/lib/auth-client";
import { Avatar, type ProfileUser } from "./profile-header";
import type { ProfileItem } from "./profile-model";

const memberSince = (createdAt: string | null): string | null => {
  if (!createdAt) {
    return null;
  }
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString("pt-BR", {
    month: "long",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  });
};

const countdown = (daysLeft: number): string => {
  if (daysLeft === 0) {
    return "hoje";
  }
  return daysLeft === 1 ? "amanhã" : `em ${daysLeft} dias`;
};

export const UpcomingDeadlines = ({
  items,
  loading,
}: {
  items: ProfileItem[];
  loading: boolean;
}) => (
  <section className="scroll-mt-24" id="prazos">
    <SideCard title="Prazos próximos">
      {loading && (
        <div
          aria-hidden="true"
          className="h-16 animate-pulse rounded-lg bg-navy-800/60"
        />
      )}
      {!loading && items.length === 0 && (
        <p className="text-[14px] text-mist">
          Nada fechando nos próximos 30 dias entre as suas oportunidades.
        </p>
      )}
      {!loading && items.length > 0 && (
        <ul className="-my-1 divide-y divide-navy-700/70">
          {items.map((item) => (
            <li className="flex items-start gap-3 py-3" key={item.stepsKey}>
              <div className="min-w-0 flex-1">
                <Link
                  className="line-clamp-2 font-semibold text-[14px] text-white leading-snug underline-offset-4 hover:underline"
                  href={item.href}
                >
                  {item.name}
                </Link>
                <p className="mt-0.5 text-[12px] text-mist tabular-nums">
                  Prazo {item.deadline}
                </p>
              </div>
              {item.daysLeft !== null && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 font-semibold text-[12px] tabular-nums ${item.daysLeft <= URGENT_DAYS ? "bg-signal/15 text-signal" : "bg-navy-800 text-slate-200"}`}
                >
                  {countdown(item.daysLeft)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </SideCard>
  </section>
);

export const AccountCard = ({ user }: { user: ProfileUser }) => {
  const router = useRouter();
  const since = memberSince(user.createdAt);
  return (
    <SideCard title="Sua conta">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0 text-[14px]" user={user} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-[15px] text-white">
            {user.name}
          </p>
          <p className="truncate text-[13px] text-mist">{user.email}</p>
        </div>
      </div>
      {since && (
        <p className="mt-3 text-[13px] text-mist">
          Na Brasil Afora desde {since}.
        </p>
      )}
      <p className="mt-3 text-[13px] text-mist-dim leading-relaxed">
        As salvas ficam na sua conta. O andamento das inscrições (situação,
        etapas e tarefas) fica salvo neste navegador.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {user.isAdmin && (
          <Link
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-navy-600 px-3 text-[13px] text-slate-100 transition-colors hover:border-signal/60 hover:text-white"
            href="/admin"
          >
            <ShieldIcon aria-hidden="true" className="h-3.5 w-3.5 text-mist" />
            Painel admin
          </Link>
        )}
        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-navy-600 px-3 text-[13px] text-slate-100 transition-colors hover:border-signal/60 hover:text-white focus-visible:outline-2 focus-visible:outline-signal"
          onClick={async () => {
            try {
              await signOut();
            } finally {
              router.push("/login");
              router.refresh();
            }
          }}
          type="button"
        >
          <LogOutIcon aria-hidden="true" className="h-3.5 w-3.5 text-mist" />
          Sair
        </button>
      </div>
    </SideCard>
  );
};
