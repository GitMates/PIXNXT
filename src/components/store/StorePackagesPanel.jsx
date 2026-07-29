import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Boxes, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  STORE_PACKAGE_CATEGORIES,
  createStorePackage,
  deleteStorePackage,
  fetchStorePackages,
  updateStorePackage,
} from '../../lib/storePackages';

const EMPTY_FORM = {
  category_tag: 'Wedding',
  name: '',
  photo_count: '40',
  price: '',
  description: '',
  is_active: true,
};

/** Module cache — avoids shake/flash when switching Store Manager tabs. */
let cachedPackagesByPhotographer = {};

function PillToggle({ checked, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={checked}
      style={{
        width: '50px',
        height: '28px',
        borderRadius: '14px',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        backgroundColor: checked ? '#059669' : '#cbd5e1',
        transition: 'background-color 0.3s ease',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          backgroundColor: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          position: 'absolute',
          top: '3px',
          left: checked ? '25px' : '3px',
          transition: 'left 0.3s ease',
        }}
      />
    </button>
  );
}

export default function StorePackagesPanel({ photographerId, onNotify }) {
  const cached = photographerId ? cachedPackagesByPhotographer[photographerId] : null;
  const [packages, setPackages] = useState(() => cached || []);
  const [loading, setLoading] = useState(() => !cached);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterCategory, setFilterCategory] = useState('all');
  const mountedRef = useRef(true);

  const notify = useCallback((text, type = 'success') => {
    if (onNotify) onNotify({ type, text });
  }, [onNotify]);

  const applyPackages = useCallback((rows, photographer) => {
    if (photographer) {
      cachedPackagesByPhotographer[photographer] = rows;
    }
    if (mountedRef.current) setPackages(rows);
  }, []);

  const load = useCallback(async ({ soft = false } = {}) => {
    if (!photographerId) return;
    const hasCache = Array.isArray(cachedPackagesByPhotographer[photographerId]);
    if (!soft && !hasCache && mountedRef.current) setLoading(true);
    try {
      const rows = await fetchStorePackages(photographerId);
      applyPackages(rows, photographerId);
    } catch (err) {
      console.error('Failed to load store packages:', err);
      notify('Failed to load packages: ' + (err.message || 'unknown error'), 'error');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [photographerId, notify, applyPackages]);

  useEffect(() => {
    mountedRef.current = true;
    load({ soft: Array.isArray(cachedPackagesByPhotographer[photographerId]) });
    return () => {
      mountedRef.current = false;
    };
  }, [load, photographerId]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (pkg) => {
    setEditingId(pkg.id);
    setForm({
      category_tag: pkg.category_tag || 'Wedding',
      name: pkg.name || '',
      photo_count: String(pkg.photo_count || 1),
      price: String(Math.round(Number(pkg.price) || 0)),
      description: pkg.description || '',
      is_active: pkg.is_active !== false,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const photoCount = parseInt(form.photo_count, 10);
    const price = parseInt(String(form.price).replace(/[^0-9]/g, ''), 10);

    if (!name) {
      notify('Enter a package name.', 'error');
      return;
    }
    if (!photoCount || photoCount < 1) {
      notify('Enter a valid photo count.', 'error');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      notify('Enter a valid price.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        category_tag: form.category_tag,
        name,
        photo_count: photoCount,
        price,
        description: form.description.trim(),
        is_active: form.is_active,
        package_type: 'digital',
      };

      if (editingId) {
        await updateStorePackage(editingId, photographerId, payload);
        notify('✓ Package updated.');
      } else {
        await createStorePackage(photographerId, {
          ...payload,
          sort_order: packages.length,
        });
        notify('✓ Package created.');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await load({ soft: true });
    } catch (err) {
      console.error('Save package failed:', err);
      notify('Failed to save: ' + (err.message || 'unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (pkg) => {
    const next = !pkg.is_active;
    // Optimistic update — no list flash
    applyPackages(
      packages.map((p) => (p.id === pkg.id ? { ...p, is_active: next } : p)),
      photographerId
    );
    try {
      await updateStorePackage(pkg.id, photographerId, { is_active: next });
    } catch (err) {
      applyPackages(
        packages.map((p) => (p.id === pkg.id ? { ...p, is_active: pkg.is_active } : p)),
        photographerId
      );
      notify('Failed to update status: ' + (err.message || 'unknown error'), 'error');
    }
  };

  const handleDelete = async (pkg) => {
    if (!window.confirm(`Delete package “${pkg.name}”?`)) return;
    const previous = packages;
    applyPackages(packages.filter((p) => p.id !== pkg.id), photographerId);
    try {
      await deleteStorePackage(pkg.id, photographerId);
      notify('✓ Package deleted.');
    } catch (err) {
      applyPackages(previous, photographerId);
      notify('Failed to delete: ' + (err.message || 'unknown error'), 'error');
    }
  };

  const visible = filterCategory === 'all'
    ? packages
    : packages.filter((p) => String(p.category_tag).toLowerCase() === filterCategory.toLowerCase());

  const grouped = STORE_PACKAGE_CATEGORIES.map((cat) => ({
    category: cat,
    items: visible.filter((p) => String(p.category_tag).toLowerCase() === cat.toLowerCase()),
  })).filter((g) => g.items.length > 0);

  const otherItems = visible.filter(
    (p) => !STORE_PACKAGE_CATEGORIES.some((c) => c.toLowerCase() === String(p.category_tag).toLowerCase())
  );
  if (otherItems.length) {
    grouped.push({ category: 'Other', items: otherItems });
  }

  return (
    <div className="store-dashboard-content" style={{ minHeight: '480px' }}>
      <div className="store-dashboard-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="store-dashboard-title">Packages</h1>
          <p className="store-dashboard-subtitle">
            Category offers for clients — e.g. Wedding 40 photos, Portrait 10 photos, Event 25 photos.
            Shown automatically in galleries that use matching category tags.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            fontSize: '12.5px',
            fontWeight: 700,
            border: 'none',
            borderRadius: '8px',
            backgroundColor: '#111',
            color: '#fff',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            flexShrink: 0,
          }}
        >
          <Plus size={16} /> New Package
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', minHeight: '36px' }}>
        {['all', ...STORE_PACKAGE_CATEGORIES].map((cat) => {
          const active = filterCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              style={{
                padding: '8px 14px',
                borderRadius: '9999px',
                border: active ? '1px solid #111' : '1px solid #e2e8f0',
                background: active ? '#111' : '#fff',
                color: active ? '#fff' : '#64748b',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          );
        })}
      </div>

      {showForm && (
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            display: 'grid',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Boxes size={18} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
              {editingId ? 'Edit Package' : 'New Package'}
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Category</label>
              <select
                value={form.category_tag}
                onChange={(e) => setForm((f) => ({ ...f, category_tag: e.target.value }))}
                style={{ height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px' }}
              >
                {STORE_PACKAGE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Package name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Wedding Full Gallery"
                style={{ height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Photo count</label>
              <input
                value={form.photo_count}
                onChange={(e) => setForm((f) => ({ ...f, photo_count: e.target.value.replace(/[^0-9]/g, '') }))}
                placeholder="40"
                style={{ height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Price (₹)</label>
              <input
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/[^0-9]/g, '') }))}
                placeholder="4999"
                style={{ height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Download up to 40 high-resolution photos from this gallery."
              style={{ borderRadius: '8px', border: '1px solid #cbd5e1', padding: '10px 12px', fontSize: '13px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <PillToggle
                checked={form.is_active}
                onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                title={form.is_active ? 'Active' : 'Inactive'}
              />
              <div>
                <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#1a1a1a' }}>
                  {form.is_active ? 'Active — visible to clients' : 'Inactive — hidden from clients'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#111',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: saving ? 0.7 : 1,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {saving ? 'Saving…' : editingId ? 'Update Package' : 'Create Package'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ minHeight: '240px' }}>
        {loading && packages.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Loading packages…</div>
        ) : packages.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              borderRadius: '16px',
              border: '1px dashed #cbd5e1',
              background: 'rgba(255,255,255,0.5)',
              color: '#64748b',
            }}
          >
            <Boxes size={28} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#111' }}>No packages yet</p>
            <p style={{ margin: 0, fontSize: '13px' }}>
              Create a Wedding, Portrait, or Event package. Tag your galleries with the same category so clients see the offer in Download.
            </p>
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No packages in this filter.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {grouped.map(({ category, items }) => (
              <div key={category}>
                <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
                  {category}
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {items.map((pkg) => (
                    <div
                      key={pkg.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap',
                        padding: '18px 20px',
                        borderRadius: '14px',
                        background: 'rgba(255,255,255,0.65)',
                        border: '1px solid rgba(0,0,0,0.06)',
                        opacity: pkg.is_active ? 1 : 0.55,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '15px', color: '#111' }}>{pkg.name}</strong>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            background: '#f1f5f9',
                            color: '#475569',
                          }}>
                            {pkg.photo_count} photos
                          </span>
                          {!pkg.is_active && (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>Hidden</span>
                          )}
                        </div>
                        {pkg.description ? (
                          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>{pkg.description}</p>
                        ) : null}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', color: '#111', minWidth: '72px', textAlign: 'right' }}>
                          ₹{Number(pkg.price).toFixed(0)}
                        </span>
                        <PillToggle
                          checked={!!pkg.is_active}
                          onClick={() => handleToggle(pkg)}
                          title={pkg.is_active ? 'Hide from clients' : 'Show to clients'}
                        />
                        <button
                          type="button"
                          onClick={() => openEdit(pkg)}
                          style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', padding: '8px', cursor: 'pointer', width: '34px', height: '34px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(pkg)}
                          style={{ border: '1px solid #fecaca', background: '#fff', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#dc2626', width: '34px', height: '34px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
