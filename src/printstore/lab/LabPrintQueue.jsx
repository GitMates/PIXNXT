import React from 'react';
import LabOrdersTable from './LabOrdersTable';

export default function LabPrintQueue() {
  // Printing orders (which includes pending orders that need to be started, or orders already printing)
  // Let's filter for both pending and printing, or just use pending as the queue.
  // The user specifically asked to remove sidebars and show tables. Let's filter by pending to start.
  // Actually, wait, the new constraint has "pending" -> "printing". Let's show "pending".
  return <LabOrdersTable title="Print Production Queue" fixedStatusFilter="pending" />;
}
