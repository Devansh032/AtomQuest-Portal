import React from 'react';
import { Target, ChevronDown, User, LogOut } from 'lucide-react';
import { Role, User as UserType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: UserType | null;
  allUsers: UserType[];
  activeRole: Role;
  onRoleChange: (role: Role) => void;
  onUserChange: (userId: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NAV_TABS: Record<Role, { id: string; label: string }[]> = {
  employee: [
    { id: 'goals', label: 'My Goals' },
    { id: 'checkins', label: 'Check-ins' },
  ],
  manager: [
    { id: 'team', label: 'Team Dashboard' },
    { id: 'checkins', label: 'Check-in Review' },
  ],
  admin: [
    { id: 'overview', label: 'Overview' },
    { id: 'audit', label: 'Audit Log' },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  employee: 'Employee',
  manager: 'Manager (L1)',
  admin: 'Admin / HR',
};

export default function Layout({
  children,
  currentUser,
  allUsers,
  activeRole,
  onRoleChange,
  onUserChange,
  activeTab,
  onTabChange,
}: LayoutProps) {
  const tabs = NAV_TABS[activeRole];

  const roleUsers = allUsers.filter((u) => u.role === activeRole);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-gray-900 text-sm">GoalTrack</span>
            <span className="ml-2 text-xs text-gray-400">Performance Management</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Demo Role Switcher */}
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <span className="text-xs font-medium text-amber-700">Demo Mode — Role:</span>
            <select
              value={activeRole}
              onChange={(e) => onRoleChange(e.target.value as Role)}
              className="text-xs font-semibold text-amber-800 bg-transparent border-none outline-none cursor-pointer"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager (L1)</option>
              <option value="admin">Admin / HR</option>
            </select>
            <ChevronDown className="w-3 h-3 text-amber-600" />
          </div>

          {/* User switcher within role */}
          {roleUsers.length > 1 && (
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={currentUser?.id ?? ''}
                onChange={(e) => onUserChange(e.target.value)}
                className="text-xs text-gray-700 bg-transparent border-none outline-none cursor-pointer"
              >
                {roleUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentUser && (
            <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xs font-semibold text-blue-700">
                  {currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-gray-800">{currentUser.name}</p>
                <p className="text-xs text-gray-400">{ROLE_LABELS[activeRole]}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-52 bg-white border-r border-gray-200 pt-6 flex flex-col">
          <nav className="flex-1 px-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="px-3 pb-6 mt-auto">
            <div className="text-xs text-gray-400 px-3">FY 2025–26</div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
