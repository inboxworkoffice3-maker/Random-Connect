import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { POPULAR_INDIAN_CITIES, getNearestCity } from '../lib/cities';
import { Gender, MatchingPreference } from '../types';
import {
  X,
  ShieldCheck,
  MapPin,
  AlertTriangle,
  User,
  Calendar,
  Heart,
  Globe2,
  Trash2,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLegal: (tab: 'deletion') => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onOpenLegal }) => {
  const { profile, updateUserProfile, deleteUserAccount } = useAuth();
  const { t } = useLanguage();

  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState<number>(18);
  const [gender, setGender] = useState<Gender>('prefer_not_to_say');
  const [city, setCity] = useState('Delhi NCR');
  const [preferredLang, setPreferredLang] = useState<'en' | 'hi' | 'hinglish'>('en');
  const [matchingPref, setMatchingPref] = useState<MatchingPreference>('open');

  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setAge(profile.age || 18);
      setGender(profile.gender || 'prefer_not_to_say');
      setCity(profile.city || 'Delhi NCR');
      setPreferredLang(profile.language || 'en');
      setMatchingPref(profile.matchingPreference || 'open');
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const nearest = getNearestCity(latitude, longitude);
        setCity(nearest.name);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!displayName.trim() || displayName.trim().length < 2) {
      setErrorMsg(t('nameRequiredError'));
      return;
    }

    if (age < 18) {
      setErrorMsg(t('underageError'));
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        age: Number(age),
        gender,
        city,
        language: preferredLang,
        matchingPreference: matchingPref,
        isProfileComplete: true,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 my-8 text-slate-100">
        
        {/* Close Button */}
        {profile?.isProfileComplete && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans']">
              {t('setupTitle')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('setupSubtitle')}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('displayNameLabel')}</span>
            </label>
            <input
              type="text"
              required
              maxLength={30}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('displayNamePlaceholder')}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Age Verification (18+) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('ageLabel')}</span>
              </label>
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                18+ Only
              </span>
            </div>
            <input
              type="number"
              min={18}
              max={100}
              required
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">{t('ageHelp')}</p>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('genderLabel')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'male', label: t('genderMale') },
                { value: 'female', label: t('genderFemale') },
                { value: 'non-binary', label: t('genderNonBinary') },
                { value: 'prefer_not_to_say', label: t('genderPreferNot') },
              ].map((g) => (
                <button
                  type="button"
                  key={g.value}
                  onClick={() => setGender(g.value as Gender)}
                  className={`px-2.5 py-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    gender === g.value
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* City / Location */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('cityLabel')}</span>
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isLocating}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
              >
                {isLocating ? 'Detecting...' : t('useCurrentLocation')}
              </button>
            </div>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {POPULAR_INDIAN_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} {c.state !== 'Global' ? `(${c.state})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Matching Preference */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>{t('matchingPrefLabel')}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'open', label: t('matchingOpen') },
                { value: 'female', label: t('matchingFemale') },
                { value: 'male', label: t('matchingMale') },
                { value: 'nearby', label: t('matchingNearby') },
              ].map((pref) => (
                <button
                  type="button"
                  key={pref.value}
                  onClick={() => setMatchingPref(pref.value as MatchingPreference)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                    matchingPref === pref.value
                      ? 'bg-rose-950/60 border-rose-600 text-rose-200'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {pref.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
            >
              <span>{saving ? 'Saving...' : t('saveAndContinue')}</span>
            </button>
          </div>
        </form>

        {/* Account Deletion Footer */}
        {profile?.isProfileComplete && (
          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Public ID: <span className="font-mono text-indigo-400">{profile.publicId}</span></span>
            <button
              type="button"
              onClick={() => onOpenLegal('deletion')}
              className="text-rose-400 hover:text-rose-300 flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('accountDeletion')}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
