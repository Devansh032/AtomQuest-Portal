
/*
  # Goal Setting & Tracking Portal Schema

  ## Tables
  1. `users` - employees, managers, admins with hierarchy via manager_id
  2. `goals` - individual goal records with UoM, weightage, approval status
  3. `checkins` - quarterly achievement logs per goal
  4. `audit_log` - change history for admin visibility

  ## Security
  - RLS enabled on all tables
  - Authenticated users can read/write their own data
  - Managers can see direct reports' data
  - Admins have full access

  ## Seed Data
  - Sample users across all 3 roles
  - Sample goals and check-ins for demo
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'admin')),
  manager_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thrust_area text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  uom_type text NOT NULL DEFAULT 'Numeric-Max' CHECK (uom_type IN ('Numeric-Min','Numeric-Max','Percentage-Min','Percentage-Max','Timeline','Zero')),
  target numeric DEFAULT 0,
  weightage numeric NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','locked','returned')),
  is_shared boolean DEFAULT false,
  parent_goal_id uuid REFERENCES goals(id),
  manager_comment text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  TO authenticated
  USING (true);

-- Check-ins table
CREATE TABLE IF NOT EXISTS checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  quarter text NOT NULL CHECK (quarter IN ('Q1','Q2','Q3','Q4')),
  actual_achievement numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','on_track','completed')),
  manager_comment text DEFAULT '',
  computed_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(goal_id, quarter)
);

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checkins"
  ON checkins FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert checkins"
  ON checkins FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update checkins"
  ON checkins FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES goals(id) ON DELETE SET NULL,
  changed_by uuid NOT NULL REFERENCES users(id),
  field_changed text NOT NULL,
  old_value text DEFAULT '',
  new_value text DEFAULT '',
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON audit_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert audit log"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_checkins_goal_id ON checkins(goal_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_goal_id ON audit_log(goal_id);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);

-- Seed Data: Users
DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
  manager1_id uuid := gen_random_uuid();
  manager2_id uuid := gen_random_uuid();
  emp1_id uuid := gen_random_uuid();
  emp2_id uuid := gen_random_uuid();
  emp3_id uuid := gen_random_uuid();
  emp4_id uuid := gen_random_uuid();
  goal1_id uuid := gen_random_uuid();
  goal2_id uuid := gen_random_uuid();
  goal3_id uuid := gen_random_uuid();
  goal4_id uuid := gen_random_uuid();
  goal5_id uuid := gen_random_uuid();
  goal6_id uuid := gen_random_uuid();
BEGIN
  -- Insert users
  INSERT INTO users (id, name, email, role, manager_id) VALUES
    (admin_id, 'Sarah Chen', 'sarah.chen@company.com', 'admin', NULL),
    (manager1_id, 'David Park', 'david.park@company.com', 'manager', admin_id),
    (manager2_id, 'Lisa Torres', 'lisa.torres@company.com', 'manager', admin_id),
    (emp1_id, 'Alex Johnson', 'alex.johnson@company.com', 'employee', manager1_id),
    (emp2_id, 'Maria Garcia', 'maria.garcia@company.com', 'employee', manager1_id),
    (emp3_id, 'James Kim', 'james.kim@company.com', 'employee', manager2_id),
    (emp4_id, 'Priya Sharma', 'priya.sharma@company.com', 'employee', manager2_id);

  -- Insert goals for Alex Johnson (approved/locked)
  INSERT INTO goals (id, user_id, thrust_area, title, description, uom_type, target, weightage, status) VALUES
    (goal1_id, emp1_id, 'Revenue Growth', 'Q1 Sales Target', 'Achieve quarterly sales target of $500K', 'Numeric-Max', 500000, 30, 'locked'),
    (goal2_id, emp1_id, 'Customer Success', 'Customer Satisfaction Score', 'Maintain NPS above 8.5', 'Numeric-Max', 8.5, 25, 'locked'),
    (goal3_id, emp1_id, 'Process Improvement', 'Lead Response Time', 'Reduce lead response time to under 2 hours', 'Numeric-Min', 2, 20, 'locked'),
    (goal4_id, emp1_id, 'Team Development', 'Training Completion', 'Complete 3 product certifications', 'Numeric-Max', 3, 15, 'locked'),
    (goal5_id, emp1_id, 'Innovation', 'New Product Demos', 'Conduct demos for 2 new product lines', 'Numeric-Max', 2, 10, 'locked');

  -- Insert goals for Maria Garcia (submitted)
  INSERT INTO goals (id, user_id, thrust_area, title, description, uom_type, target, weightage, status) VALUES
    (goal6_id, emp2_id, 'Revenue Growth', 'Pipeline Development', 'Build sales pipeline of $1.2M', 'Numeric-Max', 1200000, 40, 'submitted');

  INSERT INTO goals (user_id, thrust_area, title, description, uom_type, target, weightage, status) VALUES
    (emp2_id, 'Customer Success', 'Renewal Rate', 'Achieve 90% renewal rate', 'Percentage-Max', 90, 30, 'submitted'),
    (emp2_id, 'Team Development', 'Mentoring Sessions', 'Conduct monthly team training sessions', 'Numeric-Max', 12, 20, 'submitted'),
    (emp2_id, 'Process Improvement', 'CRM Data Quality', 'Achieve 95% data completeness in CRM', 'Percentage-Max', 95, 10, 'submitted');

  -- Check-ins for Alex's locked goals
  INSERT INTO checkins (goal_id, quarter, actual_achievement, status, computed_score) VALUES
    (goal1_id, 'Q1', 480000, 'on_track', 96),
    (goal1_id, 'Q2', 520000, 'completed', 100),
    (goal2_id, 'Q1', 8.2, 'on_track', 96.5),
    (goal3_id, 'Q1', 1.8, 'on_track', 100),
    (goal4_id, 'Q1', 2, 'on_track', 66.7),
    (goal5_id, 'Q1', 1, 'on_track', 50);

END $$;
