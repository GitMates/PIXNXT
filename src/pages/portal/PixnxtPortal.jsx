import React from 'react';
import SidebarLayout from '../../components/SidebarLayout';
import { PixnxtPortalSingle } from '../../components/portal/PixnxtPortalSingle';

export default function PixnxtPortal() {
  return (
    <SidebarLayout productId="portal">
      <PixnxtPortalSingle />
    </SidebarLayout>
  );
}
