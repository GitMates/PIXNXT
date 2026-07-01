import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';
import { MOCK_PHOTOS } from '../data/mockStoreData';

// ─── STATUS MAPS ─────────────────────────────────────────────
const PRINT_STATUS_COLORS = {
  queued: '#64748b',
  ready_to_print: '#3b82f6',
  printing: '#8b5cf6',
  printed: '#005c5a',
  failed: '#ef4444',
  reprint_required: '#f97316',
  sent_to_qc: '#10b981',
};
const PRINT_STATUS_LABELS = {
  queued: 'Queued',
  ready_to_print: 'Ready To Print',
  printing: 'Printing',
  printed: 'Printed',
  failed: 'Failed',
  reprint_required: 'Reprint Required',
  sent_to_qc: 'Sent To QC',
};
const PRIORITY_COLORS = { low: '#94a3b8', medium: '#3b82f6', high: '#f97316', urgent: '#ef4444' };
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
const PAPER_COLORS = { matte: '#78716c', semi_gloss: '#0ea5e9', luster: '#eab308', fine_art: '#a855f7', canvas: '#22c55e' };
const PAPER_LABELS = { matte: 'Matte', semi_gloss: 'Semi Gloss', luster: 'Lustre', fine_art: 'Fine Art', canvas: 'Canvas' };
const PRINTER_STATUS_COLORS = { idle: '#10b981', printing: '#8b5cf6', paused: '#f59e0b', maintenance: '#ef4444', offline: '#94a3b8' };

// ─── HELPERS ────────────────────────────────────────────────
const getOrientation = (sizeStr) => {
  if (!sizeStr) return 'landscape';
  const m = sizeStr.match(/(\d+)\s*x\s*(\d+)/i);
  if (!m) return 'landscape';
  const w = parseInt(m[1], 10), h = parseInt(m[2], 10);
  if (w === h) return 'square';
  return w > h ? 'landscape' : 'portrait';
};

const estimatePrintTime = (sizeStr, qty) => {
  const m = sizeStr?.match(/(\d+)\s*x\s*(\d+)/i);
  const area = m ? parseInt(m[1]) * parseInt(m[2]) : 500;
  return Math.max(2, Math.ceil((area / 200) * qty));
};

const estimateInk = (sizeStr, qty) => {
  const m = sizeStr?.match(/(\d+)\s*x\s*(\d+)/i);
  const area = m ? parseInt(m[1]) * parseInt(m[2]) : 500;
  return parseFloat(((area * qty * 0.008).toFixed(1)));
};

const getThumb = (item) => {
  const opts = item?.options || {};
  let p = opts.photo;
  if (!p && opts.photos?.length) p = opts.photos[0];
  if (!p) return '';
  if (typeof p === 'string') {
    if (p.startsWith('http') || p.startsWith('data:')) return p;
    const mock = MOCK_PHOTOS.find(x => x.id === p);
    return mock ? mock.url : '';
  }
  if (typeof p === 'object') {
    if (p.url) return p.url;
    if (p.id) { const mock = MOCK_PHOTOS.find(x => x.id === p.id); return mock ? mock.url : ''; }
  }
  return '';
};

