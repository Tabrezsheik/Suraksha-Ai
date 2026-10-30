'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  Shield,
  ShieldAlert,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  X,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 +91', country: 'India' },
  { code: '+1', label: '🇺🇸 +1', country: 'United States' },
  { code: '+44', label: '🇬🇧 +44', country: 'United Kingdom' },
  { code: '+971', label: '🇦🇪 +971', country: 'United Arab Emirates' }
];

const parsePhoneString = (rawPhone) => {
  if (!rawPhone) return { countryCode: '+91', localPhone: '' };

  const trimmed = rawPhone.trim().replace(/\s+/g, '');
  for (const item of COUNTRY_CODES) {
    if (trimmed.startsWith(item.code)) {
      return {
        countryCode: item.code,
        localPhone: trimmed.slice(item.code.length)
      };
    }
  }

  const match = trimmed.match(/^(\+\d{1,4})(.*)$/);
  if (match) {
    return {
      countryCode: match[1],
      localPhone: match[2]
    };
  }

  return { countryCode: '+91', localPhone: trimmed };
};

export default function TrustedCirclePage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [form, setForm] = useState({
    name: '',
    countryCode: '+91',
    localPhone: '',
    email: '',
    relationship: 'parent',
    isActive: true
  });

  // Default demo contacts if backend is not yet populated
  const defaultDemoContacts = [
    {
      id: 'cnt_1',
      name: 'Mother',
      phone: '+91 99999 88888',
      email: 'mother@example.com',
      relationship: 'parent',
      isActive: true
    },
    {
      id: 'cnt_2',
      name: 'Brother',
      phone: '+91 98888 77777',
      email: 'brother@example.com',
      relationship: 'relative',
      isActive: true
    },
    {
      id: 'cnt_3',
      name: 'Aakash (Best Friend)',
      phone: '+91 97777 66666',
      email: 'aakash.f@example.com',
      relationship: 'friend',
      isActive: false
    }
  ];

  const router = useRouter();

  // Fetch contacts — only called when authenticated
  const fetchContacts = async () => {
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) return;

    try {
      const res = await fetch('http://localhost:5000/api/contacts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setContacts(data.data);
      } else {
        // API responded but data unavailable — show empty list, not demo data
        setContacts([]);
      }
    } catch (err) {
      // Server unreachable — show empty list
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.replace('/login');
      return;
    }
    fetchContacts();
  }, [router]);

  const openAddModal = () => {
    setEditingContact(null);
    setForm({
      name: '',
      countryCode: '+91',
      localPhone: '',
      email: '',
      relationship: 'parent',
      isActive: true
    });
    setModalOpen(true);
  };

  const openEditModal = (contact) => {
    setEditingContact(contact);
    const parsed = parsePhoneString(contact.phone);
    setForm({
      name: contact.name,
      countryCode: parsed.countryCode,
      localPhone: parsed.localPhone,
      email: contact.email || '',
      relationship: contact.relationship,
      isActive: contact.isActive
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Contact name is required.' });
      return;
    }

    if (!form.localPhone.trim()) {
      setMessage({ type: 'error', text: 'Phone number is required.' });
      return;
    }

    const cleanLocal = form.localPhone.trim().replace(/[\s\-()]/g, '');
    if (!/^\d{6,14}$/.test(cleanLocal)) {
      setMessage({ type: 'error', text: 'Please enter a valid phone number (6 to 14 digits).' });
      return;
    }

    const combinedPhone = `${form.countryCode}${cleanLocal}`;

    const payload = {
      name: form.name.trim(),
      phone: combinedPhone,
      email: form.email ? form.email.trim() : '',
      relationship: form.relationship,
      isActive: form.isActive
    };

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    try {
      if (editingContact) {
        // Update contact
        if (token) {
          const res = await fetch(`http://localhost:5000/api/contacts/${editingContact.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
            setContacts(contacts.map((c) => (c.id === editingContact.id ? data.data : c)));
            setMessage({ type: 'success', text: 'Contact updated successfully.' });
          }
        } else {
          setContacts(
            contacts.map((c) =>
              c.id === editingContact.id ? { ...c, ...payload } : c
            )
          );
          setMessage({ type: 'success', text: 'Contact updated successfully.' });
        }
      } else {
        // Add new contact
        if (token) {
          const res = await fetch('http://localhost:5000/api/contacts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
            setContacts([data.data, ...contacts]);
            setMessage({ type: 'success', text: 'New trusted contact added.' });
          }
        } else {
          const newContact = {
            id: `cnt_${Date.now()}`,
            ...payload
          };
          setContacts([newContact, ...contacts]);
          setMessage({ type: 'success', text: 'New trusted contact added.' });
        }
      }
      setModalOpen(false);
    } catch (err) {
      setMessage({ type: 'error', text: 'Error saving contact details.' });
    }
  };

  const handleToggleActive = async (contact) => {
    const newStatus = !contact.isActive;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    try {
      if (token) {
        await fetch(`http://localhost:5000/api/contacts/${contact.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ isActive: newStatus })
        });
      }
      setContacts(
        contacts.map((c) => (c.id === contact.id ? { ...c, isActive: newStatus } : c))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (contactId) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    try {
      if (token) {
        await fetch(`http://localhost:5000/api/contacts/${contactId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      setContacts(contacts.filter((c) => c.id !== contactId));
      setMessage({ type: 'success', text: 'Contact removed from Trusted Circle.' });
      setDeleteConfirmId(null);
    } catch (err) {
      setMessage({ type: 'error', text: 'Error deleting contact.' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#032257] font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#032257] tracking-tight">
                Trusted Circle
              </h1>
              <p className="text-sm text-[#64748B] mt-1">
                Selected individuals who will receive emergency alerts and live GPS tracking when SOS is activated.
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0270F7] hover:bg-[#0260D7] text-white text-sm font-semibold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Trusted Contact
            </button>
          </div>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div
            className={`p-4 rounded-xl mb-6 flex items-start gap-3 border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="text-sm font-medium">{message.text}</div>
          </div>
        )}

        {/* Contacts Grid */}
        {loading ? (
          <div className="py-16 text-center text-[#64748B] text-sm">
            Loading your Trusted Circle...
          </div>
        ) : contacts.length === 0 ? (
          /* Empty State per Design.md §32 */
          <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#032257]">Your Trusted Circle is empty</h3>
            <p className="text-sm text-[#64748B] max-w-md mx-auto mt-2 mb-6">
              Add people you trust so they can receive instant emergency alerts and your live location during a distress event.
            </p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0270F7] hover:bg-[#0260D7] text-white text-sm font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Add Your First Contact
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className={`bg-white rounded-2xl p-6 border transition-all shadow-xs ${
                  contact.isActive
                    ? 'border-slate-200 hover:border-slate-300'
                    : 'border-slate-200 bg-slate-50/70 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#0F172A]">{contact.name}</h3>
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-[#032257] rounded-full capitalize">
                        {contact.relationship}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-[#64748B]">
                      <div className="flex items-center gap-2 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{contact.phone}</span>
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(contact)}
                      className="p-2 text-slate-400 hover:text-[#0270F7] hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Contact"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(contact.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove Contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    {contact.isActive ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                        <Shield className="w-3.5 h-3.5" /> Emergency Alerts Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                        <ShieldAlert className="w-3.5 h-3.5" /> Inactive (Muted)
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggleActive(contact)}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      contact.isActive
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-[#0270F7]/10 hover:bg-[#0270F7]/20 text-[#0270F7]'
                    }`}
                  >
                    {contact.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
              <h3 className="text-base font-bold text-[#032257]">Remove Trusted Contact?</h3>
              <p className="text-xs text-[#64748B] mt-2 mb-6">
                This contact will no longer receive emergency alerts or live location broadcasts during an emergency event.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors cursor-pointer"
                >
                  Remove Contact
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit Contact Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => setModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold text-[#032257] mb-1">
                {editingContact ? 'Edit Trusted Contact' : 'Add Trusted Contact'}
              </h2>
              <p className="text-xs text-[#64748B] mb-6">
                Specify contact information and relationship for emergency dispatch.
              </p>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0270F7] focus:border-transparent transition-all"
                    placeholder="e.g. Mother, Brother, Best Friend"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Phone Number (with Country Code) *
                  </label>
                  <div className="flex gap-2">
                    {/* Selectable Country Code Dropdown */}
                    <select
                      value={form.countryCode}
                      onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
                      className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0F172A] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0270F7] focus:border-transparent transition-all cursor-pointer shrink-0"
                    >
                      {COUNTRY_CODES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    {/* Local Phone Number Input */}
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={form.localPhone}
                        onChange={(e) => setForm({ ...form, localPhone: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0270F7] focus:border-transparent transition-all"
                        placeholder="99999 99999"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0270F7] focus:border-transparent transition-all"
                    placeholder="contact@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Relationship
                  </label>
                  <select
                    value={form.relationship}
                    onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0270F7] focus:border-transparent transition-all capitalize"
                  >
                    <option value="parent">Parent</option>
                    <option value="friend">Friend</option>
                    <option value="relative">Relative</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 text-[#0270F7] rounded-sm focus:ring-[#0270F7] border-slate-300"
                  />
                  <label htmlFor="isActiveCheck" className="text-xs font-semibold text-[#0F172A] cursor-pointer">
                    Enable emergency alerts for this contact
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold bg-[#0270F7] hover:bg-[#0260D7] text-white rounded-xl transition-colors shadow-xs cursor-pointer"
                  >
                    {editingContact ? 'Save Changes' : 'Add Contact'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
