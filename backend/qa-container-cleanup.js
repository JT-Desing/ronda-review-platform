export function cleanupQaRunnerContainer({
  container,
  script,
  inspectLabel,
  removeContainer,
  log = console.log,
  warn = console.warn,
}) {
  if (!container) return 'none';

  if (script === 'usability-qa.js') {
    log(`QA database retained for reproducibility: ${container}`);
    return 'retained';
  }

  try {
    if (inspectLabel(container) !== 'shared-review') {
      warn(`Skipped cleanup for ${container}: QA label did not match.`);
      return 'skipped';
    }
    removeContainer(container);
    return 'removed';
  } catch {
    warn(`QA cleanup pending for ${container}: Docker is unavailable or cleanup could not be verified. Start Docker and inspect this exact QA container before retrying cleanup.`);
    return 'pending';
  }
}
