import { Home, Search, ArrowLeft, Hexagon } from 'lucide-react';
import HoneycombLogo from './HoneycombLogo';

export default function NotFound({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* Honeycomb Pattern Background */}
        <div className="relative mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Hexagon className="w-16 h-16 text-amber-300 opacity-50" />
            <HoneycombLogo className="w-24 h-24 text-amber-500" />
            <Hexagon className="w-16 h-16 text-amber-300 opacity-50" />
          </div>

          {/* 404 Number */}
          <h1 className="text-9xl font-black text-amber-600 mb-4 tracking-tight">
            404
          </h1>

          <div className="inline-block px-6 py-2 bg-amber-100 rounded-full mb-6">
            <p className="text-amber-800 font-semibold">Oops! Lost in the Hive</p>
          </div>
        </div>

        {/* Message */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            This Honeycomb Doesn't Exist
          </h2>
          <p className="text-gray-600 mb-6">
            The page you're looking for might have been moved, deleted, or never existed.
            Let's get you back to tracking authentic honey!
          </p>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => onNavigate('beekeeper')}
              className="flex flex-col items-center gap-3 p-6 bg-amber-50 rounded-xl hover:bg-amber-100 transition border-2 border-amber-200 hover:border-amber-400"
            >
              <Home className="w-8 h-8 text-amber-600" />
              <div>
                <p className="font-semibold text-gray-900">Beekeeper</p>
                <p className="text-xs text-gray-600">Register batches</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('consumer')}
              className="flex flex-col items-center gap-3 p-6 bg-green-50 rounded-xl hover:bg-green-100 transition border-2 border-green-200 hover:border-green-400"
            >
              <Search className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-semibold text-gray-900">Consumer</p>
                <p className="text-xs text-gray-600">Verify honey</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('admin')}
              className="flex flex-col items-center gap-3 p-6 bg-blue-50 rounded-xl hover:bg-blue-100 transition border-2 border-blue-200 hover:border-blue-400"
            >
              <Hexagon className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-semibold text-gray-900">Admin</p>
                <p className="text-xs text-gray-600">KVIC Dashboard</p>
              </div>
            </button>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-800 font-semibold transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Go Back
        </button>

        {/* Bee Animation */}
        <div className="mt-8 text-4xl animate-bounce">
          🐝
        </div>
      </div>
    </div>
  );
}
