import React, { useState } from 'react';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';
import { LAB_UI, labPageStyle, labTitleStyle, labCardStyle, labBtnPrimaryStyle, labBtnSecondaryStyle } from './labUi';

export default function LabEmployeeManagement() {
  const { employees, refreshEmployees, orders } = useLabAuth();

  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empRole, setEmpRole] = useState('Operator');
  const [empDept, setEmpDept] = useState('Printing');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!empName || !empEmail) return;

    try {
      const { error } = await supabase
        .from('printstore_lab_employees')
        .insert({
          name: empName,
          email: empEmail,
          role: empRole,
          department: empDept,
          status: 'active',
          orders_completed: 0,
          orders_pending: 0
        });

      if (error) throw error;

      setEmpName('');
      setEmpEmail('');
      setShowAddForm(false);
      await refreshEmployees();
      alert('New employee successfully registered in Supabase.');
    } catch (err) {
      console.error(err);
      alert('Failed to register employee: ' + err.message);
    }
  };

  const getDepartmentLoad = (deptName) => {
    const deptEmps = employees.filter(e => e.department === deptName).map(e => e.name);
    return orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled' && deptEmps.includes(o.assigned_employee)).length;
  };

  const fieldStyle = {
    height: 40,
    padding: '0 14px',
    border: `1px solid ${LAB_UI.border}`,
    borderRadius: 9999,
    backgroundColor: '#fff',
    fontSize: 13,
    outline: 'none',
    fontFamily: LAB_UI.font,
    color: LAB_UI.foreground,
    boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.04)',
  };

  return (
    <div style={labPageStyle}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={labTitleStyle}>Employee Management</h1>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          style={showAddForm ? labBtnSecondaryStyle : labBtnPrimaryStyle}
        >
          {showAddForm ? 'Cancel' : '+ Add Employee'}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddEmployee}
          style={{ ...labCardStyle, padding: 24, marginBottom: 24 }}
        >
          <h3 style={{ fontSize: 15, color: LAB_UI.foreground, fontWeight: 600, margin: '0 0 16px 0', fontFamily: LAB_UI.titleFont }}>
            Add Production Employee
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: LAB_UI.muted, fontWeight: 600 }}>Name</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                style={fieldStyle}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: LAB_UI.muted, fontWeight: 600 }}>Email</label>
              <input
                type="email"
                placeholder="e.g. ramesh@pixnxt.com"
                value={empEmail}
                onChange={(e) => setEmpEmail(e.target.value)}
                style={fieldStyle}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: LAB_UI.muted, fontWeight: 600 }}>Role / Designation</label>
              <select value={empRole} onChange={(e) => setEmpRole(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
                <option value="Operator">Operator</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Technician">Technician</option>
                <option value="Packer">Packer</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: LAB_UI.muted, fontWeight: 600 }}>Department</label>
              <select value={empDept} onChange={(e) => setEmpDept(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
                <option value="Printing">Printing</option>
                <option value="Framing">Framing</option>
                <option value="Quality Control">Quality Control</option>
                <option value="Packaging">Packaging</option>
                <option value="Shipping">Shipping</option>
              </select>
            </div>
          </div>
          <button type="submit" style={{ ...labBtnPrimaryStyle, marginTop: 16 }}>
            Register Employee
          </button>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {['Printing', 'Framing', 'Quality Control', 'Packaging', 'Shipping'].map(dept => {
          const loadCount = getDepartmentLoad(dept);
          return (
            <div key={dept} style={{ ...labCardStyle, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: LAB_UI.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {dept}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: LAB_UI.foreground, marginTop: 8 }}>
                {loadCount}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ border: `1px solid ${LAB_UI.border}`, borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff', boxShadow: '-4px -4px 12px rgba(255,255,255,0.7), 4px 4px 14px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left', minWidth: 900 }}>
            <thead>
              <tr style={{ backgroundColor: LAB_UI.primary, color: '#fff', fontWeight: 600 }}>
                <th style={{ padding: '14px 16px' }}>Employee ID</th>
                <th style={{ padding: '14px 16px' }}>Name</th>
                <th style={{ padding: '14px 16px' }}>Email Address</th>
                <th style={{ padding: '14px 16px' }}>Designation</th>
                <th style={{ padding: '14px 16px' }}>Department</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Completed Runs</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 28, textAlign: 'center', color: LAB_UI.muted }}>
                    No employees registered yet
                  </td>
                </tr>
              ) : employees.map(emp => {
                const completedCount = orders.filter(o => o.status === 'completed' && o.assigned_employee === emp.name).length + (emp.orders_completed || 0);
                return (
                  <tr
                    key={emp.id}
                    style={{ borderBottom: `1px solid ${LAB_UI.border}`, transition: 'background-color 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = LAB_UI.hover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 700, fontFamily: 'monospace' }}>{emp.id ? emp.id.substring(0, 8) : 'N/A'}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{emp.name}</td>
                    <td style={{ padding: '14px 16px', color: LAB_UI.muted }}>{emp.email}</td>
                    <td style={{ padding: '14px 16px', color: LAB_UI.muted }}>{emp.role}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{emp.department}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700 }}>{completedCount}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: emp.status === 'active' ? LAB_UI.successBg : LAB_UI.dangerBg,
                        color: emp.status === 'active' ? LAB_UI.success : LAB_UI.danger,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 9999,
                        textTransform: 'uppercase',
                      }}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
