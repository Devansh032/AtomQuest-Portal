import { useState, useEffect } from 'react';
import { Plus, Trash2, Lock, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Goal, User, THRUST_AREAS, UOM_TYPES, UomType, GoalStatus } from '../types';
import WeightageBar from '../components/WeightageBar';
import { GoalStatusBadge } from '../components/StatusBadge';

interface Props {
  currentUser: User;
}

const EMPTY_GOAL: Omit<Goal, 'id' | 'created_at'> = {
  user_id: '',
  thrust_area: THRUST_AREAS[0],
  title: '',
  description: '',
  uom_type: 'Numeric-Max',
  target: 0,
  weightage: 10,
  status: 'draft',
  is_shared: false,
  parent_goal_id: null,
  manager_comment: '',
};

export default function EmployeeGoals({ currentUser }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchGoals = async () => {
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true });
    setGoals(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchGoals();
  }, [currentUser.id]);

  const totalWeightage = goals.reduce((sum, g) => sum + Number(g.weightage), 0);
  const isLocked = goals.some((g) => g.status === 'locked' || g.status === 'approved');
  const allDraftOrReturned = goals.every((g) => g.status === 'draft' || g.status === 'returned');
  const canSubmit =
    goals.length > 0 &&
    goals.length <= 8 &&
    totalWeightage === 100 &&
    goals.every((g) => g.weightage >= 10) &&
    allDraftOrReturned &&
    !isLocked;

  const validationErrors: string[] = [];
  if (goals.length > 8) validationErrors.push('Maximum 8 goals allowed.');
  if (goals.some((g) => g.weightage < 10)) validationErrors.push('Each goal must have at least 10% weightage.');
  if (totalWeightage !== 100 && goals.length > 0) validationErrors.push('Total weightage must equal 100%.');

  const addGoal = async () => {
    if (goals.length >= 8) return;
    const newGoal = { ...EMPTY_GOAL, user_id: currentUser.id };
    const { data } = await supabase.from('goals').insert(newGoal).select().single();
    if (data) setGoals((prev) => [...prev, data]);
  };

  const updateGoal = async (id: string, field: keyof Goal, value: string | number | boolean) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
    setSaving(id);
    await supabase.from('goals').update({ [field]: value }).eq('id', id);
    setSaving(null);
  };

  const deleteGoal = async (id: string) => {
    await supabase.from('goals').delete().eq('id', id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const submitGoals = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const draftIds = goals.filter((g) => g.status === 'draft' || g.status === 'returned').map((g) => g.id);
    await supabase.from('goals').update({ status: 'submitted' }).in('id', draftIds);
    await fetchGoals();
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const returnedGoal = goals.find((g) => g.status === 'returned');

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Goals</h1>
          <p className="text-sm text-gray-500 mt-0.5">FY 2025–26 Annual Goals</p>
        </div>
        {allDraftOrReturned && !isLocked && (
          <button
            onClick={addGoal}
            disabled={goals.length >= 8}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Goal
          </button>
        )}
      </div>

      {/* Return comment */}
      {returnedGoal && returnedGoal.manager_comment && (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <RotateCcw className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800">Returned for Rework</p>
              <p className="text-sm text-orange-700 mt-0.5">{returnedGoal.manager_comment}</p>
            </div>
          </div>
        </div>
      )}

      {/* Weightage bar */}
      {goals.length > 0 && (
        <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Weightage Distribution</span>
            <span className="text-xs text-gray-400">{goals.length}/8 goals</span>
          </div>
          <WeightageBar total={totalWeightage} />
        </div>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && allDraftOrReturned && (
        <div className="mb-4 space-y-1">
          {validationErrors.map((err) => (
            <div key={err} className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-12 text-center">
          <Target className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No goals yet. Click "Add Goal" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal, idx) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              index={idx}
              saving={saving === goal.id}
              onUpdate={updateGoal}
              onDelete={deleteGoal}
            />
          ))}
        </div>
      )}

      {/* Submit button */}
      {goals.length > 0 && allDraftOrReturned && (
        <div className="mt-6 flex items-center justify-end gap-4">
          {canSubmit && (
            <div className="flex items-center gap-1.5 text-green-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              Ready to submit
            </div>
          )}
          <button
            onClick={submitGoals}
            disabled={!canSubmit || submitting}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      )}

      {isLocked && (
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <Lock className="w-4 h-4" />
          Goals are locked after approval. Contact your manager or HR to make changes.
        </div>
      )}
    </div>
  );
}

function Target({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

interface GoalCardProps {
  goal: Goal;
  index: number;
  saving: boolean;
  onUpdate: (id: string, field: keyof Goal, value: string | number | boolean) => void;
  onDelete: (id: string) => void;
}

function GoalCard({ goal, index, saving, onUpdate, onDelete }: GoalCardProps) {
  const isReadOnly = goal.status === 'locked' || goal.status === 'approved' || goal.status === 'submitted';

  return (
    <div className={`bg-white border rounded-lg p-4 ${goal.status === 'returned' ? 'border-orange-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400 w-6">#{index + 1}</span>
          <GoalStatusBadge status={goal.status} />
          {saving && <span className="text-xs text-blue-500">Saving...</span>}
        </div>
        {!isReadOnly && (
          <button
            onClick={() => onDelete(goal.id)}
            className="text-gray-300 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        {isReadOnly && <Lock className="w-4 h-4 text-gray-300" />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Thrust Area *</label>
          {isReadOnly ? (
            <p className="text-sm text-gray-800">{goal.thrust_area}</p>
          ) : (
            <select
              value={goal.thrust_area}
              onChange={(e) => onUpdate(goal.id, 'thrust_area', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {THRUST_AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
          {isReadOnly ? (
            <p className="text-sm text-gray-800">{goal.title}</p>
          ) : (
            <input
              type="text"
              value={goal.title}
              onChange={(e) => onUpdate(goal.id, 'title', e.target.value)}
              placeholder="Goal title"
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          )}
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          {isReadOnly ? (
            <p className="text-sm text-gray-600">{goal.description || '—'}</p>
          ) : (
            <textarea
              value={goal.description}
              onChange={(e) => onUpdate(goal.id, 'description', e.target.value)}
              placeholder="Describe the goal..."
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">UoM Type *</label>
          {isReadOnly ? (
            <p className="text-sm text-gray-800">{goal.uom_type}</p>
          ) : (
            <select
              value={goal.uom_type}
              onChange={(e) => onUpdate(goal.id, 'uom_type', e.target.value as UomType)}
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {UOM_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Target *</label>
          {isReadOnly ? (
            <p className="text-sm text-gray-800">{goal.target}</p>
          ) : (
            <input
              type="number"
              value={goal.target}
              onChange={(e) => onUpdate(goal.id, 'target', parseFloat(e.target.value) || 0)}
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Weightage (%) *
            {goal.weightage < 10 && !isReadOnly && (
              <span className="text-red-500 ml-1">min 10%</span>
            )}
          </label>
          {isReadOnly ? (
            <p className="text-sm text-gray-800">{goal.weightage}%</p>
          ) : (
            <input
              type="number"
              value={goal.weightage}
              min={10}
              max={100}
              onChange={(e) => onUpdate(goal.id, 'weightage', parseFloat(e.target.value) || 0)}
              className={`w-full text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                goal.weightage < 10 ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
