import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/AdminLoginForm";
import { isAdminAuthenticated, isAdminAuthConfigured } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  return (
    <main className="pageShell userPage">
      <AdminLoginForm isConfigured={isAdminAuthConfigured()} />
    </main>
  );
}
