import React, { useState, useEffect, useRef } from 'react';
import { Building2, Mail, Phone, Camera, Check, Loader2, Save, ArrowLeft } from 'lucide-react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { profileService, UserProfile } from '../services/profileService';
import { logoService } from '../services/logoService';
import { getVisitorCountry } from '../utils/geoUtils';

interface ProfilePageProps {
  user: any;
  onBack: () => void;
  onProfileUpdate: (profile: UserProfile) => void;
  isDark: boolean;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onBack, onProfileUpdate, isDark }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [taxId, setTaxId] = useState('');
  const [currency, setCurrency] = useState('$');
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const data = await profileService.getProfile(user.id);
      if (data) {
        setProfile(data);
        setCompanyName(data.company_name);
        setPhone(data.phone || '');
        setLogoUrl(data.logo_url || '');
        setAddress(data.business_address || '');
        setWebsite(data.website_url || '');
        setTaxId(data.tax_id || '');
        setCurrency(data.currency || '$');
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user.id]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!companyName.trim()) {
      setMessage({ type: 'error', text: 'Company name is required' });
      return;
    }

    if (phone && !isValidPhoneNumber(phone)) {
      setMessage({ type: 'error', text: 'Please enter a valid phone number' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      let finalLogoUrl = logoUrl;

      // 1. Upload new logo if selected
      if (newLogoFile) {
        const uploadResult = await logoService.uploadLogo(newLogoFile, user.id);
        if (uploadResult) {
          finalLogoUrl = uploadResult.url;
        }
      }

      // 2. Update profile in database
      const success = await profileService.updateProfile(user.id, {
        company_name: companyName,
        phone: phone,
        logo_url: finalLogoUrl,
        business_address: address,
        website_url: website,
        tax_id: taxId,
        currency: currency
      });

      if (success) {
        const updatedProfile = {
          ...profile!,
          company_name: companyName,
          phone: phone,
          logo_url: finalLogoUrl,
          business_address: address,
          website_url: website,
          tax_id: taxId,
          currency: currency
        };
        setProfile(updatedProfile);
        onProfileUpdate(updatedProfile);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setNewLogoFile(null);
        setLogoPreview(null);
        setLogoUrl(finalLogoUrl);
      } else {
        setMessage({ type: 'error', text: 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-[#020617] flex items-center justify-center transition-colors duration-500">
        <Loader2 className="text-amber-500 animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-[#020617] overflow-y-auto custom-scrollbar p-6 lg:p-12 transition-colors duration-500">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-4 group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Back to Projects
            </button>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase">
              Business <span className="text-amber-500">Profile</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your branding and operational details.</p>
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="hidden lg:flex items-center gap-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-amber-500/20 active:scale-95"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Branding */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 text-center relative overflow-hidden group shadow-xl shadow-slate-200/50 dark:shadow-none">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              
              <div className="relative inline-block mb-6">
                <div className="w-32 h-32 rounded-3xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 overflow-hidden flex items-center justify-center relative group/logo shadow-2xl">
                  {logoPreview || logoUrl ? (
                    <img 
                      src={logoPreview || logoUrl} 
                      alt="Company Logo" 
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <Building2 size={48} className="text-slate-300 dark:text-slate-600" />
                  )}
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera className="text-white" size={24} />
                  </button>
                </div>
                <input 
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
              </div>

              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">{companyName || 'Your Business'}</h3>
              <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mb-6 uppercase tracking-widest">Business Branding</p>
              
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                   <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black">BOM</div>
                   <span>Syncs to all engineering reports</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                   <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black">ISO</div>
                   <span>Branded technical elevations</span>
                </div>
              </div>
            </div>
            
            {/* Quick Stats/Info */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-6">
               <h4 className="text-amber-600 dark:text-amber-500 font-bold text-xs uppercase tracking-widest mb-3">Sync Status</h4>
               <div className="flex items-center gap-3 text-sm text-amber-700 dark:text-amber-400">
                 <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                 <span>Real-time report branding active</span>
               </div>
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="lg:col-span-2 space-y-6 pb-12">
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 lg:p-10 space-y-10 relative overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none">
              
              {/* General Info Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/50">
                   <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                     <Mail size={18} />
                   </div>
                   <h4 className="text-slate-900 dark:text-white font-bold uppercase tracking-widest text-xs italic">Identity & Contact</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Luxus Elements"
                      className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-6 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Official Email</label>
                    <input
                      type="text"
                      value={user.email}
                      disabled
                      className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/50 rounded-2xl py-4 px-6 text-slate-400 dark:text-slate-500 font-medium cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="phone-input-container">
                      <PhoneInput
                        international
                        defaultCountry={getVisitorCountry() as any}
                        value={phone}
                        onChange={(val) => setPhone(val || '')}
                        placeholder="Enter phone number"
                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-6 text-slate-900 dark:text-white font-medium focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Website URL</label>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="e.g. https://www.luxuselements.com"
                      className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-6 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Business Location & Tax */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/50">
                   <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500">
                     <Building2 size={18} />
                   </div>
                   <h4 className="text-slate-900 dark:text-white font-bold uppercase tracking-widest text-xs italic">Business Details</h4>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Business Address (Shown on Reports)</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter full physical address or showroom location..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-6 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tax ID / Registration</label>
                      <input
                        type="text"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        placeholder="e.g. ABN / VAT / GST Number"
                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-6 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Default Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-6 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all appearance-none"
                      >
                        <option value="$">USD ($)</option>
                        <option value="€">EUR (€)</option>
                        <option value="£">GBP (£)</option>
                        <option value="A$">AUD (A$)</option>
                        <option value="Rs">LKR (Rs)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Message */}
              {message.text && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in ${
                  message.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                    : 'bg-red-500/10 border-red-500/20 text-red-500'
                }`}>
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    message.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                  }`} />
                  <p className="text-xs font-bold">{message.text}</p>
                </div>
              )}
            </div>

            {/* Mobile Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="lg:hidden w-full flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-amber-500/20 active:scale-95"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .phone-input-container .PhoneInput {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .phone-input-container input.PhoneInputInput {
          background: transparent !important;
          border: none !important;
          color: ${isDark ? 'white' : '#0f172a'} !important;
          font-size: 16px;
          outline: none;
          width: 100%;
        }
        .phone-input-container .PhoneInputCountry {
          background: transparent !important;
        }
        .phone-input-container select.PhoneInputCountrySelect {
          background-color: ${isDark ? '#0f172a' : 'white'} !important;
          color: ${isDark ? 'white' : '#0f172a'} !important;
        }
      `}</style>
    </div>
  );
};
