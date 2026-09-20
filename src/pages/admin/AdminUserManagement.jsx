import React, { useState, useEffect, useRef } from 'react';
import { Search, User, AlertCircle, X, Mail, Ban, CheckCircle2, Download } from 'lucide-react';
import { AppLoader, AppSpinner } from '../../components/ui/AppLoading';
import { apiFetch } from '../../lib/api/client';
import {
  broadcastPhotographerLimitsChanged,
  onPhotographerLimitsBroadcast,
  subscribeAllPhotographers,
} from '../../lib/photographerLiveSync';
import {
  AdminModal,
  AdminModalActions,
  AdminPageHeader,
  AdminStatCard,
} from '../../components/admin/AdminUi';

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 MB';
  const tb = 1024 * 1024 * 1024 * 1024;
  const gb = 1024 * 1024 * 1024;
  const mb = 1024 * 1024;
  if (bytes >= tb) return `${(bytes / tb).toFixed(2)} TB`;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  return `${(bytes / mb).toFixed(1)} MB`;
}

function formatDateShort(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

const INACTIVE_AFTER_DAYS = 30;

function daysSinceLogin(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
}

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
  const [sortBy, setSortBy] = useState('newest');
  const [confirmDisableId, setConfirmDisableId] = useState(null);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [emailTarget, setEmailTarget] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const fetchUsers = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    setMigrationWarning(null);
    // Workers: quotas flattened onto each row.
    try {
      const res = await apiFetch('/v1/admin/photographers?limit=500');
      setUsers(
        (res?.photographers || []).map((p) => ({
          id: p.id,
          name: p.display_name || 'Unnamed',
          email: p.email,
          plan: p.plan || 'Unknown',
          isDisabled: Number(p.is_disabled) === 1 || p.is_disabled === true,
          lastLoginAt: p.last_login_at || null,
          joinedAt: p.created_at || null,
          storageUsedBytes: Number(p.storage_used_bytes) || 0,
          deliveryCount: Number(p.delivery_count ?? p.delivery_used_count) || 0,
          albumCount: Number(p.album_count ?? p.album_used_count) || 0,
        }))
      );
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Ref so the live subscription always calls the latest fetch without re-subscribing.
  const fetchUsersRef = useRef(fetchUsers);
  fetchUsersRef.current = fetchUsers;

  useEffect(() => {
    fetchUsersRef.current();
    // Instant sync: account disable/enable from other admins refreshes live.
    // Silent so live polls never flash the full-page loader.
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => fetchUsersRef.current({ silent: true }), 1200);
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
      const res = await apiFetch(`/v1/admin/photographers/${user.id}`, {
        method: 'PATCH',
        body: { is_disabled: !user.isDisabled },
      });
      if (Array.isArray(res?.warnings) && res.warnings.length) {
        alert(`Saved with warnings:\n${res.warnings.join('\n')}`);
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
    if (statusFilter === 'never-login' && u.lastLoginAt) return false;
    if (statusFilter === 'inactive') {
      const days = daysSinceLogin(u.lastLoginAt);
      if (days === null || days < INACTIVE_AFTER_DAYS) return false;
    }
    return true;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'recent-login') {
      const at = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
      const bt = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      return bt - at;
    }
    if (sortBy === 'oldest') {
      const at = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
      const bt = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
      return at - bt;
    }
    // newest (matches server order, falls back gracefully without joinedAt)
    const at = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
    const bt = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
    return bt - at;
  });

  const filtersActive = Boolean(searchQuery) || statusFilter !== 'all' || sortBy !== 'newest';
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('newest');
  };

  const exportCsv = () => {
    const head = 'name,email,plan,status,last_login,joined,deliveries,albums,storage_used_bytes';
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = sortedUsers
      .map((u) =>
        [
          u.name,
          u.email,
          u.plan,
          u.isDisabled ? 'disabled' : 'active',
          u.lastLoginAt || '',
          u.joinedAt || '',
          u.deliveryCount,
          u.albumCount,
          u.storageUsedBytes,
        ]
          .map(esc)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([head + '\n' + body], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pixnxt_photographers.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="space-y-6 relative">
      <AdminPageHeader
        title="User Management"
        subtitle="Photographers, login activity, and account status."
        actions={(
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#eae8e4] bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        )}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard label="Photographers" value={loading ? '—' : users.length.toLocaleString()} loading={loading} />
        <AdminStatCard
          label="Active"
          value={loading ? '—' : users.filter((u) => !u.isDisabled).length.toLocaleString()}
          loading={loading}
          tone="ok"
          meter={users.length ? (users.filter((u) => !u.isDisabled).length / users.length) * 100 : 0}
        />
        <AdminStatCard
          label="Disabled"
          value={loading ? '—' : users.filter((u) => u.isDisabled).length.toLocaleString()}
          loading={loading}
          tone={users.some((u) => u.isDisabled) ? 'danger' : undefined}
        />
        <AdminStatCard
          label="Never logged in"
          value={loading ? '—' : users.filter((u) => !u.lastLoginAt).length.toLocaleString()}
          loading={loading}
          tone="warn"
        />
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#eae8e4] space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ad-input w-full pl-9 pr-4 py-2 bg-[#f8f7f4] border border-[#eae8e4] hover:border-[#eae8e4]/80 focus:border-[#1a1a1a] focus:bg-white rounded-xl text-sm outline-none transition-all focus:ring-1 focus:ring-[#1a1a1a]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by account status"
            className="ad-input px-3 py-2 bg-[#f8f7f4] border border-[#eae8e4] rounded-xl text-sm outline-none focus:border-[#1a1a1a] focus:bg-white transition-all"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="never-login">Never logged in</option>
            <option value="inactive">Inactive 30+ days</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort photographers"
            className="ad-input px-3 py-2 bg-[#f8f7f4] border border-[#eae8e4] rounded-xl text-sm outline-none focus:border-[#1a1a1a] focus:bg-white transition-all"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="recent-login">Recent login</option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Showing <span className="font-semibold text-gray-800">{sortedUsers.length}</span> of <span className="font-semibold text-gray-800">{users.length}</span> photographers
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
        <div className="ad-error-card rounded-2xl p-6 flex flex-col items-center justify-center text-center">
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
                  <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider" style={{ width: '26%' }}>Photographer</th>
                  <th className="px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider" style={{ width: '16%' }}>Last login</th>
                  <th className="px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider" style={{ width: '18%' }}>Activity</th>
                  <th className="px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider" style={{ width: '12%' }}>Status</th>
                  <th className="px-4 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right" style={{ width: '28%' }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
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
                  sortedUsers.map((user) => {
                    const lastLogin = formatLastLogin(user.lastLoginAt);
                    const confirming = confirmDisableId === user.id;
                    const busy = actionBusyId === user.id;
                    return (
                      <tr key={user.id} className="ad-row hover:bg-[#f8f7f4]/60 transition-colors align-top">
                        <td className="px-5 py-4 min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="ad-avatar w-9 h-9 rounded-full flex items-center justify-center bg-[#1a1a1a] text-white shrink-0">
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
                          <p className="text-[11px] text-gray-400">Joined {formatDateShort(user.joinedAt)}</p>
                        </td>
                        <td className="px-4 py-4 min-w-0">
                          <p className="text-[13px] font-medium text-gray-800">
                            {user.deliveryCount.toLocaleString()} deliver{user.deliveryCount === 1 ? 'y' : 'ies'} · {user.albumCount.toLocaleString()} album{user.albumCount === 1 ? '' : 's'}
                          </p>
                          <p className="text-[11px] text-gray-400">{formatBytes(user.storageUsedBytes)} used</p>
                        </td>
                        <td className="px-4 py-4 min-w-0">
                          {user.isDisabled ? (
                            <span className="ad-pill ad-pill--bad">Disabled</span>
                          ) : (
                            <span className="ad-pill ad-pill--ok">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEmailComposer(user)}
                              title={`Send email to ${user.email}`}
                              className="ad-action-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <Mail className="w-3.5 h-3.5" />Email
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => toggleDisabled(user)}
                              title={user.isDisabled ? 'Re-enable this account' : 'Disable this account'}
                              className={`ad-action-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 ${
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
        <AdminModal
          open
          onClose={() => setEmailTarget(null)}
          title="Send email"
          subtitle={`${emailTarget.name} · ${emailTarget.email}`}
          avatar={(emailTarget.name || emailTarget.email || 'U').charAt(0).toUpperCase()}
          footer={(
            <>
              <button
                type="button"
                onClick={() => setEmailTarget(null)}
                className="px-4 py-2.5 text-sm font-medium rounded-xl border border-[#eae8e4] bg-white text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendEmail}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#1a1a1a] text-white hover:bg-black inline-flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />Send email
              </button>
            </>
          )}
        >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="e.g. Update to your PIXNXT limits"
                  className="w-full px-3 py-2.5 bg-white border border-[#eae8e4] rounded-xl text-sm outline-none focus:border-[#1a1a1a] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Message</label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={8}
                  placeholder="Write your message..."
                  className="w-full px-3 py-2.5 bg-white border border-[#eae8e4] rounded-xl text-sm outline-none focus:border-[#1a1a1a] transition-all resize-y"
                />
              </div>
              <p className="text-[11px] text-gray-400">Opens your mail app addressed to {emailTarget.email} with this subject and message.</p>
        </AdminModal>
      )}
    </div>
  );
};

export default AdminUserManagement;
