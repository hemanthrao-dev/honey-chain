import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Home, Shield, Users, Sparkles, Hexagon } from 'lucide-react';
import BeekeeperDashboard from './components/beekeeper/BeekeeperDashboard';
import ConsumerVerification from './components/consumer/ConsumerVerification';
import AdminDashboard from './components/admin/AdminDashboard';
import HoneycombLogo from './components/HoneycombLogo';
import ErrorBoundary from './components/ErrorBoundary';
import Breadcrumbs from './components/Breadcrumbs';
import NotFound from './components/NotFound';
import SEOHead from './components/SEOHead';
import { pageMetadata } from './utils/seo';

function App() {
  const [activeView, setActiveView] = useState(() => {
    // Parse URL path on initial load
    const path = window.location.pathname.replace(/^\//, '').toLowerCase();
    if (path === 'consumer') return 'consumer';
    if (path === 'admin') return 'admin';
    if (path === 'beekeeper' || path === '') return 'beekeeper';
    // If unknown path, trigger 404
    return '404';
  });

  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\//, '').toLowerCase();
      if (path === 'consumer') setActiveView('consumer');
      else if (path === 'admin') setActiveView('admin');
      else if (path === 'beekeeper' || path === '') setActiveView('beekeeper');
      else setActiveView('404');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (viewId, batchId = null) => {
    setActiveView(viewId);
    if (batchId) {
      setSelectedBatchId(batchId);
    }
    const newPath = viewId === 'beekeeper' ? '/' : `/${viewId}`;
    window.history.pushState({}, '', newPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const views = [
    { id: 'beekeeper', name: 'Beekeeper', icon: Home },
    { id: 'consumer', name: 'Consumer', icon: Shield },
    { id: 'admin', name: 'Admin / KVIC', icon: Users },
  ];

  // Breadcrumbs config based on active view
  const getBreadcrumbItems = () => {
    if (activeView === 'beekeeper') {
      return [{ label: 'Beekeeper Portal' }];
    }
    if (activeView === 'consumer') {
      return [{ label: 'Consumer Verification' }];
    }
    if (activeView === 'admin') {
      return [{ label: 'KVIC Admin Dashboard' }];
    }
    return [{ label: '404 — Page Not Found' }];
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-amber-50/20 text-gray-900 flex flex-col font-sans">
        <SEOHead pageKey={activeView === '404' ? 'notFound' : activeView} />
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

        {/* Global Banner for Hackathon Context */}
        <div className="bg-amber-950 text-amber-200 text-xs py-1.5 px-4 text-center font-medium border-b border-amber-900/50 flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>KVIC Honey Mission × Smart India Hackathon 2026 Prototype</span>
        </div>

        {/* Header */}
        <header className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleNavigate('beekeeper')}
                className="flex items-center gap-3 text-left group focus:outline-none"
              >
                <div className="p-1.5 bg-white/10 rounded-xl group-hover:bg-white/20 transition">
                  <HoneycombLogo className="w-9 h-9" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight leading-none">Honey Chain</h1>
                    <span className="text-[10px] bg-amber-900/40 text-amber-100 font-bold px-2 py-0.5 rounded-full border border-amber-300/30 uppercase tracking-wide">
                      v1.0 Proof-of-Trust
                    </span>
                  </div>
                  <p className="text-xs text-amber-100 font-medium mt-0.5">
                    Blockchain Honey Traceability & Smart IoT Beekeeping
                  </p>
                </div>
              </button>

              <div className="hidden md:flex items-center gap-3 text-xs font-semibold">
                <div className="px-3 py-1.5 bg-black/15 backdrop-blur-xs rounded-lg border border-white/20 flex items-center gap-1.5">
                  <Hexagon className="w-3.5 h-3.5 text-yellow-300" />
                  <span>SHA-256 Ledger Active</span>
                </div>
                <div className="px-3 py-1.5 bg-black/15 backdrop-blur-xs rounded-lg border border-white/20">
                  KVIC Honey Mission
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        {activeView !== '404' && (
          <nav className="bg-white shadow-xs border-b border-amber-100 sticky top-0 z-20">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex gap-2">
                {views.map(view => {
                  const Icon = view.icon;
                  const isActive = activeView === view.id;
                  return (
                    <button
                      key={view.id}
                      onClick={() => handleNavigate(view.id)}
                      className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all border-b-2 cursor-pointer ${
                        isActive
                          ? 'text-amber-700 border-amber-600 bg-amber-50/70'
                          : 'text-gray-600 border-transparent hover:text-amber-700 hover:bg-amber-50/30'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-gray-400'}`} />
                      {view.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        )}

        {/* Breadcrumb Hierarchy */}
        {activeView !== '404' && <Breadcrumbs items={getBreadcrumbItems()} />}

        {/* Main View Router */}
        <main className="flex-1">
          <ErrorBoundary>
            {activeView === 'beekeeper' && <BeekeeperDashboard onNavigate={handleNavigate} />}
            {activeView === 'consumer' && (
              <ConsumerVerification
                initialBatchId={selectedBatchId}
                onNavigate={handleNavigate}
              />
            )}
            {activeView === 'admin' && <AdminDashboard onNavigate={handleNavigate} />}
            {activeView === '404' && <NotFound onNavigate={handleNavigate} />}
          </ErrorBoundary>
        </main>

        {/* Honey Bee Themed Footer */}
        <footer className="bg-stone-900 text-amber-100/90 py-12 mt-16 border-t-4 border-amber-500">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Brand & Purpose */}
              <div className="md:col-span-1">
                <div className="flex items-center gap-2.5 mb-3">
                  <HoneycombLogo className="w-7 h-7" />
                  <span className="text-xl font-black text-amber-400 tracking-tight">Honey Chain</span>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Decentralized provenance protocol connecting Indian rural beekeepers with conscious consumers through cryptographic proof of origin and IoT hive telemetry.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-amber-500 font-semibold">
                  <span>🐝 Protected by Honey Chain SHA-256</span>
                </div>
              </div>

              {/* Internal Quick Links */}
              <div>
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Platform Navigation</h3>
                <ul className="text-xs space-y-2 text-stone-300">
                  <li>
                    <button
                      onClick={() => handleNavigate('beekeeper')}
                      className="hover:text-amber-400 transition"
                    >
                      • Beekeeper Dashboard
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavigate('consumer')}
                      className="hover:text-amber-400 transition"
                    >
                      • Consumer QR Verification
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavigate('admin')}
                      className="hover:text-amber-400 transition"
                    >
                      • KVIC Admin Analytics
                    </button>
                  </li>
                </ul>
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
            </div>

            <div className="border-t border-stone-800 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-stone-500 gap-4">
              <p>© 2026 Honey Chain — Khadi and Village Industries Commission (KVIC) Partner Prototype</p>
              <p className="flex items-center gap-2">
                <span>Built for Smart India Hackathon 2026</span>
                <span>•</span>
                <span className="text-amber-500 font-medium">Domain: honeychain.in</span>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
