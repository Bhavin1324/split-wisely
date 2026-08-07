import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, Users, ChevronRight } from 'lucide-react';
import type { Group } from '../../types';
import { getBalanceColorClass, formatCents } from '../../utils/currency';
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
        border border-gray-100 bg-white p-5 text-left shadow-sm
        transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer
      "
    >
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-gray-800 leading-snug pr-4">
            {group.name}
          </h3>
          <ChevronRight
            className="
              h-4 w-4 flex-shrink-0 text-gray-300
              transition-transform duration-200 group-hover:translate-x-0.5
              group-hover:text-gray-500
            "
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
          <Users className="h-3.5 w-3.5" />
          <span>
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Balance footer */}
      <div className="mt-5 flex items-center justify-between border-t border-gray-50 pt-3">
        <span className="text-xs text-gray-400">Your balance</span>
        <div className="flex items-center gap-1">
          {balance > 0 && (
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
          )}
          {balance < 0 && (
            <ArrowDownLeft className="h-3.5 w-3.5 text-rose-500" />
          )}
          <span
            className={`font-financial text-sm font-bold ${getBalanceColorClass(balance)}`}
          >
            {formatCents(Math.abs(balance))}
          </span>
        </div>
      </div>

      {/* Balance accent bar at bottom */}
      <div
        className={`
          absolute bottom-0 left-0 h-1 w-full transition-opacity duration-300
          ${balance > 0 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : balance < 0 ? 'bg-gradient-to-r from-rose-400 to-rose-500' : 'bg-gray-200'}
          opacity-60 group-hover:opacity-100
        `}
      />
    </button>
  );
}
