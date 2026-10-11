import { prisma } from '@/lib/prisma';
import { UpdatePreferencesInput } from '@/lib/validations';
import { isLiveDb } from '@/lib/db-check';
import { offlineUserStore } from '@/lib/offline-user-store';

export class PreferenceService {
  /**
   * Fetch preferences for user, creating defaults if not yet established.
   */
  static async getPreferences(userId: string) {
    if (!isLiveDb()) {
      return offlineUserStore.getPreferences(userId);
    }
    try {
      let prefs = await prisma.userPreferences.findUnique({
        where: { clerkUserId: userId }
      });

      if (!prefs) {
        prefs = await prisma.userPreferences.create({
          data: {
            clerkUserId: userId,
            dailyProblemGoal: 3,
            preferredCodingLanguage: 'python',
            timezone: 'UTC',
            themePreference: 'system'
          }
        });
      }

      return prefs;
    } catch {
      return offlineUserStore.getPreferences(userId);
    }
  }

  /**
   * Update preferences for user.
   */
  static async updatePreferences(userId: string, input: UpdatePreferencesInput) {
    if (!isLiveDb()) {
      return offlineUserStore.updatePreferences(userId, {
        dailyProblemGoal: input.dailyProblemGoal,
        preferredCodingLanguage: input.preferredCodingLanguage,
        timezone: input.timezone,
        themePreference: input.themePreference
      });
    }
    try {
      return await prisma.userPreferences.upsert({
        where: { clerkUserId: userId },
        create: {
          clerkUserId: userId,
          dailyProblemGoal: input.dailyProblemGoal ?? 3,
          preferredCodingLanguage: input.preferredCodingLanguage ?? 'python',
          timezone: input.timezone ?? 'UTC',
          themePreference: input.themePreference ?? 'system'
        },
        update: {
          dailyProblemGoal: input.dailyProblemGoal ?? undefined,
          preferredCodingLanguage: input.preferredCodingLanguage ?? undefined,
          timezone: input.timezone ?? undefined,
          themePreference: input.themePreference ?? undefined
        }
      });
    } catch {
      return offlineUserStore.updatePreferences(userId, {
        dailyProblemGoal: input.dailyProblemGoal,
        preferredCodingLanguage: input.preferredCodingLanguage,
        timezone: input.timezone,
        themePreference: input.themePreference
      });
    }
  }
}
