"use client";

import { authClient } from "@/lib/auth-client";
import { useEffect, useMemo, useState } from "react";

type BusyRange = { start: string; end: string };
type FreeBusyResponse = {
  calendarId: string;
  timeMin: string;
  timeMax: string;
  busy: BusyRange[];
};

function formatBusyRange(range: BusyRange) {
  const start = new Date(range.start);
  const end = new Date(range.end);
  const formatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function GoogleCalendarFreeBusy() {
  const [data, setData] = useState<FreeBusyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState<number>(7);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/google/freebusy?days=${days}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(body?.message || `Request failed (${res.status})`);
        }

        const json = (await res.json()) as FreeBusyResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setError(e instanceof Error ? e.message : "Failed to load calendar");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const busyLines = useMemo(() => {
    if (!data?.busy) return [];
    return data.busy
      .slice()
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .map(formatBusyRange);
  }, [data]);

  return (
    <div className="text-sm/6 font-[family-name:var(--font-geist-mono)]">
      <div className="mb-1">Google Calendar availability</div>
      <label className="mb-2 flex items-center gap-2">
        <span>Days ahead</span>
        <input
          className="w-20 rounded border border-solid border-black/[.08] dark:border-white/[.145] bg-transparent px-2 py-1"
          type="number"
          min={1}
          max={30}
          step={1}
          value={days}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (!Number.isFinite(next)) return;
            setDays(Math.min(30, Math.max(1, Math.floor(next))));
          }}
        />
      </label>
      {isLoading ? (
        <div>Loading…</div>
      ) : error ? (
        <div>Calendar error: {error}</div>
      ) : busyLines.length === 0 ? (
        <div>No busy times found.</div>
      ) : (
        <ul className="list-inside list-disc">
          {busyLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AuthPanel() {
  const { data: session, isPending, error } = authClient.useSession();

  const buttonClassName =
    "rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto";

  if (isPending) {
    return <div className="text-sm">Loading session…</div>;
  }

  if (error) {
    return (
      <div className="text-sm">
        Auth error: {error.message || "Unknown error"}
      </div>
    );
  }

  if (!session) {
    return (
      <button
        type="button"
        className={buttonClassName}
        onClick={async () => {
          await authClient.signIn.social({
            provider: "google",
          });
        }}
      >
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="flex gap-4 items-center flex-col sm:flex-row">
      <div className="flex flex-col gap-2">
        <div className="text-sm/6 font-[family-name:var(--font-geist-mono)]">
          Signed in as{" "}
          {session.user.email ?? session.user.name ?? session.user.id}
        </div>
        <GoogleCalendarFreeBusy />
      </div>
      <button
        type="button"
        className={buttonClassName}
        onClick={async () => {
          await authClient.signOut();
        }}
      >
        Sign out
      </button>
    </div>
  );
}
