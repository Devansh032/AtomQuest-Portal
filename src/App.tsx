import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { User, Role } from './types';
import Layout from './components/Layout';
import EmployeeGoals from './views/EmployeeGoals';
import EmployeeCheckins from './views/EmployeeCheckins';
import ManagerTeam from './views/ManagerTeam';
import ManagerCheckins from './views/ManagerCheckins';
import AdminOverview from './views/AdminOverview';
import AdminAuditLog from './views/AdminAuditLog';

const DEFAULT_TABS: Record<Role, string> = {
  employee: 'goals',
  manager: 'team',
  admin: 'overview',
};

export default function App() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeRole, setActiveRole] = useState<Role>('employee');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('goals');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('users').select('*').then(({ data }) => {
      const users = data ?? [];
      setAllUsers(users);
      const emp = users.find((u) => u.role === 'employee');
      if (emp) setCurrentUserId(emp.id);
      setLoading(false);
    });
  }, []);

  const handleRoleChange = (role: Role) => {
    setActiveRole(role);
    setActiveTab(DEFAULT_TABS[role]);
    const user = allUsers.find((u) => u.role === role);
    if (user) setCurrentUserId(user.id);
  };

  const handleUserChange = (userId: string) => {
    setCurrentUserId(userId);
  };

  const currentUser = allUsers.find((u) => u.id === currentUserId) ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading GoalTrack...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!currentUser) return null;

    if (activeRole === 'employee') {
      if (activeTab === 'goals') return <EmployeeGoals currentUser={currentUser} />;
      if (activeTab === 'checkins') return <EmployeeCheckins currentUser={currentUser} />;
    }

    if (activeRole === 'manager') {
      if (activeTab === 'team') return <ManagerTeam currentUser={currentUser} allUsers={allUsers} />;
      if (activeTab === 'checkins') return <ManagerCheckins currentUser={currentUser} allUsers={allUsers} />;
    }

    if (activeRole === 'admin') {
      if (activeTab === 'overview') return <AdminOverview currentUser={currentUser} allUsers={allUsers} />;
      if (activeTab === 'audit') return <AdminAuditLog />;
    }

    return null;
  };

  return (
    <Layout
      currentUser={currentUser}
      allUsers={allUsers}
      activeRole={activeRole}
      onRoleChange={handleRoleChange}
      onUserChange={handleUserChange}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {renderContent()}
    </Layout>
  );
}
