import { GoalStatus, CheckinStatus } from '../types';

const GOAL_STATUS_STYLES: Record<GoalStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-50 text-blue-700',
  approved: 'bg-green-50 text-green-700',
  locked: 'bg-slate-100 text-slate-700',
  returned: 'bg-orange-50 text-orange-700',
};

const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  locked: 'Locked',
  returned: 'Returned',
};

const CHECKIN_STATUS_STYLES: Record<CheckinStatus, string> = {
  not_started: 'bg-gray-100 text-gray-500',
  on_track: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
};

const CHECKIN_STATUS_LABELS: Record<CheckinStatus, string> = {
  not_started: 'Not Started',
  on_track: 'On Track',
  completed: 'Completed',
};

interface GoalStatusBadgeProps {
  status: GoalStatus;
}

interface CheckinStatusBadgeProps {
  status: CheckinStatus;
}

export function GoalStatusBadge({ status }: GoalStatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${GOAL_STATUS_STYLES[status]}`}>
      {GOAL_STATUS_LABELS[status]}
    </span>
  );
}

export function CheckinStatusBadge({ status }: CheckinStatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CHECKIN_STATUS_STYLES[status]}`}>
      {CHECKIN_STATUS_LABELS[status]}
    </span>
  );
}
