'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  Camera,
  Trash2
} from 'lucide-react';
import Link from 'next/link';

const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 +91', country: 'India' },
  { code: '+1', label: '🇺🇸 +1', country: 'United States' },
  { code: '+44', label: '🇬🇧 +44', country: 'United Kingdom' },
  { code: '+971', label: '🇦🇪 +971', country: 'United Arab Emirates' }
];

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    ageGroup: '',
    gender: '',
    role: 'user',
    profilePicture: null
  });

  const [formData, setFormData] = useState({
    name: '',
    countryCode: '+91',
    localPhone: '',
    ageGroup: '',
    gender: '',
    profilePicture: null
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

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

  // Initialize or fetch profile
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) {
      router.replace('/login');
      return;
    }

    fetch('http://localhost:5000/api/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setProfile(data.data);
          const parsed = parsePhoneString(data.data.phone);
          setFormData({
            name: data.data.name || '',
            countryCode: parsed.countryCode,
            localPhone: parsed.localPhone,
            ageGroup: data.data.ageGroup || '',
            gender: data.data.gender || '',
            profilePicture: data.data.profilePicture || null
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({
        type: 'error',
        text: 'Invalid file format. Please upload a JPEG, PNG, or WebP image.'
      });
      return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({
        type: 'error',
        text: 'File size too large. Maximum allowed size is 2MB.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, profilePicture: reader.result }));
      setMessage({ type: 'success', text: 'Image loaded! Click "Save Profile" to save changes.' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, profilePicture: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    setMessage({ type: 'success', text: 'Profile picture removed. Click "Save Profile" to apply.' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    // Combine country code and local phone number
    let combinedPhone = null;
    if (formData.localPhone.trim()) {
      const cleanLocal = formData.localPhone.trim().replace(/[\s\-()]/g, '');
      if (!/^\d{6,14}$/.test(cleanLocal)) {
        setMessage({
          type: 'error',
          text: 'Please enter a valid phone number (6 to 14 digits).'
        });
        setSaving(false);
        return;
      }
      combinedPhone = `${formData.countryCode}${cleanLocal}`;
    }

    const payload = {
      name: formData.name.trim(),
      phone: combinedPhone,
      ageGroup: formData.ageGroup ? formData.ageGroup.trim() : null,
      gender: formData.gender ? formData.gender.trim() : null,
      profilePicture: formData.profilePicture || null
    };

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        const res = await fetch('http://localhost:5000/api/users/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          setProfile(data.data);
          setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } else {
          setMessage({ type: 'error', text: data.message || 'Failed to update profile.' });
        }
      } else {
        setProfile((prev) => ({ ...prev, ...payload }));
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Unable to connect to server. Changes saved locally.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#032257] font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#032257] tracking-tight">
                User Profile
              </h1>
              <p className="text-sm text-[#64748B] mt-1">
                Manage your account credentials and personal safety preferences.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
              <Shield className="w-3.5 h-3.5" />
              <span>Protected Account</span>
            </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview Card & Image Upload */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col items-center text-center">
            <div className="relative mb-4 group">
              {formData.profilePicture ? (
                <img
                  src={formData.profilePicture}
                  alt="User Profile"
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#0270F7] shadow-xs"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#0270F7]/10 border-2 border-[#0270F7] flex items-center justify-center text-[#0270F7]">
                  <User className="w-12 h-12" />
                </div>
              )}
            </div>

            <h2 className="text-lg font-bold text-[#0F172A]">{profile.name || 'User'}</h2>
            <p className="text-xs text-[#64748B] mt-0.5">{profile.email}</p>

            {/* Profile Image Action Buttons */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#032257] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#0270F7]" />
                <span>{formData.profilePicture ? 'Change Photo' : 'Upload Photo'}</span>
              </button>

              {formData.profilePicture && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  title="Remove picture"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <div className="w-full mt-6 pt-6 border-t border-slate-100 space-y-3 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B]">Account Role</span>
                <span className="font-semibold text-[#032257] capitalize">{profile.role}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B]">Status</span>
                <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                </span>
              </div>
            </div>
          </div>

          {/* Edit Profile Form Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <h3 className="text-lg font-bold text-[#032257] mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-[#0270F7]" /> Basic Information
            </h3>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0270F7] focus:border-transparent transition-all"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Email Address <span className="text-slate-400 font-normal">(Non-editable)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Emergency Contact Phone Number with Selectable Country Code */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Emergency Contact Phone Number
                </label>
                <div className="flex gap-2">
                  {/* Selectable Country Code Dropdown */}
                  <select
                    value={formData.countryCode}
                    onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                    className="w-32 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0F172A] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0270F7] focus:border-transparent transition-all cursor-pointer shrink-0"
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
                      value={formData.localPhone}
                      onChange={(e) => setFormData({ ...formData, localPhone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0270F7] focus:border-transparent transition-all"
                      placeholder="9392075827"
                    />
                  </div>
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Gender <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0270F7] focus:border-transparent transition-all"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Age Group */}
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Age Group <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={formData.ageGroup}
                    onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0270F7] focus:border-transparent transition-all"
                  >
                    <option value="">Select Age Group</option>
                    <option value="Under 18">Under 18</option>
                    <option value="18-24">18-24</option>
                    <option value="25-34">25-34</option>
                    <option value="35-50">35-50</option>
                    <option value="50+">50+</option>
                  </select>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0270F7] hover:bg-[#0260D7] text-white text-sm font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
