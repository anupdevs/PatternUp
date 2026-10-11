import React from 'react';
import { notFound } from 'next/navigation';
import { CatalogService } from '@/services/catalog.service';
import { getAuthenticatedUser } from '@/lib/auth';
import { ProblemWorkspace, ProblemDetailData } from '@/components/workspace/problem-workspace';
import { prisma } from '@/lib/prisma';

export async function generateMetadata({
  params
}: {
  params: Promise<{ idOrSlug: string }>;
}) {
  const { idOrSlug } = await params;
  const problem = await CatalogService.getProblemDetails(idOrSlug);
  if (!problem) return { title: 'Problem Workspace | DSA Platform' };

  return {
    title: `#${problem.originalPdfQuestionNumber} ${problem.title} | DSA Platform`,
    description: `Practice #${problem.originalPdfQuestionNumber} ${problem.title} on DSA Platform with progressive hints and spaced repetition tracking.`
  };
}

export default async function ProblemPage({
  params
}: {
  params: Promise<{ idOrSlug: string }>;
}) {
  const { idOrSlug } = await params;
  const userId = await getAuthenticatedUser();

  const problem = await CatalogService.getProblemDetails(idOrSlug, userId);
  if (!problem) {
    notFound();
  }

  // Find neighbor problems in the same pattern for navigation
  let patternNeighbors = undefined;
  if (problem.patterns && problem.patterns.length > 0) {
    const patternSlug = problem.patterns[0].patternSlug;
    try {
      const { isLiveDb } = await import('@/lib/db-check');
      if (isLiveDb()) {
        const patternProblems = await prisma.problemPattern.findMany({
          where: { pattern: { slug: patternSlug } },
          orderBy: { sheetNumber: 'asc' },
          include: { problem: { select: { canonicalSlug: true } } }
        });

        const currentIndex = patternProblems.findIndex(
          (pp) => pp.problem.canonicalSlug === problem.canonicalSlug
        );

        if (currentIndex !== -1) {
          patternNeighbors = {
            currentIndex,
            totalInPattern: patternProblems.length,
            prevSlug: currentIndex > 0 ? patternProblems[currentIndex - 1].problem.canonicalSlug : undefined,
            nextSlug:
              currentIndex < patternProblems.length - 1
                ? patternProblems[currentIndex + 1].problem.canonicalSlug
                : undefined
          };
        }
      }
    } catch {
      // Fallback to offline catalog loader
    }

    if (!patternNeighbors) {
      const { offlineCatalog } = await import('@/lib/offline-catalog');
      const hierarchy = offlineCatalog.getPatternHierarchy();
      for (const t of hierarchy) {
        const pat = t.patterns.find((p) => p.slug === patternSlug);
        if (pat) {
          const currentIndex = pat.problems.findIndex(
            (p) => p.canonicalSlug === problem.canonicalSlug
          );
          if (currentIndex !== -1) {
            patternNeighbors = {
              currentIndex,
              totalInPattern: pat.problems.length,
              prevSlug: currentIndex > 0 ? pat.problems[currentIndex - 1].canonicalSlug : undefined,
              nextSlug:
                currentIndex < pat.problems.length - 1
                  ? pat.problems[currentIndex + 1].canonicalSlug
                  : undefined
            };
            break;
          }
        }
      }
    }
  }

  return (
    <ProblemWorkspace
      problem={problem as unknown as ProblemDetailData}
      patternNeighbors={patternNeighbors}
    />
  );
}
