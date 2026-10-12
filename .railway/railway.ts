import { bucket, defineRailway, postgres, project, redis, service, volume } from 'railway/iac';

// Settings only: the reviewed source tree is uploaded separately with Railway
// CLI, or connected to the canonical GitHub repo after an explicit push request.
export default defineRailway((ctx) => {
  const db = postgres('postgres');
  const queue = redis('redis');
  const media = bucket('media');
  const enrollment = volume('admin-enrollment');
  const shared = [
    'AUTH_SECRET', 'MFA_ENCRYPTION_KEY', 'CORS_ORIGINS',
    'SMS_ADAPTER', 'SMS_HTTP_URL', 'SMS_HTTP_TOKEN',
    'ESKIZ_TOKEN', 'ESKIZ_EMAIL', 'ESKIZ_PASSWORD', 'ESKIZ_OTP_APPROVED', 'ESKIZ_OTP_TEMPLATE',
    'S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY',
    'PAYMENT_MODE', 'PAYME_MERCHANT_ID', 'PAYME_KEY',
    'TEZCHECK_API_KEY', 'TEZCHECK_CASH_DESK_CODE', 'TEZCHECK_WEBHOOK_SECRET',
    'AI_ADAPTER', 'GEMINI_API_KEY', 'GEMINI_MODEL',
    'PUSH_ADAPTER', 'PUSH_HTTP_URL', 'PUSH_HTTP_TOKEN',
    'TELEGRAM_MODE', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_BOT_USERNAME', 'TELEGRAM_WEBHOOK_SECRET',
    'TELEGRAM_ADMIN_URL', 'TELEGRAM_PARTNER_URL',
  ] as const;
  const backendEnv = {
    ...Object.fromEntries(shared.map(name => [name, ctx.shared[name]])),
    NODE_ENV: 'production',
    TRUST_PROXY: 'private',
    DEMO_OTP_ENABLED: 'false',
    BOOKING_SETTLEMENT_MODE: 'direct',
    WORKER_MODE: 'redis',
    STORAGE_ADAPTER: 's3',
    HOLD_MINUTES: '5',
    DATABASE_URL: db.env.DATABASE_URL,
    REDIS_URL: queue.env.REDIS_URL,
    RAILPACK_NODE_VERSION: '24.15.0',
    // The API pre-deploy step needs the Prisma CLI and its dependencies.
    RAILPACK_PRUNE_DEPS: 'false',
  };
  const backendBuild = { builder: 'RAILPACK' as const, buildCommand: 'npm run build:api' };
  const alwaysOn = { restartPolicyType: 'ON_FAILURE' as const, restartPolicyMaxRetries: 10, sleepApplication: false };
  const api = service('api', {
    build: backendBuild,
    start: 'npm run start:api',
    preDeploy: 'npm run deploy:check && npm run db:migrate',
    healthcheck: '/health/ready',
    healthcheckTimeout: 120,
    replicas: 1,
    deploy: { ...alwaysOn, preDeployTimeoutSeconds: 300 },
    env: { ...backendEnv, PORT: '4000', BOOTSTRAP_MFA_FILE: '/private/bootstrap-mfa.json' },
    volumeMounts: { '/private': enrollment },
  });
  const worker = service('worker', {
    build: backendBuild,
    start: 'npm run start:worker',
    replicas: 1,
    deploy: alwaysOn,
    env: backendEnv,
  });
  const telegram = service('telegram', {
    build: backendBuild,
    start: 'npm run start:telegram',
    // One poller for one bot; allow an in-flight 25-second long poll to finish.
    replicas: 1,
    deploy: { ...alwaysOn, overlapSeconds: 0, drainingSeconds: 30 },
    env: backendEnv,
  });
  const webEnv = {
    NODE_ENV: 'production',
    SIHHAT_WEB_HOST: '::',
    SIHHAT_API_URL: 'http://${{api.RAILWAY_PRIVATE_DOMAIN}}:4000',
    RAILPACK_NODE_VERSION: '24.15.0',
  };
  const admin = service('superadmin', {
    build: { builder: 'RAILPACK', buildCommand: 'npm run build -w @sihhat/superadmin-web' },
    start: 'npm run start:admin',
    healthcheck: '/api/health/ready',
    healthcheckTimeout: 120,
    replicas: 1,
    deploy: alwaysOn,
    env: webEnv,
  });
  const partner = service('partner', {
    build: { builder: 'RAILPACK', buildCommand: 'npm run build -w @sihhat/partner-web' },
    start: 'npm run start:partner',
    healthcheck: '/api/health/ready',
    healthcheckTimeout: 120,
    replicas: 1,
    deploy: alwaysOn,
    env: webEnv,
  });
  return project('sihhat-uz', { resources: [db, queue, media, enrollment, api, worker, telegram, admin, partner] });
});
