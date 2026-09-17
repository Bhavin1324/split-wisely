import { Skeleton, Card } from 'antd';

// ─── Helper: semantic bone element ────────────────────────────────────────────
// Uses bg-bg-subtle so bones are visible in both light and dark schemes without
// any hardcoded hex or raw palette class.
function Bone({ className }: { className: string }) {
  return <div className={`bg-bg-subtle animate-pulse rounded-lg ${className}`} />;
}

type SkeletonLayout = 'dashboard' | 'friends' | 'list' | 'analytics';

export function PageSkeleton({ layout = 'list' }: { layout?: SkeletonLayout }) {

  // ── A. Dashboard — Revolut Ultra mirror ─────────────────────────────────────
  // Dimensions sourced directly from DashboardHeroCard, DashboardGroupsSection,
  // DashboardActivitySection, and ActivityItem to guarantee zero CLS on hydration.
  if (layout === 'dashboard') {
    return (
      <div className="mx-auto max-w-5xl space-y-7 px-3 sm:px-6 lg:px-8 py-5 sm:py-8 pb-32 md:pb-8">

        {/* 1. Header Row — mirrors DashboardPage.tsx:144-161 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar initials circle */}
            <Bone className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
            {/* "Welcome back" + display name */}
            <div className="space-y-1.5">
              <Bone className="h-3 w-24 rounded" />
              <Bone className="h-5 w-36 rounded" />
            </div>
          </div>
          {/* Active Groups badge pill */}
          <Bone className="h-6 w-28 rounded-full" />
        </div>

        {/* 2. Hero Card — mirrors DashboardHeroCard (rounded-3xl border bg-bg-surface p-5 sm:p-7) */}
        <div className="rounded-3xl border border-border-base bg-bg-surface p-5 sm:p-7">
          {/* Label row: "Total Net Position" + "Detailed Analytics" link */}
          <div className="flex items-center justify-between mb-2">
            <Bone className="h-3 w-28 rounded" />
            <Bone className="h-3 w-24 rounded" />
          </div>
          {/* Main balance number + status pill (text-4xl sm:text-5xl font-black) */}
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 sm:gap-4">
            <Bone className="h-12 w-52 rounded-xl" />
            <Bone className="h-6 w-44 rounded-full" />
          </div>
          {/* 2-col sub-metric cards: You have to pay / You will receive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-5 border-t border-border-subtle">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="p-3.5 sm:p-4 rounded-2xl bg-bg-subtle/70 border border-border-subtle"
              >
                <Bone className="h-3 w-24 rounded mb-2" />
                <Bone className="h-7 w-28 rounded-lg mb-1.5" />
                <Bone className="h-2.5 w-32 rounded" />
              </div>
            ))}
          </div>
          {/* 4-slot Quick Action pill bar (grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
            {[0, 1, 2, 3].map((i) => (
              <Bone key={i} className="h-10 rounded-2xl" />
            ))}
          </div>
        </div>

        {/* 3. Groups Section — mirrors DashboardGroupsSection */}
        <section>
          {/* Section header: "Your Groups" title + badge + toggle + create btn */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Bone className="h-6 w-28 rounded" />
              <Bone className="h-5 w-14 rounded-full" />
            </div>
            <div className="flex items-center gap-3">
              <Bone className="h-8 w-40 rounded-xl" />
              <Bone className="h-8 w-28 rounded-xl" />
            </div>
          </div>
          {/* Group card grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 — h-44 matches GroupCard */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-44 rounded-3xl border border-border-base bg-bg-surface p-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <Bone className="h-4 w-3/5 rounded" />
                  <Bone className="h-3 w-2/5 rounded" />
                </div>
                <div className="space-y-2">
                  <Bone className="h-7 w-1/2 rounded-lg" />
                  <Bone className="h-3 w-3/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Recent Activity — mirrors ActivityItem (p-3.5 sm:p-4 rounded-2xl border-border-subtle) */}
        <section>
          <Bone className="h-6 w-36 rounded mb-4" />
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 sm:gap-4 rounded-2xl bg-bg-surface p-3.5 sm:p-4 border border-border-subtle"
              >
                {/* Category icon circle: w-10 h-10 rounded-2xl */}
                <Bone className="w-10 h-10 shrink-0 rounded-2xl" />
                {/* Description + meta row */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Bone className="h-4 w-2/5 rounded" />
                  <Bone className="h-3 w-3/5 rounded" />
                </div>
                {/* Amount pill + status label */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Bone className="h-5 w-16 rounded-full" />
                  <Bone className="h-2.5 w-12 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    );
  }

  // ── B. Friends — Apple Serenity mirror ──────────────────────────────────────
  // Dimensions sourced from FriendsHeroCard, FriendsFilterBar, FriendListItem.
  // Root wrapper mirrors FriendsPage.tsx:166 exactly (space-y-6 pb-32 md:pb-6).
  if (layout === 'friends') {
    return (
      <div className="space-y-6 pb-32 md:pb-6">

        {/* 1. Conversational Hero Card — mirrors FriendsHeroCard (rounded-2xl p-5 sm:p-6) */}
        <div className="rounded-2xl border border-border-base bg-bg-surface p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Label / headline / subtext stack */}
            <div className="space-y-2">
              <Bone className="h-3 w-32 rounded" />
              <Bone className="h-8 w-64 rounded-xl" />
              <Bone className="h-4 w-48 rounded" />
            </div>
            {/* "Add Friend" button placeholder: h-10 w-28 rounded-xl */}
            <Bone className="h-10 w-28 rounded-xl shrink-0 self-start sm:self-center" />
          </div>
        </div>

        {/* 2. Filter Bar — mirrors FriendsFilterBar (space-y-3) */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search input pill: h-10 rounded-xl max-w-md */}
            <Bone className="h-10 flex-1 max-w-md rounded-xl" />
            {/* 4 filter chip bones: h-10 w-20 rounded-xl (min-h-[40px] from real chips) */}
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3].map((i) => (
                <Bone key={i} className="h-10 w-20 shrink-0 rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        {/* 3. Continuous grouped list — mirrors FriendListItem rows inside rounded-2xl container */}
        <div className="rounded-2xl border border-border-base bg-bg-surface overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-4 sm:px-6 py-4 ${
                i < 4 ? 'border-b border-border-subtle' : ''
              }`}
            >
              {/* Avatar circle (size={44} → w-11 h-11) + name/status bones */}
              <div className="flex items-center gap-3.5 min-w-0">
                <Bone className="w-11 h-11 rounded-full shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <Bone className="h-4 w-36 rounded" />
                  <Bone className="h-3 w-24 rounded" />
                </div>
              </div>
              {/* Amount bone + chevron placeholder */}
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <Bone className="h-5 w-16 rounded" />
                <Bone className="w-4 h-4 rounded" />
              </div>
            </div>
          ))}
        </div>

      </div>
    );
  }

  // ── C. List — Unchanged (SearchPage and any other consumer) ────────────────
  if (layout === 'list') {
    return (
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 animate-pulse">
        <div className="space-y-2">
          <Skeleton.Input active size="large" className="w-1/3" />
          <br />
          <Skeleton.Input active size="small" className="w-1/4" />
        </div>
        <div className="space-y-4 mt-8">
          {[1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="rounded-xl bg-bg-surface p-4 shadow-sm border border-border-base">
              <Skeleton active avatar paragraph={{ rows: 0 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── D. Analytics — Unchanged ────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 animate-pulse">
      <div className="space-y-2">
        <Skeleton.Input active size="large" className="w-1/3" />
        <br />
        <Skeleton.Input active size="small" className="w-1/4" />
      </div>
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
    </div>
  );
}
