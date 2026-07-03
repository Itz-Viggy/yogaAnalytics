import { AdminReport } from "@/components/AdminReport";
import { logoutAdmin } from "@/app/admin/actions";
import { getTodayDate } from "@/lib/dates";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <main className="pageShell adminPage">
      <div className="adminAuthBar">
        <span>Signed in as admin</span>
        <form action={logoutAdmin}>
          <button className="button secondaryButton" type="submit">
            Sign out
          </button>
        </form>
      </div>
      <AdminReport defaultDate={getTodayDate()} />
    </main>
  );
}
