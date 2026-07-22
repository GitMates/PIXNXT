import React, { useState } from 'react';
import { useLabAuth } from './LabApp';
import { supabase } from '../../lib/supabase/client';

export default function LabEmployeeManagement() {
  const { employees, refreshEmployees, orders } = useLabAuth();

  // Form inputs
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

  return (
    <div style={{ padding: '32px', backgroundColor: '#ffffff', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'europa', sans-serif" }}>
      
      {/* Header Area */}
      <div style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '28px', color: '#005c5a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Employee Management
          </h1>
          <p style={{ color: '#777777', fontSize: '13px', margin: '4px 0 0 0' }}>Manage production staff, departments, and monitor work assignments</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            backgroundColor: '#005c5a',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add Employee'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddEmployee} style={{ padding: '24px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fafafa', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', color: '#111', fontWeight: 'bold', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Add Production Employee</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Name</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Email</label>
              <input
                type="email"
                placeholder="e.g. ramesh@pixnxt.com"
                value={empEmail}
                onChange={(e) => setEmpEmail(e.target.value)}
                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Role / Designation</label>
              <select
                value={empRole}
                onChange={(e) => setEmpRole(e.target.value)}
                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="Operator">Operator</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Technician">Technician</option>
                <option value="Packer">Packer</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Department</label>
              <select
                value={empDept}
                onChange={(e) => setEmpDept(e.target.value)}
                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="Printing">Printing</option>
                <option value="Framing">Framing</option>
                <option value="Quality Control">Quality Control</option>
                <option value="Packaging">Packaging</option>
                <option value="Shipping">Shipping</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            style={{ backgroundColor: '#005c5a', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: 'bold', fontSize: '12.5px', cursor: 'pointer', borderRadius: '4px', marginTop: '16px' }}
          >
            Register Employee
          </button>
        </form>
      )}

      {/* Departments load metrics cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {['Printing', 'Framing', 'Quality Control', 'Packaging', 'Shipping'].map(dept => {
          const loadCount = getDepartmentLoad(dept);
          return (
            <div key={dept} style={{ padding: '16px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#fafafa' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{dept}</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#005c5a', marginTop: '6px' }}>{loadCount}</div>
              <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>Active Assigned Runs</div>
            </div>
          );
        })}
      </div>

      {/* Staff directory */}
      <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#005c5a', color: '#ffffff', borderBottom: '2px solid #cbd5e1' }}>
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
            {employees.map(emp => {
              const completedCount = orders.filter(o => o.status === 'completed' && o.assigned_employee === emp.name).length + (emp.orders_completed || 0);
              
              return (
                <tr key={emp.id} style={{ borderBottom: '1px solid #eaeaea' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 'bold', fontFamily: 'monospace' }}>{emp.id ? emp.id.substring(0, 8) : 'N/A'}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{emp.name}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{emp.email}</td>
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>{emp.role}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 'bold', color: '#005c5a' }}>{emp.department}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 'bold' }}>{completedCount}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: emp.status === 'active' ? '#d1fae5' : '#fee2e2',
                      color: emp.status === 'active' ? '#065f46' : '#991b1b',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      textTransform: 'uppercase'
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
  );
}
