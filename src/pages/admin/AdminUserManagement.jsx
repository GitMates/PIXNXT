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
            className="ad-btn-secondary inline-flex items-center gap-2 px-3.5 py-2 text-sm"
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

      <div className="ad-card p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ad-faint-text" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ad-input w-full pl-9 pr-4 py-2 ad-sunk border border-[var(--ad-line)] rounded-xl text-sm outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by account status"
            className="ad-input px-3 py-2 ad-sunk border border-[var(--ad-line)] rounded-xl text-sm outline-none"
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
            className="ad-input px-3 py-2 ad-sunk border border-[var(--ad-line)] rounded-xl text-sm outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="recent-login">Recent login</option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs ad-muted-text">
            Showing <span className="font-semibold ad-ink">{sortedUsers.length}</span> of <span className="font-semibold ad-ink">{users.length}</span> photographers
          </p>
          {filtersActive && (
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold ad-muted-text hover:text-[var(--ad-ink)] transition-colors">
              <X className="w-3.5 h-3.5" />Clear filters
            </button>
          )}
        </div>
      </div>

      {migrationWarning && !loading && (
        <div className="rounded-2xl p-4 flex items-start gap-3 border border-[color-mix(in_srgb,var(--ad-warn)_35%,var(--ad-line))] bg-[var(--ad-warn-bg)]">
          <AlertCircle className="w-5 h-5 text-[var(--ad-warn)] mt-0.5 shrink-0" />
          <p className="text-[var(--ad-warn)] text-sm">{migrationWarning}</p>
        </div>
      )}

      {error && (
        <div className="ad-error-card rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-8 h-8 text-[var(--ad-bad)] mb-3" />
          <h3 className="text-[var(--ad-bad)] font-semibold mb-1">Failed to load users</h3>
          <p className="text-[var(--ad-bad)] text-sm max-w-md opacity-90">{error}</p>
        </div>
      )}

      {!error && loading && (
        <AppLoader label="Fetching user records" variant="page-short" />
      )}

      {!error && !loading && (
        <div className="ad-panel ad-card overflow-hidden">
          <div className="overflow-hidden">
            <table className="w-full text-left text-sm" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-[var(--ad-sunk)] border-b border-[var(--ad-line)]">
                <tr>
                  <th className="px-5 py-3.5 font-semibold ad-muted-text text-xs uppercase tracking-wider" style={{ width: '26%' }}>Photographer</th>
                  <th className="px-4 py-3.5 font-semibold ad-muted-text text-xs uppercase tracking-wider" style={{ width: '16%' }}>Last login</th>
                  <th className="px-4 py-3.5 font-semibold ad-muted-text text-xs uppercase tracking-wider" style={{ width: '18%' }}>Activity</th>
                  <th className="px-4 py-3.5 font-semibold ad-muted-text text-xs uppercase tracking-wider" style={{ width: '12%' }}>Status</th>
                  <th className="px-4 py-3.5 font-semibold ad-muted-text text-xs uppercase tracking-wider text-right" style={{ width: '28%' }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ad-line)]">
                {sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <p className="ad-muted-text">
                        {filtersActive ? 'No photographers match the current filters.' : 'No photographers yet.'}
                      </p>
                      {filtersActive && (
                        <button type="button" onClick={clearFilters} className="ad-btn-primary mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors">
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
                      <tr key={user.id} className="ad-row transition-colors align-top">
                        <td className="px-5 py-4 min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="ad-avatar w-9 h-9 rounded-full flex items-center justify-center bg-[var(--ad-ink)] text-[var(--ad-card)] shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold ad-ink truncate">{user.name}</p>
                              <p className="ad-muted-text text-xs truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 min-w-0">
                          <p className="text-[13px] font-medium ad-ink" title={lastLogin.title}>{lastLogin.short}</p>
                          <p className="text-[11px] ad-faint-text">Joined {formatDateShort(user.joinedAt)}</p>
                        </td>
                        <td className="px-4 py-4 min-w-0">
                          <p className="text-[13px] font-medium ad-ink">
                            {user.deliveryCount.toLocaleString()} deliver{user.deliveryCount === 1 ? 'y' : 'ies'} · {user.albumCount.toLocaleString()} album{user.albumCount === 1 ? '' : 's'}
                          </p>
                          <p className="text-[11px] ad-faint-text">{formatBytes(user.storageUsedBytes)} used</p>
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
                              className="ad-action-btn ad-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
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
                                  ? 'bg-[var(--ad-bad)] text-white hover:opacity-90'
                                  : user.isDisabled
                                    ? 'ad-btn-primary'
                                    : 'ad-btn-secondary'
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
                className="ad-btn-secondary px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendEmail}
                className="ad-btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />Send email
              </button>
            </>
          )}
        >
              <div>
                <label className="ad-field-label block mb-1.5">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="e.g. Update to your PIXNXT limits"
                  className="ad-input w-full px-3 py-2.5 border border-[var(--ad-line)] bg-[var(--ad-card)] rounded-xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="ad-field-label block mb-1.5">Message</label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={8}
                  placeholder="Write your message..."
                  className="ad-input w-full px-3 py-2.5 border border-[var(--ad-line)] bg-[var(--ad-card)] rounded-xl text-sm outline-none resize-y"
                />
              </div>
              <p className="text-[11px] ad-faint-text">Opens your mail app addressed to {emailTarget.email} with this subject and message.</p>
        </AdminModal>
      )}
    </div>
  );
};

export default AdminUserManagement;
