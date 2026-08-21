import { useState } from "react";
import { Card, Segmented } from "antd";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import type { DailyBucket, WeeklyBucket } from "../../hooks/useAnalyticsData";
import { formatCents, getCurrencySymbol } from "../../utils/currency";

interface Props {
  buckets: DailyBucket[];
  weeklyBuckets: WeeklyBucket[];
}

const formatCompactCurrency = (cents: number): string => {
  const symbol = getCurrencySymbol();
  const val = cents / 100;
  if (Math.abs(val) >= 100000) {
    const formatted = (val / 100000).toFixed(val % 100000 === 0 ? 0 : 1);
    return `${symbol}${formatted}L`;
  }
  if (Math.abs(val) >= 1000) {
    const formatted = (val / 1000).toFixed(val % 1000 === 0 ? 0 : 1);
    return `${symbol}${formatted}k`;
  }
  return `${symbol}${val}`;
};

export function SpendingVelocityChart({ buckets, weeklyBuckets }: Props) {
  const [viewMode, setViewMode] = useState<"weekly" | "cumulative">("weekly");

  const CumulativeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const current = payload.find((p: any) => p.dataKey === "cumulativeCents");
      const prev = payload.find(
        (p: any) => p.dataKey === "prevCumulativeCents",
      );
      const bucket = buckets.find((b) => b.label === label);

      return (
        <div className="bg-bg-surface border border-border-base p-3 rounded-xl shadow-lg text-sm min-w-[200px]">
          <div className="font-semibold text-text-base mb-2 border-b border-border-base pb-1">
            {label}
          </div>

          <div className="flex flex-col gap-1.5">
            {current && (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-primary-600 font-medium">
                  <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                  This Period
                </div>
                <div className="font-bold font-financial text-text-base">
                  {formatCents(current.value)}
                </div>
              </div>
            )}

            {prev && (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-text-muted font-medium">
                  <div className="w-2 h-2 rounded-full bg-text-muted"></div>
                  Last Period
                </div>
                <div className="font-bold font-financial text-text-base">
                  {formatCents(prev.value)}
                </div>
              </div>
            )}

            {bucket &&
              (bucket.personalExpenseCents > 0 ||
                bucket.groupShareCents > 0) && (
                <div className="mt-2 pt-2 border-t border-border-subtle text-xs text-text-muted">
                  <div>
                    Day Spend:{" "}
                    <span className="font-financial font-semibold text-text-base">
                      {formatCents(
                        bucket.personalExpenseCents + bucket.groupShareCents,
                      )}
                    </span>
                  </div>
                </div>
              )}
          </div>
        </div>
      );
    }
    return null;
  };

  const WeeklyBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const bucket = weeklyBuckets.find((w) => w.label === label);
      const personal = payload.find((p: any) => p.dataKey === "personalExpenseCents");
      const group = payload.find((p: any) => p.dataKey === "groupShareCents");
      const total = bucket?.totalCents ?? (personal?.value || 0) + (group?.value || 0);

      return (
        <div className="bg-bg-surface border border-border-base p-3 rounded-xl shadow-lg text-sm min-w-[200px]">
          <div className="font-semibold text-text-base mb-2 border-b border-border-base pb-1">
            {label}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-text-muted font-medium">Total Spend</span>
              <span className="font-bold font-financial text-text-base">
                {formatCents(total)}
              </span>
            </div>

            {personal && personal.value > 0 && (
              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-primary-600 font-medium">
                  <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                  Personal
                </div>
                <div className="font-bold font-financial text-text-base">
                  {formatCents(personal.value)}
                </div>
              </div>
            )}

            {group && group.value > 0 && (
              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-yellow-600 font-medium">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  Group Share
                </div>
                <div className="font-bold font-financial text-text-base">
                  {formatCents(group.value)}
                </div>
              </div>
            )}

            {bucket && bucket.prevTotalCents > 0 && (
              <div className="mt-2 pt-2 border-t border-border-subtle text-xs flex items-center justify-between text-text-muted">
                <span>Last Period Match</span>
                <span className="font-financial font-medium">
                  {formatCents(bucket.prevTotalCents)}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mb-4">
      <Card
        title={
          <div className="flex flex-wrap items-center justify-between gap-2 py-0.5">
            <span className="text-sm font-semibold tracking-wide">
              Spending Pace & Trends
            </span>
            <Segmented
              size="small"
              value={viewMode}
              onChange={(val) => setViewMode(val as "weekly" | "cumulative")}
              options={[
                {
                  label: (
                    <span className={`px-1 font-semibold text-xs transition-colors ${viewMode === "weekly" ? "text-primary-500 font-bold" : "text-text-muted"}`}>
                      Weekly Breakdown
                    </span>
                  ),
                  value: "weekly",
                },
                {
                  label: (
                    <span className={`px-1 font-semibold text-xs transition-colors ${viewMode === "cumulative" ? "text-primary-500 font-bold" : "text-text-muted"}`}>
                      Cumulative Pace
                    </span>
                  ),
                  value: "cumulative",
                },
              ]}
              className="bg-bg-subtle/80 p-0.5 rounded-lg border border-border-subtle text-xs font-semibold"
            />
          </div>
        }
        className="rounded-2xl border-border-base shadow-sm"
      >
        {/* Visual Legend Header */}
        <div className="flex items-center justify-end gap-3 text-xs text-text-muted mb-3 font-medium">
          {viewMode === "weekly" ? (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-primary-500"></div>
                <span>Personal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-yellow-500)]"></div>
                <span>Group Share</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary-500"></div>
                <span>This Period (Solid)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-0.5 border-b-2 border-dashed border-text-muted"></div>
                <span>Last Period (Dashed)</span>
              </div>
            </>
          )}
        </div>

        <div className="h-[280px] w-full select-none outline-none focus:outline-none focus-visible:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none [&_svg]:outline-none [&_*]:focus:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === "weekly" ? (
              <BarChart
                data={weeklyBuckets}
                margin={{ top: 10, right: 10, left: 5, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border-subtle)"
                />
                <XAxis
                  dataKey="label"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tick={{
                    fill: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  width={52}
                  tickMargin={6}
                  tickCount={5}
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tick={{
                    fill: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCompactCurrency}
                />
                <RechartsTooltip cursor={false} content={<WeeklyBarTooltip />} />
                <Bar
                  dataKey="personalExpenseCents"
                  stackId="spend"
                  fill="var(--color-primary-500)"
                  radius={[0, 0, 4, 4]}
                />
                <Bar
                  dataKey="groupShareCents"
                  stackId="spend"
                  fill="var(--color-yellow-500)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
              <AreaChart
                data={buckets}
                margin={{ top: 10, right: 10, left: 5, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorCumulative"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--color-primary-500)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-primary-500)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border-subtle)"
                />
                <XAxis
                  dataKey="label"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tick={{
                    fill: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  width={52}
                  tickMargin={6}
                  tickCount={5}
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tick={{
                    fill: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCompactCurrency}
                />
                <RechartsTooltip 
                  cursor={{ stroke: 'var(--border-subtle)', strokeDasharray: '3 3' }} 
                  content={<CumulativeTooltip />} 
                />

                {/* Previous Period - Dotted Line */}
                <Line
                  type="monotone"
                  dataKey="prevCumulativeCents"
                  stroke="var(--text-muted)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />

                {/* Current Period - Solid Area */}
                <Area
                  type="monotone"
                  dataKey="cumulativeCents"
                  stroke="var(--color-primary-500)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCumulative)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
