import AdminPage from "@/components/admin/admin-page";
import { requireAdminSession } from "@/server/session";

export default async function AdminRoutePage() {
  await requireAdminSession("/perfil");

  return <AdminPage />;
}
