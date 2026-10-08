/**
 * Pure utilities for version parsing and semantic version comparisons.
 */

/**
 * Normalizes a raw version string by trimming whitespace and optional leading 'v'.
 */
export function normalizeVersion(raw: string | null | undefined): string {
  if (!raw) return '0.0.0';
  const trimmed = raw.trim().replace(/^v/i, '');
  // Strip prerelease or metadata suffixes for numeric comparison (e.g. '1.0.1-beta.1' -> '1.0.1')
  const base = trimmed.split(/[-+]/)[0];
  return base || '0.0.0';
}

/**
 * Compares two semantic version strings (e.g. '1.0.1' vs '1.0.0').
 * 
 * Returns:
 *   1 if a > b (a is newer than b)
 *  -1 if a < b (a is older than b)
 *   0 if a === b
 */
export function compareSemver(a: string | null | undefined, b: string | null | undefined): number {
  const normA = normalizeVersion(a);
  const normB = normalizeVersion(b);

  const partsA = normA.split('.').map((n) => parseInt(n, 10) || 0);
  const partsB = normB.split('.').map((n) => parseInt(n, 10) || 0);

  const maxLength = Math.max(partsA.length, partsB.length, 3);

  for (let i = 0; i < maxLength; i++) {
    const valA = partsA[i] ?? 0;
    const valB = partsB[i] ?? 0;
    if (valA > valB) return 1;
    if (valA < valB) return -1;
  }

  return 0;
}

/**
 * Determines whether an update is available given an installed version and the latest version.
 * Returns true if installedVersion is valid and strictly less than latestVersion.
 */
export function isUpdateAvailable(
  installedVersion: string | null | undefined,
  latestVersion: string
): boolean {
  if (!installedVersion) return false;
  return compareSemver(installedVersion, latestVersion) < 0;
}
