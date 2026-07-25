import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';
import { getShortId } from '../utils/idFormat';
import {
  getLabStatusColor,
  getLabStatusLabel,
  canTransitionLabStatus,
} from './labOrderStatus';
import { transitionLabOrderStatus } from './labOrderStatusService';
import LabPipelineRail from './LabPipelineRail';
import { getLabItemPhotoUrl, filterLabPhysicalItems } from './labPhotoUrl';

const FRAME_PRODUCT_TYPES = [
  'frames',
  'matted_frame',
  'matted_frames',
  'float_frames',
  'circular_frames',
  'gallery_board',
  'gallery_boards',
  'matted_collages',
];

const FRAME_COLORS = {
  Black: '#111111',
  White: '#f7f7f7',
  Barnwood: '#8a7f75',
  'Dark Wood': '#3e2723',
  'Light Wood': '#d2b48c',
  Graphite: '#53565b',
  'Classic Wood': '#8b5a2b',
  'Charcoal Black': '#111111',
  'Natural Oak': '#d7a15c',
  'Polar White': '#ffffff',
  Walnut: '#4b321a',
  'Vintage Gold': '#d4af37',
};

const DEFAULT_CHECKLIST = {
  moulding_cut: false,
  mat_cut: false,
  glass_cleaned: false,
  print_mounted: false,
  assembled: false,
  hardware_fitted: false,
  final_wipe: false,
};

function isFrameItem(item) {
  const pType = (item.product_type || '').toLowerCase().replace(/\s+/g, '_');
  if (FRAME_PRODUCT_TYPES.some((ft) => pType.includes(ft))) return true;
  if (pType.includes('frame') || pType.includes('collage')) return true;
  const frame = item.options?.frame;
  if (frame && frame.id && frame.id !== 'frame_none' && frame.id !== 'none' && frame.id !== 'no_frame') {
    return true;
  }
  return false;
}

function parseSizeLabel(label) {
  if (!label) return { width: 25, height: 38 };
  const match = String(label).match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
  if (match) return { width: parseFloat(match[1]), height: parseFloat(match[2]) };
  return { width: 25, height: 38 };
}

function getPhotoUrl(item) {
  return getLabItemPhotoUrl(item);
}

function ChecklistRow({ checked, label, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        border: `1px solid ${checked ? '#ECEAE6' : '#e2e8f0'}`,
        borderRadius: 8,
        background: checked ? '#F4F3F0' : '#fff',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: `2px solid ${checked ? '#1A1A1A' : '#cbd5e1'}`,
          background: checked ? '#1A1A1A' : '#fff',
          color: '#fff',
          fontSize: 11,
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {checked ? '✓' : ''}
      </span>
      <span style={{ fontSize: 13, fontWeight: checked ? 600 : 500, color: '#0f172a' }}>{label}</span>
    </button>
  );
}

