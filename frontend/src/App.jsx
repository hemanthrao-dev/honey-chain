import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Home, Shield, Users, Sparkles, Hexagon, LogOut, UserCheck } from 'lucide-react';
import BeekeeperDashboard from './components/beekeeper/BeekeeperDashboard';
import ConsumerVerification from './components/consumer/ConsumerVerification';
import AdminDashboard from './components/admin/AdminDashboard';
import LoginPage from './components/LoginPage';
import HoneycombLogo from './components/HoneycombLogo';
import ErrorBoundary from './components/ErrorBoundary';
import Breadcrumbs from './components/Breadcrumbs';
import NotFound from './components/NotFound';
import SEOHead from './components/SEOHead';

const ROLE_VIEW_MAP = {
  beekeeper: 'beekeepers',
  consumer: 'consumers',
  admin: 'admin',
};

const VIEW_PATH_MAP = {
  login: '/',
  beekeepers: '/beekeepers',
  consumers: '/consumers',
  admin: '/admin',
};

const getViewPath = (viewId) => VIEW_PATH_MAP[viewId] || '/';

const seoKeyForView = (view) => {
  if (view === '404') return 'notFound';
  if (view === 'beekeepers') return 'beekeeper';
  if (view === 'consumers') return 'consumer';
  return view; // 'admin' | 'login'
};

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('honeychain_auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [activeView, setActiveView] = useState(() => {
    try {
      const savedUser = localStorage.getItem('honeychain_auth_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.role) return ROLE_VIEW_MAP[parsed.role] || parsed.role;
      }
    } catch {
      // ignore parsing error
    }
    const path = window.location.pathname.replace(/^\//, '').replace(/\/+$/, '').toLowerCase();
    if (path === 'beekeepers') return 'beekeepers';
    if (path === 'consumers') return 'consumers';
    if (path === 'admin') return 'admin';
    if (path === 'login' || path === '') return 'login';
    return '404';
  });

  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Sync session in localStorage & restrict activeView to authorized role
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('honeychain_auth_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('honeychain_auth_user');
    }
  }, [currentUser]);

  // Handle browser back/forward buttons & role restrictions
  useEffect(() => {
    const handlePopState = () => {
      if (currentUser) {
        // Enforce access restriction to user's assigned role only
        const expectedView = ROLE_VIEW_MAP[currentUser.role];
        if (expectedView) {
          setActiveView(expectedView);
          window.history.replaceState({}, '', getViewPath(expectedView));
        }
      } else {
        const path = window.location.pathname.replace(/^\//, '').replace(/\/+$/, '').toLowerCase();
        if (path === 'beekeepers') setActiveView('beekeepers');
        else if (path === 'consumers') setActiveView('consumers');
        else if (path === 'admin') setActiveView('admin');
        else if (path === 'login' || path === '') setActiveView('login');
        else setActiveView('404');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  const handleNavigate = (viewId, batchId = null) => {
    // If logged in, restrict navigation to only the user's role dashboard
    const allowedView = currentUser ? ROLE_VIEW_MAP[currentUser.role] : null;
    if (currentUser && viewId !== allowedView && viewId !== 'login') {
      toast.error(`Access restricted: You are logged in as ${currentUser.role.toUpperCase()}`);
      return;
    }

    setActiveView(viewId);
    if (batchId) {
      setSelectedBatchId(batchId);
    }
    window.history.pushState({}, '', getViewPath(viewId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = (userInfo) => {
    setCurrentUser(userInfo);
    const targetView = ROLE_VIEW_MAP[userInfo.role] || 'admin';
    setActiveView(targetView);
    window.history.pushState({}, '', getViewPath(targetView));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    toast.success('Logged out successfully');
    handleNavigate('login');
  };

  const viewsMap = {
    beekeeper: { id: 'beekeepers', name: 'Beekeeper Portal', icon: Home },
    consumer: { id: 'consumers', name: 'Consumer Verification', icon: Shield },
    admin: { id: 'admin', name: 'KVIC / Admin Dashboard', icon: Users },
  };

  // Breadcrumbs config based on active view
  const getBreadcrumbItems = () => {
    if (!currentUser || activeView === 'login') {
      return [{ label: 'Authentication & Login Portal' }];
    }
    if (activeView === 'beekeepers') {
      return [{ label: 'Beekeeper Portal (Exclusive Access)' }];
    }
    if (activeView === 'consumers') {
      return [{ label: 'Consumer Verification (Exclusive Access)' }];
    }
    if (activeView === 'admin') {
      return [{ label: 'KVIC Admin Dashboard (Exclusive Access)' }];
    }
    return [{ label: '404 — Page Not Found' }];
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-amber-50/20 text-gray-900 flex flex-col font-sans">
        <SEOHead pageKey={seoKeyForView(activeView)} />
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

        {/* Global Banner for Hackathon Context */}
        <div className="bg-amber-950 text-amber-200 text-xs py-1.5 px-4 text-center font-medium border-b border-amber-900/50 flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>KVIC Honey Mission × Smart India Hackathon 2026 Prototype</span>
        </div>

        {/* Header */}
        <header className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <button
                onClick={() => handleNavigate(currentUser ? ROLE_VIEW_MAP[currentUser.role] : 'login')}
                className="flex items-center gap-3 text-left group focus:outline-none"
              >
                <div className="p-1.5 bg-white/10 rounded-xl group-hover:bg-white/20 transition shrink-0">
                  <HoneycombLogo className="w-9 h-9" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none">Honey Chain</h1>
                    <span className="text-[10px] bg-amber-900/40 text-amber-100 font-bold px-2 py-0.5 rounded-full border border-amber-300/30 uppercase tracking-wide">
                      v1.0 Proof-of-Trust
                    </span>
                  </div>
                  <p className="text-xs text-amber-100 font-medium mt-0.5">
                    Blockchain Honey Traceability & Smart IoT Beekeeping
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-2 sm:gap-3 text-xs font-semibold w-full sm:w-auto justify-between sm:justify-end">
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-black/15 backdrop-blur-xs rounded-lg border border-white/20">
                  <Hexagon className="w-3.5 h-3.5 text-yellow-300" />
                  <span>SHA-256 Ledger Active</span>
                </div>

                {currentUser ? (
                  <div className="flex items-center gap-2">
                    <div className="px-2.5 py-1.5 bg-white/15 backdrop-blur-xs rounded-lg border border-white/20 flex items-center gap-1.5 max-w-[170px] sm:max-w-xs">
                      <UserCheck className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                      <span className="capitalize truncate">{currentUser.role} ({currentUser.identifier})</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition border border-red-400/30 flex items-center gap-1 cursor-pointer shrink-0"
                      title="Logout / Switch Role"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleNavigate('login')}
                    className="px-3.5 py-1.5 bg-amber-950/60 hover:bg-amber-950 text-white rounded-lg border border-amber-300/40 transition flex items-center gap-1.5"
                  >
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Bar showing ONLY active user's specific dashboard tab when logged in */}
        {currentUser && activeView !== '404' && (
          <nav className="bg-white shadow-xs border-b border-amber-100 sticky top-0 z-20">
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
              <div className="flex gap-2">
                {viewsMap[currentUser.role] && (() => {
                  const activeConfig = viewsMap[currentUser.role];
                  const Icon = activeConfig.icon;
                  return (
                    <div className="flex items-center gap-2 px-6 py-4 font-bold text-sm text-amber-700 border-b-2 border-amber-600 bg-amber-50/70">
                      <Icon className="w-4 h-4 text-amber-600" />
                      <span>Active Dashboard: {activeConfig.name}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </nav>
        )}

        {/* Breadcrumb Hierarchy */}
        {activeView !== '404' && <Breadcrumbs items={getBreadcrumbItems()} />}

        {/* Main View Router */}
        <main className="flex-1">
          <ErrorBoundary>
            {!currentUser || activeView === 'login' ? (
              <LoginPage onLogin={handleLogin} />
            ) : (
              <>
                {currentUser.role === 'beekeeper' && <BeekeeperDashboard onNavigate={handleNavigate} />}
                {currentUser.role === 'consumer' && (
                  <ConsumerVerification
                    initialBatchId={selectedBatchId}
                    onNavigate={handleNavigate}
                  />
                )}
                {currentUser.role === 'admin' && <AdminDashboard onNavigate={handleNavigate} />}
                {activeView === '404' && <NotFound onNavigate={handleNavigate} />}
              </>
            )}
          </ErrorBoundary>
        </main>

        {/* Honey Bee Themed Footer */}
        <footer className="bg-stone-900 text-amber-100/90 py-12 mt-16 border-t-4 border-amber-500">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Brand & Purpose */}
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <HoneycombLogo className="w-7 h-7" />
                  <span className="text-xl font-black text-amber-400 tracking-tight">Honey Chain</span>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Decentralized provenance protocol connecting Indian rural beekeepers with conscious consumers through cryptographic proof of origin and IoT hive telemetry.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-amber-500 font-semibold">
                  <Hexagon className="w-3.5 h-3.5" />
                  <span>Protected by Honey Chain SHA-256</span>
                </div>
              </div>

              {/* Tech Architecture */}
              <div>
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Core Technology</h3>
                <ul className="text-xs text-stone-400 space-y-1.5">
                  <li>• SHA-256 Cryptographic Hash Chain</li>
                  <li>• Dynamic QR Code Generation</li>
                  <li>• Simulated ESP32 + DHT22/HX711 Telemetry</li>
                  <li>• Heuristic Hive Disease & Swarming Engine</li>
                  <li>• React 19 + Tailwind CSS Production Engine</li>
                </ul>
              </div>

              {/* Deployment & Institutional Framework */}
              <div>
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">KVIC Deployment Scale</h3>
                <ul className="text-xs text-stone-400 space-y-1.5">
                  <li>• Target: 10,000+ Rural Beekeepers</li>
                  <li>• 1M+ Annual Batches Throughput</li>
                  <li>• Hyperledger Fabric Roadmap</li>
                  <li>• LoRaWAN Rural Apiary Integration</li>
                </ul>
              </div>

              {/* Credits & Institutional Framework */}
              <div>
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Project Credits & Context</h3>
                <p className="text-amber-400 font-bold text-xs leading-relaxed">This Website is Built/Created by<br/>HEMANTH RAO | Team Lead<br/>ACE | Smart India Hackathon Team</p>
                <p className="text-stone-400 text-xs leading-relaxed mt-3">
                  Problem ID: SIH26021<br/>
                  Problem statement: Honey Chain: A block chain-based system for honey traceability and smart beekeeping management.<br/>
                  Organization: Ministry of Micro, Small and Medium Enterprises (MSME)
                </p>
                <a
                  href="https://www.sih.gov.in/sih2026PS"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 font-semibold text-xs transition mt-3 inline-block"
                >
                  🔗 View Official SIH Problem Statements
                </a>
              </div>
            </div>

            <div className="border-t border-stone-800 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-400">
              <p>© 2026 Honey Chain — Khadi and Village Industries Commission (KVIC) Partner Prototype</p>
              <div className="text-left md:text-right leading-relaxed">
                <p className="text-stone-400 font-normal">Contact us:</p>
                <p className="text-stone-400 font-normal">
                  ✉️{' '}
                  <a
                    href="mailto:hemanthrao1947@gmail.com"
                    className="text-amber-400 hover:text-amber-300 font-semibold transition"
                  >
                    hemanthrao1947@gmail.com
                  </a>
                </p>
                <p className="text-stone-400 font-normal">📞 +91 9108664824</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
