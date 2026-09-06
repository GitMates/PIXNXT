import React, { useState, useEffect } from 'react';
import { Search, MoreVertical, User, AlertCircle, X } from 'lucide-react';
import { AppLoader, AppSpinner } from '../../components/ui/AppLoading';
import { supabase } from '../../lib/supabase/client';

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0.00 MB';
  const tbLimit = 1024 * 1024 * 1024 * 1024;
  const gbLimit = 1024 * 1024 * 1024;
  if (bytes >= tbLimit) return `${(bytes / tbLimit).toFixed(2)} TB`;
  if (bytes >= gbLimit) return `${(bytes / gbLimit).toFixed(2)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatCountQuota(used, limit) {
  const cap = Number(limit);
  if (cap === -1) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Disabled</span>;
  }
  const usedCount = Number(used) || 0;
  if (cap > 0) return `${usedCount.toLocaleString()} / ${cap.toLocaleString()}`;
  return `${usedCount.toLocaleString()} / Unlimited`;
}

function splitStorageDisplay(label) {
  const parts = String(label || '').trim().split(' ');
  return { value: parts[0] || '', unit: parts[1] || 'GB' };
}

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [editingUser, setEditingUser] = useState(null);
  const [storageValue, setStorageValue] = useState('');
  const [storageUnit, setStorageUnit] = useState('GB');
  const [imageEnabled, setImageEnabled] = useState(true);
  const [imageLimit, setImageLimit] = useState('');
  const [imageUnlimited, setImageUnlimited] = useState(true);

  const [faceEnabled, setFaceEnabled] = useState(true);
  const [faceLimit, setFaceLimit] = useState('');
  const [faceUnlimited, setFaceUnlimited] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('photographers')
        .select(
          'id, display_name, email, plan, storage_used_bytes, storage_limit_bytes, image_used_count, image_limit, face_matching_delivery_used, face_matching_delivery_limit'
        )
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mappedPhotographers = (data || []).map((p) => ({
        id: p.id,
        name: p.display_name || 'Unnamed',
        email: p.email,
        plan: p.plan || 'Unknown',
        role: 'Photographer',
        usedStorage: formatBytes(p.storage_used_bytes),
        totalStorage: formatBytes(p.storage_limit_bytes),
        rawLimitBytes: p.storage_limit_bytes || 0,
        rawUsedBytes: p.storage_used_bytes || 0,
        imageUsed: Number(p.image_used_count) || 0,
        imageLimit: p.image_limit != null ? Number(p.image_limit) : 0,
        faceUsed: Number(p.face_matching_delivery_used) || 0,
        faceLimit: p.face_matching_delivery_limit != null ? Number(p.face_matching_delivery_limit) : 0,
      }));

      setUsers(mappedPhotographers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users. Ensure RLS policies allow reading.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openLimitsEditor = (user) => {
    const storage = splitStorageDisplay(user.totalStorage);
    setEditingUser(user);
    setStorageValue(storage.value);
    setStorageUnit(storage.unit);

    const isImgDisabled = user.imageLimit === -1;
    setImageEnabled(!isImgDisabled);
    setImageUnlimited(!isImgDisabled && !(user.imageLimit > 0));
    setImageLimit(user.imageLimit > 0 ? String(user.imageLimit) : '');

    const isFaceDisabled = user.faceLimit === -1;
    setFaceEnabled(!isFaceDisabled);
    setFaceUnlimited(!isFaceDisabled && !(user.faceLimit > 0));
    setFaceLimit(user.faceLimit > 0 ? String(user.faceLimit) : '');

    setActiveMenuId(null);
  };

  const handleUpdateLimits = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setUpdating(true);
    try {
      let multiplier = 1024 * 1024 * 1024;
      if (storageUnit === 'MB') multiplier = 1024 * 1024;
      if (storageUnit === 'TB') multiplier = 1024 * 1024 * 1024 * 1024;

      const parsedStorage = parseFloat(storageValue);
      if (!Number.isFinite(parsedStorage) || parsedStorage <= 0) {
        throw new Error('Enter a storage limit greater than zero.');
      }

      let parsedImages = 0;
      if (!imageEnabled) {
        parsedImages = -1; // Disabled
      } else if (imageUnlimited) {
        parsedImages = 0; // Unlimited
      } else {
        parsedImages = Math.floor(Number(imageLimit));
        if (!Number.isFinite(parsedImages) || parsedImages < 1) {
          throw new Error('Enter an image limit of at least 1, or toggle unlimited.');
        }
      }

      let parsedFace = 0;
      if (!faceEnabled) {
        parsedFace = -1; // Disabled
      } else if (faceUnlimited) {
        parsedFace = 0; // Unlimited
      } else {
        parsedFace = Math.floor(Number(faceLimit));
        if (!Number.isFinite(parsedFace) || parsedFace < 1) {
          throw new Error('Enter a face matching delivery limit of at least 1, or toggle unlimited.');
        }
      }

      const { error: updateError } = await supabase
        .from('photographers')
        .update({
          storage_limit_bytes: Math.round(parsedStorage * multiplier),
          image_limit: parsedImages,
          face_matching_delivery_limit: parsedFace,
        })
        .eq('id', editingUser.id);

      if (updateError) throw updateError;

      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update account limits.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight font-serif uppercase">User Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage administrators and platform users.</p>
        </div>
      </div>

      <div className="bg-[#fdfdfc] p-4 rounded-2xl shadow-sm border border-[#eae8e4] flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#f8f7f4] border border-[#eae8e4] hover:border-[#eae8e4]/80 focus:border-[#1a1a1a] focus:bg-white rounded-xl text-sm outline-none transition-all focus:ring-1 focus:ring-[#1a1a1a]"
          />
        </div>
      </div>

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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#f9f8f5]/85 border-b border-[#eae8e4]">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-500 tracking-wider">User</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 tracking-wider">Role</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 tracking-wider">Plan</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 tracking-wider">Storage</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 tracking-wider">Face AI Images</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 tracking-wider">Face Matching</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No users found matching "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#f8f7f4]/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#f8f7f4] text-slate-600">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700 font-medium">{user.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 capitalize">{user.plan}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {user.usedStorage} / {user.totalStorage}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatCountQuota(user.imageUsed, user.imageLimit)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatCountQuota(user.faceUsed, user.faceLimit)}
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === user.id ? null : user.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === user.id && (
                          <div className="absolute right-6 top-10 w-56 bg-white border border-[#eae8e4] rounded-xl shadow-lg py-1 z-20">
                            <button
                              onClick={() => openLimitsEditor(user)}
                              className="w-full text-left px-4 py-2 text-sm text-[#3c3c3b] hover:bg-[#f8f7f4] transition-colors"
                            >
                              Edit Account Limits
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#fdfdfc] rounded-2xl max-w-md w-full shadow-xl border border-[#eae8e4] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#eae8e4] flex items-center justify-between">
              <h3 className="font-semibold text-[#1a1a1a]">Edit Account Limits</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-gray-400 hover:text-[#3c3c3b] rounded-lg hover:bg-[#f8f7f4] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLimits} className="p-6 space-y-5">
              <p className="text-sm text-gray-500">
                Update storage, image, and face matching limits for{' '}
                <strong className="text-gray-900">{editingUser.email}</strong>.
              </p>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#3c3c3b]">Storage capacity</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={storageValue}
                    onChange={(e) => setStorageValue(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-[#eae8e4] rounded-xl focus:ring-2 focus:ring-[#1a1a1a] focus:border-[#1a1a1a] sm:text-sm outline-none transition-all"
                    placeholder="Enter limit"
                  />
                  <select
                    value={storageUnit}
                    onChange={(e) => setStorageUnit(e.target.value)}
                    className="w-24 px-3 py-2 border border-[#eae8e4] rounded-xl bg-[#f8f7f4] focus:ring-2 focus:ring-[#1a1a1a] focus:border-[#1a1a1a] sm:text-sm outline-none transition-all"
                  >
                    <option value="MB">MB</option>
                    <option value="GB">GB</option>
                    <option value="TB">TB</option>
                  </select>
                </div>
                <p className="text-xs text-gray-400">Used: {editingUser.usedStorage}</p>
              </div>

              {/* Face Recognition Image Limit Section */}
              <div className="space-y-2 p-3.5 rounded-xl border border-[#eae8e4] bg-[#faf9f6]/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={imageEnabled}
                      onClick={() => setImageEnabled(!imageEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        imageEnabled ? 'bg-[#1a1a1a]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          imageEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <label className="text-sm font-medium text-[#3c3c3b] block">Face recognition image limit</label>
                      <span className="text-[11px] text-gray-400">Max photos allowed to be scanned for face matching</span>
                    </div>
                  </div>

                  {imageEnabled && (
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={imageUnlimited}
                        onChange={(e) => setImageUnlimited(e.target.checked)}
                        className="rounded text-[#1a1a1a] focus:ring-0"
                      />
                      Unlimited
                    </label>
                  )}
                </div>

                {!imageEnabled ? (
                  <div className="px-3 py-2 bg-gray-100/80 rounded-xl text-xs text-gray-500 font-medium">
                    Face recognition is turned off (disabled for this user)
                  </div>
                ) : (
                  <input
                    type="number"
                    min="1"
                    step="1"
                    disabled={imageUnlimited}
                    value={imageLimit}
                    onChange={(e) => setImageLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#eae8e4] rounded-xl focus:ring-2 focus:ring-[#1a1a1a] focus:border-[#1a1a1a] sm:text-sm outline-none transition-all disabled:bg-[#f8f7f4] disabled:text-gray-400"
                    placeholder="Max face recognition images (e.g. 500)"
                  />
                )}
                <p className="text-xs text-gray-400">Used: {editingUser.imageUsed.toLocaleString()} images scanned</p>
              </div>

              {/* Face Matching Delivery Limit Section */}
              <div className="space-y-2.5 p-3.5 rounded-xl border border-[#eae8e4] bg-[#faf9f6]/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={faceEnabled}
                      onClick={() => setFaceEnabled(!faceEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        faceEnabled ? 'bg-[#1a1a1a]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          faceEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <label className="text-sm font-medium text-[#3c3c3b] block">Face matching delivery limit</label>
                    </div>
                  </div>

                  {faceEnabled && (
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={faceUnlimited}
                        onChange={(e) => setFaceUnlimited(e.target.checked)}
                        className="rounded text-[#1a1a1a] focus:ring-0"
                      />
                      Unlimited
                    </label>
                  )}
                </div>

                {!faceEnabled ? (
                  <div className="px-3 py-2 bg-gray-100/80 rounded-xl text-xs text-gray-500 font-medium">
                    Feature is turned off (disabled for this user)
                  </div>
                ) : (
                  <>
                    {/* Quick Preset Selector for 1 delivery vs multiple deliveries */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Permission:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFaceUnlimited(false);
                          setFaceLimit('1');
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${
                          !faceUnlimited && faceLimit === '1'
                            ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                            : 'bg-white text-gray-600 border-[#eae8e4] hover:bg-gray-50'
                        }`}
                      >
                        1 Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFaceUnlimited(false);
                          if (faceLimit === '1' || !faceLimit) setFaceLimit('5');
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${
                          !faceUnlimited && Number(faceLimit) > 1
                            ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                            : 'bg-white text-gray-600 border-[#eae8e4] hover:bg-gray-50'
                        }`}
                      >
                        Multiple Deliveries
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFaceUnlimited(true);
                          setFaceLimit('');
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${
                          faceUnlimited
                            ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                            : 'bg-white text-gray-600 border-[#eae8e4] hover:bg-gray-50'
                        }`}
                      >
                        Unlimited
                      </button>
                    </div>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      disabled={faceUnlimited}
                      value={faceLimit}
                      onChange={(e) => setFaceLimit(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#eae8e4] rounded-xl focus:ring-2 focus:ring-[#1a1a1a] focus:border-[#1a1a1a] sm:text-sm outline-none transition-all disabled:bg-[#f8f7f4] disabled:text-gray-400"
                      placeholder={faceUnlimited ? 'Unlimited deliveries' : 'Max face matching deliveries (e.g. 1 or more)'}
                    />
                  </>
                )}
                <p className="text-xs text-gray-400">
                  Used: {editingUser.faceUsed.toLocaleString()} face matching {editingUser.faceUsed === 1 ? 'delivery' : 'deliveries'}
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#eae8e4] mt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-[#eae8e4] text-[#3c3c3b] text-sm font-medium rounded-xl hover:bg-[#f8f7f4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-[#1a1a1a] text-white text-sm font-medium rounded-xl hover:bg-[#2a2a2a] transition-colors disabled:opacity-75 flex items-center gap-2"
                >
                  {updating && <AppSpinner size="xs" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
