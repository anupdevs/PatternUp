-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('LEETCODE', 'GEEKS_FOR_GEEKS', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'PENDING_VERIFICATION', 'NEEDS_RESOLUTION');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('NOT_STARTED', 'ATTEMPTED', 'SOLVED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "AttemptOutcome" AS ENUM ('SOLVED', 'FAILED', 'PARTIALLY_SOLVED');

-- CreateEnum
CREATE TYPE "HintSourceType" AS ENUM ('OFFICIAL_PLATFORM', 'INFERRED_EDITORIAL', 'USER_CONTRIBUTED');

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pattern" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "canonicalSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'UNKNOWN',
    "difficultySource" TEXT NOT NULL DEFAULT 'Bosscoder PDF / Inferred',
    "platform" "Platform" NOT NULL DEFAULT 'LEETCODE',
    "externalUrl" TEXT,
    "originalPdfQuestionNumber" INTEGER NOT NULL,
    "sourcePage" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "examples" JSONB,
    "constraints" JSONB,
    "contentVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'VERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemPattern" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "sheetNumber" INTEGER NOT NULL,
    "pdfTitle" TEXT NOT NULL,
    "pdfPage" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProblemProgress" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "firstAttemptAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "solvedAt" TIMESTAMP(3),
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "successfulAttempts" INTEGER NOT NULL DEFAULT 0,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "totalTimeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "personalDifficulty" INTEGER,
    "confidenceRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProblemProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemNote" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeAttempt" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" "AttemptOutcome" NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "approachNotes" TEXT,
    "difficultyExperienced" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemHint" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "sourceType" "HintSourceType" NOT NULL DEFAULT 'OFFICIAL_PLATFORM',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemHint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HintReveal" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "hintId" TEXT NOT NULL,
    "revealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HintReveal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyActivity" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "questionsAttempted" INTEGER NOT NULL DEFAULT 0,
    "questionsSolved" INTEGER NOT NULL DEFAULT 0,
    "studyDurationSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionSchedule" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "intervalDays" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "repetitionCount" INTEGER NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevisionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "dailyProblemGoal" INTEGER NOT NULL DEFAULT 3,
    "preferredCodingLanguage" TEXT NOT NULL DEFAULT 'python',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "themePreference" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE INDEX "Topic_displayOrder_idx" ON "Topic"("displayOrder");

-- CreateIndex
CREATE INDEX "Pattern_topicId_idx" ON "Pattern"("topicId");

-- CreateIndex
CREATE INDEX "Pattern_displayOrder_idx" ON "Pattern"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Pattern_topicId_slug_key" ON "Pattern"("topicId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_canonicalSlug_key" ON "Problem"("canonicalSlug");

-- CreateIndex
CREATE INDEX "Problem_difficulty_idx" ON "Problem"("difficulty");

-- CreateIndex
CREATE INDEX "Problem_platform_idx" ON "Problem"("platform");

-- CreateIndex
CREATE INDEX "Problem_displayOrder_idx" ON "Problem"("displayOrder");

-- CreateIndex
CREATE INDEX "Problem_originalPdfQuestionNumber_idx" ON "Problem"("originalPdfQuestionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemPattern_sheetNumber_key" ON "ProblemPattern"("sheetNumber");

-- CreateIndex
CREATE INDEX "ProblemPattern_problemId_idx" ON "ProblemPattern"("problemId");

-- CreateIndex
CREATE INDEX "ProblemPattern_patternId_idx" ON "ProblemPattern"("patternId");

-- CreateIndex
CREATE INDEX "ProblemPattern_sheetNumber_idx" ON "ProblemPattern"("sheetNumber");

-- CreateIndex
CREATE INDEX "UserProblemProgress_clerkUserId_idx" ON "UserProblemProgress"("clerkUserId");

-- CreateIndex
CREATE INDEX "UserProblemProgress_clerkUserId_status_idx" ON "UserProblemProgress"("clerkUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserProblemProgress_clerkUserId_problemId_key" ON "UserProblemProgress"("clerkUserId", "problemId");

-- CreateIndex
CREATE INDEX "ProblemNote_clerkUserId_idx" ON "ProblemNote"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemNote_clerkUserId_problemId_key" ON "ProblemNote"("clerkUserId", "problemId");

-- CreateIndex
CREATE INDEX "Bookmark_clerkUserId_idx" ON "Bookmark"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_clerkUserId_problemId_key" ON "Bookmark"("clerkUserId", "problemId");

-- CreateIndex
CREATE INDEX "PracticeAttempt_clerkUserId_idx" ON "PracticeAttempt"("clerkUserId");

-- CreateIndex
CREATE INDEX "PracticeAttempt_clerkUserId_problemId_idx" ON "PracticeAttempt"("clerkUserId", "problemId");

-- CreateIndex
CREATE INDEX "PracticeAttempt_clerkUserId_attemptedAt_idx" ON "PracticeAttempt"("clerkUserId", "attemptedAt");

-- CreateIndex
CREATE INDEX "ProblemHint_problemId_idx" ON "ProblemHint"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemHint_problemId_order_key" ON "ProblemHint"("problemId", "order");

-- CreateIndex
CREATE INDEX "HintReveal_clerkUserId_problemId_idx" ON "HintReveal"("clerkUserId", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "HintReveal_clerkUserId_hintId_key" ON "HintReveal"("clerkUserId", "hintId");

-- CreateIndex
CREATE INDEX "DailyActivity_clerkUserId_idx" ON "DailyActivity"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyActivity_clerkUserId_date_key" ON "DailyActivity"("clerkUserId", "date");

-- CreateIndex
CREATE INDEX "RevisionSchedule_clerkUserId_nextReviewAt_idx" ON "RevisionSchedule"("clerkUserId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "RevisionSchedule_clerkUserId_problemId_key" ON "RevisionSchedule"("clerkUserId", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_clerkUserId_key" ON "UserPreferences"("clerkUserId");

-- CreateIndex
CREATE INDEX "UserPreferences_clerkUserId_idx" ON "UserPreferences"("clerkUserId");

-- AddForeignKey
ALTER TABLE "Pattern" ADD CONSTRAINT "Pattern_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemPattern" ADD CONSTRAINT "ProblemPattern_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemPattern" ADD CONSTRAINT "ProblemPattern_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "Pattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProblemProgress" ADD CONSTRAINT "UserProblemProgress_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemNote" ADD CONSTRAINT "ProblemNote_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemHint" ADD CONSTRAINT "ProblemHint_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HintReveal" ADD CONSTRAINT "HintReveal_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HintReveal" ADD CONSTRAINT "HintReveal_hintId_fkey" FOREIGN KEY ("hintId") REFERENCES "ProblemHint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionSchedule" ADD CONSTRAINT "RevisionSchedule_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

