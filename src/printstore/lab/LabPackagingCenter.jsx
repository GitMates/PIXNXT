import React, { useState, useEffect, useMemo } from 'react';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Printer, Check, Plus, Eye, ChevronRight, Filter, ChevronLeft, AlertCircle, RefreshCw
} from 'lucide-react';
import { MOCK_PHOTOS } from '../data/mockStoreData';
import { getShortId } from '../utils/idFormat';

export default function LabPackagingCenter() {
  const { orders, orderItems, refreshOrders } = useLabAuth();
  const navigate = useNavigate();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [packerFilter, setPackerFilter] = useState('all');
  const [courierFilter, setCourierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Worksheets & Logs from DB
  const [worksheets, setWorksheets] = useState([]);
  const [packagingLogs, setPackagingLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch worksheets
      const { data: wsData } = await supabase.from('printstore_order_worksheets').select('*');
      if (wsData) setWorksheets(wsData);

      // Fetch packaging logs
      const { data: logData } = await supabase.from('printstore_lab_packaging_logs').select('*');
      if (logData) setPackagingLogs(logData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orders]);

  const getOrderItems = (orderId) => orderItems.filter(item => item.order_id === orderId);

  const getPhotoThumbnail = (item) => {
    if (!item) return '';
    const opts = item.options || {};
    let photoOption = opts.photo;
    if (!photoOption && opts.photos && opts.photos.length > 0) {
      photoOption = opts.photos[0];
    }
    if (!photoOption) return '';
    if (typeof photoOption === 'string') {
      if (photoOption.startsWith('http://') || photoOption.startsWith('https://') || photoOption.startsWith('data:')) {
        return photoOption;
      }
      const mock = MOCK_PHOTOS.find(p => p.id === photoOption);
      if (mock) return mock.url;
      return '';
    }
    if (typeof photoOption === 'object' && photoOption.url) {
      return photoOption.url;
    }
    return '';
  };

  // Group Packaging List dynamically
  const packagingData = useMemo(() => {
    const list = [];
    const wsMap = new Map(worksheets.map(w => [w.order_id, w]));
    const logsMap = new Map(packagingLogs.map(l => [l.order_id, l]));

    // Packaging center shows orders with status packaging, ready_to_ship, shipped, completed
    const targetOrders = orders.filter(o => ['packaging', 'ready_to_ship', 'shipped', 'completed'].includes(o.status));

    targetOrders.forEach(order => {
      const ws = wsMap.get(order.id);
      const log = logsMap.get(order.id);
      const currentItems = getOrderItems(order.id);
      const itemsCount = currentItems.reduce((sum, i) => sum + i.quantity, 0);

      // Status mapping to match screenshot options: To Pack, Packing, Packed, Ready to Ship
      let packStatus = 'To Pack';
      if (order.status === 'packaging') {
        // If it has checklist entries or partial flags, show Packing, otherwise To Pack
        packStatus = log ? 'Packed' : 'To Pack';
      } else if (order.status === 'ready_to_ship') {
        packStatus = 'Ready to Ship';
      } else if (['shipped', 'completed'].includes(order.status)) {
        packStatus = 'Packed';
      }

      list.push({
        id: order.id,
        orderNumber: getShortId(order.id, 'order'),
        order,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        itemsCount,
        thumbnail: currentItems.length > 0 ? getPhotoThumbnail(currentItems[0]) : '',
        courier: ws?.carrier || 'Delhivery',
        packingType: ws?.box_dimensions || 'Standard Box',
        status: packStatus,
        packer: log?.packed_by || 'David'
      });
    });

    return list;
  }, [orders, worksheets, packagingLogs, orderItems]);

  // Compute stats dynamically from packagingData
  const metrics = useMemo(() => {
    const toPack = packagingData.filter(p => p.status === 'To Pack').length;
    const readyToShip = packagingData.filter(p => p.status === 'Ready to Ship').length;
    
    // Packed today count
    const todayStr = new Date().toDateString();
    const packedToday = packagingLogs.filter(l => new Date(l.created_at).toDateString() === todayStr).length;

    // Packed this month
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const packedThisMonth = packagingLogs.filter(l => {
      const d = new Date(l.created_at);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const progress = (packedToday + toPack) ? Math.round((packedToday / (toPack + packedToday)) * 100) : 0;

    return {
      toPack: toPack,
      packedToday: packedToday,
      readyToShip: readyToShip,
      progress: progress,
      totalPacked: packedThisMonth
    };
  }, [packagingData, packagingLogs]);

  // Actions
  const handleMarkAsPacked = async () => {
    if (selectedOrders.length === 0) {
      alert("Please select at least one order to mark as packed.");
      return;
    }
    setIsSubmitting(true);
    try {
      for (const orderId of selectedOrders) {
        // Move status to ready_to_ship
        const { error: updateError } = await supabase
          .from('printstore_orders')
          .update({ 
            status: 'ready_to_ship',
            shelf_location: 'Shelf ' + ['A-03', 'B-11', 'C-08', 'D-12'][Math.floor(Math.random() * 4)]
          })
          .eq('id', orderId);

        if (updateError) {
          // Fallback if shelf_location doesn't exist
          const { error: fallbackError } = await supabase
            .from('printstore_orders')
            .update({ status: 'ready_to_ship' })
            .eq('id', orderId);
          if (fallbackError) throw fallbackError;
        }

        // Create log entry
        const { error: logError } = await supabase.from('printstore_lab_packaging_logs').insert({
          order_id: orderId,
          packed_by: 'PACKING OPERATOR DAVID',
          packaging_type: 'Standard Box',
          bubble_wrap: true,
          corner_protectors: true,
          foam_sheet: true,
          protective_sleeve: true,
          shipping_box: true
        });
        if (logError) throw logError;

        // Insert timeline tracking
        const { error: trackingError } = await supabase.from('printstore_order_tracking').insert({
          order_id: orderId,
          status: 'ready_to_ship',
          label: 'Order Packed',
          description: 'Logistics validation complete. Order packed in Standard Box.'
        });
        if (trackingError) throw trackingError;
      }

      await refreshOrders();
      setSelectedOrders([]);
      alert("Selected orders successfully packed & stored.");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrders(filteredPackaging.map(p => p.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleToggleSelect = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  // Filters & Search
  const filteredPackaging = useMemo(() => {
    let result = [...packagingData];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p => 
        p.orderNumber.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        p.courier.toLowerCase().includes(q)
      );
    }

    if (packerFilter !== 'all') {
      result = result.filter(p => p.packer === packerFilter);
    }

    if (courierFilter !== 'all') {
      result = result.filter(p => p.courier === courierFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    return result;
  }, [packagingData, search, packerFilter, courierFilter, statusFilter]);

  // Pagination
  const paginatedPackaging = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPackaging.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPackaging, currentPage]);

  const totalPages = Math.ceil(filteredPackaging.length / itemsPerPage) || 1;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', width: '100%' }}>
        <div className="lab-spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#ffffff', minHeight: '100%', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", color: '#1e293b', boxSizing: 'border-box' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#0f172a', textTransform: 'uppercase' }}>
            Packaging Center
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Pack and prepare orders for delivery
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12.5px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={14} /> Print Invoice
          </button>
          <button style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12.5px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={14} /> Print Label
          </button>
          <button 
            onClick={handleMarkAsPacked}
            disabled={isSubmitting || selectedOrders.length === 0}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: selectedOrders.length === 0 ? '#cbd5e1' : '#0f766e', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '12.5px', 
              fontWeight: 'bold', 
              color: '#fff', 
              cursor: selectedOrders.length === 0 ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px' 
            }}
          >
            <Plus size={14} /> Mark as Packed
          </button>
        </div>
      </div>

      {/* KPI Cards Row (5 Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        
        {/* Card 1: To Pack */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📦</div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', display: 'block' }}>To Pack</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', display: 'block', margin: '2px 0' }}>{metrics.toPack}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Pending</span>
          </div>
        </div>

        {/* Card 2: Packed Today */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📅</div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', display: 'block' }}>Packed Today</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', display: 'block', margin: '2px 0' }}>{metrics.packedToday}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Orders</span>
          </div>
        </div>

        {/* Card 3: Ready to Ship */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🚚</div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', display: 'block' }}>Ready to Ship</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ea580c', display: 'block', margin: '2px 0' }}>{metrics.readyToShip}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Orders</span>
          </div>
        </div>

        {/* Card 4: Packing Progress */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', display: 'block' }}>Packing Progress</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 2px 0' }}>
            <div style={{ flex: 1, height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${metrics.progress}%`, height: '100%', backgroundColor: '#0f766e', borderRadius: '3px' }} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>{metrics.progress}%</span>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Today</span>
        </div>

        {/* Card 5: Total Packed */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏆</div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', display: 'block' }}>Total Packed</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a', display: 'block', margin: '2px 0' }}>{metrics.totalPacked}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>This month</span>
          </div>
        </div>

      </div>

      {/* Search & Filters row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: '12px', top: '9px', color: '#94a3b8', fontSize: '13px' }}>🔍</span>
          <input
            type="search"
            placeholder="Search by Order ID, Customer, Product..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
          />
        </div>

        {/* Packers */}
        <select 
          value={packerFilter}
          onChange={(e) => { setPackerFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', minWidth: '130px' }}
        >
          <option value="all">All Packers</option>
          <option value="David">David</option>
          <option value="Sarah">Sarah</option>
        </select>

        {/* Couriers */}
        <select 
          value={courierFilter}
          onChange={(e) => { setCourierFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', minWidth: '130px' }}
        >
          <option value="all">All Couriers</option>
          <option value="Delhivery">Delhivery</option>
          <option value="BlueDart">BlueDart</option>
          <option value="India Post">India Post</option>
        </select>

        {/* Status */}
        <select 
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', minWidth: '130px' }}
        >
          <option value="all">All Status</option>
          <option value="To Pack">To Pack</option>
          <option value="Packing">Packing</option>
          <option value="Packed">Packed</option>
          <option value="Ready to Ship">Ready to Ship</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto', marginBottom: '16px' }}>
        <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
              <th style={{ padding: '14px 16px', width: '40px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                <input 
                  type="checkbox" 
                  style={{ cursor: 'pointer' }}
                  onChange={handleSelectAll}
                  checked={selectedOrders.length === filteredPackaging.length && filteredPackaging.length > 0}
                />
              </th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Order ID</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Customer</th>
              <th style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>Items</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Courier</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Packing Type</th>
              <th style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>Status</th>
              <th style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPackaging.map((pack) => {
              const getStatusColors = (status) => {
                if (status === 'To Pack') return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
                if (status === 'Packing') return { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' };
                if (status === 'Packed') return { bg: '#ecfdf5', text: '#10b981', border: '#a7f3d0' };
                return { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' };
              };

              const colors = getStatusColors(pack.status);

              return (
                <tr 
                  key={pack.id} 
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => navigate(`/lab/orders/${pack.id}`)}
                >
                  {/* Checkbox */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      style={{ cursor: 'pointer' }}
                      checked={selectedOrders.includes(pack.id)}
                      onChange={() => handleToggleSelect(pack.id)}
                    />
                  </td>

                  {/* Order ID & Photo Thumbnail */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', flexShrink: 0 }}>
                        {pack.thumbnail ? (
                          <img src={pack.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#94a3b8' }}>📦</div>
                        )}
                      </div>
                      <span style={{ fontWeight: 'bold', color: '#0f766e', fontFamily: 'Courier New, Courier, monospace', whiteSpace: 'nowrap' }}>
                        {pack.orderNumber}
                      </span>
                    </div>
                  </td>

                  {/* Customer */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#1e293b', fontWeight: '500', whiteSpace: 'nowrap' }}>{pack.customerName}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                      {pack.order?.shipping_address?.phone || pack.order?.shipping_address?.address || ''}
                    </div>
                  </td>

                  {/* Items */}
                  <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 'bold', color: '#475569', whiteSpace: 'nowrap' }}>
                    {pack.itemsCount}
                  </td>

                  {/* Courier */}
                  <td style={{ padding: '14px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                    {pack.courier}
                  </td>

                  {/* Packing Type */}
                  <td style={{ padding: '14px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                    {pack.packingType}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      backgroundColor: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      display: 'inline-block',
                      whiteSpace: 'nowrap'
                    }} onClick={(e) => e.stopPropagation()}>
                      {pack.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        onClick={() => navigate(`/lab/orders/${pack.id}`)}
                        style={{
                          width: '28px',
                          height: '28px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          backgroundColor: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#475569'
                        }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => navigate(`/lab/orders/${pack.id}`)}
                        style={{
                          width: '28px',
                          height: '28px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          backgroundColor: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#475569'
                        }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredPackaging.length === 0 && (
              <tr>
                <td colSpan="8" style={{ padding: '40px', textAlignment: 'center', color: '#64748b' }}>
                  No packaging orders found matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>
          Showing {filteredPackaging.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPackaging.length)} of {filteredPackaging.length} orders
        </span>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            style={{ 
              padding: '6px 12px', 
              border: '1px solid #cbd5e1', 
              borderRadius: '6px', 
              backgroundColor: currentPage === 1 ? '#f1f5f9' : '#fff', 
              color: '#475569', 
              fontSize: '12px', 
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer' 
            }}
          >
            &lt;
          </button>
          
          {Array.from({ length: totalPages }, (_, idx) => (
            <button 
              key={idx + 1}
              onClick={() => setCurrentPage(idx + 1)}
              style={{ 
                padding: '6px 12px', 
                border: '1px solid #cbd5e1', 
                borderRadius: '6px', 
                backgroundColor: currentPage === idx + 1 ? '#0f766e' : '#fff', 
                color: currentPage === idx + 1 ? '#fff' : '#475569', 
                fontSize: '12px', 
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {idx + 1}
            </button>
          ))}

          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            style={{ 
              padding: '6px 12px', 
              border: '1px solid #cbd5e1', 
              borderRadius: '6px', 
              backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#fff', 
              color: '#475569', 
              fontSize: '12px', 
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' 
            }}
          >
            &gt;
          </button>
        </div>
      </div>

    </div>
  );
}
