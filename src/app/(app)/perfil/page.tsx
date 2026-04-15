import ProfileMain from "@/components/profile/profile-main";
import { requireUserSession } from "@/server/session";

export default async function ProfilePage() {
  await requireUserSession("/login?redirectTo=%2Fperfil");

  return <ProfileMain />;
}
