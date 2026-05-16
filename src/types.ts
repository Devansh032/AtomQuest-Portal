export type Role = 'employee' | 'manager' | 'admin';

export type UomType = 'Numeric-Min' | 'Numeric-Max' | 'Percentage-Min' | 'Percentage-Max' | 'Timeline' | 'Zero';

export type GoalStatus = 'draft' | 'submitted' | 'approved' | 'locked' | 'returned';

export type CheckinStatus = 'not_started' | 'on_track' | 'completed';

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  manager_id: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  thrust_area: string;
  title: string;
  description: string;
  uom_type: UomType;
  target: number;
  weightage: number;
  status: GoalStatus;
  is_shared: boolean;
  parent_goal_id: string | null;
  manager_comment: string;
  created_at: string;
}

export interface Checkin {
  id: string;
  goal_id: string;
  quarter: Quarter;
  actual_achievement: number;
  status: CheckinStatus;
  manager_comment: string;
  computed_score: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  goal_id: string | null;
  changed_by: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  timestamp: string;
  users?: { name: string; email: string };
  goals?: { title: string };
}

export const THRUST_AREAS = [
  'Revenue Growth',
  'Customer Success',
  'Process Improvement',
  'Team Development',
  'Innovation',
  'Operational Excellence',
  'Digital Transformation',
  'Risk & Compliance',
  'Talent Management',
  'Strategic Initiatives',
];

export const UOM_TYPES: UomType[] = [
  'Numeric-Min',
  'Numeric-Max',
  'Percentage-Min',
  'Percentage-Max',
  'Timeline',
  'Zero',
];

export function computeScore(uomType: UomType, target: number, actual: number): number {
  if (target === 0) return 0;
  switch (uomType) {
    case 'Numeric-Min':
    case 'Percentage-Min':
      return Math.min(100, (actual / target) * 100);
    case 'Numeric-Max':
    case 'Percentage-Max':
      return Math.min(100, (target / actual) * 100);
    case 'Timeline':
      return actual <= target ? 100 : Math.max(0, (target / actual) * 100);
    case 'Zero':
      return actual === 0 ? 100 : 0;
    default:
      return 0;
  }
}
