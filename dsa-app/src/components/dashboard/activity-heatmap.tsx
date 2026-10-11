'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

interface ActivityDay {
  date: string; // YYYY-MM-DD
  questionsAttempted: number;
  questionsSolved: number;
  studyDurationSeconds: number;
}

interface ActivityHeatmapProps {
  activities?: ActivityDay[];
  timezone?: string;
}

export function ActivityHeatmap({ activities = [], timezone = 'UTC' }: ActivityHeatmapProps) {
  // Generate past 16 weeks of daily squares
  const activityMap = React.useMemo(() => {
    const map = new Map<string, ActivityDay>();
    activities.forEach((act) => {
      map.set(act.date, act);
    });
    return map;
  }, [activities]);

  const weeks = React.useMemo(() => {
    const today = new Date();
    const result: Array<Array<{ dateStr: string; act?: ActivityDay }>> = [];

    // Go back 16 weeks (112 days)
    const startDate = new Date();
    startDate.setDate(today.getDate() - 111);

    // align to Sunday
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const curr = new Date(startDate);
    while (curr <= today) {
      const week: Array<{ dateStr: string; act?: ActivityDay }> = [];
      for (let i = 0; i < 7; i++) {
        const dateStr = curr.toISOString().slice(0, 10);
        week.push({
          dateStr,
          act: activityMap.get(dateStr)
        });
        curr.setDate(curr.getDate() + 1);
      }
      result.push(week);
    }
    return result;
  }, [activityMap]);

  const getColorClass = (act?: ActivityDay) => {
    if (!act || (act.questionsAttempted === 0 && act.studyDurationSeconds === 0)) {
      return 'bg-zinc-100 dark:bg-zinc-800/60';
    }
    const score = act.questionsSolved * 2 + act.questionsAttempted;
    if (score >= 4) return 'bg-emerald-600 dark:bg-emerald-500';
    if (score >= 2) return 'bg-emerald-500/70 dark:bg-emerald-500/80';
    return 'bg-emerald-300 dark:bg-emerald-900';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Study Activity Heatmap</CardTitle>
          <p className="text-xs text-zinc-500">
            Past 16 weeks of continuous DSA problem solving
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Calendar className="h-3.5 w-3.5" />
          <span>{timezone}</span>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="overflow-x-auto pb-2">
          <div className="inline-flex flex-col gap-1">
            <div className="flex gap-1.5">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1.5">
                  {week.map((day, dIdx) => {
                    const title = day.act
                      ? `${day.dateStr}: ${day.act.questionsSolved} solved, ${day.act.questionsAttempted} attempted (${Math.round(day.act.studyDurationSeconds / 60)} min)`
                      : `${day.dateStr}: No recorded activity`;

                    return (
                      <div
                        key={dIdx}
                        title={title}
                        className={`h-3 w-3 rounded-xs transition-colors hover:ring-2 hover:ring-indigo-400 ${getColorClass(day.act)}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-zinc-400">
              <span>Less</span>
              <div className="h-2.5 w-2.5 rounded-xs bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-2.5 w-2.5 rounded-xs bg-emerald-300 dark:bg-emerald-900" />
              <div className="h-2.5 w-2.5 rounded-xs bg-emerald-500/70 dark:bg-emerald-500/80" />
              <div className="h-2.5 w-2.5 rounded-xs bg-emerald-600 dark:bg-emerald-500" />
              <span>More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
