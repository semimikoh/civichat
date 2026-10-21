import * as Sentry from '@sentry/nextjs';

export function register() {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === 'production',
  });
}

/** 서버 컴포넌트·라우트 핸들러에서 잡히지 않은 에러를 Sentry로 보낸다. */
export const onRequestError = Sentry.captureRequestError;
