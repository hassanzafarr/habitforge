/**
 * GitHub-style 365-day heatmap built from scratch with SVG.
 *
 * Layout:
 *   - 53 columns (weeks) × 7 rows (days Mon→Sun)
 *   - Each cell: 11px square, 2px gap, 2px border-radius
 *   - Month labels across the top
 *   - Day labels on the left (Mon / Wed / Fri)
 *   - 5-level intensity derived from count/total ratio
 *   - Tooltip on hover showing date + completion stats
 *   - Accessible: role="grid" + aria-labels on cells
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfWeek, addDays, parseISO } from "date-fns";
import { api, qk } from "@/lib/api";
import { intensityColor, isoDate } from "@/lib/utils";
import type { HeatmapCell } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

// ── Constants ──────────────────────────────────────────────────────────────────

const CELL = 11;
const GAP = 2;
const STEP = CELL + GAP;
const COLS = 53;
const ROWS = 7;

const SVG_W = COLS * STEP - GAP;
const SVG_H = ROWS * STEP - GAP;

const DAY_LABELS: Array<{ row: number; label: string }> = [
  { row: 0, label: "Mon" },
  { row: 2, label: "Wed" },
  { row: 4, label: "Fri" },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Build week grid ────────────────────────────────────────────────────────────

interface Cell {
  col: number;
  row: number; // 0=Mon … 6=Sun
  date: string; // YYYY-MM-DD
}

function buildGrid(endDate: Date): Cell[] {
  // Start from the Monday that contains the day 364 days before endDate
  const start = subDays(endDate, 364);
  // Find the Monday ≤ start
  const monday = startOfWeek(start, { weekStartsOn: 1 });
  const cells: Cell[] = [];
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const d = addDays(monday, col * 7 + row);
      cells.push({ col, row, date: isoDate(d) });
    }
  }
  return cells;
}

// ── Month label positions ──────────────────────────────────────────────────────

function buildMonthLabels(cells: Cell[]): Array<{ col: number; label: string }> {
  const seen = new Set<string>();
  const labels: Array<{ col: number; label: string }> = [];
  for (const cell of cells) {
    if (cell.row !== 0) continue;
    const month = cell.date.slice(0, 7); // YYYY-MM
    if (!seen.has(month)) {
      seen.add(month);
      const m = parseInt(cell.date.slice(5, 7), 10) - 1;
      labels.push({ col: cell.col, label: MONTH_NAMES[m] });
    }
  }
  return labels;
}

// ── Heatmap component ──────────────────────────────────────────────────────────

interface Props {
  /** If provided, use this habit's color. Falls back to indigo. */
  baseColor?: string;
  /** Optional: only show this habit's completions */
  habitId?: number;
  title?: string;
}

interface Tooltip {
  x: number;
  y: number;
  date: string;
  count: number;
  total: number;
}

export function Heatmap({ baseColor = "#6366f1", habitId, title }: Props) {
  const today = new Date();
  const from = isoDate(subDays(today, 364));
  const to = isoDate(today);

  // Fetch heatmap data
  const { data, isLoading } = useQuery({
    queryKey: habitId
      ? qk.completions(habitId, from, to)
      : qk.heatmap(from, to),
    queryFn: habitId
      ? () =>
          api.listCompletions(habitId, from, to).then((completions) =>
            // Convert per-habit completions to HeatmapCell shape
            completions.map((c) => ({
              date: c.date,
              count: c.status === "done" ? 1 : 0,
              total: 1,
            }))
          )
      : () => api.heatmap(from, to),
  });

  // Build static grid (memoized — only changes when today changes)
  const cells = useMemo(() => buildGrid(today), []); // eslint-disable-line react-hooks/exhaustive-deps
  const monthLabels = useMemo(() => buildMonthLabels(cells), [cells]);

  // Build lookup map date → HeatmapCell
  const lookup = useMemo<Map<string, HeatmapCell>>(() => {
    const m = new Map<string, HeatmapCell>();
    if (data) data.forEach((c) => m.set(c.date, c));
    return m;
  }, [data]);

  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  if (isLoading) {
    return <Skeleton className="h-28 w-full rounded-xl" />;
  }

  const LABEL_W = 28; // left label area width
  const MONTH_H = 16; // top month label height
  const TOTAL_W = LABEL_W + SVG_W;
  const TOTAL_H = MONTH_H + SVG_H;

  return (
    <div className="relative overflow-x-auto">
      {title && <p className="mb-2 text-xs font-medium text-muted">{title}</p>}

      <svg
        role="grid"
        aria-label="Habit completion heatmap"
        width={TOTAL_W}
        height={TOTAL_H}
        style={{ fontFamily: "inherit" }}
      >
        {/* Month labels */}
        {monthLabels.map(({ col, label }) => (
          <text
            key={`m-${col}`}
            x={LABEL_W + col * STEP}
            y={10}
            fontSize={9}
            fill="currentColor"
            className="text-muted fill-neutral-500"
          >
            {label}
          </text>
        ))}

        {/* Day labels */}
        {DAY_LABELS.map(({ row, label }) => (
          <text
            key={`d-${row}`}
            x={0}
            y={MONTH_H + row * STEP + CELL - 1}
            fontSize={9}
            fill="currentColor"
            className="text-muted fill-neutral-500"
          >
            {label}
          </text>
        ))}

        {/* Grid cells */}
        {cells.map(({ col, row, date }) => {
          const cell = lookup.get(date);
          const ratio = cell && cell.total > 0 ? cell.count / cell.total : 0;
          const fill = intensityColor(baseColor, ratio);
          const x = LABEL_W + col * STEP;
          const y = MONTH_H + row * STEP;

          return (
            <rect
              key={date}
              role="gridcell"
              aria-label={`${date}: ${cell ? `${cell.count}/${cell.total}` : "no data"}`}
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              rx={2}
              fill={fill}
              className="cursor-pointer transition-opacity hover:opacity-80"
              onMouseEnter={() =>
                setTooltip({
                  x: x + CELL / 2,
                  y: y - 4,
                  date,
                  count: cell?.count ?? 0,
                  total: cell?.total ?? 0,
                })
              }
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <HeatmapTooltip
              x={tooltip.x}
              y={tooltip.y}
              date={tooltip.date}
              count={tooltip.count}
              total={tooltip.total}
            />
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="mt-1 flex items-center gap-1 justify-end">
        <span className="text-[9px] text-muted mr-1">Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <div
            key={r}
            style={{
              width: CELL,
              height: CELL,
              borderRadius: 2,
              backgroundColor: intensityColor(baseColor, r),
            }}
          />
        ))}
        <span className="text-[9px] text-muted ml-1">More</span>
      </div>
    </div>
  );
}

// ── SVG tooltip ───────────────────────────────────────────────────────────────

interface TooltipProps {
  x: number;
  y: number;
  date: string;
  count: number;
  total: number;
}

function HeatmapTooltip({ x, y, date, count, total }: TooltipProps) {
  const label =
    total === 0
      ? "No habits due"
      : `${count} of ${total} completed`;
  const formattedDate = format(parseISO(date), "MMM d, yyyy");
  const text = `${formattedDate} · ${label}`;
  const width = text.length * 5.6 + 16;

  return (
    <>
      <rect
        x={x - width / 2}
        y={y - 22}
        width={width}
        height={18}
        rx={4}
        fill="#1c1917"
        opacity={0.9}
      />
      <text
        x={x}
        y={y - 9}
        fontSize={9}
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {text}
      </text>
    </>
  );
}
