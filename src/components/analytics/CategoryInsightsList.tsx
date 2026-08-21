import { Card, Tag } from 'antd';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { CategoryStat, OutlierItem } from '../../hooks/useAnalyticsData';
import { formatCents } from '../../utils/currency';
import dayjs from 'dayjs';

interface Props {
  categories: CategoryStat[];
  topOutliers: OutlierItem[];
}

export function CategoryInsightsList({ categories, topOutliers }: Props) {
  return (
    <Card 
      title={<span className="text-sm font-semibold tracking-wide">Spending by Category</span>} 
      className="rounded-2xl border-border-base shadow-sm h-full flex flex-col"
      bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <div className="flex-1 space-y-5">
        {categories.length === 0 ? (
          <div className="text-center text-text-muted py-8 text-sm">No category data for this period.</div>
        ) : (
          categories.slice(0, 5).map((cat, idx) => {
            const isUp = cat.deltaPercent !== null && cat.deltaPercent > 0;
            const isDown = cat.deltaPercent !== null && cat.deltaPercent < 0;
            
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-base text-sm">{cat.name}</span>
                    {cat.deltaPercent !== null && (
                      <Tag
                        color="borderless"
                        className={`rounded-md m-0 px-1.5 py-0 border-none text-[10px] flex items-center gap-0.5 font-semibold ${
                          isDown 
                            ? 'bg-[var(--color-success-bg)] text-[var(--color-success-600)]' 
                            : isUp 
                              ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger-600)]'
                              : 'bg-bg-subtle text-text-muted'
                        }`}
                      >
                        {isDown && <ArrowDownRight className="w-2.5 h-2.5" />}
                        {isUp && <ArrowUpRight className="w-2.5 h-2.5" />}
                        <span className="font-financial">{Math.abs(cat.deltaPercent)}%</span>
                      </Tag>
                    )}
                  </div>
                  <span className="font-bold font-financial text-sm">{formatCents(cat.currentCents)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-bg-subtle rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-500 rounded-full" 
                      style={{ width: `${Math.max(1, cat.sharePercent)}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-muted w-8 text-right font-medium font-financial">
                    {cat.sharePercent}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {topOutliers.length > 0 && (
        <div className="mt-6 pt-5 border-t border-border-base">
          <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
            Biggest Expenses This Period
          </h4>
          <div className="space-y-3">
            {topOutliers.map((tx) => (
              <div key={tx.id} className="flex justify-between items-start gap-2">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium text-text-base truncate">
                    {tx.description}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-text-muted">
                      {dayjs(tx.date).format('MMM D')}
                    </span>
                    <span className="text-border-base text-xs">&middot;</span>
                    {tx.source === 'PERSONAL' ? (
                      <span className="text-[10px] bg-bg-subtle text-text-muted px-1.5 py-0.5 rounded-md font-medium tracking-wide">
                        👤 Personal
                      </span>
                    ) : (
                      <span className="text-[10px] bg-primary-500/10 text-primary-600 px-1.5 py-0.5 rounded-md font-medium tracking-wide truncate max-w-[120px]">
                        👥 {tx.subtitle}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold font-financial text-text-base shrink-0 mt-0.5">
                  {formatCents(tx.amountCents)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
