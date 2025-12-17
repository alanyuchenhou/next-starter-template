import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

let authSingleton: ReturnType<typeof betterAuth> | undefined;

export function getAuth() {
  if (authSingleton) return authSingleton;

  authSingleton = betterAuth({
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
    },
    plugins: [nextCookies()],
  });

  return authSingleton;
}
