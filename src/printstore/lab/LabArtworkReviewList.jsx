import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';
import { useLabAuth } from './LabApp';
import { getShortId } from '../utils/idFormat';
import { Filter, Eye, ShieldAlert, ArrowRight, UserCheck, AlertTriangle, History } from 'lucide-react';
import LabSearchField from './LabSearchField';
import { getLabItemPhotoUrl } from './labPhotoUrl';
import LabFramedThumb from './LabFramedThumb';

export default function LabArtworkReviewList() {
  const { orders, orderItems, refreshOrders } = useLabAuth();
  const navigate = useNavigate();

  // State
  const [dbReviews, setDbReviews] = useState([]);
  const [dbError, setDbError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [reviewerFilter, setReviewerFilter] = useState('all');

  // Fetch reviews from printstore_artwork_reviews
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('printstore_artwork_reviews')
        .select('*');
      
      if (error) {
        // Table probably doesn't exist yet
        setDbError(true);
      } else if (data) {
        setDbReviews(data);
        setDbError(false);
      }
    } catch (e) {
      setDbError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [orders]);

  // Combine DB reviews or fallback to auto-generated reviews for demo/fallback purposes
  const reviewData = useMemo(() => {
    const list = [];
    const dbReviewMap = new Map(dbReviews.map(r => [r.order_id, r]));

    // Match each order item to create a review queue row
    orders.forEach(order => {
      const items = orderItems.filter(item => item.order_id === order.id);
      
      items.forEach((item, index) => {
        // We match order status or custom review status
        const dbReview = dbReviewMap.get(order.id);
        
        let status = 'Pending Review';
        if (dbReview) {
          status = dbReview.review_status;
        } else if (order.status === 'printing' || order.status === 'printed' || order.status === 'completed') {
          status = 'Ready For Print';
        } else if (order.status === 'reprint') {
          status = 'Pending Review';
        } else if (order.status === 'artwork_review') {
          status = 'Waiting Customer';
        }

        // Get thumbnail photo from real order item data only
        const opts = item.options || {};
        const photoUrl = getLabItemPhotoUrl(item);

        let priority = 'Medium';
        if (dbReview?.notes) {
          try {
            priority = JSON.parse(dbReview.notes)?.priority || 'Medium';
          } catch {
            priority = 'Medium';
          }
        }
        const reviewer = dbReview?.reviewed_by || 'Unassigned';

        list.push({
          id: order.id,
          orderItemId: item.id,
          orderNumber: getShortId(order.id, 'order'),
          order,
          item,
          customerName: order.customer_name || '—',
          photographer: opts.photographer || order.photographer_name || '—',
          productType: item.product_name || '—',
          frameType: opts.frameType || (typeof opts.frame === 'object' ? opts.frame?.label : opts.frame) || '—',
          printSize: opts.printSize || (typeof opts.size === 'object' ? opts.size?.label : opts.size) || '—',
          status,
          arrivalTime: order.created_at ? new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '30 May 2025, 10:23 AM',
          rawArrivalDate: order.created_at ? new Date(order.created_at) : new Date(),
          reviewer,
          priority,
          thumbnail: photoUrl
        });
      });
    });

    // Sort by priority and arrival date
    const priorityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
    return list.sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return new Date(b.rawArrivalDate) - new Date(a.rawArrivalDate);
    });
  }, [orders, orderItems, dbReviews]);

  // Compute Statistics Cards
  const stats = useMemo(() => {
    const pending = reviewData.filter(r => r.status === 'Pending Review').length;
    const waiting = reviewData.filter(r => r.status === 'Waiting Customer').length;
    const approved = reviewData.filter(r => r.status === 'Customer Approved' || r.status === 'Ready For Print').length;
    const rejected = reviewData.filter(r => r.status === 'Rejected').length; // Rejected/Failure state
    const newUploads = reviewData.filter(r => r.status === 'New Image Uploaded').length;
    
    return {
      pending,
      waiting,
      approved,
      rejected,
      newUploads,
      avgTime: '24 mins'
    };
  }, [reviewData]);

  // Dynamic filter processing
  const filteredReviews = useMemo(() => {
    return reviewData.filter(r => {
      // Search term match
      if (search) {
        const q = search.toLowerCase();
        const match = 
          r.orderNumber.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.photographer.toLowerCase().includes(q) ||
          r.productType.toLowerCase().includes(q);
        if (!match) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      // Priority filter
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;

      // Reviewer filter
      if (reviewerFilter !== 'all') {
        if (reviewerFilter === 'Unassigned' && r.reviewer !== 'Unassigned') return false;
        if (reviewerFilter !== 'Unassigned' && r.reviewer.toLowerCase() !== reviewerFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [reviewData, search, statusFilter, priorityFilter, reviewerFilter]);

  // Distinct reviewer options for filter
  const reviewerOptions = useMemo(() => {
    const set = new Set(reviewData.map(r => r.reviewer).filter(Boolean));
    return Array.from(set);
  }, [reviewData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', width: '100%' }}>
        <div className="lab-spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#F9F9F7', minHeight: '100%', fontFamily: "'Inter', system-ui, -apple-system, sans-serif", color: '#1e293b', boxSizing: 'border-box' }}>
      
      {/* DB Setup Warning Alert */}
      {dbError && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <AlertTriangle size={18} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <strong style={{ color: '#b45309', fontSize: '13px', display: 'block', marginBottom: '3px' }}>
              Database Table Missing!
            </strong>
            <span style={{ fontSize: '12px', color: '#78350f', lineHeight: '1.4' }}>
              We detected that table <code>printstore_artwork_reviews</code> doesn't exist in Supabase yet. 
              The Artwork Review Center is currently operating in <strong>Dynamic Local State Mode</strong>. 
              To enable persistent storage, please execute the SQL statements inside 
              <span style={{ fontFamily: 'Courier New, monospace', fontSize: '11.5px', background: '#f5f5f5', padding: '2px 4px', borderRadius: '4px', margin: '0 4px' }}>
                src/printstore/lab/printstore_artwork_reviews.sql
              </span> 
              in your Supabase SQL Editor.
            </span>
          </div>
        </div>
      )}

      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#0f172a', textTransform: 'uppercase' }}>
            Artwork Review Center
          </h1>
        </div>
      </div>

      {/* KPI statistics cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Pending Reviews', value: stats.pending, bg: '#eff6ff', color: '#3b82f6', icon: '' },
          { label: 'Waiting Customer', value: stats.waiting, bg: '#fff7ed', color: '#ea580c', icon: '' },
          { label: 'Approved Today', value: stats.approved, bg: '#ecfdf5', color: '#10b981', icon: '' },
          { label: 'Rejected Today', value: stats.rejected, bg: '#fef2f2', color: '#ef4444', icon: '' }
        ].map((card, i) => (
          <div key={i} style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 14, padding: '14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
              {card.icon}
            </div>
            <div>
              <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', display: 'block' }}>{card.label}</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', display: 'block', margin: '2px 0' }}>{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters Row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
        
        {/* Search Input */}
        <LabSearchField
          placeholder="Search by Order ID, Customer, Photographer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Review Status Filter */}
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', minWidth: '150px' }}
        >
          <option value="all">All Statuses</option>
          <option value="Pending Review">Pending Review</option>
          <option value="Waiting Customer">Waiting Customer</option>
          <option value="Customer Approved">Customer Approved</option>
          <option value="New Image Uploaded">New Image Uploaded</option>
          <option value="Ready For Print">Ready For Print</option>
        </select>

        {/* Priority Filter */}
        <select 
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', minWidth: '130px' }}
        >
          <option value="all">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Reviewer Filter */}
        <select 
          value={reviewerFilter}
          onChange={(e) => setReviewerFilter(e.target.value)}
          style={{ padding: '9px 24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none', minWidth: '160px' }}
        >
          <option value="all">All Reviewers</option>
          {reviewerOptions.map(rev => (
            <option key={rev} value={rev}>{rev}</option>
          ))}
        </select>
      </div>

      {/* Review Queue Table */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #ECEAE6', borderRadius: 14, overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '14px 16px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', fontSize: '11px', width: '70px', whiteSpace: 'nowrap' }}>Preview</th>
              <th style={{ padding: '14px 16px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', fontSize: '11px', whiteSpace: 'nowrap' }}>Order ID</th>
              <th style={{ padding: '14px 16px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', fontSize: '11px', whiteSpace: 'nowrap' }}>Customer</th>
              <th style={{ padding: '14px 16px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', fontSize: '11px', whiteSpace: 'nowrap' }}>Photographer</th>
              <th style={{ padding: '14px 16px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', fontSize: '11px', whiteSpace: 'nowrap' }}>Product Type</th>
              <th style={{ padding: '14px 16px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', fontSize: '11px', whiteSpace: 'nowrap' }}>Frame Type</th>
              <th style={{ padding: '14px 16px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', fontSize: '11px', whiteSpace: 'nowrap' }}>Print Size</th>
              <th style={{ padding: '14px 16px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', fontSize: '11px', whiteSpace: 'nowrap' }}>Status</th>
              <th style={{ padding: '14px 16px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', fontSize: '11px', whiteSpace: 'nowrap' }}>Arrival Time</th>
              <th style={{ padding: '14px 16px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', fontSize: '11px', whiteSpace: 'nowrap' }}>Reviewer</th>
              <th style={{ padding: '14px 16px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', fontSize: '11px', whiteSpace: 'nowrap' }}>Priority</th>
              <th style={{ padding: '14px 16px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', fontSize: '11px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReviews.map((row) => {
              const isHigh = row.priority === 'High';
              const isMedium = row.priority === 'Medium';
              
              // Status Badge Styles
              let statusBg = '#eff6ff';
              let statusColor = '#2563eb';
              if (row.status === 'Waiting Customer') {
                statusBg = '#fff7ed';
                statusColor = '#ea580c';
              } else if (row.status === 'New Image Uploaded') {
                statusBg = '#f5f3ff';
                statusColor = '#7c3aed';
              } else if (row.status === 'Ready For Print' || row.status === 'Customer Approved') {
                statusBg = '#ecfdf5';
                statusColor = '#10b981';
              }

              return (
                <tr key={`${row.id}-${row.orderItemId}`} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <LabFramedThumb item={row.item} size={42} />
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', fontFamily: 'Courier New, monospace', color: '#1A1A1A', whiteSpace: 'nowrap' }}>
                    {row.orderNumber}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap' }}>{row.customerName}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                      {row.order?.shipping_address?.phone || row.order?.shipping_address?.address || ''}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{row.photographer}</td>
                  <td style={{ padding: '12px 16px', color: '#1e293b', fontWeight: '500', whiteSpace: 'nowrap' }}>{row.productType}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{row.frameType}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{row.printSize}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      backgroundColor: statusBg,
                      color: statusColor,
                      display: 'inline-block',
                      whiteSpace: 'nowrap'
                    }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{row.arrivalTime}</td>
                  <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{row.reviewer}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10.5px',
                      fontWeight: 'bold',
                      backgroundColor: isHigh ? '#fef2f2' : isMedium ? '#fffbeb' : '#f1f5f9',
                      color: isHigh ? '#ef4444' : isMedium ? '#b45309' : '#64748b',
                      display: 'inline-block',
                      whiteSpace: 'nowrap'
                    }}>
                      {row.priority}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {row.status === 'Waiting Customer' ? (
                      <span
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#fff7ed',
                          border: '1px solid #fed7aa',
                          borderRadius: '6px',
                          color: '#ea580c',
                          fontSize: '11.5px',
                          fontWeight: 'bold',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'default'
                        }}
                      >
                        Awaiting
                      </span>
                    ) : ['Customer Approved', 'New Image Uploaded', 'Ready For Print', 'Approved'].includes(row.status) ? (
                      <button
                        onClick={() => navigate(`/lab/artwork-review/${row.id}`)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#475569',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '11.5px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#475569'}
                      >
                        <History size={12} /> View History
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/lab/artwork-review/${row.id}`)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#1A1A1A',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '11.5px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d9488'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1A1A1A'}
                      >
                        <Eye size={12} /> Review
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredReviews.length === 0 && (
              <tr>
                <td colSpan="12" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  No artwork reviews found matching current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
