import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLabAuth } from './LabApp';
import { MOCK_PHOTOS } from '../data/mockStoreData';
import { Copy, Check, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_COLORS = {
  shipped: '#2ecc71',
  completed: '#27ae60',
};

const STATUS_LABELS = {
  shipped: 'Shipped',
  completed: 'Delivered',
};

const getPhotoThumbnail = (item) => {
  const opts = item?.options || {};
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
  if (typeof photoOption === 'object') {
    if (photoOption.url) return photoOption.url;
    if (photoOption.id) {
      const mock = MOCK_PHOTOS.find(p => p.id === photoOption.id);
      if (mock) return mock.url;
    }
  }
  return '';
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px',
        color: copied ? '#2ecc71' : '#94a3b8',
        marginLeft: '4px',
        verticalAlign: 'middle',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {copied ? <Check size={12} color="#2ecc71" strokeWidth={3} /> : <Copy size={11} />}
    </button>
  );
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function LabDispatchHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders, orderItems } = useLabAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter for shipped / completed only
  const dispatchedOrders = useMemo(() => {
    let result = orders.filter(o => o.status === 'shipped' || o.status === 'completed');

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    return result;
  }, [orders, search, statusFilter]);

  // Group orders by date (based on updated_at or created_at)
  const groupedByDate = useMemo(() => {
    const groups = {};
    dispatchedOrders.forEach(order => {
      const d = new Date(order.updated_at || order.created_at);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          dayName: DAY_NAMES[d.getDay()],
          dayNum: d.getDate(),
          month: MONTH_NAMES[d.getMonth()],
          year: d.getFullYear(),
          orders: [],
        };
      }
      groups[dateKey].orders.push(order);
    });
    // Sort groups by date descending
    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [dispatchedOrders]);

  const getProductTypeLabel = (orderId) => {
    const items = orderItems.filter(item => item.order_id === orderId);
    if (items.length === 0) return 'N/A';
    const types = [...new Set(items.map(item => item.product_type || 'print'))];
    return types.map(t => t.replace(/_/g, ' ')).join(', ');
  };

  const getQuantitySum = (orderId) => {
    const items = orderItems.filter(item => item.order_id === orderId);
    return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  };

  const getFirstThumbnail = (orderId) => {
    const items = orderItems.filter(item => item.order_id === orderId);
    for (const item of items) {
      const url = getPhotoThumbnail(item);
      if (url) return url;
    }
    return '';
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatFullDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const totalShipped = orders.filter(o => o.status === 'shipped').length;
  const totalDelivered = orders.filter(o => o.status === 'completed').length;

  return (
    <div style={{
      padding: '24px 32px',
      backgroundColor: 'transparent',
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'europa', sans-serif",
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{
          fontFamily: "'EB Garamond', serif",
          fontSize: '28px',
          color: '#005c5a',
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          Dispatch History
          <span style={{ 
            color: '#0d9488', 
            fontSize: '24px', 
            fontWeight: 700, 
            fontFamily: 'sans-serif',
            backgroundColor: '#e6f4f3', 
            borderRadius: '50%', 
            width: '36px', 
            height: '36px', 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center',
          }}>
            5
          </span>
        </h1>
        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px', marginBottom: 0 }}>
          Timeline of all shipped and delivered orders
        </p>
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '6px',
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: '#2ecc71',
          }} />
          <span style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>
            {totalShipped} Shipped
          </span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '6px',
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: '#27ae60',
          }} />
          <span style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>
            {totalDelivered} Delivered
          </span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
        }}>
          <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
            {dispatchedOrders.length} Total
          </span>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={15} style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: '#94a3b8',
          }} />
          <input
            type="search"
            placeholder="Search by order ID, name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              outline: 'none',
              fontSize: '13px',
              backgroundColor: '#fff',
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 28px 10px 14px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            backgroundColor: '#fff',
            fontSize: '13px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Dispatched</option>
          <option value="shipped">Shipped Only</option>
          <option value="completed">Delivered Only</option>
        </select>
      </div>

      {/* Timeline Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
      }}>
        {groupedByDate.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: '#94a3b8',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#64748b' }}>No dispatched orders yet</div>
            <div style={{ fontSize: '13px', marginTop: '6px' }}>
              Orders will appear here once they are shipped or delivered
            </div>
          </div>
        ) : (
          groupedByDate.map((group) => (
            <div key={group.dateKey} style={{
              display: 'flex',
              gap: '0',
              marginBottom: '8px',
            }}>
              {/* Date badge on the left */}
              <div style={{
                width: '64px',
                minWidth: '64px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '16px',
              }}>
                <div style={{
                  backgroundColor: '#005c5a',
                  color: '#fff',
                  borderRadius: '10px',
                  width: '52px',
                  textAlign: 'center',
                  padding: '8px 4px',
                  boxShadow: '0 2px 8px rgba(0,92,90,0.18)',
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    opacity: 0.85,
                  }}>
                    {group.dayName}
                  </div>
                  <div style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    lineHeight: 1.1,
                    marginTop: '2px',
                  }}>
                    {group.dayNum}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    opacity: 0.7,
                    marginTop: '1px',
                  }}>
                    {group.month}
                  </div>
                </div>
                {/* Vertical line connector */}
                <div style={{
                  width: '2px',
                  flex: 1,
                  backgroundColor: '#e2e8f0',
                  marginTop: '8px',
                  minHeight: '20px',
                }} />
              </div>

              {/* Order cards for that date */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                paddingTop: '10px',
                paddingBottom: '10px',
              }}>
                {group.orders.map((order) => {
                  const thumbnail = getFirstThumbnail(order.id);
                  const createdTime = formatTime(order.created_at);
                  const updatedTime = formatTime(order.updated_at || order.created_at);
                  const qtySum = getQuantitySum(order.id);
                  const productType = getProductTypeLabel(order.id);
                  const orderNumber = `#PXNXT-${order.id.substring(0, 8).toUpperCase()}`;
                  const isDelivered = order.status === 'completed';

                  return (
                    <div
                      key={order.id}
                      onClick={() => navigate(`/lab/orders/${order.id}`, { state: { from: location.pathname } })}
                      style={{
                        display: 'flex',
                        alignItems: 'stretch',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e8ecf0',
                        borderRadius: '10px',
                        padding: '16px 20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        gap: '16px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#005c5a40';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,92,90,0.08)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e8ecf0';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {/* Time range */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        minWidth: '140px',
                      }}>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          color: '#0f172a',
                          letterSpacing: '-0.01em',
                        }}>
                          {createdTime} – {updatedTime}
                        </div>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          marginTop: '6px',
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: isDelivered ? '#dcfce7' : '#dbeafe',
                            color: isDelivered ? '#166534' : '#1d4ed8',
                          }}>
                            <span style={{
                              width: '6px', height: '6px', borderRadius: '50%',
                              backgroundColor: isDelivered ? '#22c55e' : '#3b82f6',
                            }} />
                            {isDelivered ? 'Delivered' : 'Shipped'}
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div style={{
                        width: '1px',
                        backgroundColor: '#e8ecf0',
                        alignSelf: 'stretch',
                      }} />

                      {/* Order details */}
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '4px',
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}>
                          <span style={{
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            color: '#64748b',
                            backgroundColor: '#f1f5f9',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}>
                            ID: {orderNumber}
                          </span>
                          <CopyButton text={order.id} />
                          <span style={{ color: '#cbd5e1' }}>·</span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {qtySum} {qtySum === 1 ? 'item' : 'items'}
                          </span>
                          <span style={{ color: '#cbd5e1' }}>·</span>
                          <span style={{
                            fontSize: '12px',
                            color: '#475569',
                            textTransform: 'capitalize',
                          }}>
                            {productType}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                            {order.customer_name}
                          </span>
                          <span style={{ color: '#cbd5e1' }}>·</span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {order.customer_email}
                          </span>
                        </div>
                      </div>

                      {/* Thumbnail + Amount */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                      }}>
                        <div style={{
                          textAlign: 'right',
                          minWidth: '80px',
                        }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#0f172a',
                          }}>
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(order.total || 0)}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: '#94a3b8',
                            marginTop: '2px',
                          }}>
                            {formatFullDate(order.updated_at || order.created_at)}
                          </div>
                        </div>
                        {thumbnail ? (
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid #e2e8f0',
                            flexShrink: 0,
                          }}>
                            <img
                              src={thumbnail}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        ) : (
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <span style={{ fontSize: '16px' }}>📦</span>
                          </div>
                        )}
                        {/* View details button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/lab/orders/${order.id}`, { state: { from: location.pathname } });
                          }}
                          style={{
                            padding: '6px 14px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            color: '#475569',
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#005c5a';
                            e.currentTarget.style.color = '#005c5a';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.color = '#475569';
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
