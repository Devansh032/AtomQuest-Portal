import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Check, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Goal, User, GoalStatus } from '../types';
import { GoalStatusBadge } from '../components/StatusBadge';
import WeightageBar from '../components/WeightageBar';

interface Props {
  currentUser: User;
  allUsers: User[];
}

export default function ManagerTeam({ currentUser, allUsers }: Props) {
  const [goals, setGoals] = useState<Record<string, Goal[]>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [returnComment, setReturnComment] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const directReports = allUsers.filter((u) => u.manager_id === currentUser.id);

  useEffect(() => {
    if (directReports.length === 0) return;
    const fetch = async () => {
      const ids = directReports.map((u) => u.id);
      const { data } = await supabase.from('goals').select('*').in('user_id', ids);
      const map: Record<string, Goal[]> = {};
      for (const g of data ?? []) {
        if (!map[g.user_id]) map[g.user_id] = [];
        map[g.user_id].push(g);
      }
      setGoals(map);
    };
    fetch();
  }, [currentUser.id, allUsers.length]);

  const getEmployeeStatus = (emp: User): { label: string; color: string } => {
    const empGoals = goals[emp.id] ?? [];
    if (empGoals.length === 0) return { label: 'No Goals', color: 'text-gray-400' };
    if (empGoals.every((g) => g.status === 'locked')) return { label: 'Locked', color: 'text-slate-600' };
    if (empGoals.some((g) => g.status === 'submitted')) return { label: 'Pending Review', color: 'text-blue-600' };
    if (empGoals.some((g) => g.status === 'returned')) return { label: 'Returned', color: 'text-orange-600' };
    return { label: 'Draft', color: 'text-gray-500' };
  };

  const updateGoalInline = async (goalId: string, field: 'target' | 'weightage', value: number) => {
    setSaving(goalId);
    await supabase.from('goals').update({ [field]: value }).eq('id', goalId);
    setGoals((prev) => {
      const updated = { ...prev };
      for (const uid in updated) {
        updated[uid] = updated[uid].map((g) => (g.id === goalId ? { ...g, [field]: value } : g));
      }
      return updated;
    });
    setSaving(null);
  };

  const approveGoals = async (empId: string) => {
    setActionLoading(true);
    const empGoals = goals[empId]?.filter((g) => g.status === 'submitted') ?? [];
    const ids = empGoals.map((g) => g.id);
    if (ids.length > 0) {
      await supabase.from('goals').update({ status: 'locked' }).in('id', ids);
      setGoals((prev) => ({
        ...prev,
        [empId]: prev[empId].map((g) => ids.includes(g.id) ? { ...g, status: 'locked' as GoalStatus } : g),
      }));
    }
    setActionLoading(false);
    setSelectedEmployee(null);
  };

  const returnGoals = async (empId: string) => {
    if (!returnComment.trim()) return;
    setActionLoading(true);
    const empGoals = goals[empId]?.filter((g) => g.status === 'submitted') ?? [];
    const ids = empGoals.map((g) => g.id);
    if (ids.length > 0) {
      await supabase.from('goals').update({ status: 'returned', manager_comment: returnComment }).in('id', ids);
      setGoals((prev) => ({
        ...prev,
        [empId]: prev[empId].map((g) =>
          ids.includes(g.id) ? { ...g, status: 'returned' as GoalStatus, manager_comment: returnComment } : g
        ),
      }));
    }
    setReturnComment('');
    setShowReturnModal(false);
    setActionLoading(false);
    setSelectedEmployee(null);
  };

  if (selectedEmployee) {
    const empGoals = goals[selectedEmployee.id] ?? [];
    const totalWeightage = empGoals.reduce((sum, g) => sum + Number(g.weightage), 0);
    const hasSubmitted = empGoals.some((g) => g.status === 'submitted');

    return (
      <div className="p-6 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setSelectedEmployee(null)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{selectedEmployee.name}</h1>
            <p className="text-sm text-gray-400">{selectedEmployee.email}</p>
          </div>
        </div>

        {empGoals.length > 0 && (
          <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Weightage Distribution</span>
              <span className="text-xs text-gray-400">{empGoals.length} goals</span>
            </div>
            <WeightageBar total={totalWeightage} />
          </div>
        )}

        {empGoals.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-lg p-12 text-center">
            <p className="text-gray-500 text-sm">No goals submitted yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Thrust Area</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">UoM</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Target</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Weight %</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {empGoals.map((goal) => {
                  const canEdit = goal.status === 'submitted';
                  return (
                    <tr key={goal.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 text-xs">{goal.thrust_area}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{goal.title}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{goal.uom_type}</td>
                      <td className="px-4 py-3">
                        {canEdit ? (
                          <input
                            type="number"
                            defaultValue={goal.target}
                            onBlur={(e) => updateGoalInline(goal.id, 'target', parseFloat(e.target.value) || 0)}
                            className="w-24 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        ) : (
                          <span className="text-gray-700">{goal.target}</span>
                        )}
                        {saving === goal.id && <span className="ml-1 text-xs text-blue-400">...</span>}
                      </td>
                      <td className="px-4 py-3">
                        {canEdit ? (
                          <input
                            type="number"
                            defaultValue={goal.weightage}
                            min={10}
                            max={100}
                            onBlur={(e) => updateGoalInline(goal.id, 'weightage', parseFloat(e.target.value) || 0)}
                            className="w-16 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        ) : (
                          <span className="text-gray-700">{goal.weightage}%</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <GoalStatusBadge status={goal.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {hasSubmitted && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => approveGoals(selectedEmployee.id)}
              disabled={actionLoading}
              className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Check className="w-4 h-4" />
              Approve & Lock Goals
            </button>
            <button
              onClick={() => setShowReturnModal(true)}
              disabled={actionLoading}
              className="flex items-center gap-2 border border-orange-300 text-orange-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-orange-50 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Return for Rework
            </button>
          </div>
        )}

        {/* Return modal */}
        {showReturnModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Return Goals for Rework</h3>
              <p className="text-sm text-gray-500 mb-4">Provide a comment explaining what needs to be revised.</p>
              <textarea
                value={returnComment}
                onChange={(e) => setReturnComment(e.target.value)}
                placeholder="E.g. Please revise target for Revenue Growth goal and rebalance weightage..."
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none"
              />
              <div className="flex gap-3 mt-4 justify-end">
                <button
                  onClick={() => { setShowReturnModal(false); setReturnComment(''); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => returnGoals(selectedEmployee.id)}
                  disabled={!returnComment.trim() || actionLoading}
                  className="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  Send Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Team Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{directReports.length} direct reports</p>
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Goals</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Weight</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {directReports.map((emp) => {
                const empGoals = goals[emp.id] ?? [];
                const totalW = empGoals.reduce((s, g) => s + Number(g.weightage), 0);
                const status = getEmployeeStatus(emp);
                return (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{emp.name}</p>
                          <p className="text-xs text-gray-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{empGoals.length}</td>
                    <td className="px-4 py-3">
                      <span className={totalW === 100 ? 'text-green-600 font-medium' : 'text-red-500'}>{totalW}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedEmployee(emp)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium ml-auto transition-colors"
                      >
                        View Goals <ChevronRight className="w-3.5 h-3.5" />
                      </button>
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
