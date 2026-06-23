import React from 'react';
import LabOrdersTable from './LabOrdersTable';

export default function LabReadyToDeliver() {
  return <LabOrdersTable title="Ready to Deliver Queue" fixedStatusFilter="ready_to_ship" />;
}
