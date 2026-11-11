import fs from 'fs';
import path from 'path';

/**
 * Resolves the location of a seed data file across different execution contexts
 * (e.g., when launched from repository root or dsa-app directory).
 */
export function getSeedDataPath(filename: string): string {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, 'dsa-app/prisma/seed-data', filename),
    path.resolve(cwd, 'prisma/seed-data', filename),
    path.resolve(__dirname, '../../../prisma/seed-data', filename),
    path.resolve(__dirname, '../../prisma/seed-data', filename),
    path.resolve(__dirname, '../prisma/seed-data', filename)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback to primary expected path
  return path.resolve(cwd, 'prisma/seed-data', filename);
}

/**
 * Resolves the persistent data directory for offline user store and collections.
 * Consistently targets the canonical dsa-app/data directory if available.
 */
export function getDataDirPath(): string {
  const cwd = process.cwd();
  // If running from repo root, target dsa-app/data
  if (fs.existsSync(path.resolve(cwd, 'dsa-app'))) {
    const p = path.resolve(cwd, 'dsa-app/data');
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
    return p;
  }

  // If running inside dsa-app already
  const p = path.resolve(cwd, 'data');
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
  return p;
}

