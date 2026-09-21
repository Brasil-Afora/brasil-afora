import type { Metadata } from "next";
import ProfileMain from "@/components/profile/profile-main";
import { getVerifiedLocations } from "@/server/geo/opportunity-locations";
import { requireUserSession } from "@/server/session";

export const metadata: Metadata = {
  title: "Seu perfil",
};

export default async function ProfilePage() {
  const session = await requireUserSession("/login?redirectTo=%2Fperfil");
  const user = session.user;
  const createdAt = user?.createdAt ? new Date(user.createdAt) : null;

  return (
    <ProfileMain
      user={{
        createdAt:
          createdAt && !Number.isNaN(createdAt.getTime())
            ? createdAt.toISOString()
            : null,
        email: user?.email ?? "",
        image: user?.image ?? null,
        isAdmin: user?.role === "admin",
        name: user?.name ?? "",
      }}
      verifiedLocations={getVerifiedLocations()}
    />
  );
}
