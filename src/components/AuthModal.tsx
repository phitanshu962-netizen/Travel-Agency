'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'signup';
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, role: 'user', data: { name: string; phone?: string }) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  googleUser?: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
}

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
];



export default function AuthModal({
  isOpen,
  onClose,
  initialTab = 'login',
  onLogin,
  onRegister,
  onGoogleSignIn,
  googleUser,
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCountryCodes, setShowCountryCodes] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhone('');
    setError('');
  };

  const handleTabChange = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    resetForm();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    try {
      await onLogin(email, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) { setError('Please fill in all fields.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      await onRegister(email, password, 'user', { name: fullName, phone: phone ? `${countryCode}${phone}` : '' });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await onGoogleSignIn();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col md:flex-row w-full max-w-3xl max-sm:max-h-[92dvh] sm:h-[580px] sm:max-h-[90vh] overflow-hidden shadow-2xl bg-white border border-slate-200 rounded-t-2xl sm:rounded-md animate-in slide-in-from-bottom sm:slide-in-from-none duration-200"
      >
        {/* Mobile Drag Pill */}
        <div className="sm:hidden w-full flex items-center justify-center pt-2.5 pb-0.5 shrink-0 bg-white">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2.5 sm:top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-white text-gray-600 hover:text-gray-900 transition-all shadow-xs cursor-pointer border border-slate-200 rounded-full sm:rounded-md"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* LEFT — Hero Image */}
        <div
          className="hidden md:flex md:w-[46%] h-full flex-col justify-end p-8 relative shrink-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="relative z-10">
            <h2 className="text-white text-2xl font-bold leading-tight mb-2">
              Your Adventure Starts Here
            </h2>
          </div>
        </div>

        {/* RIGHT — Auth Form */}
        <div className="flex-1 bg-white flex flex-col h-full overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 pt-6 px-7 shrink-0">
            <button
              onClick={() => handleTabChange('login')}
              className={`pb-3 px-2 text-base font-semibold mr-6 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'login'
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => handleTabChange('signup')}
              className={`pb-3 px-2 text-base font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'signup'
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="flex-1 px-7 py-5 overflow-y-auto custom-scrollbar">
            {/* — LOGIN TAB — */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Log into Your Account</h3>

                {error && (
                  <div 
                    className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5"
                    style={{ borderRadius: '6px' }}
                  >
                    {error}
                  </div>
                )}

                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-all"
                    style={{ borderRadius: '6px' }}
                    required
                  />
                </div>

                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-all"
                    style={{ borderRadius: '6px' }}
                    required
                  />
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FF5500] hover:bg-[#E04B00] active:scale-[0.99] text-white font-bold py-3.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                  style={{ borderRadius: '6px' }}
                >
                  {loading ? 'Please wait...' : 'Login & Continue'}
                </button>

                {/* Google Sign In */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-between border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-all disabled:opacity-60 cursor-pointer"
                  style={{ borderRadius: '6px' }}
                >
                  <div className="flex items-center gap-3">
                    {googleUser?.photoURL ? (
                      <img src={googleUser.photoURL} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div 
                        className="w-6 h-6 bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500"
                        style={{ borderRadius: '4px' }}
                      >
                        G
                      </div>
                    )}
                    <span className="text-sm font-semibold text-gray-700">
                      {googleUser?.displayName ? `Sign in as ${googleUser.displayName}` : 'Sign in with Google'}
                    </span>
                    {googleUser?.email && (
                      <span className="text-xs text-gray-400">{googleUser.email}</span>
                    )}
                  </div>
                  {/* Google logo */}
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </button>
              </form>
            )}

            {/* — SIGN UP TAB — */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Create Your Account</h3>

                {error && (
                  <div 
                    className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5"
                    style={{ borderRadius: '6px' }}
                  >
                    {error}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-all"
                  style={{ borderRadius: '6px' }}
                  required
                />

                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-all"
                  style={{ borderRadius: '6px' }}
                  required
                />

                {/* Phone with country code */}
                <div className="flex gap-2 relative">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountryCodes(!showCountryCodes)}
                      className="flex items-center gap-1 border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all whitespace-nowrap focus:outline-none focus:border-orange-400 cursor-pointer"
                      style={{ borderRadius: '6px' }}
                    >
                      {countryCode}
                      <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showCountryCodes && (
                      <div 
                        className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 shadow-xl z-50 py-1 max-h-48 overflow-y-auto"
                        style={{ borderRadius: '6px' }}
                      >
                        {COUNTRY_CODES.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => { setCountryCode(c.code); setShowCountryCodes(false); }}
                            className="w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-orange-50 text-sm transition-colors cursor-pointer"
                          >
                            <span>{c.flag}</span>
                            <span className="font-medium">{c.code}</span>
                            <span className="text-gray-500">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-all"
                    style={{ borderRadius: '6px' }}
                  />
                </div>

                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-all"
                  style={{ borderRadius: '6px' }}
                  required
                />

                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-all"
                  style={{ borderRadius: '6px' }}
                  required
                />

                <p className="text-xs text-gray-500">
                  By joining, you agree to the{' '}
                  <a href="/policies/terms" className="text-orange-500 hover:underline font-medium">Terms</a>
                  {' '}and{' '}
                  <a href="/policies/privacy-notice" className="text-orange-500 hover:underline font-medium">Privacy Policy</a>.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FF5500] hover:bg-[#E04B00] active:scale-[0.99] text-white font-bold py-3.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                  style={{ borderRadius: '6px' }}
                >
                  {loading ? 'Creating account...' : 'Sign Up'}
                </button>

                <p className="text-sm text-center text-gray-500">
                  Already Have An Account?{' '}
                  <button
                    type="button"
                    onClick={() => handleTabChange('login')}
                    className="font-bold text-gray-800 hover:text-orange-500 transition-colors cursor-pointer"
                  >
                    Log In
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
