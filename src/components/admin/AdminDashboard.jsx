import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Package, AlertTriangle, TrendingUp, MapPin, Activity, Shield, Zap, ShieldAlert, Cpu, Plus, Trash2, Edit2, Check, X, CalendarDays } from 'lucide-react';
import { honeyChain } from '../../utils/blockchain';
import { getNextBeekeeperId, loadBeekeepers, saveBeekeepers } from '../../utils/beekeepers';
import { simulateBlockchainAttack, getBlockchainHealthReport, demoAttackScenarios, resetBlockchainAfterAttack } from '../../utils/attackDemo';
import toast from 'react-hot-toast';

const getTodayInputDate = () => new Date().toISOString().slice(0, 10);
const createDefaultFormData = () => ({
  name: '',
  location: '',
  hives: '',
  rating: '',
  registrationDate: getTodayInputDate(),
});

function formatClusterDate(dateValue) {
  if (!dateValue) return 'Date not recorded';

  const parsedDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return 'Date not recorded';

  return parsedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminDashboard({ onNavigate }) {
  const [showSecurityDemo, setShowSecurityDemo] = useState(false);
  const [attackResult, setAttackResult] = useState(null);
  const [beekeepers, setBeekeepers] = useState(loadBeekeepers());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(createDefaultFormData());
  const [, setChainStatusVersion] = useState(0);

  const allBatches = honeyChain.getAllBatches();
  const chainValidation = honeyChain.isChainValid();

  // Aggregate stats
  const totalBatches = allBatches.length;
  const totalQuantity = allBatches.reduce((sum, block) => sum + (block.data.quantity || 0), 0);
  const labTestedCount = allBatches.filter(block => block.data.labTested).length;
  const totalBeekeepers = beekeepers.length;

  // Regional distribution
  const regionData = beekeepers.map(bk => ({
    name: bk.location.split(',')[1]?.trim() || bk.location,
    batches: honeyChain.getBatchesByBeekeeper(bk.id).length,
    beekeeper: bk.name,
  }));

  const handleDeleteBeekeeper = (bk) => {
    if (!confirm(`Are you sure you want to delete "${bk.name}" and all their batches?`)) return;

    const result = honeyChain.deleteBeekeeper(bk.id);
    if (result) {
      const updated = loadBeekeepers();
      setBeekeepers(updated);
      toast.success(`Deleted ${bk.name} and all associated batches`);
    } else {
      toast.error('Failed to delete beekeeper');
    }
  };

  const handleAddBeekeeper = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a beekeeper name');
      return;
    }
    if (!formData.location.trim()) {
      toast.error('Please enter a location');
      return;
    }

    const newId = getNextBeekeeperId(beekeepers);
    const newBeekeeper = {
      id: newId,
      name: formData.name.trim(),
      location: formData.location.trim(),
      hives: formData.hives ? formData.hives.split(',').map(h => h.trim()).filter(Boolean) : [],
      registrationDate: formData.registrationDate || getTodayInputDate(),
      totalBatches: 0,
      rating: parseFloat(formData.rating) || 4.5,
    };

    const updated = [...beekeepers, newBeekeeper];
    saveBeekeepers(updated);
    setBeekeepers(updated);
    setFormData(createDefaultFormData());
    setShowAddForm(false);
    toast.success(`Added ${newBeekeeper.name}`);
  };

  const handleEditBeekeeper = (bk) => {
    setEditingId(bk.id);
    setFormData({
      name: bk.name,
      location: bk.location,
      hives: bk.hives.join(', '),
      rating: bk.rating,
      registrationDate: bk.registrationDate || getTodayInputDate(),
    });
  };

  const handleSaveEdit = (bk) => {
    if (!formData.name.trim()) {
      toast.error('Please enter a beekeeper name');
      return;
    }
    if (!formData.location.trim()) {
      toast.error('Please enter a location');
      return;
    }

    const updated = beekeepers.map(b => {
      if (b.id === bk.id) {
        return {
          ...b,
          name: formData.name.trim(),
          location: formData.location.trim(),
          hives: formData.hives ? formData.hives.split(',').map(h => h.trim()).filter(Boolean) : [],
          registrationDate: formData.registrationDate || getTodayInputDate(),
          rating: parseFloat(formData.rating) || 4.5,
        };
      }
      return b;
    });
    saveBeekeepers(updated);
    setBeekeepers(updated);
    setEditingId(null);
    setFormData(createDefaultFormData());
    toast.success(`Updated ${bk.name}`);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(createDefaultFormData());
  };

  // Floral source distribution
  const floralDistribution = allBatches.reduce((acc, block) => {
    const source = block.data.floralSource;
    if (!acc[source]) acc[source] = 0;
    acc[source]++;
    return acc;
  }, {});

  const floralData = Object.entries(floralDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  // Recent activity mirrors the beekeeper cluster registry.
  const recentClusterRegistrations = [...beekeepers].reverse().slice(0, 5);

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  const handleAttack = (attackType) => {
    const result = simulateBlockchainAttack(attackType);
    setAttackResult(result);
    setChainStatusVersion(version => version + 1);

    if (result.success) {
      toast.error(`🚨 Attack Simulated: ${result.attackType}`);
    } else {
      toast.error(result.message);
    }
  };

  const handleResetChain = () => {
    const result = resetBlockchainAfterAttack();
    setAttackResult(null);
    setChainStatusVersion(version => version + 1);
    toast.success(result.message);
  };

  const healthReport = getBlockchainHealthReport();

  return (
    <div className="min-h-screen bg-amber-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Unique Page Heading */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-1">
            <Shield className="w-4 h-4" />
            <span>National Honey Board & KVIC Surveillance</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            KVIC Honey Mission Control Center
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time analytics across regional beekeeper clusters, honey yield volumes, and blockchain ledger health.
          </p>
        </div>

        {/* Quick Nav Shortcuts */}
        {onNavigate && (
          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm bg-white p-3.5 rounded-xl border border-amber-100 shadow-sm">
            <span className="text-gray-500 font-medium">Quick Navigate:</span>
            <button
              onClick={() => onNavigate('beekeeper')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-900 rounded-lg hover:bg-amber-100 font-medium transition border border-amber-200 text-xs"
            >
              ← Beekeeper Portal
            </button>
            <button
              onClick={() => onNavigate('consumer')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-900 rounded-lg hover:bg-amber-100 font-medium transition border border-amber-200 text-xs"
            >
              Consumer QR Verification →
            </button>
          </div>
        )}

        {/* Chain Status Alert */}
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border shadow-sm ${
          chainValidation.valid
            ? 'bg-green-50/90 border-green-200'
            : 'bg-red-50/90 border-red-200'
        }`}>
          {chainValidation.valid ? (
            <>
              <Activity className="w-6 h-6 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-900">Blockchain Ledger Operational & Healthy</p>
                <p className="text-xs text-green-700">All {honeyChain.chain.length} blocks verified cryptographically with zero hash mismatches.</p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Ledger Integrity Compromised</p>
                <p className="text-xs text-red-700">
                  Tampering detected at block #{chainValidation.tamperedIndex}: {chainValidation.reason}
                </p>
              </div>
              <button
                onClick={handleResetChain}
                className="shrink-0 bg-red-600 text-white px-3.5 py-2 rounded-lg text-xs font-semibold hover:bg-red-700 transition"
              >
                Reset Ledger
              </button>
            </>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Harvest Batches</p>
              <Package className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{totalBatches}</p>
            <p className="text-xs text-green-700 mt-1 font-medium">100% on-chain registered</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Honey Volume</p>
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{totalQuantity.toFixed(1)} kg</p>
            <p className="text-xs text-gray-500 mt-1">Aggregated across all clusters</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Beekeepers</p>
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{totalBeekeepers}</p>
            <p className="text-xs text-gray-500 mt-1">KVIC certified clusters</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Lab Tested Compliance</p>
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900">
              {totalBatches > 0 ? Math.round((labTestedCount / totalBatches) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">{labTestedCount} of {totalBatches} batches certified</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Regional Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Regional Production Distribution</h2>
            <p className="text-xs text-gray-500 mb-4">Harvest batch counts by geographic cluster</p>
            {regionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={regionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="batches" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">No data available</p>
            )}
          </div>

          {/* Floral Source Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Floral Source Varietals</h2>
            <p className="text-xs text-gray-500 mb-4">Botanical classification breakdown of verified batches</p>
            {floralData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={floralData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={95}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {floralData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">No data available</p>
            )}
          </div>
        </div>

        {/* Beekeeper Clusters */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100 mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">KVIC Beekeeper Apiary Clusters</h2>
              <p className="text-xs text-gray-500">Active producer registry with cluster telemetry overview</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Beekeeper
            </button>
          </div>
          {/* Add / Edit Form Modal */}
          {showAddForm && (
            <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-xl">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                {editingId ? 'Edit Beekeeper' : 'Add New Beekeeper'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Beekeeper Name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <input
                  type="text"
                  placeholder="Apiary Location (e.g. Sundarbans, West Bengal)"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <input
                  type="text"
                  placeholder="IoT Hives (comma separated, e.g. HIVE001, HIVE002)"
                  value={formData.hives}
                  onChange={e => setFormData({ ...formData, hives: e.target.value })}
                  className="px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <input
                  type="date"
                  value={formData.registrationDate}
                  onChange={e => setFormData({ ...formData, registrationDate: e.target.value })}
                  className="px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  aria-label="Registration Date"
                />
                <input
                  type="number"
                  placeholder="Rating (e.g. 4.5)"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={e => setFormData({ ...formData, rating: e.target.value })}
                  className="px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={editingId ? () => handleSaveEdit(beekeepers.find(b => b.id === editingId)) : handleAddBeekeeper}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  {editingId ? 'Save Changes' : 'Add Beekeeper'}
                </button>
                <button
                  onClick={editingId ? handleCancelEdit : () => { setShowAddForm(false); setFormData(createDefaultFormData()); }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-amber-50/50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Beekeeper Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Apiary Location</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">IoT Hives</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Batches</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Rating</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {beekeepers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400 text-sm">
                      No beekeepers registered. Click <strong>"Add Beekeeper"</strong> to add your own.
                    </td>
                  </tr>
                ) : (
                  beekeepers.map((bk) => {
                  const bkBatches = honeyChain.getBatchesByBeekeeper(bk.id).length;
                  const isEditing = editingId === bk.id;
                  return (
                    <tr key={bk.id} className="hover:bg-amber-50/40 transition">
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="px-2 py-1 text-sm border border-amber-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400 w-full"
                          />
                        ) : (
                          bk.name
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-600" />
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            className="px-2 py-1 text-sm border border-amber-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400 w-full"
                          />
                        ) : (
                          bk.location
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.hives}
                            onChange={e => setFormData({ ...formData, hives: e.target.value })}
                            className="px-2 py-1 text-sm border border-amber-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400 w-full"
                          />
                        ) : (
                          bk.hives.length > 0 ? bk.hives.join(', ') : '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {isEditing ? (
                          <input
                            type="date"
                            value={formData.registrationDate}
                            onChange={e => setFormData({ ...formData, registrationDate: e.target.value })}
                            className="px-2 py-1 text-sm border border-amber-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400 w-full"
                          />
                        ) : (
                          formatClusterDate(bk.registrationDate)
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">{bkBatches}</td>
                      <td className="py-3 px-4 text-sm">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            value={formData.rating}
                            onChange={e => setFormData({ ...formData, rating: e.target.value })}
                            className="px-2 py-1 text-sm border border-amber-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400 w-20"
                          />
                        ) : (
                          <span className="text-amber-700 font-semibold">★ {bk.rating}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                          Active Certified
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditBeekeeper(bk)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBeekeeper(bk)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity - Live Blockchain Transaction Stream */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Live Blockchain Transaction Stream</h2>
          <p className="text-xs text-gray-500 mb-4">Latest beekeeper cluster records added through the KVIC registry</p>
          {recentClusterRegistrations.length > 0 ? (
            <div className="space-y-3">
              {recentClusterRegistrations.map(bk => {
                const bkBatches = honeyChain.getBatchesByBeekeeper(bk.id).length;

                return (
                  <div key={bk.id} className="flex items-center gap-4 p-4 bg-amber-50/30 rounded-xl border border-amber-100 hover:bg-amber-50/60 transition">
                    <Users className="w-10 h-10 text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">Cluster {bk.id} Registered</p>
                      <p className="text-sm text-gray-600">
                        Registered <span className="font-medium text-amber-800">{bk.hives.length}</span> IoT hive{bk.hives.length === 1 ? '' : 's'} in <span className="font-medium">{bk.location}</span>
                      </p>
                      <p className="text-xs text-gray-400 font-mono truncate">{bk.id} | {bk.hives.length > 0 ? bk.hives.join(', ') : 'No hives configured'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                        <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
                        {formatClusterDate(bk.registrationDate)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{bkBatches} batch{bkBatches === 1 ? '' : 'es'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No beekeeper cluster records yet</p>
          )}
        </div>

        {/* Scalable Deployment Framework */}
        <div className="bg-gradient-to-br from-amber-500/10 via-yellow-500/10 to-orange-500/10 p-6 rounded-2xl shadow-sm border border-amber-200 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-5 h-5 text-amber-700" />
            <h2 className="text-lg font-bold text-gray-900">KVIC Rural Scalability & Deployment Framework</h2>
          </div>
          <p className="text-xs text-gray-600 mb-6">Architectural roadmap for rolling out Honey Chain across 10,000+ beekeeper clusters nationwide.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="bg-white/80 p-4 rounded-xl border border-amber-100 shadow-xs">
              <p className="font-bold text-amber-900 mb-2">1. Permissioned Network</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                <li>Hyperledger Fabric consortium nodes</li>
                <li>State channels for high-throughput batching</li>
                <li>IPFS storage for KVIC lab certificates</li>
              </ul>
            </div>
            <div className="bg-white/80 p-4 rounded-xl border border-amber-100 shadow-xs">
              <p className="font-bold text-amber-900 mb-2">2. Low-Cost IoT Hive Nodes</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                <li>ESP32 + DHT22/HX711 (~₹2,000/hive)</li>
                <li>LoRaWAN long-range rural backhaul</li>
                <li>Edge ML for on-device swarming alerts</li>
              </ul>
            </div>
            <div className="bg-white/80 p-4 rounded-xl border border-amber-100 shadow-xs">
              <p className="font-bold text-amber-900 mb-2">3. National Cluster Scaling</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                <li>10,000+ rural beekeepers onboarded</li>
                <li>1,000,000+ batches/year throughput</li>
                <li>State-level KVIC inspection nodes</li>
              </ul>
            </div>
            <div className="bg-white/80 p-4 rounded-xl border border-amber-100 shadow-xs">
              <p className="font-bold text-amber-900 mb-2">4. Grassroots Onboarding</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                <li>KVIC cluster training programs</li>
                <li>SMS / IVR feature phone telemetry</li>
                <li>Tamper-evident QR jar label distribution</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Security Demo Section */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-2xl shadow-sm border border-red-200">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-red-600 shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-red-900">Security Demo: Cryptographic Attack Simulation</h2>
                <p className="text-xs text-red-700">Demonstrate blockchain tamper resistance for evaluation judges</p>
              </div>
            </div>
            <button
              onClick={() => setShowSecurityDemo(!showSecurityDemo)}
              className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition shadow-sm"
            >
              {showSecurityDemo ? 'Hide Simulation Panel' : 'Launch Simulation Panel'}
            </button>
          </div>

          {showSecurityDemo && (
            <div className="space-y-6 mt-6">
              {/* Blockchain Health Status */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4 text-amber-600" />
                  Live Blockchain Integrity Health Report
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Total Blocks</p>
                    <p className="text-2xl font-bold text-gray-900">{healthReport.totalBlocks}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Total Batches</p>
                    <p className="text-2xl font-bold text-gray-900">{healthReport.totalBatches}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Chain Status</p>
                    <p className={`text-2xl font-bold ${healthReport.chainValid ? 'text-green-600' : 'text-red-600'}`}>
                      {healthReport.chainValid ? '✓ Intact' : '✗ Compromised'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Tampered Block</p>
                    <p className="text-2xl font-bold text-red-600">
                      {healthReport.tamperedBlock !== null ? `#${healthReport.tamperedBlock}` : 'None'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attack Scenarios */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 text-sm">Simulate Real-World Attack Scenarios</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {demoAttackScenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      className="bg-white p-5 rounded-xl border border-gray-200 hover:border-red-400 transition shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{scenario.icon}</span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                              scenario.severity === 'CRITICAL'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {scenario.severity}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm mb-1">{scenario.name}</h4>
                        <p className="text-xs text-gray-600 mb-4">{scenario.description}</p>
                      </div>
                      <button
                        onClick={() => handleAttack(scenario.id)}
                        className="w-full bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-red-700 transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Simulate Attack
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attack Result */}
              {attackResult && attackResult.success && (
                <div className="bg-red-100/80 border-2 border-red-400 p-5 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-red-900 mb-2">
                        🚨 Attack Simulated: {attackResult.attackType}
                      </h3>
                      <div className="space-y-1 text-xs text-red-800">
                        <p><strong>Action Executed:</strong> {attackResult.message}</p>
                        <p><strong>Target Block:</strong> #{attackResult.targetBlock}</p>
                        <p><strong>Target Batch ID:</strong> <span className="font-mono">{attackResult.batchId}</span></p>
                        <p className="bg-red-200/80 p-2 rounded-lg mt-2">
                          <strong>Cryptographic Detection:</strong> {attackResult.detection}
                        </p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3 items-center">
                        {onNavigate && (
                          <button
                            onClick={() => onNavigate('consumer', attackResult.batchId)}
                            className="bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-800 transition"
                          >
                            Test Tampered Batch in Consumer View →
                          </button>
                        )}
                        <button
                          onClick={handleResetChain}
                          className="bg-green-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition"
                        >
                          Reset Blockchain to Valid State
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
