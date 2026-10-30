'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, AlertCircle, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const list = data.data || [];
        setNotifications(list);
        setUnreadCount(list.filter((n) => n.status !== 'READ').length);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'SENT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'ACCEPTED':
      case 'PENDING':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
      case 'FAILED':
      case 'UNDELIVERED':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
      case 'READ':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      case 'NOT_CONFIGURED':
      case 'UNAVAILABLE':
      case 'SKIPPED':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300';
      case 'UNKNOWN':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[999] overflow-hidden text-slate-800 dark:text-white animate-fade-in">
          <div className="bg-slate-50 dark:bg-slate-950 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-[#032257] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              Safety Notifications
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {unreadCount} unread
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No notification history available.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id || n.id}
                  className={`p-3.5 flex flex-col space-y-1.5 transition-colors ${
                    n.status !== 'READ'
                      ? 'bg-blue-50/50 dark:bg-blue-950/20'
                      : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-[#032257] dark:text-blue-300">
                        {n.title}
                      </span>
                      <span
                        className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                          n.notificationType === 'self_alert'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : n.channel === 'push'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {n.notificationType === 'self_alert'
                          ? 'Self-Alert'
                          : n.channel === 'push'
                          ? 'Push'
                          : 'Trusted Circle'}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded uppercase ${getStatusBadgeClass(n.status)}`}
                    >
                      {n.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {n.message}
                  </p>

                  {n.providerError && (n.status === 'FAILED' || n.status === 'UNDELIVERED') && (
                    <p className="text-[10px] text-red-600 dark:text-red-400 font-mono bg-red-50 dark:bg-red-950/40 p-1.5 rounded border border-red-200 dark:border-red-900/40">
                      Provider Error: {n.providerError}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleTimeString()}
                    </span>

                    {n.status !== 'READ' && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(n._id || n.id)}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-bold"
                      >
                        <Check className="w-3 h-3" />
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
