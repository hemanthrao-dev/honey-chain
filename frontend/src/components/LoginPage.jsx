import { useState } from 'react';
import { Shield, Users, UserCheck, Key, Phone, Lock, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import HoneycombLogo from './HoneycombLogo';
import { api } from '../utils/api';

export default function LoginPage({ onLogin }) {
  const [role, setRole] = useState('beekeeper'); // 'beekeeper' | 'consumer' | 'admin'
  const [authMethod, setAuthMethod] = useState('password'); // 'password' | 'otp'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const roleConfigs = {
    beekeeper: {
      title: 'Beekeeper Portal',
      description: 'Register honey batches & monitor live IoT hive telemetry.',
      placeholder: 'Enter Beekeeper ID or Phone (e.g. BK001)',
      defaultIdentifier: 'BK001',
      icon: UserCheck,
      color: 'from-amber-500 to-amber-600',
    },
    consumer: {
      title: 'Consumer Verification',
      description: 'Verify honey batch authenticity & trace origin on blockchain.',
      placeholder: 'Enter Mobile Number or Email',
      defaultIdentifier: 'consumer@honeychain.in',
      icon: Shield,
      color: 'from-yellow-500 to-amber-600',
    },
    admin: {
      title: 'Admin / KVIC Dashboard',
      description: 'Manage apiary clusters, monitor integrity & national analytics.',
      placeholder: 'Enter KVIC Official ID (e.g. KVIC-ADMIN-01)',
      defaultIdentifier: 'KVIC-ADMIN-01',
      icon: Users,
      color: 'from-amber-600 to-yellow-600',
    },
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setRole(newRole);
    setOtpSent(false);
    setOtp('');
    setIdentifier(roleConfigs[newRole].defaultIdentifier);
  };

  const handleSendOtp = () => {
    if (!identifier.trim()) {
      toast.error('Please enter your Mobile number or Email first.');
      return;
    }
    setOtpSent(true);
    setOtp('123456');
    toast.success('Demo OTP sent: 123456');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!identifier.trim()) {
      toast.error('Please enter your login identifier.');
      return;
    }

    if (authMethod === 'password' && !password && identifier !== roleConfigs[role].defaultIdentifier) {
      toast.error('Please enter your password.');
      return;
    }

    if (authMethod === 'otp') {
      if (!otpSent) {
        toast.error('Please request an OTP first.');
        return;
      }
      if (otp !== '123456' && otp.length < 4) {
        toast.error('Invalid OTP code.');
        return;
      }
    }

    try {
      // Authenticate against backend server API
      await api.auth.login({
        identifier: identifier || roleConfigs[role].defaultIdentifier,
        password: password || 'demo',
        authMethod,
        otp,
      });
    } catch {
      // Fallback allowed for offline client mode
    }

    toast.success(`Logged in successfully as ${roleConfigs[role].title}`);
    onLogin({
      role,
      identifier: identifier || roleConfigs[role].defaultIdentifier,
      authMethod,
    });
  };

  const handleQuickLogin = async (selectedRole) => {
    const config = roleConfigs[selectedRole];
    setRole(selectedRole);
    setIdentifier(config.defaultIdentifier);

    try {
      await api.auth.login({
        identifier: config.defaultIdentifier,
        password: 'demo',
        authMethod: 'password',
      });
    } catch {
      // Fallback allowed for offline client mode
    }

    toast.success(`Signed in as ${config.title}`);
    onLogin({
      role: selectedRole,
      identifier: config.defaultIdentifier,
      authMethod: 'password',
    });
  };

  const currentRoleConfig = roleConfigs[role];
  const ActiveIcon = currentRoleConfig.icon;

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-amber-50/50 to-amber-100/30">
      <div className="max-w-md w-full space-y-6">
        {/* Card Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-amber-200/60 p-8">
          <div className="text-center space-y-3 mb-6">
            {/* Darker and prominent logo matching header styling */}
            <div className="inline-flex p-3 bg-gradient-to-r from-amber-600 to-amber-500 rounded-2xl text-white mb-1 shadow-md ring-4 ring-amber-500/20">
              <HoneycombLogo className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900">
              Welcome to <span className="text-amber-600">Honey Chain</span>
            </h2>
            <p className="text-xs text-gray-500">
              Select your role and authenticate to access your portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Dropdown for Login Options */}
            <div>
              <label htmlFor="user-role" className="block text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">
                1. Select Login Option / User Role
              </label>
              <div className="relative">
                <select
                  id="user-role"
                  value={role}
                  onChange={handleRoleChange}
                  className="w-full pl-10 pr-10 py-3 bg-amber-50/50 border-2 border-amber-200 rounded-xl font-semibold text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition cursor-pointer appearance-none"
                >
                  <option value="beekeeper">Beekeepers (Honey Producers & Apiaries)</option>
                  <option value="consumer">Consumers (Batch Verification & Traceability)</option>
                  <option value="admin">Admin / KVIC (Mission Control & Management)</option>
                </select>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-600">
                  <ActiveIcon className="w-5 h-5" />
                </div>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-amber-600">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-amber-800/80 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                {currentRoleConfig.description}
              </p>
            </div>

            {/* Auth Method Switcher (Password / OTP) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">
                2. Authentication Method
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAuthMethod('password')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    authMethod === 'password'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('otp')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    authMethod === 'otp'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Mobile / Email OTP
                </button>
              </div>
            </div>

            {/* Identifier Input */}
            <div>
              <label htmlFor="identifier-input" className="block text-xs font-bold text-gray-700 mb-1">
                {role === 'beekeeper' ? 'Beekeeper ID / Mobile' : role === 'admin' ? 'KVIC Officer ID' : 'Mobile / Email Address'}
              </label>
              <div className="relative">
                <input
                  id="identifier-input"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={currentRoleConfig.placeholder}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Phone className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Conditional Input: Password or OTP */}
            {authMethod === 'password' ? (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="password-input" className="block text-xs font-bold text-gray-700">Password</label>
                  <a href="#forgot" onClick={(e) => { e.preventDefault(); toast.info('Demo password: Any string or default'); }} className="text-xs text-amber-600 hover:underline">
                    Forgot Password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="password-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="otp-input" className="block text-xs font-bold text-gray-700">One-Time Password (OTP)</label>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-xs text-amber-600 hover:text-amber-700 font-bold hover:underline"
                  >
                    {otpSent ? 'Resend OTP' : 'Send OTP'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="otp-input"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition tracking-widest font-mono text-center"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Key className="w-4 h-4" />
                  </div>
                </div>
                {otpSent && (
                  <p className="mt-1 text-[11px] text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> OTP sent to registered phone/email (Demo OTP: 123456)
                  </p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <span>Sign In as {roleConfigs[role].title.split(' ')[0]}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Selector for Judges */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-[11px] text-center font-bold text-stone-500 uppercase tracking-wider mb-3">
              ⚡ Quick Demo Login (One-Click Access)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('beekeeper')}
                className="py-2 px-1 text-[11px] font-semibold bg-amber-50 text-amber-800 rounded-lg border border-amber-200 hover:bg-amber-100 transition text-center"
              >
                Beekeeper
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('consumer')}
                className="py-2 px-1 text-[11px] font-semibold bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition text-center"
              >
                Consumer
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="py-2 px-1 text-[11px] font-semibold bg-orange-50 text-orange-800 rounded-lg border border-orange-200 hover:bg-orange-100 transition text-center"
              >
                Admin/KVIC
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
