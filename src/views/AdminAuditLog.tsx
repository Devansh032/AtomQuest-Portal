import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuditLog } from '../types';

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [goals, setGoals] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [logsRes, usersRes, goalsRes] = await Promise.all([
        supabase.from('audit_log').select('*').order('timestamp', { ascending: false }),
        supabase.from('users').select('id, name'),
        supabase.from('goals').select('id, title'),
      ]);

      const usersMap: Record<string, string> = {};
      for (const u of usersRes.data ?? []) usersMap[u.id] = u.name;

      const goalsMap: Record<string, string> = {};
      for (const g of goalsRes.data ?? []) goalsMap[g.id] = g.title;

      setLogs(logsRes.data ?? []);
      setUsers(usersMap);
      setGoals(goalsMap);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete history of goal changes</p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm">No audit events recorded yet. Unlock a goal to generate an entry.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Changed By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Goal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Field</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Old Value</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">New Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {users[log.changed_by] ?? log.changed_by.slice(0, 8) + '...'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.goal_id ? (goals[log.goal_id] ?? log.goal_id.slice(0, 8) + '...') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{log.field_changed}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">{log.old_value || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{log.new_value || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
