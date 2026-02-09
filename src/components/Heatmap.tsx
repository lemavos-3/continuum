import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, subDays } from "date-fns";

interface HeatmapProps {
  data: Record<string, number>;
  onDayClick?: (date: string) => void;
}

function getColor(count: number): string {
  if (count === 0) return "bg-muted";
  if (count === 1) return "bg-success/30";
  if (count === 2) return "bg-success/50";
  if (count <= 4) return "bg-success/70";
  return "bg-success";
}

export function Heatmap({ data, onDayClick }: HeatmapProps) {
  const today = new Date();
  const days = Array.from({ length: 364 }, (_, i) => {
    const date = subDays(today, 363 - i);
    const key = format(date, "yyyy-MM-dd");
    return { date, key, count: data[key] || 0 };
  });

  // Group into weeks (columns)
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <Tooltip key={day.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onDayClick?.(day.key)}
                    className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-colors hover:ring-1 hover:ring-primary/50`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{format(day.date, "d MMM yyyy")} · {day.count} menções</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