// ─── STYLES ───────────────────────────────────────────────
const cardStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', flex: '1 1 200px', minWidth: '180px' };
const sectionTitle = { fontSize: '13px', fontWeight: 800, color: '#005c5a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px', borderBottom: '2px solid #005c5a', paddingBottom: '8px', fontFamily: "'EB Garamond', serif" };
const btnPrimary = { background: '#005c5a', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' };
const btnSecondary = { background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' };
const btnDanger = { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' };

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function LabPrintQueue() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders, orderItems, setOrders, employees, refreshOrders } = useLabAuth();

  // ─── State ──────────────────────────────────────────────
  const [printers, setPrinters] = useState([]);
  const [printJobs, setPrintJobs] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaper, setFilterPaper] = useState('all');
  const [filterSize, setFilterSize] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterPrinter, setFilterPrinter] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('jobs'); // jobs | batches | reprints | workload

  // ─── Fetch printers ─────────────────────────────────────
  const fetchPrinters = useCallback(async () => {
    try {
      setLoadingPrinters(true);
      const { data, error } = await supabase.from('printstore_lab_printers').select('*').order('created_at');
      if (error) throw error;

      if (!data || data.length === 0) {
        // Seed printers
        const seed = [
          { name: 'Canon PRO-300 #1', model: 'Canon PRO-300', status: 'idle', location: 'Bay 1', max_width_cm: 33, supported_papers: ['matte', 'semi_gloss', 'luster', 'fine_art'] },
          { name: 'Canon imagePROGRAF PRO-1000', model: 'Canon imagePROGRAF PRO-1000', status: 'idle', location: 'Bay 2', max_width_cm: 60, supported_papers: ['matte', 'semi_gloss', 'luster', 'fine_art', 'canvas'] },
          { name: 'Epson SureColor P900', model: 'Epson SureColor P900', status: 'idle', location: 'Bay 3', max_width_cm: 44, supported_papers: ['matte', 'semi_gloss', 'luster', 'fine_art'] },
          { name: 'Epson SureColor P700', model: 'Epson SureColor P700', status: 'idle', location: 'Bay 4', max_width_cm: 33, supported_papers: ['matte', 'semi_gloss', 'luster'] },
          { name: 'HP DesignJet T230', model: 'HP DesignJet T230', status: 'idle', location: 'Bay 5', max_width_cm: 61, supported_papers: ['matte', 'semi_gloss', 'luster', 'canvas'] },
        ];
        const { data: inserted, error: ie } = await supabase.from('printstore_lab_printers').insert(seed).select();
        if (!ie && inserted) setPrinters(inserted);
        else setPrinters([]);
      } else {
        setPrinters(data);
      }
    } catch (e) {
      console.error('Error loading printers:', e);
      setIsDemoMode(true);
      const local = localStorage.getItem('pixnxt_demo_printers');
      if (local) {
        setPrinters(JSON.parse(local));
      } else {
        const seed = [
          { id: 'printer-1', name: 'Canon PRO-300 #1', model: 'Canon PRO-300', status: 'idle', location: 'Bay 1', max_width_cm: 33, supported_papers: ['matte', 'semi_gloss', 'luster', 'fine_art'] },
          { id: 'printer-2', name: 'Canon imagePROGRAF PRO-1000', model: 'Canon imagePROGRAF PRO-1000', status: 'idle', location: 'Bay 2', max_width_cm: 60, supported_papers: ['matte', 'semi_gloss', 'luster', 'fine_art', 'canvas'] },
          { id: 'printer-3', name: 'Epson SureColor P900', model: 'Epson SureColor P900', status: 'idle', location: 'Bay 3', max_width_cm: 44, supported_papers: ['matte', 'semi_gloss', 'luster', 'fine_art'] },
          { id: 'printer-4', name: 'Epson SureColor P700', model: 'Epson SureColor P700', status: 'idle', location: 'Bay 4', max_width_cm: 33, supported_papers: ['matte', 'semi_gloss', 'luster'] },
          { id: 'printer-5', name: 'HP DesignJet T230', model: 'HP DesignJet T230', status: 'idle', location: 'Bay 5', max_width_cm: 61, supported_papers: ['matte', 'semi_gloss', 'luster', 'canvas'] },
        ];
        setPrinters(seed);
        localStorage.setItem('pixnxt_demo_printers', JSON.stringify(seed));
      }
    }
    finally { setLoadingPrinters(false); }
  }, []);

  // ─── Fetch print jobs ──────────────────────────────────
  const fetchPrintJobs = useCallback(async () => {
    try {
      setLoadingJobs(true);
      const { data, error } = await supabase.from('printstore_print_jobs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPrintJobs(data || []);
    } catch (e) {
      console.error('Error loading print jobs:', e);
      setIsDemoMode(true);
      const local = localStorage.getItem('pixnxt_demo_print_jobs');
      if (local) {
        setPrintJobs(JSON.parse(local));
      } else {
        setPrintJobs([]);
      }
    }
    finally { setLoadingJobs(false); }
  }, []);

  // ─── Auto-generate print jobs from orders ──────────────
  const autoGenerateJobs = useCallback(async () => {
    const printingOrders = orders.filter(o => o.status === 'printing' || o.status === 'pending');
    if (printingOrders.length === 0 || printJobs === null) return;

    const existingOrderIds = new Set(printJobs.map(j => j.order_id));
    const newJobs = [];

    for (const order of printingOrders) {
      if (existingOrderIds.has(order.id)) continue;

      const items = orderItems.filter(it => it.order_id === order.id);
      for (const item of items) {
        const opts = item.options || {};
        const sizeLabel = opts.size?.label || '25x38 cm';
        const paperLabel = opts.paper?.label?.toLowerCase()?.replace(/\s+/g, '_') || 'luster';
        const paperKey = Object.keys(PAPER_LABELS).find(k => PAPER_LABELS[k].toLowerCase() === (opts.paper?.label || 'lustre').toLowerCase()) || paperLabel;
        const orientation = getOrientation(sizeLabel);
        const etMinutes = estimatePrintTime(sizeLabel, item.quantity);
        const etInk = estimateInk(sizeLabel, item.quantity);

        newJobs.push({
          id: 'job_' + Math.random().toString(36).substr(2, 9),
          order_id: order.id,
          order_item_id: item.id,
          priority: order.priority || 'medium',
          print_size: sizeLabel,
          paper_type: paperKey,
          orientation,
          quantity: item.quantity,
          status: order.status === 'printing' ? 'ready_to_print' : 'queued',
          estimated_time_minutes: etMinutes,
          estimated_ink_ml: etInk,
          estimated_paper_sheets: item.quantity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    if (newJobs.length > 0) {
      if (isDemoMode) {
        const updatedJobs = [...newJobs, ...printJobs];
        setPrintJobs(updatedJobs);
        localStorage.setItem('pixnxt_demo_print_jobs', JSON.stringify(updatedJobs));
      } else {
        try {
          const insertPayload = newJobs.map(({ id, ...rest }) => rest);
          const { data, error } = await supabase.from('printstore_print_jobs').insert(insertPayload).select();
          if (!error && data) {
            setPrintJobs(prev => [...data, ...prev]);
          }
        } catch (e) { console.error('Error creating print jobs:', e); }
      }
    }
  }, [orders, orderItems, printJobs, isDemoMode]);

  // ─── Initial load ───────────────────────────────────────
  useEffect(() => { fetchPrinters(); fetchPrintJobs(); }, []);

  // Auto-generate jobs when orders load
  useEffect(() => {
    if (orders.length > 0 && !loadingJobs) {
      autoGenerateJobs();
    }
  }, [orders, loadingJobs, autoGenerateJobs]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPrintJobs();
      fetchPrinters();
      if (refreshOrders) refreshOrders();
      setLastSync(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchPrintJobs, fetchPrinters, refreshOrders]);

  const handleManualRefresh = () => {
    fetchPrintJobs();
    fetchPrinters();
    if (refreshOrders) refreshOrders();
    setLastSync(new Date());
  };

  // ─── Enriched jobs ─────────────────────────────────────
  const enrichedJobs = useMemo(() => {
    return printJobs.map(job => {
      const order = orders.find(o => o.id === job.order_id);
      const item = orderItems.find(i => i.id === job.order_item_id);
      const printer = printers.find(p => p.id === job.printer_id);
      return { ...job, order, item, printer, thumbnail: getThumb(item) };
    });
  }, [printJobs, orders, orderItems, printers]);

  // ─── Filtered jobs ─────────────────────────────────────
  const filteredJobs = useMemo(() => {
    let result = [...enrichedJobs];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(j =>
        j.order_id?.toLowerCase().includes(q) ||
        j.order?.customer_name?.toLowerCase().includes(q) ||
        j.order?.customer_email?.toLowerCase().includes(q)
      );
    }
    if (filterPaper !== 'all') result = result.filter(j => j.paper_type === filterPaper);
    if (filterSize !== 'all') result = result.filter(j => j.print_size === filterSize);
    if (filterPriority !== 'all') result = result.filter(j => j.priority === filterPriority);
    if (filterPrinter !== 'all') result = result.filter(j => j.printer_id === filterPrinter);
    if (filterStatus !== 'all') result = result.filter(j => j.status === filterStatus);
    return result;
  }, [enrichedJobs, searchQuery, filterPaper, filterSize, filterPriority, filterPrinter, filterStatus]);

  // ─── Stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      waiting: enrichedJobs.filter(j => j.status === 'queued' || j.status === 'ready_to_print').length,
      printing: enrichedJobs.filter(j => j.status === 'printing').length,
      completedToday: enrichedJobs.filter(j => (j.status === 'printed' || j.status === 'sent_to_qc') && j.completed_at && new Date(j.completed_at).toDateString() === today).length,
      reprints: enrichedJobs.filter(j => j.status === 'failed' || j.status === 'reprint_required').length,
    };
  }, [enrichedJobs]);

  // ─── Batches ────────────────────────────────────────────
  const batches = useMemo(() => {
    const batchable = enrichedJobs.filter(j => j.status === 'queued' || j.status === 'ready_to_print');
    const groups = {};
    batchable.forEach(j => {
      const key = `${j.paper_type}|${j.print_size}|${j.orientation}`;
      if (!groups[key]) groups[key] = { paper_type: j.paper_type, print_size: j.print_size, orientation: j.orientation, jobs: [] };
      groups[key].jobs.push(j);
    });
    return Object.values(groups).filter(b => b.jobs.length >= 1).sort((a, b) => b.jobs.length - a.jobs.length);
  }, [enrichedJobs]);

  // ─── Reprints ───────────────────────────────────────────
  const reprintJobs = useMemo(() => enrichedJobs.filter(j => j.status === 'failed' || j.status === 'reprint_required'), [enrichedJobs]);

  // ─── Material stats ─────────────────────────────────────
  const materialStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayDone = enrichedJobs.filter(j => j.completed_at && new Date(j.completed_at).toDateString() === today);
    const totalSheets = todayDone.reduce((s, j) => s + (j.estimated_paper_sheets || 0), 0);
    const totalInk = todayDone.reduce((s, j) => s + parseFloat(j.estimated_ink_ml || 0), 0);
    const totalArea = todayDone.reduce((s, j) => {
      const m = j.print_size?.match(/(\d+)\s*x\s*(\d+)/i);
      if (m) return s + (parseInt(m[1]) * parseInt(m[2]) * (j.quantity || 1)) / 10000;
      return s;
    }, 0);
    return { sheets: totalSheets, ink: totalInk.toFixed(1), area: totalArea.toFixed(2), cost: (totalSheets * 52.5).toFixed(0) };
  }, [enrichedJobs]);

  // ─── Workload ───────────────────────────────────────────
  const workload = useMemo(() => {
    return printers.map(p => {
      const pJobs = enrichedJobs.filter(j => j.printer_id === p.id && (j.status === 'printing' || j.status === 'ready_to_print'));
      const totalTime = pJobs.reduce((s, j) => s + (j.estimated_time_minutes || 5), 0);
      return { ...p, jobCount: pJobs.length, remainingMinutes: totalTime };
    });
  }, [printers, enrichedJobs]);

  // ─── Actions ────────────────────────────────────────────
  const updateJobStatus = async (jobId, newStatus, extraFields = {}) => {
    const updates = { status: newStatus, updated_at: new Date().toISOString(), ...extraFields };
    if (newStatus === 'printing') updates.started_at = new Date().toISOString();
    if (newStatus === 'printed' || newStatus === 'sent_to_qc') updates.completed_at = new Date().toISOString();

    setPrintJobs(prev => {
      const next = prev.map(j => j.id === jobId ? { ...j, ...updates } : j);
      if (isDemoMode) {
        localStorage.setItem('pixnxt_demo_print_jobs', JSON.stringify(next));
      }
      return next;
    });

    if (isDemoMode) {
      if (newStatus === 'sent_to_qc') {
        const job = printJobs.find(j => j.id === jobId);
        if (job) {
          setOrders(prev => prev.map(o => o.id === job.order_id ? { ...o, status: 'printed' } : o));
        }
      }
      return;
    }

    try {
      const { error } = await supabase.from('printstore_print_jobs').update(updates).eq('id', jobId);
      if (error) throw error;

      // If sent_to_qc, also update the order status to 'printed'
      if (newStatus === 'sent_to_qc') {
        const job = printJobs.find(j => j.id === jobId);
        if (job) {
          await supabase.from('printstore_orders').update({ status: 'printed' }).eq('id', job.order_id);
          setOrders(prev => prev.map(o => o.id === job.order_id ? { ...o, status: 'printed' } : o));
        }
      }
    } catch (e) { console.error('Error updating job:', e); }
  };

  const assignPrinter = async (jobId, printerId) => {
    setPrintJobs(prev => {
      const next = prev.map(j => j.id === jobId ? { ...j, printer_id: printerId } : j);
      if (isDemoMode) {
        localStorage.setItem('pixnxt_demo_print_jobs', JSON.stringify(next));
      }
      return next;
    });
    if (isDemoMode) return;
    try {
      await supabase.from('printstore_print_jobs').update({ printer_id: printerId, updated_at: new Date().toISOString() }).eq('id', jobId);
    } catch (e) { console.error(e); }
  };

  const updateJobPriority = async (jobId, priority) => {
    setPrintJobs(prev => {
      const next = prev.map(j => j.id === jobId ? { ...j, priority } : j);
      if (isDemoMode) {
        localStorage.setItem('pixnxt_demo_print_jobs', JSON.stringify(next));
      }
      return next;
    });
    if (isDemoMode) return;
    try {
      await supabase.from('printstore_print_jobs').update({ priority, updated_at: new Date().toISOString() }).eq('id', jobId);
    } catch (e) { console.error(e); }
  };

  const updatePrinterStatus = async (printerId, status) => {
    setPrinters(prev => {
      const next = prev.map(p => p.id === printerId ? { ...p, status } : p);
      if (isDemoMode) {
        localStorage.setItem('pixnxt_demo_printers', JSON.stringify(next));
      }
      return next;
    });
    if (isDemoMode) return;
    try {
      await supabase.from('printstore_lab_printers').update({ status, updated_at: new Date().toISOString() }).eq('id', printerId);
    } catch (e) { console.error(e); }
  };

  const startBatch = async (batch) => {
    for (const job of batch.jobs) {
      await updateJobStatus(job.id, 'ready_to_print');
    }
  };

  const openDrawer = (job) => { setSelectedJob(job); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setSelectedJob(null); };

  // ─── Unique sizes for filter ────────────────────────────
  const uniqueSizes = useMemo(() => [...new Set(enrichedJobs.map(j => j.print_size).filter(Boolean))].sort(), [enrichedJobs]);

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  const isLoading = loadingPrinters || loadingJobs;

  return (
    <div style={{ padding: '28px 32px', backgroundColor: '#fafaf8', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'europa', sans-serif" }}>

      {/* ─── DEMO MODE BANNER ──────────────────────────────── */}
      {isDemoMode && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fef3c7',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#b45309',
          fontSize: '12.5px'
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <div>
            <strong>Demo Mode Active:</strong> Working with in-memory workstation storage. The database tables for print production were not detected in this environment. Run 
            <code style={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: '3px', margin: '0 4px' }}>print_production_schema.sql</code> 
            in your Supabase SQL Editor to enable persistent database sync.
          </div>
        </div>
      )}

      {/* ─── HEADER ──────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '28px', color: '#005c5a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Print Production Center
            </h1>
            <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#005c5a', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }}>1</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '12.5px', margin: '4px 0 0 0', maxWidth: '600px' }}>
            Monitor active printers, manage print jobs, organize production batches, and dispatch completed prints to Quality Control.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Last sync: {lastSync.toLocaleTimeString()}</span>
          <button onClick={handleManualRefresh} style={btnPrimary}>↻ Refresh</button>
        </div>
      </div>

      {/* ─── SECTION 1: OVERVIEW CARDS ────────────────────── */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {[
          { label: 'Waiting Jobs', count: stats.waiting, color: '#f59e0b', icon: '⏳', suffix: 'Orders' },
          { label: 'Currently Printing', count: stats.printing, color: '#8b5cf6', icon: '🖨️', suffix: 'Orders' },
          { label: 'Completed Today', count: stats.completedToday, color: '#10b981', icon: '✅', suffix: 'Jobs' },
          { label: 'Reprints Required', count: stats.reprints, color: '#ef4444', icon: '🔄', suffix: 'Jobs' },
        ].map((c, i) => (
          <div key={i} style={{ ...cardStyle, borderLeft: `4px solid ${c.color}`, position: 'relative' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{c.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#111', lineHeight: 1 }}>{c.count}</span>
              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>{c.suffix}</span>
            </div>
            <span style={{ position: 'absolute', top: '16px', right: '18px', fontSize: '24px' }}>{c.icon}</span>
          </div>
        ))}
      </div>

      {/* ─── SECTION 2: PRINTER STATUS CENTER ─────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={sectionTitle}>Printer Status Center</h2>
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
          {printers.length === 0 && !loadingPrinters && (
            <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>No printers configured. Run the SQL schema to set up printers.</p>
          )}
          {printers.map(p => {
            const pJobs = enrichedJobs.filter(j => j.printer_id === p.id);
            const activeJob = pJobs.find(j => j.status === 'printing');
            const queueCount = pJobs.filter(j => j.status === 'queued' || j.status === 'ready_to_print').length;
            const stColor = PRINTER_STATUS_COLORS[p.status] || '#94a3b8';
            return (
              <div key={p.id} style={{ ...cardStyle, minWidth: '220px', flex: '0 0 auto', borderTop: `3px solid ${stColor}`, width: '240px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#111' }}>{p.name}</div>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: `${stColor}18`, color: stColor, textTransform: 'uppercase' }}>
                    {p.status}
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span><strong>Model:</strong> {p.model}</span>
                  <span><strong>Location:</strong> {p.location || '—'}</span>
                  <span><strong>Operator:</strong> {p.assigned_operator || '—'}</span>
                  <span><strong>Queue:</strong> {queueCount} Jobs</span>
                  {activeJob && <span><strong>Current:</strong> #{activeJob.order_id?.slice(0, 8).toUpperCase()}</span>}
                  {activeJob && <span><strong>Remaining:</strong> ~{activeJob.estimated_time_minutes || '?'} min</span>}
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '6px' }}>
                  <select value={p.status} onChange={e => updatePrinterStatus(p.id, e.target.value)}
                    style={{ fontSize: '11px', padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', flex: 1 }}>
                    {Object.keys(PRINTER_STATUS_COLORS).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                  <select value={p.assigned_operator || ''} onChange={async e => {
                    const val = e.target.value;
                    setPrinters(prev => {
                      const next = prev.map(x => x.id === p.id ? { ...x, assigned_operator: val } : x);
                      if (isDemoMode) {
                        localStorage.setItem('pixnxt_demo_printers', JSON.stringify(next));
                      }
                      return next;
                    });
                    if (!isDemoMode) {
                      await supabase.from('printstore_lab_printers').update({ assigned_operator: val }).eq('id', p.id);
                    }
                  }} style={{ fontSize: '11px', padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', flex: 1 }}>
                    <option value="">Assign</option>
                    {employees.filter(e => e.status === 'active').map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION 8: MATERIAL CONSUMPTION ──────────────── */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {[
          { label: 'Paper Used', value: materialStats.sheets, unit: 'Sheets', icon: '📄', color: '#3b82f6' },
          { label: 'Ink Used', value: materialStats.ink, unit: 'ml', icon: '🎨', color: '#8b5cf6' },
          { label: 'Printed Area', value: materialStats.area, unit: 'm²', icon: '📐', color: '#10b981' },
          { label: 'Production Cost', value: `₹${Number(materialStats.cost).toLocaleString('en-IN')}`, unit: '', icon: '💰', color: '#f59e0b' },
        ].map((m, i) => (
          <div key={i} style={{ ...cardStyle, borderLeft: `3px solid ${m.color}`, background: '#fff' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>{m.icon} {m.label} Today</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#111' }}>{m.value} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>{m.unit}</span></div>
          </div>
        ))}
      </div>

      {/* ─── TABS ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '0', borderBottom: '2px solid #e2e8f0' }}>
        {[
          { key: 'jobs', label: 'Active Print Jobs', count: filteredJobs.length },
          { key: 'batches', label: 'Batch Center', count: batches.length },
          { key: 'reprints', label: 'Reprint Center', count: reprintJobs.length },
          { key: 'workload', label: 'Workload Monitor', count: printers.length },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '10px 20px', fontSize: '12.5px', fontWeight: 700, border: 'none', background: activeTab === t.key ? '#005c5a' : 'transparent', color: activeTab === t.key ? '#fff' : '#64748b', cursor: 'pointer', borderRadius: '6px 6px 0 0', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {t.label}
            <span style={{ background: activeTab === t.key ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: activeTab === t.key ? '#fff' : '#64748b', padding: '2px 7px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB: ACTIVE PRINT JOBS ────────────────────────── */}
      {activeTab === 'jobs' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '20px' }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by Order ID, Customer..."
              style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12.5px', minWidth: '220px', flex: '1 1 220px' }} />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px' }}>
              <option value="all">All Status</option>
              {Object.entries(PRINT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterPaper} onChange={e => setFilterPaper(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px' }}>
              <option value="all">All Papers</option>
              {Object.entries(PAPER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterSize} onChange={e => setFilterSize(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px' }}>
              <option value="all">All Sizes</option>
              {uniqueSizes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px' }}>
              <option value="all">All Priorities</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterPrinter} onChange={e => setFilterPrinter(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px' }}>
              <option value="all">All Printers</option>
              {printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Jobs Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Priority', '', 'Order ID', 'Product', 'Size', 'Paper', 'Qty', 'Orient.', 'Printer', 'Status', 'Est. Time', 'Actions'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr><td colSpan={12} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No print jobs found. New orders in "printing" status will auto-generate jobs.</td></tr>
                ) : filteredJobs.map(job => (
                  <tr key={job.id} onClick={() => openDrawer(job)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                    {/* Priority */}
                    <td style={{ padding: '10px 8px' }}>
                      <select value={job.priority} onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); updateJobPriority(job.id, e.target.value); }}
                        style={{ fontSize: '11px', padding: '3px 6px', border: `2px solid ${PRIORITY_COLORS[job.priority]}`, borderRadius: '4px', fontWeight: 700, color: PRIORITY_COLORS[job.priority], background: '#fff', cursor: 'pointer' }}>
                        {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    {/* Thumbnail */}
                    <td style={{ padding: '10px 4px' }}>
                      {job.thumbnail ? (
                        <img src={job.thumbnail} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🖼️</div>
                      )}
                    </td>
                    {/* Order ID */}
                    <td style={{ padding: '10px 8px', fontWeight: 700, color: '#111', fontFamily: 'monospace', fontSize: '12px' }}>
                      PXNXT-{job.order_id?.slice(0, 8).toUpperCase()}
                    </td>
                    {/* Product */}
                    <td style={{ padding: '10px 8px', color: '#334155', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.item?.product_name || 'Custom Product'}
                    </td>
                    {/* Size */}
                    <td style={{ padding: '10px 8px', fontWeight: 700, color: '#111' }}>{job.print_size || '—'}</td>
                    {/* Paper */}
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: `${PAPER_COLORS[job.paper_type] || '#94a3b8'}18`, color: PAPER_COLORS[job.paper_type] || '#94a3b8' }}>
                        {PAPER_LABELS[job.paper_type] || job.paper_type || '—'}
                      </span>
                    </td>
                    {/* Qty */}
                    <td style={{ padding: '10px 8px', fontWeight: 700, textAlign: 'center' }}>{job.quantity}</td>
                    {/* Orientation */}
                    <td style={{ padding: '10px 8px', fontSize: '11px', color: '#64748b' }}>
                      {job.orientation === 'landscape' ? '🌅' : job.orientation === 'portrait' ? '🖼️' : '⬜'} {job.orientation}
                    </td>
                    {/* Printer */}
                    <td style={{ padding: '10px 8px' }}>
                      <select value={job.printer_id || ''} onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); assignPrinter(job.id, e.target.value); }}
                        style={{ fontSize: '11px', padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', maxWidth: '130px' }}>
                        <option value="">Assign</option>
                        {printers.filter(p => p.status !== 'offline' && p.status !== 'maintenance').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    {/* Status */}
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', background: `${PRINT_STATUS_COLORS[job.status] || '#94a3b8'}14`, color: PRINT_STATUS_COLORS[job.status] || '#94a3b8', whiteSpace: 'nowrap' }}>
                        {PRINT_STATUS_LABELS[job.status] || job.status}
                      </span>
                    </td>
                    {/* Est time */}
                    <td style={{ padding: '10px 8px', fontSize: '12px', color: '#64748b' }}>{job.estimated_time_minutes ? `${job.estimated_time_minutes} min` : '—'}</td>
                    {/* Actions */}
                    <td style={{ padding: '10px 8px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {(job.status === 'queued' || job.status === 'ready_to_print') && (
                          <button onClick={() => updateJobStatus(job.id, 'printing')} style={{ ...btnPrimary, padding: '4px 10px', fontSize: '10.5px' }}>▶ Print</button>
                        )}
                        {job.status === 'printing' && (
                          <>
                            <button onClick={() => updateJobStatus(job.id, 'printed')} style={{ ...btnPrimary, padding: '4px 10px', fontSize: '10.5px', background: '#10b981' }}>✓ Done</button>
                            <button onClick={() => updateJobStatus(job.id, 'queued')} style={{ ...btnSecondary, padding: '4px 10px', fontSize: '10.5px' }}>⏸ Pause</button>
                          </>
                        )}
                        {job.status === 'printed' && (
                          <button onClick={() => updateJobStatus(job.id, 'sent_to_qc')} style={{ ...btnPrimary, padding: '4px 10px', fontSize: '10.5px', background: '#005c5a' }}>→ QC</button>
                        )}
                        {(job.status === 'failed' || job.status === 'reprint_required') && (
                          <button onClick={() => updateJobStatus(job.id, 'queued')} style={{ ...btnDanger, padding: '4px 10px', fontSize: '10.5px' }}>🔄 Requeue</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB: BATCH CENTER ─────────────────────────────── */}
      {activeTab === 'batches' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '20px' }}>
          <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '20px' }}>
            Jobs are auto-grouped by Paper Type, Size, and Orientation for efficient batch printing. Start a batch to prepare all jobs at once.
          </p>
          {batches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No batchable jobs in queue.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              {batches.map((b, i) => {
                const totalCopies = b.jobs.reduce((s, j) => s + (j.quantity || 1), 0);
                const totalTime = b.jobs.reduce((s, j) => s + (j.estimated_time_minutes || 5), 0);
                const hours = Math.floor(totalTime / 60);
                const mins = totalTime % 60;
                return (
                  <div key={i} style={{ ...cardStyle, minWidth: '260px', borderTop: `3px solid ${PAPER_COLORS[b.paper_type] || '#94a3b8'}` }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#111', marginBottom: '12px' }}>BATCH #{i + 1}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569' }}>
                      <span><strong>Paper:</strong> <span style={{ color: PAPER_COLORS[b.paper_type], fontWeight: 700 }}>{PAPER_LABELS[b.paper_type] || b.paper_type}</span></span>
                      <span><strong>Size:</strong> {b.print_size}</span>
                      <span><strong>Orientation:</strong> {b.orientation}</span>
                      <span><strong>Orders:</strong> {b.jobs.length}</span>
                      <span><strong>Total Copies:</strong> {totalCopies}</span>
                      <span><strong>Est. Time:</strong> {hours > 0 ? `${hours}h ` : ''}{mins} min</span>
                    </div>
                    <button onClick={() => startBatch(b)} style={{ ...btnPrimary, marginTop: '14px', width: '100%' }}>▶ Start Batch</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: REPRINT CENTER ──────────────────────────── */}
      {activeTab === 'reprints' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '20px' }}>
          {reprintJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No failed or reprint-required jobs. Great work! 🎉</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Order ID', 'Product', 'Reason', 'Failed Date', 'Priority', 'Actions'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 800, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reprintJobs.map(job => (
                  <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 700, fontFamily: 'monospace', fontSize: '12px' }}>PXNXT-{job.order_id?.slice(0, 8).toUpperCase()}</td>
                    <td style={{ padding: '10px 8px' }}>{job.item?.product_name || 'Custom Product'}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', padding: '3px 8px', background: '#fef2f2', borderRadius: '8px' }}>
                        {(job.failure_reason || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: '12px', color: '#64748b' }}>{job.updated_at ? new Date(job.updated_at).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ fontWeight: 700, color: PRIORITY_COLORS[job.priority], fontSize: '11px' }}>{PRIORITY_LABELS[job.priority]}</span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => updateJobStatus(job.id, 'queued')} style={{ ...btnPrimary, padding: '4px 10px', fontSize: '10.5px' }}>🔄 Reprint</button>
                        <select value={job.printer_id || ''} onChange={e => assignPrinter(job.id, e.target.value)}
                          style={{ fontSize: '11px', padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}>
                          <option value="">Assign Printer</option>
                          {printers.filter(p => p.status !== 'offline').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── TAB: WORKLOAD MONITOR ─────────────────────────── */}
      {activeTab === 'workload' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {workload.map(p => {
              const hours = Math.floor(p.remainingMinutes / 60);
              const mins = p.remainingMinutes % 60;
              const barPct = Math.min(100, (p.jobCount / Math.max(1, enrichedJobs.length)) * 100 * 5);
              return (
                <div key={p.id} style={{ ...cardStyle, minWidth: '280px', flex: '1 1 280px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#111' }}>{p.name}</div>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: `${PRINTER_STATUS_COLORS[p.status]}18`, color: PRINTER_STATUS_COLORS[p.status], textTransform: 'uppercase' }}>
                      {p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#111', marginBottom: '4px' }}>{p.jobCount} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Jobs</span></div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                    {p.jobCount === 0 ? 'Idle — 0 Jobs' : `${hours > 0 ? `${hours}h ` : ''}${mins} min remaining`}
                  </div>
                  <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barPct}%`, background: PRINTER_STATUS_COLORS[p.status] || '#94a3b8', borderRadius: '3px', transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── DETAIL DRAWER ─────────────────────────────────── */}
      {drawerOpen && selectedJob && (
        <>
          <div onClick={closeDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 900 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, width: '480px', maxWidth: '90vw', height: '100vh', background: '#fff', zIndex: 901, overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#111' }}>Print Job Details</h2>
              <button onClick={closeDrawer} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#94a3b8' }}>✕</button>
            </div>

            {/* Order Info */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#005c5a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>Order Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                <div><strong>Order ID:</strong><br />PXNXT-{selectedJob.order_id?.slice(0, 8).toUpperCase()}</div>
                <div><strong>Customer:</strong><br />{selectedJob.order?.customer_name || '—'}</div>
                <div><strong>Email:</strong><br />{selectedJob.order?.customer_email || '—'}</div>
                <div><strong>Placed:</strong><br />{selectedJob.order?.created_at ? new Date(selectedJob.order.created_at).toLocaleDateString() : '—'}</div>
              </div>
            </div>

            {/* Product Info */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#005c5a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>Product Information</h3>
              {selectedJob.thumbnail && <img src={selectedJob.thumbnail} alt="" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '12px', background: '#f8fafc' }} />}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                <div><strong>Product:</strong><br />{selectedJob.item?.product_name || 'Custom Product'}</div>
                <div><strong>Quantity:</strong><br />{selectedJob.quantity}</div>
                <div><strong>Size:</strong><br />{selectedJob.print_size || '—'}</div>
                <div><strong>Paper:</strong><br />{PAPER_LABELS[selectedJob.paper_type] || selectedJob.paper_type || '—'}</div>
                <div><strong>Orientation:</strong><br />{selectedJob.orientation || '—'}</div>
                <div><strong>Border:</strong><br />{selectedJob.item?.options?.border || 'none'}</div>
                <div><strong>Frame:</strong><br />{selectedJob.item?.options?.frame?.label || 'No Frame'}</div>
                <div><strong>Frame Color:</strong><br />{selectedJob.item?.options?.frame?.color || '—'}</div>
              </div>
            </div>

            {/* Production Info */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#005c5a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>Production Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12.5px', color: '#334155' }}>
                <div><strong>Printer:</strong><br />{selectedJob.printer?.name || 'Not Assigned'}</div>
                <div><strong>Priority:</strong><br /><span style={{ color: PRIORITY_COLORS[selectedJob.priority], fontWeight: 700 }}>{PRIORITY_LABELS[selectedJob.priority]}</span></div>
                <div><strong>Est. Print Time:</strong><br />{selectedJob.estimated_time_minutes || '—'} min</div>
                <div><strong>Est. Ink Usage:</strong><br />{selectedJob.estimated_ink_ml || '—'} ml</div>
                <div><strong>Est. Paper:</strong><br />{selectedJob.estimated_paper_sheets || '—'} sheets</div>
                <div><strong>Status:</strong><br /><span style={{ color: PRINT_STATUS_COLORS[selectedJob.status], fontWeight: 700 }}>{PRINT_STATUS_LABELS[selectedJob.status]}</span></div>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#005c5a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>Production Timeline</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0', paddingLeft: '14px', borderLeft: '2px solid #e2e8f0' }}>
                {[
                  { label: 'Job Created', time: selectedJob.created_at },
                  { label: 'Printing Started', time: selectedJob.started_at },
                  { label: 'Printing Completed', time: selectedJob.completed_at },
                ].filter(t => t.time).map((t, i) => (
                  <div key={i} style={{ position: 'relative', paddingLeft: '16px', paddingBottom: '16px' }}>
                    <div style={{ position: 'absolute', left: '-8px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#005c5a', border: '2px solid #fff' }} />
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#111' }}>{t.label}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{new Date(t.time).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              {(selectedJob.status === 'queued' || selectedJob.status === 'ready_to_print') && (
                <button onClick={() => { updateJobStatus(selectedJob.id, 'printing'); closeDrawer(); }} style={{ ...btnPrimary, width: '100%', padding: '10px' }}>▶ Start Printing</button>
              )}
              {selectedJob.status === 'printing' && (
                <>
                  <button onClick={() => { updateJobStatus(selectedJob.id, 'printed'); closeDrawer(); }} style={{ ...btnPrimary, width: '100%', padding: '10px', background: '#10b981' }}>✓ Mark As Printed</button>
                  <button onClick={() => { updateJobStatus(selectedJob.id, 'queued'); closeDrawer(); }} style={{ ...btnSecondary, width: '100%', padding: '10px' }}>⏸ Pause Printing</button>
                  <button onClick={() => { updateJobStatus(selectedJob.id, 'failed', { failure_reason: 'printer_error' }); closeDrawer(); }} style={{ ...btnDanger, width: '100%', padding: '10px' }}>✕ Mark As Failed</button>
                </>
              )}
              {selectedJob.status === 'printed' && (
                <button onClick={() => { updateJobStatus(selectedJob.id, 'sent_to_qc'); closeDrawer(); }} style={{ ...btnPrimary, width: '100%', padding: '10px', background: '#005c5a' }}>→ Send To Quality Control</button>
              )}
              {(selectedJob.status === 'failed' || selectedJob.status === 'reprint_required') && (
                <button onClick={() => { updateJobStatus(selectedJob.id, 'queued'); closeDrawer(); }} style={{ ...btnPrimary, width: '100%', padding: '10px' }}>🔄 Requeue for Reprint</button>
              )}
              <button onClick={() => { navigate(`/lab/orders/${selectedJob.order_id}`, { state: { from: location.pathname } }); }} style={{ ...btnSecondary, width: '100%', padding: '10px' }}>📋 View Full Order Details</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
