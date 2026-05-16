import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Goal, Checkin, User, Quarter } from '../types';
import { CheckinStatusBadge } from '../components/StatusBadge';

interface Props {
  currentUser: User;
  allUsers: User[];
}

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function ManagerCheckins({ currentUser, allUsers }: Props) {
  const [goals, setGoals] = useState<Record<string, Goal[]>>({});
  const [checkins, setCheckins] = useState<Record<string, Checkin[]>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>('Q1');
  const [editingComment, setEditingComment] = useState<{ goalId: string; quarter: Quarter } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);

  const directReports = allUsers.filter((u) => u.manager_id === currentUser.id);

  useEffect(() => {
    if (directReports.length === 0) { setLoading(false); return; }
    const fetch = async () => {
      const ids = directReports.map((u) => u.id);
      const { data: goalsData } = await supabase.from('goals').select('*').in('user_id', ids).eq('status', 'locked');
      const goalIds = (goalsData ?? []).map((g) => g.id);
      const { data: checkinsData } = goalIds.length > 0
        ? await supabase.from('checkins').select('*').in('goal_id', goalIds)
        : { data: [] };

      const goalsMap: Record<string, Goal[]> = {};
      for (const g of goalsData ?? []) {
        if (!goalsMap[g.user_id]) goalsMap[g.user_id] = [];
        goalsMap[g.user_id].push(g);
      }
      const checkinsMap: Record<string, Checkin[]> = {};
      for (const c of checkinsData ?? []) {
        if (!checkinsMap[c.goal_id]) checkinsMap[c.goal_id] = [];
        checkinsMap[c.goal_id].push(c);
      }
      setGoals(goalsMap);
      setCheckins(checkinsMap);
      setLoading(false);
    };
    fetch();
  }, [currentUser.id, allUsers.length]);

  const getCheckin = (goalId: string, quarter: Quarter) =>
    checkins[goalId]?.find((c) => c.quarter === quarter);

  const saveComment = async () => {
    if (!editingComment) return;
    const { goalId, quarter } = editingComment;
    const existing = getCheckin(goalId, quarter);
    if (existing) {
      await supabase.from('checkins').update({ manager_comment: commentText }).eq('id', existing.id);
      setCheckins((prev) => ({
        ...prev,
        [goalId]: prev[goalId].map((c) => c.id === existing.id ? { ...c, manager_comment: commentText } : c),
      }));
    } else {
      const { data } = await supabase.from('checkins').insert({
        goal_id: goalId, quarter, manager_comment: commentText, actual_achievement: 0, status: 'not_started', computed_score: 0,
      }).select().single();
      if (data) {
        setCheckins((prev) => ({ ...prev, [goalId]: [...(prev[goalId] ?? []), data] }));
      }
    }
    setEditingComment(null);
    setCommentText('');
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (selectedEmployee) {
    const empGoals = goals[selectedEmployee.id] ?? [];

    return (
      <div className="p-6 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedEmployee(null)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ChevronLeft className="w-4 h-4" />Back
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <h1 className="text-xl font-semibold text-gray-900">{selectedEmployee.name} — Check-ins</h1>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {QUARTERS.map((q) => (
            <button key={q} onClick={() => setSelectedQuarter(q)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedQuarter === q ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {q}
            </button>
          ))}
        </div>

        {empGoals.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-lg p-12 text-center">
            <p className="text-gray-500 text-sm">No locked goals for this employee.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Goal</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Target</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actual</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {empGoals.map((goal) => {
                  const checkin = getCheckin(goal.id, selectedQuarter);
                  const isEditing = editingComment?.goalId === goal.id && editingComment?.quarter === selectedQuarter;
                  return (
                    <tr key={goal.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{goal.title}</p>
                        <p className="text-xs text-gray-400">{goal.thrust_area} · {goal.weightage}%</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{goal.target}</td>
                      <td className="px-4 py-3 text-gray-700">{checkin?.actual_achievement ?? '—'}</td>
                      <td className="px-4 py-3">
                        {checkin ? <CheckinStatusBadge status={checkin.status} /> : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {checkin ? (
                          <span className={`font-semibold ${checkin.computed_score >= 80 ? 'text-green-600' : checkin.computed_score >= 60 ? 'text-blue-600' : 'text-orange-500'}`}>
                            {checkin.computed_score.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                              className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                              placeholder="Add comment..." autoFocus />
                            <button onClick={saveComment} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Save</button>
                            <button onClick={() => { setEditingComment(null); setCommentText(''); }} className="text-xs text-gray-500 px-2 py-1">Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingComment({ goalId: goal.id, quarter: selectedQuarter }); setCommentText(checkin?.manager_comment ?? ''); }}
                            className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            {checkin?.manager_comment ? checkin.manager_comment : '+ Add comment'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Check-in Review</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review quarterly progress of your team</p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {QUARTERS.map((q) => (
          <button key={q} onClick={() => setSelectedQuarter(q)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedQuarter === q ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {q}
          </button>
        ))}
      </div>

      {directReports.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm">No direct reports found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Locked Goals</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Check-ins Logged</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {directReports.map((emp) => {
                const empGoals = goals[emp.id] ?? [];
                const checkinsLogged = empGoals.filter((g) => getCheckin(g.id, selectedQuarter)).length;
                return (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">{emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                        </div>
                        <p className="font-medium text-gray-800">{emp.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{empGoals.length}</td>
                    <td className="px-4 py-3">
                      <span className={checkinsLogged === empGoals.length && empGoals.length > 0 ? 'text-green-600 font-medium' : 'text-gray-600'}>
                        {checkinsLogged}/{empGoals.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {empGoals.length > 0 && (
                        <button onClick={() => setSelectedEmployee(emp)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium ml-auto transition-colors">
                          Review <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
