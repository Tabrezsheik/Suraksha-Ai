'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import SafetyAssistant from '@/components/SafetyAssistant';
import { useRouter } from 'next/navigation';

export default function AssistantPage() {
  const router = useRouter();

  const handleTriggerSOS = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ triggerType: 'voice' })
      });
      if (res.ok) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Failed to trigger emergency from assistant:', err);
    }
  };

  return (
    <div className="min-[#100vh] bg-[#F8FAFC] text-[#032257] flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#032257] tracking-tight">
              AI Safety Assistant & Legal RAG
            </h1>
            <p className="text-xs text-[#64748B]">
              Real-Time Safety Intelligence & High Court of Andhra Pradesh Legal Guidance (2025–2026)
            </p>
          </div>
        </div>

        <SafetyAssistant onTriggerSOS={handleTriggerSOS} />
      </main>
    </div>
  );
}
