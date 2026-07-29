import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import GuestDeliveryLayout from '../../components/guest-delivery/GuestDeliveryLayout';
import GuestDeliveryEventsList from './EventsList';
import EventDetail from './EventDetail';
import EventShare from './EventShare';

function ModuleShell() {
  return (
    <GuestDeliveryLayout>
      <Outlet />
    </GuestDeliveryLayout>
  );
}

export default function GuestDelivery() {
  return (
    <Routes>
      <Route element={<ModuleShell />}>
        <Route index element={<GuestDeliveryEventsList />} />
      </Route>
      <Route path="event/:eventId" element={<EventDetail />} />
      <Route path="event/:eventId/share" element={<EventShare />} />
      <Route path="*" element={<Navigate to="/guest-delivery" replace />} />
    </Routes>
  );
}