export default function LabFrameWorkshop() {
  const navigate = useNavigate();
  const { orders, orderItems, setOrders, setOrderItems, initialLoaded, setInitialLoaded } = useLabAuth();
  const [loading, setLoading] = useState(!initialLoaded);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [tab, setTab] = useState('active'); // ready | active | done
  const [busy, setBusy] = useState(false);
  const [checklist, setChecklist] = useState({ ...DEFAULT_CHECKLIST });
  const [operatorNote, setOperatorNote] = useState('');
  const [jobMeta, setJobMeta] = useState(null);

  const fetchFrameData = useCallback(async (showLoading = !initialLoaded) => {
    try {
      if (showLoading) setLoading(true);
      const { data: ordersData, error: ordersError } = await supabase
        .from('printstore_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (ordersError) throw ordersError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('printstore_order_items')
        .select('*');
      if (itemsError) throw itemsError;

      const physicalItems = filterLabPhysicalItems(itemsData || []);
      const labOrderIds = new Set(physicalItems.map((item) => item.order_id));
      setOrders((ordersData || []).filter((order) => labOrderIds.has(order.id)));
      setOrderItems(physicalItems);
      setInitialLoaded(true);
    } catch (err) {
      console.error('Error fetching frame workshop data:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [initialLoaded, setOrders, setOrderItems, setInitialLoaded]);

  useEffect(() => {
    fetchFrameData();
    const interval = setInterval(() => fetchFrameData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchFrameData]);

  const frameOrders = useMemo(() => {
    const result = [];
    orders.forEach((order) => {
      const items = orderItems.filter((item) => item.order_id === order.id && isFrameItem(item));
      if (items.length > 0) result.push({ order, items });
    });
    return result;
  }, [orders, orderItems]);

  const readyQueue = useMemo(
    () => frameOrders.filter((fo) => fo.order.status === 'printed'),
    [frameOrders]
  );
  const activeQueue = useMemo(
    () => frameOrders.filter((fo) => fo.order.status === 'framing'),
    [frameOrders]
  );
  const doneQueue = useMemo(
    () =>
      frameOrders.filter((fo) =>
        ['packaging', 'ready_to_ship', 'shipped', 'completed'].includes(fo.order.status)
      ),
    [frameOrders]
  );

  const visibleQueue = tab === 'ready' ? readyQueue : tab === 'done' ? doneQueue : activeQueue;

  const selected = useMemo(() => {
    if (!selectedOrderId) return null;
    return frameOrders.find((fo) => fo.order.id === selectedOrderId) || null;
  }, [selectedOrderId, frameOrders]);

  const currentItem = useMemo(() => {
    if (!selected) return null;
    if (selectedItemId) {
      return selected.items.find((i) => i.id === selectedItemId) || selected.items[0];
    }
    return selected.items[0];
  }, [selected, selectedItemId]);

  const loadFrameJob = useCallback(async (orderId) => {
    try {
      const { data, error } = await supabase
        .from('printstore_lab_frame_jobs')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();
      if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
        console.warn('Frame job load:', error.message);
      }
      if (data) {
        setJobMeta(data);
        setChecklist({ ...DEFAULT_CHECKLIST, ...(data.checklist || {}) });
        setOperatorNote(data.notes || '');
      } else {
        setJobMeta(null);
        setChecklist({ ...DEFAULT_CHECKLIST });
        setOperatorNote('');
      }
    } catch (e) {
      setJobMeta(null);
      setChecklist({ ...DEFAULT_CHECKLIST });
      setOperatorNote('');
    }
  }, []);

  useEffect(() => {
    if (selectedOrderId) loadFrameJob(selectedOrderId);
  }, [selectedOrderId, loadFrameJob]);

  const saveFrameJob = async (extra = {}) => {
    if (!selectedOrderId) return;
    const payload = {
      order_id: selectedOrderId,
      checklist,
      notes: operatorNote,
      updated_at: new Date().toISOString(),
      ...extra,
    };
    const { error } = await supabase
      .from('printstore_lab_frame_jobs')
      .upsert(payload, { onConflict: 'order_id' });
    if (error) {
      if (error.code === '42P01' || /does not exist|schema cache/i.test(error.message || '')) {
        throw new Error(
          'Frame jobs table missing. Run src/printstore/lab/lab_frame_workshop.sql in Supabase.'
        );
      }
      throw error;
    }
  };

  const openOrder = (orderId) => {
    setSelectedOrderId(orderId);
    setSelectedItemId(null);
  };

  const handleStartFraming = async () => {
    if (!selected) return;
    if (!canTransitionLabStatus(selected.order.status, 'framing')) {
      alert(`Cannot start framing from "${getLabStatusLabel(selected.order.status)}".`);
      return;
    }
    setBusy(true);
    try {
      await transitionLabOrderStatus(selected.order.id, 'framing', {
        fromStatus: selected.order.status,
      });
      await saveFrameJob({
        started_at: new Date().toISOString(),
        status: 'in_progress',
      });
      await fetchFrameData(false);
      setTab('active');
    } catch (err) {
      alert(err.message || 'Failed to start framing');
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteFraming = async () => {
    if (!selected) return;
    const allDone = Object.values(checklist).every(Boolean);
    if (!allDone) {
      alert('Complete all assembly checklist items before sending to packaging.');
      return;
    }
    if (!canTransitionLabStatus(selected.order.status, 'packaging')) {
      alert(`Cannot complete framing from "${getLabStatusLabel(selected.order.status)}".`);
      return;
    }
    if (!window.confirm('Mark framing complete and send this order to Packaging?')) return;
    setBusy(true);
    try {
      await saveFrameJob({
        completed_at: new Date().toISOString(),
        status: 'completed',
      });
      await transitionLabOrderStatus(selected.order.id, 'packaging', {
        fromStatus: selected.order.status,
      });
      await fetchFrameData(false);
      setSelectedOrderId(null);
      setTab('done');
    } catch (err) {
      alert(err.message || 'Failed to complete framing');
    } finally {
      setBusy(false);
    }
  };

  const handleSendReprint = async () => {
    if (!selected) return;
    if (!window.confirm('Send this order to Reprint Required?')) return;
    setBusy(true);
    try {
      await saveFrameJob({ status: 'failed' });
      await transitionLabOrderStatus(selected.order.id, 'reprint', {
        fromStatus: selected.order.status,
      });
      await fetchFrameData(false);
      setSelectedOrderId(null);
    } catch (err) {
      alert(err.message || 'Failed to route to reprint');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProgress = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await saveFrameJob({ status: selected.order.status === 'framing' ? 'in_progress' : 'draft' });
      alert('Workshop progress saved.');
      await loadFrameJob(selected.order.id);
    } catch (err) {
      alert(err.message || 'Failed to save progress');
    } finally {
      setBusy(false);
    }
  };

  const toggleCheck = (key) => {
    if (selected?.order.status !== 'framing' && selected?.order.status !== 'printed') return;
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="lab-spinner" />
      </div>
    );
  }

  // ===== DETAIL =====
  if (selected && currentItem) {
    const dims = parseSizeLabel(currentItem.options?.size?.label);
    const frame = currentItem.options?.frame;
    const paper = currentItem.options?.paper;
    const frameLabel = frame?.label || 'No Frame';
    const activeColor = FRAME_COLORS[frameLabel] || frame?.color || '#111111';
    const thickness = 2;
    const glassW = dims.width + 2 * thickness;
    const glassH = dims.height + 2 * thickness;
    const woodLength = 2 * (glassW + glassH);
    const photoUrl = getPhotoUrl(currentItem);
    const status = selected.order.status;
    const canStart = status === 'printed';
    const inWorkshop = status === 'framing';
    const checklistComplete = Object.values(checklist).every(Boolean);

    return (
      <div style={{ padding: 28, background: '#f8fafc', minHeight: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => setSelectedOrderId(null)}
              style={btnSecondary}
            >
              ← Back to queue
            </button>
            <div>
              <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, color: '#0f172a' }}>
                Job {getShortId(selected.order.id)}
              </h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate(`/lab/orders/${selected.order.id}`, { state: { from: '/lab/frame-workshop' } })}
              style={btnSecondary}
            >
              Full order
            </button>
            <button type="button" onClick={handleSaveProgress} disabled={busy} style={btnSecondary}>
              Save progress
            </button>
          </div>
        </div>

        <LabPipelineRail status={status} />

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={card}>
              <h3 style={sectionTitle}>Frame specifications</h3>
              <SpecRow label="Customer" value={selected.order.customer_name || selected.order.customer_email || 'Guest'} />
              <SpecRow label="Product" value={(currentItem.product_type || 'frame').replace(/_/g, ' ')} />
              <SpecRow label="Print size" value={currentItem.options?.size?.label || 'N/A'} />
              <SpecRow
                label="Frame"
                value={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: activeColor, border: '1px solid #cbd5e1' }} />
                    {frameLabel}
                  </span>
                }
              />
              <SpecRow label="Paper" value={paper?.label || 'Standard'} />
              <SpecRow label="Qty" value={String(currentItem.quantity || 1)} />
              <SpecRow
                label="Status"
                value={
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      background: `${getLabStatusColor(status)}18`,
                      color: getLabStatusColor(status),
                    }}
                  >
                    {getLabStatusLabel(status)}
                  </span>
                }
              />
              {selected.items.length > 1 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>LINE ITEMS</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selected.items.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItemId(item.id)}
                        style={{
                          ...btnSecondary,
                          background: currentItem.id === item.id ? '#ecfdf5' : '#fff',
                          borderColor: currentItem.id === item.id ? '#ECEAE6' : '#e2e8f0',
                        }}
                      >
                        Item {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section style={{ ...card, borderColor: '#ECEAE6', background: '#F4F3F0' }}>
              <h3 style={{ ...sectionTitle, color: '#1A1A1A' }}>Cut sheet</h3>
              <SpecRow label="Photo" value={`${dims.width} × ${dims.height} cm`} />
              <SpecRow label="Glass / acrylic" value={`${glassW} × ${glassH} cm`} />
              <SpecRow label="Backing board" value={`${glassW} × ${glassH} cm`} />
              <SpecRow label="Moulding length" value={`${woodLength} cm`} emphasize />
            </section>

            <section style={card}>
              <h3 style={sectionTitle}>Assembly checklist</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ChecklistRow label="Moulding cut to length" checked={checklist.moulding_cut} onToggle={() => toggleCheck('moulding_cut')} disabled={!inWorkshop && !canStart} />
                <ChecklistRow label="Mat board cut / fitted" checked={checklist.mat_cut} onToggle={() => toggleCheck('mat_cut')} disabled={!inWorkshop && !canStart} />
                <ChecklistRow label="Glass / acrylic cleaned" checked={checklist.glass_cleaned} onToggle={() => toggleCheck('glass_cleaned')} disabled={!inWorkshop && !canStart} />
                <ChecklistRow label="Print mounted square" checked={checklist.print_mounted} onToggle={() => toggleCheck('print_mounted')} disabled={!inWorkshop && !canStart} />
                <ChecklistRow label="Frame assembled" checked={checklist.assembled} onToggle={() => toggleCheck('assembled')} disabled={!inWorkshop && !canStart} />
                <ChecklistRow label="Hanging hardware fitted" checked={checklist.hardware_fitted} onToggle={() => toggleCheck('hardware_fitted')} disabled={!inWorkshop && !canStart} />
                <ChecklistRow label="Final wipe & inspect" checked={checklist.final_wipe} onToggle={() => toggleCheck('final_wipe')} disabled={!inWorkshop && !canStart} />
              </div>
              <textarea
                value={operatorNote}
                onChange={(e) => setOperatorNote(e.target.value)}
                placeholder="Operator notes (optional)"
                rows={3}
                style={{
                  marginTop: 12,
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 10,
                  fontSize: 13,
                  resize: 'vertical',
                }}
              />
              {jobMeta?.started_at && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                  Started: {new Date(jobMeta.started_at).toLocaleString()}
                </div>
              )}
            </section>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={{ ...card, textAlign: 'center' }}>
              <h3 style={sectionTitle}>Visual reference</h3>
              <div
                style={{
                  display: 'inline-flex',
                  padding: thickness * 8,
                  background: activeColor,
                  border: '1px solid rgba(0,0,0,0.12)',
                  boxShadow: '0 12px 28px rgba(15,23,42,0.18)',
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    width: Math.max(80, dims.width * 5),
                    height: Math.max(80, dims.height * 5),
                    background: photoUrl
                      ? `center / cover no-repeat url(${photoUrl})`
                      : 'linear-gradient(135deg, #F4F3F0, #cbd5e1)',
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                />
              </div>
              <p style={{ margin: '16px 0 0', fontSize: 12, color: '#64748b' }}>
                {frameLabel} · {paper?.label || 'Standard'} · {dims.width}×{dims.height} cm
              </p>
            </section>

            <section style={card}>
              <h3 style={sectionTitle}>Station actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {canStart && (
                  <button type="button" onClick={handleStartFraming} disabled={busy} style={btnPrimary}>
                    {busy ? 'Working…' : 'Start framing (printed → framing)'}
                  </button>
                )}
                {inWorkshop && (
                  <button
                    type="button"
                    onClick={handleCompleteFraming}
                    disabled={busy || !checklistComplete}
                    style={{
                      ...btnPrimary,
                      opacity: !checklistComplete || busy ? 0.55 : 1,
                    }}
                  >
                    {busy ? 'Working…' : 'Complete → Packaging'}
                  </button>
                )}
                {(inWorkshop || canStart) && (
                  <button type="button" onClick={handleSendReprint} disabled={busy} style={btnDanger}>
                    Fail → Reprint
                  </button>
                )}
                {!canStart && !inWorkshop && (
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                    This job is in <strong>{getLabStatusLabel(status)}</strong>. Only Printed (QC) jobs can be started here; active framing jobs can be completed to Packaging.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // ===== QUEUE =====
  const tabs = [
    { id: 'ready', label: 'Ready from QC', count: readyQueue.length },
    { id: 'active', label: 'In workshop', count: activeQueue.length },
    { id: 'done', label: 'Sent onward', count: doneQueue.length },
  ];

  return (
    <div style={{ padding: 28, background: '#F9F9F7', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 500, color: '#1A1A1A', letterSpacing: '-0.02em' }}>
            Frame Workshop
          </h1>
        </div>
        <button type="button" onClick={() => fetchFrameData(false)} style={btnPrimary}>
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              ...btnSecondary,
              background: tab === t.id ? '#1A1A1A' : '#fff',
              color: tab === t.id ? '#fff' : '#71717A',
              borderColor: tab === t.id ? '#1A1A1A' : '#ECEAE6',
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1A1A1A', color: '#fff' }}>
              <th style={th}>Order</th>
              <th style={th}>Customer</th>
              <th style={th}>Product</th>
              <th style={th}>Size</th>
              <th style={th}>Frame</th>
              <th style={th}>Qty</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleQueue.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>
                  No frame jobs in this tab.
                </td>
              </tr>
            ) : (
              visibleQueue.map(({ order, items }) => {
                const item = items[0];
                const frameLabel = item?.options?.frame?.label || 'No Frame';
                const frameColor = FRAME_COLORS[frameLabel] || item?.options?.frame?.color || '#111';
                return (
                  <tr
                    key={order.id}
                    onClick={() => openOrder(order.id)}
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={td}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{getShortId(order.id)}</span>
                    </td>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{order.customer_name || 'Guest'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{order.customer_email || ''}</div>
                    </td>
                    <td style={{ ...td, textTransform: 'capitalize' }}>{(item.product_type || 'frame').replace(/_/g, ' ')}</td>
                    <td style={td}>{item.options?.size?.label || '—'}</td>
                    <td style={td}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: frameColor, border: '1px solid #cbd5e1' }} />
                        {frameLabel}
                      </span>
                    </td>
                    <td style={td}>{item.quantity || 1}</td>
                    <td style={td}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          background: `${getLabStatusColor(order.status)}18`,
                          color: getLabStatusColor(order.status),
                        }}
                      >
                        {getLabStatusLabel(order.status)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SpecRow({ label, value, emphasize }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 0',
        borderBottom: '1px solid #f1f5f9',
        fontSize: 13,
      }}
    >
      <span style={{ color: '#64748b', fontWeight: 500 }}>{label}</span>
      <span style={{ color: emphasize ? '#1A1A1A' : '#0f172a', fontWeight: emphasize ? 800 : 700, textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

const card = {
  background: '#fff',
  border: '1px solid #ECEAE6',
  borderRadius: 16,
  padding: 16,
  boxShadow: '-4px -4px 12px rgba(255,255,255,0.7), 4px 4px 14px rgba(0,0,0,0.04)',
};

const sectionTitle = {
  margin: '0 0 12px',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#71717A',
};

const btnPrimary = {
  padding: '10px 18px',
  backgroundImage: 'linear-gradient(180deg, #4D4D4D, #333333)',
  color: '#fff',
  border: 'none',
  borderRadius: 9999,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  boxShadow: '0 1px 0 0 rgba(255,255,255,0.15) inset, 0 12px 24px -10px rgba(0,0,0,0.45)',
};

const btnSecondary = {
  padding: '8px 14px',
  background: '#fff',
  color: '#1A1A1A',
  border: '1px solid #ECEAE6',
  borderRadius: 9999,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const btnDanger = {
  ...btnSecondary,
  color: '#b91c1c',
  borderColor: '#fecaca',
  background: '#fef2f2',
};

const th = { padding: '12px 14px', textAlign: 'left', fontWeight: 600 };
const td = { padding: '12px 14px', color: '#0f172a' };
