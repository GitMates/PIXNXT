import React, { useState, useEffect, useRef } from 'react';
import { Search, User, AlertCircle, X, Mail, Ban, CheckCircle2 } from 'lucide-react';
import { AppLoader, AppSpinner } from '../../components/ui/AppLoading';
import { supabase } from '../../lib/supabase/client';
import {
  broadcastPhotographerLimitsChanged,
  onPhotographerLimitsBroadcast,
  subscribeAllPhotographers,
} from '../../lib/photographerLiveSync';

const FULL_SELECT = 'id, display_name, email, plan, is_disabled, last_login_at';
const BASIC_SELECT = 'id, display_name, email, plan';

const isMissingColumnError = (err) => {
  const msg = String(err?.message || '');
  return err?.code === '42703' || /does not exist|is_disabled|last_login_at/i.test(msg);
};

function formatLastLogin(value) {
  if (!value) return { short: 'Never', title: 'No login recorded yet' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { short: '—', title: String(value) };
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  let short;
  if (mins < 1) short = 'Just now';
  else if (mins < 60) short = `${mins}m ago`;
  else if (mins < 60 * 24) short = `${Math.floor(mins / 60)}h ago`;
  else if (mins < 60 * 24 * 30) short = `${Math.floor(mins / (60 * 24))}d ago`;
  else short = d.toLocaleDateString();
  return { short, title: d.toLocaleString() };
}

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [migrationWarning, setMigrationWarning] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDisableId, setConfirmDisableId] = useState(null);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [emailTarget, setEmailTarget] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    setMigrationWarning(null);
    try {
      const res = await supabase.from('photographers').select(FULL_SELECT).order('created_at', { ascending: false });
      let data = res.data;
      if (res.error) {
        if (!isMissingColumnError(res.error)) throw res.error;
        const basic = await supabase.from('photographers').select(BASIC_SELECT).order('created_at', { ascending: false });
        if (basic.error) throw basic.error;
        data = (basic.data || []).map((p) => ({ ...p, is_disabled: false, last_login_at: null }));
        setMigrationWarning(
          'Database migration pending: run supabase/migrations/20260914000000_photographer_disabled_last_login.sql in Supabase SQL Editor to enable last login + disable account.'
        );
      }
      setUsers(
        (data || []).map((p) => ({
          id: p.id,
          name: p.display_name || 'Unnamed',
          email: p.email,
          plan: p.plan || 'Unknown',
          isDisabled: p.is_disabled === true,
          lastLoginAt: p.last_login_at || null,
        }))
      );
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users. Ensure RLS policies allow reading.');
    } finally {
      setLoading(false);
    }
  };

  // Ref so the live subscription always calls the latest fetch without re-subscribing.
  const fetchUsersRef = useRef(fetchUsers);
  fetchUsersRef.current = fetchUsers;

  useEffect(() => {
    fetchUsersRef.current();
    // Instant sync: account disable/enable from other admins refreshes live.
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => fetchUsersRef.current(), 1200);
    };
    const offLive = subscribeAllPhotographers(schedule);
    const offBroadcast = onPhotographerLimitsBroadcast(null, schedule);
    return () => {
      clearTimeout(timer);
      offLive();
      offBroadcast();
    };
  }, []);

  const openEmailComposer = (user) => {
    setEmailTarget(user);
    setEmailSubject('');
    setEmailMessage(`Hi ${user.name},\n\n`);
  };

  const sendEmail = () => {
    if (!emailTarget?.email) return;
    const href =
      `mailto:${encodeURIComponent(emailTarget.email)}` +
      `?subject=${encodeURIComponent(emailSubject)}` +
      `&body=${encodeURIComponent(emailMessage)}`;
    window.location.href = href;
    setEmailTarget(null);
  };

  const toggleDisabled = async (user) => {
    if (confirmDisableId !== user.id) {
      setConfirmDisableId(user.id);
      setTimeout(() => setConfirmDisableId((prev) => (prev === user.id ? null : prev)), 4000);
      return;
    }
    setConfirmDisableId(null);
    setActionBusyId(user.id);
    try {
      const { error: updateError } = await supabase
        .from('photographers')
        .update({ is_disabled: !user.isDisabled })
        .eq('id', user.id);
      if (updateError) {
        if (isMissingColumnError(updateError)) {
          throw new Error('Migration missing: run 20260914000000_photographer_disabled_last_login.sql in Supabase SQL Editor first.');
        }
        throw updateError;
      }
      fetchUsers();
      broadcastPhotographerLimitsChanged(user.id);
    } catch (err) {
      alert(err.message || 'Failed to update account status.');
    } finally {
      setActionBusyId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    if (q && !(u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))) return false;
    if (statusFilter === 'active' && u.isDisabled) return false;
    if (statusFilter === 'disabled' && !u.isDisabled) return false;
    return true;
  });

  const filtersActive = Boolean(searchQuery) || statusFilter !== 'all';
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight font-serif uppercase">User Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage administrators and platform users.</p>
        </div>
      </div>

      <div className="bg-[#fdfdfc] p-4 rounded-2xl shadow-sm border border-[#eae8e4] space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#f8f7f4] border border-[#eae8e4] hover:border-[#eae8e4]/80 focus:border-[#1a1a1a] focus:bg-white rounded-xl text-sm outline-none transition-all focus:ring-1 focus:ring-[#1a1a1a]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by account status"
            className="px-3 py-2 bg-[#f8f7f4] border border-[#eae8e4] rounded-xl text-sm outline-none focus:border-[#1a1a1a] focus:bg-white transition-all"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing <span className="font-semibold text-gray-800">{filteredUsers.length}</span> of <span className="font-semibold text-gray-800">{users.length}</span> photographers
          </p>
          {filtersActive && (
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors">
              <X className="w-3.5 h-3.5" />Clear filters
            </button>
          )}
        </div>
      </div>

      {migrationWarning && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-amber-800 text-sm">{migrationWarning}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
          <h3 className="text-red-800 font-semibold mb-1">Failed to load users</h3>
          <p className="text-red-600 text-sm max-w-md">{error}</p>
        </div>
      )}

      {!error && loading && (
        <AppLoader label="Fetching user records" variant="page-short" />
      )}

      {!error && !loading && (
        <div className="bg-[#fdfdfc] rounded-2xl shadow-sm border border-[#eae8e4] overflow-hidden">
          <div className="overflow-hidden">
            <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-[#f9f8f5]/85 border-b border-[#eae8e4]">
                <tr>
                  <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider" style={{ width: '32%' }}>Photographer</th>
                  <th className="px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider" style={{ width: '22%' }}>Last login</th>
                  <th className="px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider" style={{ width: '16%' }}>Status</th>
                  <th className="px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right" style={{ width: '30%' }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <p className="text-gray-500">
                        {filtersActive ? 'No photographers match the current filters.' : 'No photographers yet.'}
                      </p>
                      {filtersActive && (
                        <button type="button" onClick={clearFilters} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1a1a1a] text-white rounded-lg hover:bg-black transition-colors">
                          <X className="w-3.5 h-3.5" />Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const lastLogin = formatLastLogin(user.lastLoginAt);
                    const confirming = confirmDisableId === user.id;
                    const busy = actionBusyId === user.id;
                    return (
                      <tr key={user.id} className="hover:bg-[#f8f7f4]/60 transition-colors align-top">
                        <td className="px-5 py-4 min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#1a1a1a] text-white shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                              <p className="text-gray-500 text-xs truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 min-w-0">
                          <p className="text-[13px] font-medium text-gray-800" title={lastLogin.title}>{lastLogin.short}</p>
                        </td>
                        <td className="px-4 py-4 min-w-0">
                          {user.isDisabled ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">Disabled</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEmailComposer(user)}
                              title={`Send email to ${user.email}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <Mail className="w-3.5 h-3.5" />Email
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => toggleDisabled(user)}
                              title={user.isDisabled ? 'Re-enable this account' : 'Disable this account'}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 ${
                                confirming
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : user.isDisabled
                                    ? 'bg-[#1a1a1a] text-white hover:bg-black'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {busy ? (
                                <AppSpinner size="xs" />
                              ) : user.isDisabled ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Ban className="w-3.5 h-3.5" />
                              )}
                              {confirming ? `Confirm ${user.isDisabled ? 'enable' : 'disable'}?` : user.isDisabled ? 'Enable' : 'Disable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {emailTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#eae8e4] overflow-hidden flex flex-col" style={{ maxHeight: '88vh' }}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center font-semibold shrink-0">
                {(emailTarget.name || emailTarget.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-[#1a1a1a] leading-tight">Send email</h3>
                <p className="text-xs text-gray-500 truncate">{emailTarget.name} · {emailTarget.email}</p>
              </div>
              <button onClick={() => setEmailTarget(null)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="e.g. Update to your PIXNXT limits"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#1a1a1a] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Message</label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={8}
                  placeholder="Write your message..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-[#1a1a1a] transition-all resize-y"
                />
              </div>
              <p className="text-[11px] text-gray-400">Opens your mail app addressed to {emailTarget.email} with this subject and message.</p>
            </div>

            <div className="px-5 py-4 flex items-center justify-end gap-2.5 border-t border-gray-100 shrink-0 bg-gray-50/60">
              <button
                type="button"
                onClick={() => setEmailTarget(null)}
                className="px-4 py-2 border border-gray-200 bg-white text-gray-700 text-[13px] font-semibold rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendEmail}
                className="px-5 py-2 bg-[#1a1a1a] text-white text-[13px] font-semibold rounded-xl hover:bg-black transition-colors inline-flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />Send email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
