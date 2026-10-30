'use client';

import { useState } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function SOSButton({ onSOSActivated, className = '' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleActivateSOS = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }

    if (loading) return;

    setLoading(true);
    setError('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Session expired. Please sign in again.');
      setLoading(false);
      return;
    }

    // 1-second intentional activation delay upon user click, attempting fast GPS acquisition in parallel
    let initialLocationPayload = null;
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      try {
        const position = await new Promise((resolve) => {
          const timeoutId = setTimeout(() => resolve(null), 1000);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              clearTimeout(timeoutId);
              resolve(pos);
            },
            () => {
              clearTimeout(timeoutId);
              resolve(null);
            },
            { timeout: 1000, enableHighAccuracy: true, maximumAge: 3000 }
          );
        });

        if (position && position.coords && typeof position.coords.latitude === 'number' && typeof position.coords.longitude === 'number') {
          initialLocationPayload = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          if (typeof position.coords.accuracy === 'number') {
            initialLocationPayload.accuracy = position.coords.accuracy;
          }
        }
      } catch (_) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Send Emergency Activation request
    try {
      const res = await fetch('http://localhost:5000/api/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          triggerType: 'manual',
          ...(initialLocationPayload ? { location: initialLocationPayload } : {})
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.data) {
          // Active emergency already exists — switch to active view immediately
          onSOSActivated(data.data);
          return;
        }
        throw new Error(data.message || 'Failed to activate SOS');
      }

      if (data.success && data.data) {
        const emergencyData = data.data;
        const emergencyId = emergencyData.id || emergencyData.emergencyId;

        // Switch to Active Emergency UI IMMEDIATELY
        onSOSActivated(emergencyData);

        // 2. Perform background initial location capture asynchronously without blocking activation
        if (!initialLocationPayload && typeof window !== 'undefined' && 'geolocation' in navigator && emergencyId) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              if (position && position.coords && typeof position.coords.latitude === 'number' && typeof position.coords.longitude === 'number') {
                const locObj = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                };
                if (typeof position.coords.accuracy === 'number') {
                  locObj.accuracy = position.coords.accuracy;
                }

                try {
                  const updateRes = await fetch(`http://localhost:5000/api/emergency/${emergencyId}/location`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ location: locObj })
                  });
                  const updateData = await updateRes.json();
                  if (updateRes.ok && updateData.success && updateData.data) {
                    onSOSActivated(updateData.data);
                  }
                } catch (patchErr) {
                  console.warn('Could not update initial location asynchronously:', patchErr.message);
                }
              }
            },
            (geoError) => {
              console.warn('Geolocation permission denied or unavailable for initial SOS:', geoError.message);
            },
            {
              timeout: 8000,
              enableHighAccuracy: true
            }
          );
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to reach backend API server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {error && (
        <div className="mb-4 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 w-full text-center">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleActivateSOS}
        disabled={loading}
        className="group relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white font-extrabold shadow-lg hover:shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed border-4 border-red-200"
        aria-label="Activate Silent SOS Emergency"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" />
            <span className="text-xs sm:text-sm font-semibold tracking-wide uppercase">Activating SOS…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <ShieldAlert className="w-9 h-9 sm:w-12 sm:h-12 group-hover:scale-110 transition-transform" />
            <span className="text-xl sm:text-2xl font-black tracking-wider">SOS</span>
            <span className="text-[10px] sm:text-xs font-semibold tracking-wide uppercase text-red-100">Silent SOS</span>
          </div>
        )}
      </button>

      <p className="mt-3 text-xs text-[#64748B] text-center font-medium">
        Press to trigger an immediate emergency event
      </p>
    </div>
  );
}
