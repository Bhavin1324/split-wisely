import { Skeleton, Card } from 'antd';

type SkeletonLayout = 'dashboard' | 'list' | 'analytics';

export function PageSkeleton({ layout = 'list' }: { layout?: SkeletonLayout }) {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 animate-pulse">
      {/* Header Skeleton (Shared across all pages) */}
      <div className="space-y-2">
        <Skeleton.Input active size="large" className="w-1/3" />
        <br />
        <Skeleton.Input active size="small" className="w-1/4" />
      </div>

      {/* Dashboard Layout (3 Top Cards + Bottom List) */}
      {layout === 'dashboard' && (
        <>
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[1, 2, 3].map((key) => (
              <Card key={key} className="rounded-xl border-none shadow-sm">
                <Skeleton active avatar paragraph={{ rows: 1 }} />
              </Card>
            ))}
          </section>
          <div className="rounded-xl bg-bg-surface p-6 shadow-sm border border-border-base mt-8">
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        </>
      )}

      {/* List Layout (Just a list of items like Friends/Search) */}
      {layout === 'list' && (
        <div className="space-y-4 mt-8">
          {[1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="rounded-xl bg-bg-surface p-4 shadow-sm border border-border-base">
              <Skeleton active avatar paragraph={{ rows: 0 }} />
            </div>
          ))}
        </div>
      )}

      {/* Analytics Layout (Large blocks mimicking charts) */}
      {layout === 'analytics' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-8">
          <Card className="rounded-xl border-none shadow-sm h-64">
            <Skeleton active paragraph={{ rows: 5 }} />
          </Card>
          <Card className="rounded-xl border-none shadow-sm h-64">
            <Skeleton active paragraph={{ rows: 5 }} />
          </Card>
          <Card className="rounded-xl border-none shadow-sm col-span-1 lg:col-span-2 h-64">
             <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        </div>
      )}
    </div>
  );
}
