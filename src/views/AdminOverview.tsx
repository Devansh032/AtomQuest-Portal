import { useState, useEffect } from 'react';
import { Unlock, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Goal, User, Checkin } from '../types';
import { GoalStatusBadge } from '../components/StatusBadge';

interface Props {
  currentUser: User;
  allUsers: User[];
}

export default function AdminOverview({ currentUser, allUsers }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const employees = allUsers.filter((u) => u.role === 'employee');

  useEffect(() => {
    const fetch = async () => {
      const [goalsRes, checkinsRes] = await Promise.all([
        supabase.from('goals').select('*'),
        supabase.from('checkins').select('*'),
      ]);
      setGoals(goalsRes.data ?? []);
      setCheckins(checkinsRes.data ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const getEmployeeGoals = (userId: string) => goals.filter((g) => g.user_id === userId);

  const getCheckinCompletion = (userId: string) => {
    const empGoals = getEmployeeGoals(userId).filter((g) => g.status === 'locked');
    if (empGoals.length === 0) return null;
    const withCheckins = empGoals.filter((g) => checkins.some((c) => c.goal_id === g.id));
    return `${withCheckins.length}/${empGoals.length}`;
  };

  const unlockGoal = async (goalId: string) => {
    setUnlocking(goalId);
    await supabase.from('goals').update({ status: 'draft' }).eq('id', goalId);
    await supabase.from('audit_log').insert({
      goal_id: goalId,
      changed_by: currentUser.id,
      field_changed: 'status',
      old_value: 'locked',
      new_value: 'draft',
    });
    setGoals((prev) => prev.map((g) => g.id === goalId ? { ...g, status: 'draft' } : g));
    setUnlocking(null);
  };

  const exportCSV = () => {
    const rows: string[][] = [
      ['Employee', 'Email', 'Goal Title', 'Thrust Area', 'UoM Type', 'Target', 'Weightage', 'Status', 'Q1 Actual', 'Q1 Score', 'Q2 Actual', 'Q2 Score', 'Q3 Actual', 'Q3 Score', 'Q4 Actual', 'Q4 Score'],
    ];

    for (const user of employees) {
      const empGoals = getEmployeeGoals(user.id);
      for (const goal of empGoals) {
        const row: string[] = [user.name, user.email, goal.title, goal.thrust_area, goal.uom_type, String(goal.target), String(goal.weightage), goal.status];
        for (const q of ['Q1', 'Q2', 'Q3', 'Q4'] as const) {
          const c = checkins.find((c) => c.goal_id === goal.id && c.quarter === q);
          row.push(c ? String(c.actual_achievement) : '', c ? c.computed_score.toFixed(1) : '');
        }
        rows.push(row);
      }
    }

    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `goal-achievements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const totalGoals = goals.length;
  const lockedGoals = goals.filter((g) => g.status === 'locked').length;
  const submittedGoals = goals.filter((g) => g.status === 'submitted').length;
  const draftGoals = goals.filter((g) => g.status === 'draft').length;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">All employees and goal status</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Employees', value: employees.length, color: 'text-gray-900' },
          { label: 'Goals Locked', value: lockedGoals, color: 'text-slate-700' },
          { label: 'Pending Review', value: submittedGoals, color: 'text-blue-700' },
          { label: 'In Draft', value: draftGoals, color: 'text-gray-500' },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Employee table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Manager</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Goals</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Latest Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Check-ins</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map((emp) => {
              const empGoals = getEmployeeGoals(emp.id);
              const manager = allUsers.find((u) => u.id === emp.manager_id);
              const checkinComp = getCheckinCompletion(emp.id);
              const latestStatus = empGoals.length > 0
                ? empGoals.reduce((latest, g) => {
                    const order = ['draft', 'returned', 'submitted', 'approved', 'locked'];
                    return order.indexOf(g.status) > order.indexOf(latest.status) ? g : latest;
                  })
                : null;

              return (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">{emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{emp.name}</p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{manager?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{empGoals.length}</td>
                  <td className="px-4 py-3">
                    {latestStatus ? <GoalStatusBadge status={latestStatus.status} /> : <span className="text-gray-300 text-xs">No goals</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={checkinComp ? 'text-gray-700' : 'text-gray-300 text-xs'}>
                      {checkinComp ?? '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Locked goals - unlock section */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Locked Goals Management</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Goal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Thrust Area</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Weight</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {goals.filter((g) => g.status === 'locked').map((goal) => {
                const emp = allUsers.find((u) => u.id === goal.user_id);
                return (
                  <tr key={goal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{emp?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{goal.title}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{goal.thrust_area}</td>
                    <td className="px-4 py-3 text-gray-600">{goal.weightage}%</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => unlockGoal(goal.id)}
                        disabled={unlocking === goal.id}
                        className="flex items-center gap-1 text-orange-600 hover:text-orange-800 text-xs font-medium ml-auto disabled:opacity-50 transition-colors"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        {unlocking === goal.id ? 'Unlocking...' : 'Unlock'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {goals.filter((g) => g.status === 'locked').length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No locked goals.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
