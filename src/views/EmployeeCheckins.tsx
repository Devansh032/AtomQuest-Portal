import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Goal, Checkin, User, Quarter, CheckinStatus, computeScore } from '../types';
import { CheckinStatusBadge } from '../components/StatusBadge';

interface Props {
  currentUser: User;
}

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function EmployeeCheckins({ currentUser }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>('Q1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const [goalsRes, checkinsRes] = await Promise.all([
        supabase.from('goals').select('*').eq('user_id', currentUser.id).eq('status', 'locked'),
        supabase.from('checkins').select('*').in(
          'goal_id',
          (await supabase.from('goals').select('id').eq('user_id', currentUser.id)).data?.map((g) => g.id) ?? []
        ),
      ]);
      setGoals(goalsRes.data ?? []);
      setCheckins(checkinsRes.data ?? []);
      setLoading(false);
    };
    fetch();
  }, [currentUser.id]);

  const getCheckin = (goalId: string, quarter: Quarter) =>
    checkins.find((c) => c.goal_id === goalId && c.quarter === quarter);

  const upsertCheckin = async (
    goalId: string,
    quarter: Quarter,
    field: 'actual_achievement' | 'status',
    value: number | CheckinStatus
  ) => {
    const existing = getCheckin(goalId, quarter);
    setSaving(`${goalId}-${quarter}`);

    const goal = goals.find((g) => g.id === goalId);
    const achievement = field === 'actual_achievement' ? (value as number) : (existing?.actual_achievement ?? 0);
    const score = goal ? computeScore(goal.uom_type, goal.target, achievement) : 0;

    if (existing) {
      const { data } = await supabase
        .from('checkins')
        .update({ [field]: value, computed_score: score, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (data) setCheckins((prev) => prev.map((c) => (c.id === data.id ? data : c)));
    } else {
      const { data } = await supabase
        .from('checkins')
        .insert({
          goal_id: goalId,
          quarter,
          actual_achievement: field === 'actual_achievement' ? value : 0,
          status: field === 'status' ? value : 'not_started',
          computed_score: score,
        })
        .select()
        .single();
      if (data) setCheckins((prev) => [...prev, data]);
    }
    setSaving(null);
  };

  const quarterScore = () => {
    if (goals.length === 0) return null;
    let totalWeighted = 0;
    let totalWeight = 0;
    for (const goal of goals) {
      const c = getCheckin(goal.id, selectedQuarter);
      if (c) {
        totalWeighted += (c.computed_score * goal.weightage) / 100;
        totalWeight += goal.weightage;
      }
    }
    if (totalWeight === 0) return null;
    return (totalWeighted / totalWeight) * 100;
  };

  const score = quarterScore();

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Check-ins</h1>
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm">No locked goals found. Goals must be approved and locked before logging check-ins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Check-ins</h1>
          <p className="text-sm text-gray-500 mt-0.5">Log quarterly achievements</p>
        </div>
        {score !== null && (
          <div className="text-right">
            <p className="text-xs text-gray-500">{selectedQuarter} Progress Score</p>
            <p className={`text-2xl font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-blue-600' : 'text-orange-500'}`}>
              {score.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {/* Quarter tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {QUARTERS.map((q) => (
          <button
            key={q}
            onClick={() => setSelectedQuarter(q)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selectedQuarter === q ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {q}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Goal</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Target</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actual</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {goals.map((goal) => {
              const checkin = getCheckin(goal.id, selectedQuarter);
              const isSaving = saving === `${goal.id}-${selectedQuarter}`;

              return (
                <tr key={goal.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{goal.title}</p>
                    <p className="text-xs text-gray-400">{goal.thrust_area} · {goal.uom_type} · {goal.weightage}%</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{goal.target}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={checkin?.actual_achievement ?? ''}
                      placeholder="—"
                      onChange={(e) =>
                        upsertCheckin(goal.id, selectedQuarter, 'actual_achievement', parseFloat(e.target.value) || 0)
                      }
                      className="w-24 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    {isSaving && <span className="ml-2 text-xs text-blue-400">...</span>}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={checkin?.status ?? 'not_started'}
                      onChange={(e) =>
                        upsertCheckin(goal.id, selectedQuarter, 'status', e.target.value as CheckinStatus)
                      }
                      className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      <option value="not_started">Not Started</option>
                      <option value="on_track">On Track</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {checkin ? (
                      <span className={`font-semibold ${checkin.computed_score >= 80 ? 'text-green-600' : checkin.computed_score >= 60 ? 'text-blue-600' : 'text-orange-500'}`}>
                        {checkin.computed_score.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Manager comments */}
      {checkins.filter((c) => c.quarter === selectedQuarter && c.manager_comment).length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Manager Comments</h3>
          {goals.map((goal) => {
            const c = getCheckin(goal.id, selectedQuarter);
            if (!c?.manager_comment) return null;
            return (
              <div key={goal.id} className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700">{goal.title}</p>
                <p className="text-sm text-blue-800 mt-0.5">{c.manager_comment}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
