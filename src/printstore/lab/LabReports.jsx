import React, { useState, useMemo } from 'react';
import { useLabAuth } from './LabApp';
import { getShortId } from '../utils/idFormat';
import { LAB_UI, labPageStyle, labTitleStyle, labCardStyle, labBtnPrimaryStyle, labBtnSecondaryStyle } from './labUi';

export default function LabReports() {
  const { orders, orderItems } = useLabAuth();
  const [reportType, setReportType] = useState('monthly');

  const summaryMetrics = useMemo(() => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'shipped').length;
    const failedOrders = orders.filter(o => o.status === 'reprint').length;
    const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const averageOrderValue = totalOrders > 0 ? (revenue / totalOrders) : 0;

    return {
      completedOrders,
      failedOrders,
      revenue,
      averageOrderValue
    };
  }, [orders]);

  const dailyCompletedStats = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };

    orders
      .filter(o => o.status === 'completed' || o.status === 'shipped')
      .forEach(order => {
        const dayName = days[new Date(order.created_at).getDay()];
        counts[dayName] = (counts[dayName] || 0) + 1;
      });

    return Object.entries(counts).map(([label, count]) => ({ label, count }));
  }, [orders]);

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

      paperArea += (width * height * qty) / 10000;

      if (opts.frame && opts.frame.label !== 'No Frame') {
        glassSheets += qty;
        woodMeters += (2 * (width + height) * qty) / 100;
      }
    });

    const rollsEst = paperArea / 12;
    return [
      { material: 'Lustre Photo Paper Roll Estimate', amount: `${rollsEst.toFixed(2)} rolls`, cost: `Est. ₹${Math.round(rollsEst * 14500)}` },
      { material: 'Premium Matte Roll Estimate', amount: `${(rollsEst * 0.35).toFixed(2)} rolls`, cost: `Est. ₹${Math.round(rollsEst * 0.35 * 8200)}` },
      { material: 'Wood Profile Framing Moulding', amount: `${woodMeters.toFixed(1)} meters`, cost: `Est. ₹${Math.round(woodMeters * 250)}` },
      { material: 'Clear Squeegee Glass Cutouts', amount: `${glassSheets} sheets`, cost: `Est. ₹${Math.round(glassSheets * 180)}` }
    ];
  }, [orderItems]);

  const fmtINR = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  const handleExportCSV = () => {
    const headers = ['Order ID,Customer Name,Date,Status,Total Amount\n'];
    const rows = orders.map(o => {
      const orderNumber = getShortId(o.id, 'order');
      return `${orderNumber},"${o.customer_name}",${new Date(o.created_at).toLocaleDateString()},${o.status},${o.total || 0}`;
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + headers.concat(rows).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PIXNXT_Lab_Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const maxBar = Math.max(...dailyCompletedStats.map(b => b.count), 1);

  return (
    <div style={labPageStyle}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={labTitleStyle}>Reports & Analytics</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={handleExportCSV} style={labBtnSecondaryStyle}>
            Export CSV / Excel
          </button>
          <button type="button" onClick={() => window.print()} style={labBtnPrimaryStyle}>
            Export PDF
          </button>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['daily', 'weekly', 'monthly'].map(type => {
          const active = reportType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setReportType(type)}
              style={active ? labBtnPrimaryStyle : labBtnSecondaryStyle}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)} Report
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Lab Orders Completed', value: summaryMetrics.completedOrders },
          { label: 'Quality Defect Reprints', value: summaryMetrics.failedOrders, accent: LAB_UI.danger },
          { label: 'Cycle Total Revenue', value: fmtINR(summaryMetrics.revenue) },
          { label: 'Average Order Value', value: fmtINR(summaryMetrics.averageOrderValue) },
        ].map((card) => (
          <div key={card.label} style={{ ...labCardStyle, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: LAB_UI.muted }}>{card.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: card.accent || LAB_UI.foreground, marginTop: 8 }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...labCardStyle, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, color: LAB_UI.foreground, fontWeight: 500, margin: '0 0 20px 0', fontFamily: LAB_UI.titleFont }}>
          Weekly Completed Runs
        </h3>
        <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: 420, height: 220, display: 'flex', alignItems: 'flex-end', gap: 16, paddingBottom: 8, borderBottom: `1px solid ${LAB_UI.border}` }}>
            {dailyCompletedStats.map(bar => (
              <div key={bar.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: LAB_UI.foreground }}>{bar.count}</span>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 48,
                    height: `${Math.max(6, (bar.count / maxBar) * 160)}px`,
                    backgroundColor: LAB_UI.primary,
                    borderRadius: '10px 10px 4px 4px',
                    transition: 'height 0.3s',
                  }}
                />
                <span style={{ fontSize: 11, color: LAB_UI.muted, fontWeight: 600 }}>{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...labCardStyle, padding: 24, overflow: 'hidden' }}>
        <h3 style={{ fontSize: 16, color: LAB_UI.foreground, fontWeight: 500, margin: '0 0 16px 0', fontFamily: LAB_UI.titleFont }}>
          Lumber & Paper Usage Audit
        </h3>
        <div style={{ border: `1px solid ${LAB_UI.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: LAB_UI.primary, color: '#fff', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Material</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {materialUsage.map((row, idx) => (
                <tr
                  key={idx}
                  style={{ borderBottom: `1px solid ${LAB_UI.border}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = LAB_UI.hover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                >
                  <td style={{ padding: '14px 16px', fontWeight: 500 }}>{row.material}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700 }}>{row.amount}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: LAB_UI.muted }}>{row.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
