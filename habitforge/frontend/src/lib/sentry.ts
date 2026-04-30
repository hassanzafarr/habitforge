import * as Sentry from "@sentry/react";

function numberFromEnv(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const dsn = import.meta.env.VITE_SENTRY_DSN;
const apiUrl = import.meta.env.VITE_API_URL;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: numberFromEnv(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.1),
    replaysSessionSampleRate: numberFromEnv(
      import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
      0,
    ),
    replaysOnErrorSampleRate: numberFromEnv(
      import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
      1,
    ),
    tracePropagationTargets: [
      /^\/api\//,
      /^https:\/\/(www\.)?habitforge\.me\/api\//,
      ...(apiUrl ? [apiUrl] : []),
    ],
  });
}

export { Sentry };
