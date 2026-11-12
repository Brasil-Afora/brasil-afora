import { redirect } from "next/navigation";
import { requireAdminSession } from "@/server/session";

export default async function AdminRoutePage() {
  await requireAdminSession("/perfil");
  redirect("/admin/review");
}
