"use client";

import { authClient } from "@/lib/auth-client";

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
      <div className="text-sm/6 font-[family-name:var(--font-geist-mono)]">
        Signed in as{" "}
        {session.user.email ?? session.user.name ?? session.user.id}
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
