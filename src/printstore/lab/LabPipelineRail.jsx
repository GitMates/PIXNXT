import React from 'react';
import {
  LAB_PIPELINE_STEPS,
  getLabStatusColor,
  getLabStatusLabel,
  isLabPipelineStatusActive,
  isLabPipelineStatusDone,
} from './labOrderStatus';

/**
 * Compact horizontal production rail for lab order tickets.
 * Lab-only UI — does not affect storefront modules.
 */
export default function LabPipelineRail({ status }) {
  const isException = status === 'reprint' || status === 'cancelled';

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          gap: 12,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#64748b', textTransform: 'uppercase' }}>
          Production pipeline
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 999,
            background: `${getLabStatusColor(status)}18`,
            color: getLabStatusColor(status),
            border: `1px solid ${getLabStatusColor(status)}33`,
          }}
        >
          {getLabStatusLabel(status)}
        </div>
      </div>

      {isException ? (
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
          This order is outside the main pipeline ({getLabStatusLabel(status)}).
          Move it back to Printing when ready to continue.
        </p>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 0,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {LAB_PIPELINE_STEPS.map((step, index) => {
            const done = isLabPipelineStatusDone(status, step.key);
            const active = isLabPipelineStatusActive(status, step.key);
            const color = active ? getLabStatusColor(step.key) : done ? '#0f766e' : '#cbd5e1';

            return (
              <React.Fragment key={step.key}>
                <div style={{ minWidth: 72, textAlign: 'center' }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      margin: '0 auto 6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      color: active || done ? '#fff' : '#64748b',
                      background: active || done ? color : '#f1f5f9',
                      border: active ? `2px solid ${color}` : '1px solid #e2e8f0',
                      boxShadow: active ? `0 0 0 3px ${color}22` : 'none',
                    }}
                  >
                    {step.step}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: active ? 700 : 500,
                      color: active ? '#0f172a' : '#64748b',
                      lineHeight: 1.2,
                    }}
                  >
                    {step.shortLabel}
                  </div>
                </div>
                {index < LAB_PIPELINE_STEPS.length - 1 && (
                  <div
                    style={{
                      flex: '1 1 12px',
                      height: 2,
                      marginTop: 13,
                      minWidth: 10,
                      background: done || active ? '#99f6e4' : '#e2e8f0',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
