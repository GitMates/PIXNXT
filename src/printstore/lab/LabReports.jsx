import React, { useState, useMemo } from 'react';
import { useLabAuth } from './LabApp';

export default function LabReports() {
  const { orders, orderItems } = useLabAuth();
  const [reportType, setReportType] = useState('monthly'); // 'daily', 'weekly', 'monthly'

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'shipped').length;
    const failedOrders = orders.filter(o => o.status === 'reprint').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const averageOrderValue = totalOrders > 0 ? (revenue / totalOrders) : 0;

    return {
      totalOrders,
      completedOrders,
      failedOrders,
      cancelledOrders,
      revenue,
      averageOrderValue
    };
  }, [orders]);

  // Daily completed counts calculated dynamically from DB!
  const dailyCompletedStats = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 };
    
    // Filter completed or shipped orders
    const completedOrdersList = orders.filter(o => o.status === 'completed' || o.status === 'shipped');
    
    completedOrdersList.forEach(order => {
      const dayName = days[new Date(order.created_at).getDay()];
      counts[dayName] = (counts[dayName] || 0) + 1;
    });

    return Object.entries(counts).map(([label, count]) => ({ label, count }));
  }, [orders]);

  // Material usage calculations derived dynamically from DB item choices!
  const materialUsage = useMemo(() => {
    let paperArea = 0;
    let woodMeters = 0;
    let glassSheets = 0;
    
    orderItems.forEach(item => {
      const opts = item.options || {};
      const qty = item.quantity || 1;
      const sizeStr = opts.size?.label || '16x20 cm';
      
      let width = 16;
      let height = 20;
      const match = sizeStr.match(/(\d+)x(\d+)/);
      if (match) {
        width = parseInt(match[1], 10);
        height = parseInt(match[2], 10);
      }
      
      paperArea += (width * height * qty) / 10000; // area in sq. meters
      
      if (opts.frame && opts.frame.label !== 'No Frame') {
        glassSheets += qty;
        woodMeters += (2 * (width + height) * qty) / 100; // meters
      }
    });

    const rollsEst = paperArea / 12; // average roll capacity is 12 sq meters
    return [
      { material: 'Lustre Photo Paper Roll Estimate', amount: `${rollsEst.toFixed(2)} rolls`, cost: `Est. ₹${Math.round(rollsEst * 14500)}` },
      { material: 'Premium Matte Roll Estimate', amount: `${(rollsEst * 0.35).toFixed(2)} rolls`, cost: `Est. ₹${Math.round(rollsEst * 0.35 * 8200)}` },
      { material: 'Wood Profile Framing Moulding', amount: `${woodMeters.toFixed(1)} meters`, cost: `Est. ₹${Math.round(woodMeters * 250)}` },
      { material: 'Clear Squeegee Glass Cutouts', amount: `${glassSheets} sheets`, cost: `Est. ₹${Math.round(glassSheets * 180)}` }
    ];
  }, [orderItems]);

  const handleExportCSV = () => {
    let headers = ['Order ID,Customer Name,Date,Status,Total Amount\n'];
    let rows = orders.map(o => {
      const orderNumber = `#PXNXT-${o.id.substring(0, 8).toUpperCase()}`;
      return `${orderNumber},"${o.customer_name}",${new Date(o.created_at).toLocaleDateString()},${o.status},${o.total || 0}`;
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PIXNXT_Lab_Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '32px', backgroundColor: '#ffffff', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'europa', sans-serif" }}>
      
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header Area */}
      <div className="no-print" style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '28px', color: '#005c5a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Reports & Analytics
          </h1>
          <p style={{ color: '#777777', fontSize: '13px', margin: '4px 0 0 0' }}>Analyze manufacturing performance metrics and download CSV files</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleExportCSV}
            style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#333' }}
          >
            📊 Export CSV / Excel
          </button>
          <button
            onClick={() => window.print()}
            style={{ padding: '8px 16px', backgroundColor: '#111', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#fff' }}
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* Time filters */}
      <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        {['daily', 'weekly', 'monthly'].map(type => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            style={{
              padding: '6px 14px',
              border: reportType === type ? '1px solid #005c5a' : '1px solid #cbd5e1',
              backgroundColor: reportType === type ? '#eefaf9' : '#fff',
              color: reportType === type ? '#005c5a' : '#475569',
              fontSize: '12.5px',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '20px',
              textTransform: 'uppercase'
            }}
          >
            {type} Report
          </button>
        ))}
      </div>

      {/* Stats Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <div style={{ padding: '24px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lab Orders Completed</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#005c5a', marginTop: '8px' }}>{summaryMetrics.completedOrders}</div>
          <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>Across selected cycle</div>
        </div>
        
        <div style={{ padding: '24px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quality Defect Reprints</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#e74c3c', marginTop: '8px' }}>{summaryMetrics.failedOrders}</div>
          <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>Re-printing runs required</div>
        </div>

        <div style={{ padding: '24px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cycle Total Revenue</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111', marginTop: '8px' }}>
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(summaryMetrics.revenue)}
          </div>
          <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>Delivered print packages</div>
        </div>

        <div style={{ padding: '24px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Average Order Value</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111', marginTop: '8px' }}>
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(summaryMetrics.averageOrderValue)}
          </div>
          <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>Customer checkout average</div>
        </div>
      </div>

      {/* SVG production performance chart */}
      <div style={{ padding: '24px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fafafa', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', color: '#111', fontWeight: 'bold', margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Weekly Completed Runs Chart</h3>
        <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'flex-end', gap: '20px', paddingBottom: '20px', borderBottom: '1px solid #cbd5e1' }}>
          {dailyCompletedStats.map(bar => (
            <div key={bar.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#005c5a' }}>{bar.count}</span>
              <div style={{ width: '100%', height: `${Math.min(180, bar.count * 15 + 4)}px`, backgroundColor: '#005c5a', borderRadius: '2px 2px 0 0', transition: 'height 0.3s' }} />
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{bar.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Material usage estimates */}
      <div style={{ padding: '24px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fff' }}>
        <h3 style={{ fontSize: '14px', color: '#111', fontWeight: 'bold', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lumber & Paper Usage Audit</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {materialUsage.map((row, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eaeaea', paddingBottom: '8px', fontSize: '13px' }}>
              <span style={{ fontWeight: '500', color: '#333' }}>{row.material}</span>
              <span style={{ fontWeight: 'bold', color: '#005c5a' }}>{row.amount} <span style={{ color: '#777', fontWeight: 'normal', fontSize: '11px' }}>({row.cost})</span></span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
