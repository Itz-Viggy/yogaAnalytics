import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getTodayDate, isDateOnly } from "@/lib/dates";
import { buildReport } from "@/lib/report";
import { getCheckIns } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "Admin password required." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date") || getTodayDate();

    if (!isDateOnly(date)) {
      return NextResponse.json(
        { error: "Date must use YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    const rows = await getCheckIns();
    const report = buildReport(rows, date);

    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to generate report."
      },
      { status: 500 }
    );
  }
}
