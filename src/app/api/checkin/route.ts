import { NextResponse } from "next/server";

import { upsertCheckIn, type CheckInResponse } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isCheckInResponse(value: unknown): value is CheckInResponse {
  return value === "yes" || value === "no";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: unknown;
      response?: unknown;
    };

    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (body.name.length > 100) {
      return NextResponse.json(
        { error: "Name must be 100 characters or fewer." },
        { status: 400 }
      );
    }

    if (!isCheckInResponse(body.response)) {
      return NextResponse.json(
        { error: "Response must be yes or no." },
        { status: 400 }
      );
    }

    const result = await upsertCheckIn({
      name: body.name,
      response: body.response
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save check-in."
      },
      { status: 500 }
    );
  }
}
