import { NextResponse } from "next/server";

import { buildLeadBriefEmail } from "@/lib/pipeline";
import type { Lead } from "@/types/pipeline";

export const runtime = "nodejs";

function isLead(value: unknown): value is Lead {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Lead>;

  return (
    typeof candidate.businessName === "string" &&
    typeof candidate.city === "string" &&
    typeof candidate.category === "string" &&
    typeof candidate.websiteStatus === "string" &&
    typeof candidate.nextAction === "string" &&
    typeof candidate.angle === "string" &&
    Array.isArray(candidate.services)
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.RESEND_TO_EMAIL;

  if (!apiKey || !from || !to) {
    return NextResponse.json(
      {
        error:
          "Missing Resend configuration. Add RESEND_API_KEY, RESEND_FROM_EMAIL, and RESEND_TO_EMAIL.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as { lead?: unknown } | null;
  const lead = body?.lead;

  if (!isLead(lead)) {
    return NextResponse.json({ error: "A valid lead payload is required." }, { status: 400 });
  }

  const { html, text } = buildLeadBriefEmail(lead);

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Lead Brief: ${lead.businessName}`,
      html,
      text,
    }),
  });

  if (!resendResponse.ok) {
    const errorPayload = (await resendResponse.json().catch(() => null)) as
      | { message?: string; error?: { message?: string } }
      | null;

    return NextResponse.json(
      {
        error:
          errorPayload?.message ||
          errorPayload?.error?.message ||
          "Resend could not deliver the lead brief.",
      },
      { status: resendResponse.status },
    );
  }

  return NextResponse.json({ ok: true, to });
}
