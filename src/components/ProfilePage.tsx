import React, { useState, useEffect, useRef } from 'react';
import { Building2, Mail, Phone, Camera, Check, Loader2, Save, ArrowLeft, Globe, MapPin, Hash, DollarSign, Package, ShieldCheck, Key, Code, Copy } from 'lucide-react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { profileService, UserProfile } from '../services/profileService';
import { logoService } from '../services/logoService';
import { getVisitorCountry } from '../utils/geoUtils';
import { SheetTypeManager } from './SheetTypeManager';

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

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const [data, key] = await Promise.all([
        profileService.getProfile(user.id),
        profileService.getApiKey(user.id)
      ]);
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
      setApiKey(key);
      setLoadingKey(false);
      setLoading(false);
    };
    fetchProfile();
  }, [user.id]);

  const handleGenerateKey = async () => {
    setLoadingKey(true);
    const key = await profileService.generateApiKey(user.id);
    if (key) {
      setApiKey(key);
    }
    setLoadingKey(false);
  };

  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
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

      if (newLogoFile) {
        const uploadResult = await logoService.uploadLogo(newLogoFile, user.id);
        if (uploadResult) {
          finalLogoUrl = uploadResult.url;
        }
      }

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
        setMessage({ type: 'success', text: 'Business profile updated successfully!' });
        setNewLogoFile(null);
        setLogoPreview(null);
        setLogoUrl(finalLogoUrl);
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
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
        <Loader2 className="text-orange-600 animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-[#020617] overflow-y-auto custom-scrollbar p-6 lg:p-12 transition-colors duration-500">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-slate-500 hover:text-orange-600 font-bold text-xs uppercase tracking-widest transition-colors mb-2 group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </button>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase leading-none">
              Business <span className="text-orange-600">Profile</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Manage your branding, catalog and financial settings.</p>
          </div>
        </div>

        {/* Sectioned Layout */}
        <div className="space-y-12">
          
          {/* SECTION 1: BUSINESS IDENTITY & CONTACT */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] italic">1. Business Identity</h3>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-orange-500/10 active:scale-95"
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                SAVE
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-[2.5rem] p-8 lg:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-10">
              {/* Branding Row */}
              <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
                <div className="relative group/logo flex-shrink-0">
                  <div className="w-40 h-40 rounded-[2rem] bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center transition-all group-hover/logo:border-orange-500/50">
                    {logoPreview || logoUrl ? (
                      <img src={logoPreview || logoUrl} alt="Company Logo" className="w-full h-full object-contain p-6" />
                    ) : (
                      <Building2 size={48} className="text-slate-300 dark:text-slate-700" />
                    )}
                    <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer rounded-[2rem]">
                      <Camera className="text-white" size={24} />
                    </button>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoChange} />
                </div>

                <div className="flex-1 space-y-6 w-full">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                    <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Luxus Elements" className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-6 text-slate-900 dark:text-white font-bold text-lg focus:ring-4 focus:ring-amber-500/10 focus:border-orange-500 outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <div className="phone-input-container">
                        <PhoneInput international defaultCountry={getVisitorCountry() as any} value={phone} onChange={(val) => setPhone(val || '')} className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 px-4 text-slate-900 dark:text-white font-bold text-sm focus-within:ring-4 focus-within:ring-amber-500/10 focus-within:border-orange-500 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Website URL</label>
                      <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 px-6 text-slate-900 dark:text-white font-bold text-sm focus:ring-4 focus:ring-amber-500/10 focus:border-orange-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Operations & Currency Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Address</label>
                  <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full physical address..." rows={3} className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-6 text-slate-900 dark:text-white font-medium text-sm focus:ring-4 focus:ring-amber-500/10 focus:border-orange-500 outline-none transition-all resize-none" />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax ID / Registration</label>
                    <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="Registration Number" className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-5 pr-6 text-slate-900 dark:text-white font-bold text-sm focus:ring-4 focus:ring-amber-500/10 focus:border-orange-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Currency</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-5 text-slate-900 dark:text-white font-bold text-sm focus:ring-4 focus:ring-amber-500/10 focus:border-orange-500 outline-none transition-all appearance-none">
                      <option value="$">USD ($)</option>
                      <option value="€">EUR (€)</option>
                      <option value="£">GBP (£)</option>
                      <option value="A$">AUD (A$)</option>
                      <option value="Rs">LKR (Rs)</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {message.text && (
                <div className={`px-6 py-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                  message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
                }`}>
                  {message.type === 'success' ? <Check size={16} /> : <Hash size={16} />}
                  <p className="text-[10px] font-black uppercase tracking-widest">{message.text}</p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: GLOBAL SHEET MATERIALS */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] italic">2. Core Sheet Materials</h3>
            </div>
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-[2.5rem] p-4 lg:p-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
              <SheetTypeManager currency={currency} sheetTypesExpanded={true} showSheetsOnly={true} />
            </div>
          </div>

          {/* SECTION 3: HARDWARE & ACCESSORIES */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] italic">3. Hardware & Fittings</h3>
            </div>
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-[2.5rem] p-4 lg:p-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
              <SheetTypeManager currency={currency} accessoriesExpanded={true} showHardwareOnly={true} />
            </div>
          </div>

          {/* SECTION 4: CLIENT EMBED WIDGET */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] italic">4. Embed Wizard Widget</h3>
            </div>
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-[2.5rem] p-8 lg:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-8">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">Embed Code & API Integration</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                  Expose steps 1-4 of the setup page on your own website. Submissions will automatically sync to your dashboard as new projects.
                </p>
              </div>

              {loadingKey ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="animate-spin text-orange-600" size={24} />
                </div>
              ) : !apiKey ? (
                <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 rounded-[2rem] p-8 text-center space-y-4">
                  <div className="w-12 h-12 bg-orange-600/10 rounded-xl flex items-center justify-center text-orange-600 mx-auto">
                    <Key size={24} />
                  </div>
                  <div>
                    <h5 className="font-black uppercase text-xs">No Active Embed Key</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium italic mt-1">Generate a widget key to fetch the embed code snippet.</p>
                  </div>
                  <button
                    onClick={handleGenerateKey}
                    className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all shadow-xl shadow-orange-500/10 active:scale-95"
                  >
                    GENERATE EMBED KEY
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Widget API Key</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={apiKey}
                        className="flex-1 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-5 text-slate-500 dark:text-slate-400 font-mono text-xs focus:outline-none"
                      />
                      <button
                        onClick={() => handleCopyCode(apiKey)}
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-orange-600 hover:text-white px-5 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 hover:border-orange-500"
                      >
                        Copy Key
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HTML Embed Snippet</label>
                      <button
                        onClick={() => handleCopyCode(`<!-- Start Cabinet Widget Button -->
<button onclick="openCabinetModal()" style="padding: 14px 28px; background: #f59e0b; color: white; border: none; border-radius: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; transition: all 0.2s;">Configure Cabinets</button>

<!-- Hidden Modal overlay -->
<div id="cabinetModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:99999; justify-content:center; align-items:center;">
  <div style="position:relative; width:96%; max-width:1400px; height:90%; background:#1e293b; border-radius:24px; overflow:hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
    <button onclick="closeCabinetModal()" style="position:absolute; top:16px; right:16px; border:none; background:rgba(255,255,255,0.05); color:#94a3b8; border-radius:99px; width:36px; height:36px; font-size:22px; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:100; transition: all 0.2s;">&times;</button>
    <iframe src="${window.location.origin}/embed/setup?apiKey=${apiKey}" style="width:100%; height:100%; border:none;"></iframe>
  </div>
</div>

<script>
  function openCabinetModal() {
    document.getElementById('cabinetModal').style.display = 'flex';
  }
  function closeCabinetModal() {
    document.getElementById('cabinetModal').style.display = 'none';
  }

  // Auto close modal when project is submitted
  window.addEventListener('message', (event) => {
    if (event.data.type === 'SETUP_COMPLETED') {
      closeCabinetModal();
    }
  });
</script>
<!-- End Cabinet Widget Button -->`)}
                        className="text-[10px] text-orange-600 font-bold hover:underline"
                      >
                        {copySuccess ? 'Copied!' : 'Copy Code Snippet'}
                      </button>
                    </div>
                    <pre className="p-5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] text-slate-500 dark:text-slate-400 font-mono overflow-x-auto whitespace-pre-wrap max-h-48 custom-scrollbar">
{`<!-- Start Cabinet Widget Button -->
<button onclick="openCabinetModal()" style="padding: 14px 28px; background: #f59e0b; ...">Configure Cabinets</button>

<!-- Hidden Modal overlay -->
<div id="cabinetModal" style="display:none; position:fixed; ...">
  <div style="position:relative; width:96%; max-width:1400px; ...">
    <button onclick="closeCabinetModal()" ...>&times;</button>
    <iframe src="${window.location.origin}/embed/setup?apiKey=${apiKey}" ...></iframe>
  </div>
</div>`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="pb-20 pt-10 text-center space-y-4">
           <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-900 dark:bg-white rounded-full">
              <ShieldCheck className="text-orange-600" size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest text-white dark:text-slate-900">Enterprise Database Encryption Active</span>
           </div>
           <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">Cabinet SaaS © 2026 • Secure Infrastructure</p>
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
          font-size: 14px;
          font-weight: 700;
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
