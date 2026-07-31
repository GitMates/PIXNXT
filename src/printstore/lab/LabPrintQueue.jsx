import React, { useState, useEffect, useMemo } from 'react';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';
import { Play, Pause, Eye } from 'lucide-react';
import { getShortId } from '../utils/idFormat';
import LabSearchField from './LabSearchField';
import { getLabItemPhotoUrl } from './labPhotoUrl';
import LabFramedThumb from './LabFramedThumb';

export default function LabPrintQueue() {
  const { orders, orderItems, refreshOrders, inventory } = useLabAuth();
  
  // State for active printing progress
  const [printingStatus, setPrintingStatus] = useState({}); // orderId -> 'idle' | 'running' | 'paused'
  const [progress, setProgress] = useState({}); // orderId -> percentage
  const [search, setSearch] = useState('');
  const [printerFilter, setPrinterFilter] = useState('all');
  const [paperFilter, setPaperFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showSidebar, setShowSidebar] = useState(true);

  // Filter orders by 'printing' status
  const printQueueOrders = useMemo(() => {
    return orders.filter(o => o.status === 'printing' || o.status === 'processing');
  }, [orders]);

  const getOrderItems = (orderId) => orderItems.filter(item => item.order_id === orderId);

  const getAssignedPrinterName = (order) =>
    order.assigned_printer ||
    order.printer_name ||
    order.printer ||
    getOrderItems(order.id)[0]?.options?.printer?.label ||
    getOrderItems(order.id)[0]?.options?.printer?.name ||
    'Unassigned';

  // Printer list derived from real queue assignments (no mock catalog)
  const printers = useMemo(() => {
    const counts = {};
    printQueueOrders.forEach((o) => {
      const name = getAssignedPrinterName(o);
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, jobs]) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      status: name === 'Unassigned' ? 'Pending' : 'Active',
      quality: '—',
      jobs,
    }));
  }, [printQueueOrders, orderItems]);

  const getPhotoThumbnail = (item) => getLabItemPhotoUrl(item);

  // Simulate progress bar for active jobs
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = { ...prev };
        let updated = false;
        Object.keys(printingStatus).forEach(id => {
          if (printingStatus[id] === 'running') {
            const current = next[id] || 0;
            if (current < 100) {
              next[id] = Math.min(100, current + 10); // increment progress
              updated = true;
            }
          }
        });
        return updated ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [printingStatus]);

  // Auto-finish printing when progress reaches 100%
  useEffect(() => {
    Object.keys(progress).forEach(orderId => {
      if (progress[orderId] >= 100 && printingStatus[orderId] === 'running') {
        setPrintingStatus(prev => ({ ...prev, [orderId]: 'completed' }));
        handleFinishPrinting(orderId);
      }
    });
  }, [progress, printingStatus]);

  const handleStartPrinting = (orderId) => {
    setPrintingStatus(prev => ({ ...prev, [orderId]: 'running' }));
  };

  const handlePausePrinting = (orderId) => {
    setPrintingStatus(prev => ({ ...prev, [orderId]: 'paused' }));
  };

  const handleFinishPrinting = async (orderId) => {
    try {
      // 1. Move status to printed in Supabase
      const { error: updateError } = await supabase
        .from('printstore_orders')
        .update({ status: 'printed' })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // 2. Create timeline log
      await supabase
        .from('printstore_order_tracking')
        .insert({
          order_id: orderId,
          status: 'printed',
          label: 'Printing Completed',
          description: `Images printed successfully. Dispatched to Noida Hub Quality Control Inspection.`
        });

      // Update local states
      setPrintingStatus(prev => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
      setProgress(prev => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });

      if (refreshOrders) {
        await refreshOrders();
      }
    } catch (err) {
      console.error("Error completing printing:", err);
    }
  };

  // Filter queue jobs dynamically
  const filteredJobs = useMemo(() => {
    let result = [...printQueueOrders];

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o => {
        const orderNumber = getShortId(o.id, 'order');
        return orderNumber.toLowerCase().includes(q) ||
               o.id.toLowerCase().includes(q) ||
               (o.customer_name && o.customer_name.toLowerCase().includes(q));
      });
    }

    // Printer filter (real assigned printer on order / item options)
    if (printerFilter !== 'all') {
      result = result.filter((o) => getAssignedPrinterName(o) === printerFilter);
    }

    // Paper type filter
    if (paperFilter !== 'all') {
      result = result.filter(o => {
        const items = getOrderItems(o.id);
        if (items.length === 0) return false;
        const paperType = (items[0].options?.paper?.label || 'Glossy').toLowerCase();
        return paperType.includes(paperFilter.toLowerCase());
      });
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter(o => o.priority === priorityFilter);
    }

    return result;
  }, [printQueueOrders, search, printerFilter, paperFilter, priorityFilter]);

  // Compute stats
  const activeCount = Object.values(printingStatus).filter(s => s === 'running').length;

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F9F9F7', minHeight: '100%', fontFamily: "var(--font-sans)", color: '#1e293b', boxSizing: 'border-box' }}>
      
      {/* Top Header - Fixed (does not scroll horizontally) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#0f172a', textTransform: 'uppercase' }}>
            Print Production Queue
          </h1>
        </div>
      </div>

      {/* KPI Cards Row (6 Cards - Fixed) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '24px' }}>
        
        {/* Card 1 */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 14, padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Jobs in Queue</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>{printQueueOrders.length}</span>
          <span style={{ fontSize: '10.5px', color: '#64748b' }}>Waiting to print</span>
        </div>

        {/* Card 2 */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 14, padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Printing Now</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>{activeCount}</span>
          <span style={{ fontSize: '10.5px', color: '#64748b' }}>In progress</span>
        </div>

        {/* Card 3 */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 14, padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Ink Usage Today</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>42%</span>
          <span style={{ fontSize: '10.5px', color: '#64748b' }}>Of total capacity</span>
        </div>

        {/* Card 4 */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 14, padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Paper Usage Today</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>36%</span>
          <span style={{ fontSize: '10.5px', color: '#64748b' }}>Of total capacity</span>
        </div>

        {/* Card 5 */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 14, padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Jobs Completed</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#22c55e' }}>18</span>
          <span style={{ fontSize: '10.5px', color: '#64748b' }}>Today</span>
        </div>

        {/* Card 6 */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 14, padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Printer Log</span>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#3b82f6', marginTop: '4px' }}>Production</span>
          <span style={{ fontSize: '10.5px', color: '#64748b' }}>Printing active</span>
        </div>

      </div>

      {/* Scrollable container for Filters and main content (does not scroll headers/KPIs) */}
      <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '16px' }}>
        <div style={{ minWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <LabSearchField
              placeholder="Search by Order ID, Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            
            <select value={printerFilter} onChange={(e) => setPrinterFilter(e.target.value)}>
              <option value="all">All Printers</option>
              {printers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>

            <select value={paperFilter} onChange={(e) => setPaperFilter(e.target.value)}>
              <option value="all">All Paper Types</option>
              <option value="glossy">Glossy Photo</option>
              <option value="matte">Matte Photo</option>
            </select>

            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Collapse / Expand right panels arrow toggle */}
            <button 
              onClick={() => setShowSidebar(!showSidebar)}
              style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: showSidebar ? '#e2e8f0' : '#fff', fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title={showSidebar ? "Hide Printer Panel summary" : "Show Printer Panel summary"}
            >
              <span>{showSidebar ? '▲' : '▼'}</span>
            </button>
          </div>

          {/* Main Split Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: showSidebar ? '1.4fr 0.6fr' : '1fr', gap: '20px', alignItems: 'start' }}>
            
            {/* Left Side: Print Queue list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0, overflow: 'hidden' }}>
              
              {/* Queue Table Card - Transparent Background */}
              <div style={{ backgroundColor: 'transparent', border: '1px solid #ECEAE6', borderRadius: 16, overflow: 'hidden', boxShadow: 'none' }}>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#1A1A1A', borderBottom: 'none', color: '#ffffff', fontWeight: 600, textTransform: 'none' }}>
                        <th style={{ padding: '12px 14px', width: '30px', whiteSpace: 'nowrap' }}><input type="checkbox" style={{ cursor: 'pointer' }} /></th>
                        <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Job Details</th>
                        <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Product & Specifications</th>
                        <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Printer</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>Qty</th>
                        <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Priority</th>
                        <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Status</th>
                        <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Est. Time</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.map((job, idx) => {
                        const jobItems = getOrderItems(job.id);
                        const isRunning = printingStatus[job.id] === 'running';
                        const jobProgress = progress[job.id] || 0;
                        const orderNumber = getShortId(job.id, 'order');
                        
                        const assignedPrinterName = getAssignedPrinterName(job);
                        const assignedPrinter = { name: assignedPrinterName, status: assignedPrinterName === 'Unassigned' ? 'Pending' : 'Active' };

                        return (
                          <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px', whiteSpace: 'nowrap' }}><input type="checkbox" style={{ cursor: 'pointer' }} /></td>
                            
                            {/* Job Details with thumbnail preview */}
                            <td style={{ padding: '14px' }}>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                {jobItems[0] ? (
                                  <LabFramedThumb item={jobItems[0]} size={48} />
                                ) : (
                                  <div style={{ width: 48, height: 48 }} />
                                )}
                                <div>
                                  <strong style={{ color: '#1A1A1A', fontSize: '13px', whiteSpace: 'nowrap' }}>{orderNumber}</strong>
                                  <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '12px', marginTop: '2px', whiteSpace: 'nowrap' }}>{job.customer_name}</div>
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1.5px', whiteSpace: 'nowrap' }}>
                                    {job.shipping_address?.phone || job.shipping_address?.address || ''}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Product Specifications */}
                            <td style={{ padding: '14px', fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' }}>
                              {jobItems[0] ? (
                                <>
                                  <div style={{ fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap' }}>{jobItems[0].product_name}</div>
                                  <div style={{ fontSize: '11px', marginTop: '3px', whiteSpace: 'nowrap' }}>Size: {jobItems[0].options?.size?.label || '13x18 cm'}</div>
                                  <div style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>Paper: {jobItems[0].options?.paper?.label || 'Glossy'}</div>
                                  <div style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>Frame: {jobItems[0].options?.frame?.label || 'No Frame'}</div>
                                </>
                              ) : (
                                <span style={{ whiteSpace: 'nowrap' }}>No products spec</span>
                              )}
                            </td>

                            {/* Printer assignment status */}
                            <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                              <strong style={{ color: '#1e293b', fontSize: '12.5px', whiteSpace: 'nowrap' }}>{assignedPrinter.name}</strong>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', whiteSpace: 'nowrap' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: assignedPrinter.status === 'Online' ? '#10b981' : '#ef4444' }} />
                                <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>{assignedPrinter.status}</span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap' }}>{assignedPrinter.quality}</div>
                            </td>

                            {/* Qty */}
                            <td style={{ padding: '14px', textAlign: 'center', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap' }}>
                              {jobItems.reduce((sum, i) => sum + i.quantity, 0)} pcs
                            </td>

                            {/* Priority badge */}
                            <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '10.5px',
                                fontWeight: 'bold',
                                backgroundColor: job.priority === 'High' ? '#fee2e2' : job.priority === 'Medium' ? '#fef3c7' : '#ecfdf5',
                                color: job.priority === 'High' ? '#ef4444' : job.priority === 'Medium' ? '#d97706' : '#10b981',
                                whiteSpace: 'nowrap'
                              }}>{job.priority || 'Medium'}</span>
                            </td>

                            {/* Progress status column */}
                            <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                              {isRunning ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100px' }}>
                                  <span style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#3b82f6', whiteSpace: 'nowrap' }}>Printing - {jobProgress}%</span>
                                  <div style={{ width: '100%', height: '5px', backgroundColor: '#eff6ff', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${jobProgress}%`, height: '100%', backgroundColor: '#3b82f6', transition: 'width 0.15s ease' }} />
                                  </div>
                                </div>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                  {printingStatus[job.id] === 'paused' ? 'Paused' : 'Queued - Waiting'}
                                </span>
                              )}
                            </td>

                            {/* Est. time */}
                            <td style={{ padding: '14px', color: '#475569', fontSize: '12px', whiteSpace: 'nowrap' }}>
                              <div style={{ whiteSpace: 'nowrap' }}>15 mins</div>
                              <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px', whiteSpace: 'nowrap' }}>Due: 11:00 AM</div>
                            </td>

                            {/* Play/Pause actions */}
                            <td style={{ padding: '14px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                {isRunning ? (
                                  <button 
                                    onClick={() => handlePausePrinting(job.id)}
                                    style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center', color: '#e74c3c' }}
                                    title="Pause"
                                  >
                                    <Pause size={12} fill="#e74c3c" />
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => handleStartPrinting(job.id)}
                                    style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center', color: '#2ecc71' }}
                                    title="Print"
                                  >
                                    <Play size={12} fill="#2ecc71" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredJobs.length === 0 && (
                        <tr>
                          <td colSpan="9" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                            No print production jobs active in queue.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right Side: Sidebar info blocks (Conditionally Rendered) */}
            {showSidebar && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Card A: Printer Status - Beautiful Aligned Mockup UI */}
                <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 14, padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>Printer Status</span>
                    <span style={{ fontSize: '11px', color: '#1A1A1A', fontWeight: 'bold', cursor: 'pointer' }}>View All</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {printers.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#71717A' }}>No print jobs in queue.</div>
                    ) : (
                      printers.map(p => (
                      <div key={p.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {/* Generic Printer SVG */}
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" />
                            <path d="M6 9V2h12v7" />
                          </svg>
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '13px' }}>{p.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: p.status === 'Active' ? '#10b981' : '#64748b' }} />
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{p.status}</span>
                          </div>
                        </div>
                        
                        <span style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                          {p.jobs} Jobs
                        </span>
                      </div>
                    ))
                    )}
                  </div>
                </div>

                {/* Card B: Supply Levels from real inventory */}
                <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 14, padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>Supply Levels</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(inventory || []).length === 0 ? (
                      <div style={{ fontSize: 12, color: '#71717A' }}>No inventory records yet.</div>
                    ) : (
                      (inventory || []).slice(0, 6).map((item) => {
                        const qty = Number(item.quantity ?? item.stock ?? 0);
                        const threshold = Number(item.low_stock_threshold ?? item.reorder_level ?? 100) || 100;
                        const pct = Math.max(0, Math.min(100, Math.round((qty / threshold) * 100)));
                        return (
                          <div key={item.id || item.sku} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>{item.name || item.sku || 'Material'}</span>
                                <strong>{qty}</strong>
                              </div>
                              <div style={{ width: '100%', height: '5px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct < 30 ? '#ef4444' : '#10b981' }} />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      </div>

    </div>
  );
}
