import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, Users, ChevronRight } from 'lucide-react';
import type { Group } from '../../types';
import { formatCents } from '../../utils/currency';
import { useGroupMembers } from '../../hooks/supabase/useGroupsData';
import { DEMO_MODE } from '../../context/AppDataContext';
import { MOCK_GROUP_MEMBERS } from '../../lib/mockData';

export function GroupCard({
  group,
  balance,
}: {
  group: Group;
  balance: number;
}) {
  const navigate = useNavigate();
  const { data: liveMembers } = useGroupMembers(group.id);
  const members = DEMO_MODE ? MOCK_GROUP_MEMBERS.filter(m => m.group_id === group.id) : liveMembers;
  const memberCount = group.member_count ?? members.length;

  return (
    <button
      type="button"
      onClick={() => navigate(`/groups/${group.id}`)}
      className="
        group relative flex flex-col justify-between overflow-hidden rounded-2xl
        border border-border-base bg-bg-surface p-5 text-left shadow-sm
        transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer
      "
    >
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-text-base leading-snug pr-4">
            {group.name}
          </h3>
          <ChevronRight
            className="
              h-4 w-4 flex-shrink-0 text-gray-300
              transition-transform duration-200 group-hover:translate-x-0.5
              group-hover:text-text-muted
            "
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
          <Users className="h-3.5 w-3.5" />
          <span>
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Balance footer */}
      <div className="mt-5 flex items-center justify-between border-t border-border-base pt-4">
        <span className="text-xs font-medium text-text-muted">Your balance</span>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
          balance > 0 ? 'bg-success-bg text-success-text' : 
          balance < 0 ? 'bg-error-bg text-error-text' : 
          'bg-bg-subtle text-text-muted'
        }`}>
          {balance > 0 && (
            <ArrowUpRight className="h-3.5 w-3.5" />
          )}
          {balance < 0 && (
            <ArrowDownLeft className="h-3.5 w-3.5" />
          )}
          <span className="font-financial text-sm font-bold">
            {formatCents(Math.abs(balance))}
          </span>
        </div>
      </div>
    </button>
  );
}
