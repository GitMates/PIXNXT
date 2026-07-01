import React from 'react';
import LabOrdersTable from './LabOrdersTable';

export default function LabQueue() {
  return <LabOrdersTable title="New Orders" fixedStatusFilter="pending" />;
}
