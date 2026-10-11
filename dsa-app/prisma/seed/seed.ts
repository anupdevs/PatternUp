import { PrismaClient, Difficulty, Platform, VerificationStatus, HintSourceType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Idempotent DSA Content Seed ---');

  const seedDir = path.resolve(__dirname, '../seed-data');

  const topics = JSON.parse(fs.readFileSync(path.join(seedDir, 'topics.json'), 'utf8'));
  const patterns = JSON.parse(fs.readFileSync(path.join(seedDir, 'patterns.json'), 'utf8'));
  const canonicalProblems = JSON.parse(fs.readFileSync(path.join(seedDir, 'canonical_problems.json'), 'utf8'));
  const sheetMappings = JSON.parse(fs.readFileSync(path.join(seedDir, 'sheet_mappings.json'), 'utf8'));
  const hints = JSON.parse(fs.readFileSync(path.join(seedDir, 'hints.json'), 'utf8'));

  // 1. Seed Topics
  console.log(`Seeding ${topics.length} topics...`);
  const topicMap = new Map<string, string>(); // slug -> id

  for (const t of topics) {
    const record = await prisma.topic.upsert({
      where: { slug: t.slug },
      update: {
        name: t.name,
        description: t.description,
        displayOrder: t.displayOrder
      },
      create: {
        name: t.name,
        slug: t.slug,
        description: t.description,
        displayOrder: t.displayOrder
      }
    });
    topicMap.set(t.slug, record.id);
  }

  // 2. Seed Patterns
  console.log(`Seeding ${patterns.length} patterns...`);
  const patternMap = new Map<string, string>(); // `${topicSlug}::${patternSlug}` -> id

  for (const p of patterns) {
    const topicId = topicMap.get(p.topicSlug);
    if (!topicId) throw new Error(`Topic id not found for slug: ${p.topicSlug}`);

    const record = await prisma.pattern.upsert({
      where: {
        topicId_slug: {
          topicId,
          slug: p.slug
        }
      },
      update: {
        name: p.name,
        description: p.description,
        displayOrder: p.displayOrder
      },
      create: {
        topicId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        displayOrder: p.displayOrder
      }
    });
    patternMap.set(`${p.topicSlug}::${p.slug}`, record.id);
  }

  // 3. Seed Canonical Problems
  console.log(`Seeding ${canonicalProblems.length} canonical problems...`);
  const problemMap = new Map<string, string>(); // canonicalSlug -> id

  for (const prob of canonicalProblems) {
    const record = await prisma.problem.upsert({
      where: { canonicalSlug: prob.canonicalSlug },
      update: {
        title: prob.title,
        description: prob.description,
        difficulty: prob.difficulty as Difficulty,
        difficultySource: prob.difficultySource,
        platform: prob.platform as Platform,
        externalUrl: prob.externalUrl,
        originalPdfQuestionNumber: prob.originalPdfQuestionNumber,
        sourcePage: prob.sourcePage,
        displayOrder: prob.displayOrder,
        tags: prob.tags,
        contentVerificationStatus: prob.contentVerificationStatus as VerificationStatus
      },
      create: {
        canonicalSlug: prob.canonicalSlug,
        title: prob.title,
        description: prob.description,
        difficulty: prob.difficulty as Difficulty,
        difficultySource: prob.difficultySource,
        platform: prob.platform as Platform,
        externalUrl: prob.externalUrl,
        originalPdfQuestionNumber: prob.originalPdfQuestionNumber,
        sourcePage: prob.sourcePage,
        displayOrder: prob.displayOrder,
        tags: prob.tags,
        contentVerificationStatus: prob.contentVerificationStatus as VerificationStatus
      }
    });
    problemMap.set(prob.canonicalSlug, record.id);
  }

  // 4. Seed Sheet Mappings (All 211 PDF Problem Instances)
  console.log(`Seeding ${sheetMappings.length} sheet mappings...`);
  for (const m of sheetMappings) {
    const problemId = problemMap.get(m.canonicalSlug);
    const patternId = patternMap.get(`${m.topicSlug}::${m.patternSlug}`);

    if (!problemId) throw new Error(`Problem id not found for slug: ${m.canonicalSlug}`);
    if (!patternId) throw new Error(`Pattern id not found for: ${m.topicSlug}::${m.patternSlug}`);

    await prisma.problemPattern.upsert({
      where: { sheetNumber: m.sheetNumber },
      update: {
        problemId,
        patternId,
        pdfTitle: m.pdfTitle,
        pdfPage: m.pdfPage,
        displayOrder: m.displayOrder
      },
      create: {
        sheetNumber: m.sheetNumber,
        problemId,
        patternId,
        pdfTitle: m.pdfTitle,
        pdfPage: m.pdfPage,
        displayOrder: m.displayOrder
      }
    });
  }

  // 5. Seed Hints
  console.log(`Seeding ${hints.length} hints...`);
  for (const h of hints) {
    const problemId = problemMap.get(h.canonicalSlug);
    if (!problemId) continue;

    await prisma.problemHint.upsert({
      where: {
        problemId_order: {
          problemId,
          order: h.order
        }
      },
      update: {
        content: h.content,
        sourceType: h.sourceType as HintSourceType,
        verified: h.verified
      },
      create: {
        problemId,
        order: h.order,
        content: h.content,
        sourceType: h.sourceType as HintSourceType,
        verified: h.verified
      }
    });
  }

  console.log('--- Idempotent Seed Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
