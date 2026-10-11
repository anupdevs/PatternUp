import fs from 'fs';
import path from 'path';

interface Topic {
  slug: string;
  name: string;
  description: string;
  displayOrder: number;
}

interface Pattern {
  topicSlug: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
}

interface CanonicalProblem {
  canonicalSlug: string;
  title: string;
  description: string | null;
  difficulty: string;
  difficultySource: string;
  platform: string;
  externalUrl: string | null;
  originalPdfQuestionNumber: number;
  sourcePage: string | null;
  displayOrder: number;
  tags: string[];
  examples: unknown | null;
  constraints: unknown | null;
  contentVerificationStatus: string;
}

interface SheetMapping {
  sheetNumber: number;
  canonicalSlug: string;
  topicSlug: string;
  patternSlug: string;
  pdfTitle: string;
  pdfPage: number;
  displayOrder: number;
}

export interface ValidationReport {
  totalSheetProblems: number;
  uniqueCanonicalProblems: number;
  totalTopics: number;
  totalPatterns: number;
  verifiedProblemsCount: number;
  unresolvedRecordsCount: number;
  sharedCanonicalProblemsCount: number;
  missingFieldsCount: number;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

export function validateContentPipeline(): ValidationReport {
  const seedDir = path.resolve(__dirname, '../prisma/seed-data');

  const topics: Topic[] = JSON.parse(fs.readFileSync(path.join(seedDir, 'topics.json'), 'utf8'));
  const patterns: Pattern[] = JSON.parse(fs.readFileSync(path.join(seedDir, 'patterns.json'), 'utf8'));
  const canonicalProblems: CanonicalProblem[] = JSON.parse(fs.readFileSync(path.join(seedDir, 'canonical_problems.json'), 'utf8'));
  const sheetMappings: SheetMapping[] = JSON.parse(fs.readFileSync(path.join(seedDir, 'sheet_mappings.json'), 'utf8'));

  const errors: string[] = [];
  const warnings: string[] = [];
  let missingFieldsCount = 0;

  // 1. Validate Topics
  const topicSlugSet = new Set<string>();
  topics.forEach((t, i) => {
    if (!t.slug || !t.name) {
      errors.push(`Topic at index ${i} missing slug or name`);
    }
    if (topicSlugSet.has(t.slug)) {
      errors.push(`Duplicate topic slug: ${t.slug}`);
    }
    topicSlugSet.add(t.slug);
  });

  // 2. Validate Patterns and Topic-Pattern relationship
  const patternKeySet = new Set<string>();
  patterns.forEach((p, i) => {
    if (!topicSlugSet.has(p.topicSlug)) {
      errors.push(`Pattern '${p.name}' references non-existent topic slug '${p.topicSlug}'`);
    }
    const key = `${p.topicSlug}::${p.slug}`;
    if (patternKeySet.has(key)) {
      errors.push(`Duplicate pattern '${p.slug}' under topic '${p.topicSlug}'`);
    }
    patternKeySet.add(key);
  });

  // 3. Validate Canonical Problems
  const canonicalSlugMap = new Map<string, CanonicalProblem>();
  const allowedDifficulties = new Set(['EASY', 'MEDIUM', 'HARD', 'UNKNOWN']);
  const allowedPlatforms = new Set(['LEETCODE', 'GEEKS_FOR_GEEKS', 'OTHER']);

  canonicalProblems.forEach((prob) => {
    if (canonicalSlugMap.has(prob.canonicalSlug)) {
      errors.push(`Duplicate canonical slug in canonical_problems.json: ${prob.canonicalSlug}`);
    }
    canonicalSlugMap.set(prob.canonicalSlug, prob);

    if (!prob.title || prob.title.trim().length === 0) {
      errors.push(`Problem ${prob.canonicalSlug} has empty title`);
      missingFieldsCount++;
    }

    if (!allowedDifficulties.has(prob.difficulty)) {
      errors.push(`Problem ${prob.canonicalSlug} has invalid difficulty '${prob.difficulty}'`);
    }

    if (!allowedPlatforms.has(prob.platform)) {
      errors.push(`Problem ${prob.canonicalSlug} has invalid platform '${prob.platform}'`);
    }

    if (!prob.difficultySource) {
      warnings.push(`Problem ${prob.canonicalSlug} missing difficultySource`);
      missingFieldsCount++;
    }

    if (prob.externalUrl) {
      if (!prob.externalUrl.startsWith('https://')) {
        errors.push(`Problem ${prob.canonicalSlug} has invalid URL format: ${prob.externalUrl}`);
      }
    } else {
      warnings.push(`Problem ${prob.canonicalSlug} has no external practice URL`);
      missingFieldsCount++;
    }
  });

  // 4. Validate Sheet Mappings (The 211 PDF items)
  const sheetNumberSet = new Set<number>();
  const slugAppearanceCount = new Map<string, number>();

  sheetMappings.forEach((m) => {
    if (sheetNumberSet.has(m.sheetNumber)) {
      errors.push(`Duplicate sheet question number: ${m.sheetNumber}`);
    }
    sheetNumberSet.add(m.sheetNumber);

    slugAppearanceCount.set(m.canonicalSlug, (slugAppearanceCount.get(m.canonicalSlug) || 0) + 1);

    if (!canonicalSlugMap.has(m.canonicalSlug)) {
      errors.push(`Sheet mapping #${m.sheetNumber} references missing canonical problem '${m.canonicalSlug}'`);
    }

    if (!topicSlugSet.has(m.topicSlug)) {
      errors.push(`Sheet mapping #${m.sheetNumber} references missing topic '${m.topicSlug}'`);
    }

    const patternKey = `${m.topicSlug}::${m.patternSlug}`;
    if (!patternKeySet.has(patternKey)) {
      errors.push(`Sheet mapping #${m.sheetNumber} references invalid pattern '${m.patternSlug}' under topic '${m.topicSlug}'`);
    }

    if (!m.pdfTitle || m.pdfTitle.trim().length === 0) {
      errors.push(`Sheet mapping #${m.sheetNumber} has missing pdfTitle`);
      missingFieldsCount++;
    }
  });

  // Verify numbering continuity (1 to 211)
  for (let num = 1; num <= 211; num++) {
    if (!sheetNumberSet.has(num)) {
      errors.push(`Missing sheet question number: ${num}`);
    }
  }

  // Count shared canonical problems across patterns
  let sharedCanonicalProblemsCount = 0;
  slugAppearanceCount.forEach((count) => {
    if (count > 1) sharedCanonicalProblemsCount++;
  });

  let verifiedProblemsCount = 0;
  let unresolvedRecordsCount = 0;

  canonicalProblems.forEach((p) => {
    if (p.contentVerificationStatus === 'VERIFIED') {
      verifiedProblemsCount++;
    } else {
      unresolvedRecordsCount++;
    }
  });

  return {
    totalSheetProblems: sheetMappings.length,
    uniqueCanonicalProblems: canonicalProblems.length,
    totalTopics: topics.length,
    totalPatterns: patterns.length,
    verifiedProblemsCount,
    unresolvedRecordsCount,
    sharedCanonicalProblemsCount,
    missingFieldsCount,
    errors,
    warnings,
    isValid: errors.length === 0
  };
}

if (require.main === module) {
  const report = validateContentPipeline();

  console.log('================================================================');
  console.log('       DSA CONTENT PIPELINE & TAXONOMY VALIDATION REPORT        ');
  console.log('================================================================');
  console.log(`- Total Sheet Problems Extracted: ${report.totalSheetProblems} (Expected: 211)`);
  console.log(`- Unique Canonical Problems:      ${report.uniqueCanonicalProblems}`);
  console.log(`- Total Topics:                   ${report.totalTopics}`);
  console.log(`- Total Patterns:                 ${report.totalPatterns}`);
  console.log(`- Fully Verified Problems:        ${report.verifiedProblemsCount}`);
  console.log(`- Unresolved / Pending Records:   ${report.unresolvedRecordsCount}`);
  console.log(`- Multi-Pattern Canonical Probs:  ${report.sharedCanonicalProblemsCount}`);
  console.log(`- Missing Optional Fields:        ${report.missingFieldsCount}`);
  console.log(`- Validation Errors:              ${report.errors.length}`);
  console.log(`- Warnings:                       ${report.warnings.length}`);
  console.log('----------------------------------------------------------------');

  if (report.errors.length > 0) {
    console.error('Validation ERRORS:');
    report.errors.forEach(e => console.error(`  [ERROR] ${e}`));
    process.exit(1);
  } else {
    console.log('Validation SUCCESS: All checks passed. Content pipeline is 100% sound.');
  }
}
