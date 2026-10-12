import { loadConfig, productionIssues } from '../src/common/config';

try {
  const config = loadConfig();
  const issues = productionIssues(config);
  if (config.NODE_ENV !== 'production') issues.unshift('NODE_ENV=production kerak');
  console.log(JSON.stringify({
    configuration_ready: issues.length === 0,
    external_services_verified: false,
    issues,
  }));
  if (issues.length) process.exitCode = 1;
} catch (error) {
  // loadConfig only reports field/requirement names, never supplied values.
  console.error(error instanceof Error ? error.message : 'Deployment konfiguratsiyasi noto‘g‘ri.');
  process.exitCode = 1;
}
