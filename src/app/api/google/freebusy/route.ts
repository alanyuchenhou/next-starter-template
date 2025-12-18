import { getAuth } from "@/lib/auth";
import { z } from "zod";

type GoogleFreeBusyApiResponse = {
  calendars?: Record<
    string,
    {
      busy?: Array<{ start: string; end: string }>;
      errors?: Array<{ domain?: string; reason?: string }>;
    }
  >;
};

export async function GET(request: Request) {
  const auth = getAuth();

  const url = new URL(request.url);

  const querySchema = z.object({
    days: z.coerce.number().int().min(1).max(30).default(7),
  });

  const query = querySchema.safeParse({
    days: url.searchParams.get("days") ?? undefined,
  });

  if (!query.success) {
    return Response.json(
      {
        error: "BAD_REQUEST",
        message: "Invalid query parameters.",
        issues: query.error.issues,
      },
      { status: 400 },
    );
  }

  const { days } = query.data;

  let tokenData:
    | {
        accessToken: string;
        accessTokenExpiresAt: Date | undefined;
        scopes: string[];
        idToken: string | undefined;
      }
    | undefined;

  try {
    tokenData = await auth.api.getAccessToken({
      body: {
        providerId: "google",
      },
      headers: request.headers,
    });
  } catch {
    tokenData = undefined;
  }

  if (!tokenData?.accessToken) {
    return Response.json(
      {
        error: "UNAUTHORIZED",
        message: "You must be signed in with Google to view availability.",
      },
      { status: 401 },
    );
  }

  const timeMin = new Date();
  const timeMax = new Date(timeMin.getTime() + days * 24 * 60 * 60 * 1000);

  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: "primary" }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return Response.json(
      {
        error: "GOOGLE_API_ERROR",
        status: res.status,
        body: text || undefined,
      },
      { status: 502 },
    );
  }

  const data = (await res.json()) as GoogleFreeBusyApiResponse;
  const calendarId = "primary";
  const busy = data.calendars?.[calendarId]?.busy ?? [];

  return Response.json(
    {
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      busy,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
