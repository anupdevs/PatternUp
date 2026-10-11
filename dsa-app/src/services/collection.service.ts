import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { ForbiddenError } from '@/lib/auth';

export interface CollectionItem {
  id: string;
  clerkUserId: string;
  name: string;
  description: string;
  color: string;
  isDefault: boolean;
  problemIds: string[]; // problem IDs or canonical slugs
  createdAt: string;
  updatedAt: string;
}

const COLLECTIONS_FILE = path.resolve(process.cwd(), 'data/user_collections.json');

const DEFAULT_COLLECTION_TEMPLATES = [
  { name: 'Must Revise', description: 'Essential core algorithms to revisit before interviews', color: 'rose' },
  { name: 'Interview Favorites', description: 'High-frequency interview questions with elegant approaches', color: 'indigo' },
  { name: 'Frequently Asked', description: 'Top LeetCode / Bosscoder company tagged problems', color: 'amber' },
  { name: 'Problems I Keep Getting Wrong', description: 'Tricky edge cases, off-by-one errors, and stumbling blocks', color: 'purple' }
];

function ensureFileExists(): void {
  const dir = path.dirname(COLLECTIONS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(COLLECTIONS_FILE)) {
    fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify([]), 'utf8');
  }
}

function readAllCollections(): CollectionItem[] {
  ensureFileExists();
  try {
    const raw = fs.readFileSync(COLLECTIONS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAllCollections(collections: CollectionItem[]): void {
  ensureFileExists();
  fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify(collections, null, 2), 'utf8');
}

export class CollectionService {
  /**
   * Retrieves all collections for a user, provisioning defaults if this is their first visit.
   */
  static async getUserCollections(userId: string): Promise<CollectionItem[]> {
    const all = readAllCollections();
    let userCollections = all.filter((c) => c.clerkUserId === userId);

    if (userCollections.length === 0) {
      // Provision the 4 required standard collections for the user
      const now = new Date().toISOString();
      const defaults: CollectionItem[] = DEFAULT_COLLECTION_TEMPLATES.map((tmpl, idx) => ({
        id: `col_${userId.slice(-6)}_${idx}_${Date.now()}`,
        clerkUserId: userId,
        name: tmpl.name,
        description: tmpl.description,
        color: tmpl.color,
        isDefault: true,
        problemIds: [],
        createdAt: now,
        updatedAt: now
      }));

      const updatedAll = [...all, ...defaults];
      writeAllCollections(updatedAll);
      userCollections = defaults;
    }

    return userCollections;
  }

  /**
   * Creates a custom collection for the user.
   */
  static async createCollection(
    userId: string,
    input: { name: string; description?: string; color?: string }
  ): Promise<CollectionItem> {
    const trimmedName = input.name.trim();
    if (!trimmedName) throw new Error('Collection name cannot be empty');

    const all = readAllCollections();
    const existing = all.find(
      (c) => c.clerkUserId === userId && c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      throw new Error(`A collection named "${trimmedName}" already exists.`);
    }

    const now = new Date().toISOString();
    const newCollection: CollectionItem = {
      id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      clerkUserId: userId,
      name: trimmedName,
      description: input.description?.trim() || '',
      color: input.color || 'indigo',
      isDefault: false,
      problemIds: [],
      createdAt: now,
      updatedAt: now
    };

    all.push(newCollection);
    writeAllCollections(all);
    return newCollection;
  }

  /**
   * Deletes a user collection, enforcing ownership.
   */
  static async deleteCollection(userId: string, collectionId: string): Promise<void> {
    const all = readAllCollections();
    const index = all.findIndex((c) => c.id === collectionId);
    if (index === -1) throw new Error('Collection not found');

    if (all[index].clerkUserId !== userId) {
      throw new ForbiddenError('You do not own this collection');
    }

    all.splice(index, 1);
    writeAllCollections(all);
  }

  /**
   * Adds a problem to a collection, preventing duplicate membership.
   */
  static async addProblemToCollection(
    userId: string,
    collectionId: string,
    problemIdOrSlug: string
  ): Promise<CollectionItem> {
    const all = readAllCollections();
    const col = all.find((c) => c.id === collectionId);
    if (!col) throw new Error('Collection not found');

    if (col.clerkUserId !== userId) {
      throw new ForbiddenError('You do not own this collection');
    }

    // Verify problem exists in catalog (supports online DB and offline catalog fallback)
    let identifier = problemIdOrSlug;
    const isLiveDb =
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes('placeholder') &&
      !process.env.DATABASE_URL.includes('dummy');

    if (isLiveDb) {
      try {
        const problem = await prisma.problem.findFirst({
          where: {
            OR: [{ id: problemIdOrSlug }, { canonicalSlug: problemIdOrSlug }]
          },
          select: { id: true, canonicalSlug: true }
        });
        if (problem) {
          identifier = problem.canonicalSlug;
        }
      } catch {
        // fallback
      }
    } else {
      try {
        const canonicalData = JSON.parse(
          fs.readFileSync(path.resolve(process.cwd(), 'prisma/seed-data/canonical_problems.json'), 'utf8')
        );
        const found = canonicalData.find(
          (p: any) => p.canonicalSlug === problemIdOrSlug || p.id === problemIdOrSlug
        );
        if (found) {
          identifier = found.canonicalSlug;
        }
      } catch {
        // fallback
      }
    }

    if (col.problemIds.includes(identifier)) {
      return col; // Already present, idempotent
    }

    col.problemIds.push(identifier);
    col.updatedAt = new Date().toISOString();
    writeAllCollections(all);
    return col;
  }

  /**
   * Removes a problem from a collection, enforcing user ownership.
   */
  static async removeProblemFromCollection(
    userId: string,
    collectionId: string,
    problemIdOrSlug: string
  ): Promise<CollectionItem> {
    const all = readAllCollections();
    const col = all.find((c) => c.id === collectionId);
    if (!col) throw new Error('Collection not found');

    if (col.clerkUserId !== userId) {
      throw new ForbiddenError('You do not own this collection');
    }

    col.problemIds = col.problemIds.filter((p) => p !== problemIdOrSlug);
    col.updatedAt = new Date().toISOString();
    writeAllCollections(all);
    return col;
  }

  /**
   * Resolves problem records for a collection.
   */
  static async getCollectionDetailsWithProblems(userId: string, collectionId: string) {
    const collections = await this.getUserCollections(userId);
    const col = collections.find((c) => c.id === collectionId);
    if (!col) return null;

    if (col.problemIds.length === 0) {
      return { collection: col, problems: [] };
    }

    const isLiveDb =
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes('placeholder') &&
      !process.env.DATABASE_URL.includes('dummy');

    let problems: any[] = [];
    if (isLiveDb) {
      try {
        problems = await prisma.problem.findMany({
          where: {
            OR: [
              { canonicalSlug: { in: col.problemIds } },
              { id: { in: col.problemIds } }
            ]
          },
          include: {
            patterns: {
              include: { pattern: { include: { topic: true } } }
            },
            progress: {
              where: { clerkUserId: userId },
              take: 1
            }
          }
        });
      } catch {
        // fallback
      }
    } else {
      try {
        const canonicalData = JSON.parse(
          fs.readFileSync(path.resolve(process.cwd(), 'prisma/seed-data/canonical_problems.json'), 'utf8')
        );
        problems = canonicalData
          .filter((p: any) => col.problemIds.includes(p.canonicalSlug) || col.problemIds.includes(p.id))
          .map((p: any) => ({
            ...p,
            patterns: [{ pattern: { name: 'Catalog Pattern', topic: { name: 'DSA', slug: 'dsa' } } }],
            progress: []
          }));
      } catch {
        problems = [];
      }
    }

    return { collection: col, problems };
  }
}
