import { Card } from "antd";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import type { DailyBucket } from "../../hooks/useAnalyticsData";
import { formatCents, getCurrencySymbol } from "../../utils/currency";

interface Props {
  buckets: DailyBucket[];
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

export function SpendingVelocityChart({ buckets }: Props) {
  // Find max cumulative value for domain scaling if needed,
  // but Recharts auto-scales nicely.

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const current = payload.find((p: any) => p.dataKey === "cumulativeCents");
      const prev = payload.find(
        (p: any) => p.dataKey === "prevCumulativeCents",
      );

      const bucket = buckets.find((b) => b.label === label);

      return (
        <div className="bg-bg-surface border border-border-base p-3 rounded-xl shadow-lg text-sm">
          <div className="font-semibold text-text-base mb-2 border-b border-border-base pb-1">
            {label}
          </div>

          <div className="flex flex-col gap-1.5">
            {current && (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-primary-600 font-medium">
                  <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                  Current Period
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
                  Previous Period
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
                    Daily Spend:{" "}
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

  return (
    <div className="mb-4">
      <Card
        title={
          <span className="text-sm font-semibold tracking-wide">
            Spending Velocity
          </span>
        }
        className="rounded-2xl border-border-base shadow-sm"
      >
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
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
              <RechartsTooltip content={<CustomTooltip />} />

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
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
