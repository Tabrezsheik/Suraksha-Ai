'use client';

import { GlobalVoiceSOSProvider } from '@/context/GlobalVoiceSOSContext';

export default function DashboardLayout({ children }) {
  return (
    <GlobalVoiceSOSProvider>
      {children}
    </GlobalVoiceSOSProvider>
  );
}
