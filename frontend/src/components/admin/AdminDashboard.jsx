import { useState } from 'react';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Users, Package, AlertTriangle, TrendingUp, MapPin, Activity, Shield, Cpu, Plus, Trash2, Edit2, Check, X, CalendarDays, Award, KeyRound, Copy } from 'lucide-react';
import { honeyChain } from '../../utils/blockchain';
import { getNextBeekeeperId, loadBeekeepers, saveBeekeepers } from '../../utils/beekeepers';
import { getBatchLabStatus, getCertificateForBatch, issueLabCertificate, isLabCertified } from '../../utils/labCertificates';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';

const getTodayInputDate = () => new Date().toISOString().slice(0, 10);
const createDefaultFormData = () => ({
  name: '',
  state: '',
  district: '',
  place: '',
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

export default function AdminDashboard() {
  const [beekeepers, setBeekeepers] = useState(loadBeekeepers());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(createDefaultFormData());
  const [formErrors, setFormErrors] = useState({});
  const [, forceLabRefresh] = useState(0);
  const [, forceLedgerRefresh] = useState(0);

  const allBatches = honeyChain.getAllBatches();
  const chainValidation = honeyChain.isChainValid();

  // Aggregate stats
  const totalBatches = allBatches.length;
  const totalQuantity = allBatches.reduce((sum, block) => sum + (block.data.quantity || 0), 0);
  const labTestedCount = allBatches.filter(block => isLabCertified(block)).length;
  const totalBeekeepers = beekeepers.length;

  // State-wise production leaderboard (ranked by total harvest volume)
  const stateLeaderboard = beekeepers.reduce((acc, bk) => {
    const state = bk.location.split(',').pop()?.trim() || 'Unknown State';
    const bkBatches = honeyChain.getBatchesByBeekeeper(bk.id);
    const quantity = bkBatches.reduce((sum, block) => sum + (block.data.quantity || 0), 0);

    if (!acc[state]) {
      acc[state] = { state, quantity: 0, batches: 0, beekeepers: 0 };
    }
    acc[state].quantity += quantity;
    acc[state].batches += bkBatches.length;
    acc[state].beekeepers += 1;
    return acc;
  }, {});
  const stateLeaderboardList = Object.values(stateLeaderboard).sort((a, b) => b.quantity - a.quantity);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Lab Certificate code copied to clipboard');
    } catch {
      toast.info(`Lab Certificate code: ${text}`);
    }
  };

  const handleIssueLabCode = async (block) => {
    try {
      await api.batches.approve(block.data.batchId);
    } catch {
      // fallback
    }
    const result = issueLabCertificate(block.data.batchId, block.data.beekeeperId, block.data.beekeeper);
    if (result.ok) {
      forceLabRefresh(v => v + 1);
      toast.success(`Lab Certificate Verification Code issued: ${result.code}`);
    } else {
      toast.error(result.error);
    }
  };

  const handleDeleteBeekeeper = async (bk) => {
    if (!confirm(`Are you sure you want to delete "${bk.name}" and all their batches?`)) return;

    try {
      await api.beekeepers.delete(bk.id);
    } catch {
      // fallback
    }

    const result = honeyChain.deleteBeekeeper(bk.id);
    if (result) {
      const updated = loadBeekeepers();
      setBeekeepers(updated);
      toast.success(`Deleted ${bk.name} and all associated batches`);
    } else {
      toast.error('Failed to delete beekeeper');
    }
  };

  const handleResetChain = async () => {
    try {
      await api.batches.restoreDemo();
    } catch {
      // fallback
    }
    honeyChain.resetChain();
    setBeekeepers(loadBeekeepers());
    forceLedgerRefresh(v => v + 1);
    forceLabRefresh(v => v + 1);
    toast.success('Blockchain ledger reset to genesis block!');
  };

  const handleAddBeekeeper = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a beekeeper name');
      return;
    }
    if (/[^a-zA-Z\s]/.test(formData.name)) {
      toast.error('Beekeeper name must contain only alphabets and spaces');
      return;
    }
    if (!formData.state.trim() || !formData.district.trim() || !formData.place.trim()) {
      toast.error('Please fill in State, District, and Place');
      return;
    }

    const hiveList = formData.hives ? formData.hives.split(',').map(h => h.trim()).filter(Boolean) : [];
    const invalidHive = hiveList.find(h => !/^HIVE\d{3}$/.test(h));
    if (invalidHive) {
      toast.error(`Invalid Hive ID "${invalidHive}". Use format HIVE001-HIVE999.`);
      return;
    }

    const location = `${formData.place.trim()}, ${formData.district.trim()}, ${formData.state.trim()}`;

    const newId = getNextBeekeeperId(beekeepers);
    const newBeekeeper = {
      id: newId,
      name: formData.name.trim(),
      location,
      hives: formData.hives ? formData.hives.split(',').map(h => h.trim()).filter(Boolean) : [],
      registrationDate: formData.registrationDate || getTodayInputDate(),
      totalBatches: 0,
      rating: Math.min(parseFloat(formData.rating) || 4.5, 5),
    };

    try {
      await api.beekeepers.create({
        name: newBeekeeper.name,
        location: newBeekeeper.location,
        hives: newBeekeeper.hives,
        rating: newBeekeeper.rating,
        registrationDate: newBeekeeper.registrationDate,
      });
    } catch {
      // fallback
    }

    const updated = [...beekeepers, newBeekeeper];
    saveBeekeepers(updated);
    setBeekeepers(updated);
    setFormData(createDefaultFormData());
    setShowAddForm(false);
    toast.success(`Added ${newBeekeeper.name}`);
  };

  const handleEditBeekeeper = (bk) => {
    setEditingId(bk.id);
    const locParts = bk.location.split(',').map(s => s.trim());
    setFormData({
      name: bk.name,
      state: locParts[2] || '',
      district: locParts[1] || '',
      place: locParts[0] || '',
      hives: bk.hives.join(', '),
      rating: bk.rating,
      registrationDate: bk.registrationDate || getTodayInputDate(),
    });
  };

  const handleSaveEdit = async (bk) => {
    if (!formData.name.trim()) {
      toast.error('Please enter a beekeeper name');
      return;
    }
    if (/[^a-zA-Z\s]/.test(formData.name)) {
      toast.error('Beekeeper name must contain only alphabets and spaces');
      return;
    }
    if (!formData.state.trim() || !formData.district.trim() || !formData.place.trim()) {
      toast.error('Please fill in State, District, and Place');
      return;
    }

    const hiveList = formData.hives ? formData.hives.split(',').map(h => h.trim()).filter(Boolean) : [];
    const invalidHive = hiveList.find(h => !/^HIVE\d{3}$/.test(h));
    if (invalidHive) {
      toast.error(`Invalid Hive ID "${invalidHive}". Use format HIVE001-HIVE999.`);
      return;
    }

    const location = `${formData.place.trim()}, ${formData.district.trim()}, ${formData.state.trim()}`;

    try {
      await api.beekeepers.update(bk.id, {
        name: formData.name.trim(),
        location,
        hives: hiveList,
        rating: Math.min(parseFloat(formData.rating) || 4.5, 5),
        registrationDate: formData.registrationDate || getTodayInputDate(),
      });
    } catch {
      // fallback
    }

    const updated = beekeepers.map(b => {
      if (b.id === bk.id) {
        return {
          ...b,
          name: formData.name.trim(),
          location,
          hives: formData.hives ? formData.hives.split(',').map(h => h.trim()).filter(Boolean) : [],
          registrationDate: formData.registrationDate || getTodayInputDate(),
          rating: Math.min(parseFloat(formData.rating) || 4.5, 5),
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
            Real-time analytics across state beekeeper clusters, honey yield volumes, blockchain ledger health, and lab certification workflow.
          </p>
        </div>

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
          {/* State-wise Production Leaderboard */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-amber-600" />
              <h2 className="text-lg font-bold text-gray-900">State-wise Production Leaderboard</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">Top honey-producing states ranked by total harvest volume</p>
            {stateLeaderboardList.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stateLeaderboardList} layout="vertical" margin={{ top: 0, right: 32, left: 32, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${v} kg`} tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} />
                  <YAxis type="category" dataKey="state" width={100} tick={{ fontSize: 11, fill: '#44403c' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(1)} kg`, 'Harvest Volume']}
                    labelFormatter={(label) => {
                      const entry = stateLeaderboardList.find(e => e.state === label);
                      return entry ? `${label} · ${entry.batches} batch${entry.batches === 1 ? '' : 'es'} · ${entry.beekeepers} beekeeper${entry.beekeepers === 1 ? '' : 's'}` : label;
                    }}
                  />
                  <Bar dataKey="quantity" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">No state data available</p>
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
                  placeholder="Beekeeper Name (alphabets only)"
                  value={formData.name}
                  onChange={e => {
                    const val = e.target.value;
                    if (/^[a-zA-Z\s]*$/.test(val)) {
                      setFormData({ ...formData, name: val });
                    }
                  }}
                  className="px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <select
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  className="px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="">Select State</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Haryana">Haryana</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Himachal Pradesh">Himachal Pradesh</option>
                  <option value="Uttarakhand">Uttarakhand</option>
                  <option value="Assam">Assam</option>
                  <option value="Meghalaya">Meghalaya</option>
                  <option value="Nagaland">Nagaland</option>
                  <option value="Manipur">Manipur</option>
                  <option value="Mizoram">Mizoram</option>
                  <option value="Tripura">Tripura</option>
                  <option value="Odisha">Odisha</option>
                  <option value="Bihar">Bihar</option>
                  <option value="Jharkhand">Jharkhand</option>
                  <option value="Chhattisgarh">Chhattisgarh</option>
                  <option value="Goa">Goa</option>
                </select>
                <input
                  type="text"
                  placeholder="District (e.g. Bangalore)"
                  value={formData.district}
                  onChange={e => setFormData({ ...formData, district: e.target.value })}
                  className="px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <input
                  type="text"
                  placeholder="Place (e.g. Whitefield)"
                  value={formData.place}
                  onChange={e => setFormData({ ...formData, place: e.target.value })}
                  className="px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <input
                  type="text"
                  placeholder="IoT Hives (e.g. HIVE001, HIVE002)"
                  value={formData.hives}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({ ...formData, hives: val });
                    const hiveList = val.split(',').map(h => h.trim()).filter(Boolean);
                    const invalid = hiveList.some(h => !/^HIVE\d{3}$/.test(h));
                    if (invalid) {
                      setFormErrors(prev => ({ ...prev, hives: 'Invalid Hive ID. Use HIVE001-HIVE999.' }));
                    } else {
                      setFormErrors(prev => ({ ...prev, hives: '' }));
                    }
                  }}
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
                  placeholder="Rating (max 5)"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    if (isNaN(val)) {
                      setFormData({ ...formData, rating: '' });
                    } else {
                      setFormData({ ...formData, rating: Math.min(val, 5) });
                    }
                  }}
                  className="px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>
              {formErrors.hives && (
                <p className="text-xs text-red-600 mb-2">{formErrors.hives}</p>
              )}
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
                            onChange={e => {
                              const val = e.target.value;
                              if (/^[a-zA-Z\s]*$/.test(val)) {
                                setFormData({ ...formData, name: val });
                              }
                            }}
                            className="px-2 py-1 text-sm border border-amber-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400 w-full"
                          />
                        ) : (
                          bk.name
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          {bk.location}
                        </span>
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
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              if (isNaN(val)) {
                                setFormData({ ...formData, rating: '' });
                              } else {
                                setFormData({ ...formData, rating: Math.min(val, 5) });
                              }
                            }}
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

        {/* Lab Certification & Verification Center */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100 mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <h2 className="text-lg font-bold text-gray-900">Lab Certification & Verification Center</h2>
              </div>
              <p className="text-xs text-gray-500">
                Verify honey samples, approve batches, and issue secure Lab Certificate Verification Codes for beekeepers to apply on their registered batches.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-amber-50/50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Batch ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Beekeeper</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Hive</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Quantity</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Harvest Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Lab Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Issue Lab Certificate Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allBatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 text-sm">
                      No honey batches on the ledger yet.
                    </td>
                  </tr>
                ) : (
                  [...allBatches].reverse().map(block => {
                    const status = getBatchLabStatus(block);
                    const certificate = getCertificateForBatch(block.data.batchId);
                    return (
                      <tr key={block.data.batchId} className="hover:bg-amber-50/40 transition">
                        <td className="py-3 px-4 text-sm font-mono font-medium text-amber-700">{block.data.batchId}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{block.data.beekeeper}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{block.data.hiveId}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{block.data.quantity} kg</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(block.data.harvestDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                            status === 'certified'
                              ? 'bg-green-100 text-green-700'
                              : status === 'issued'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {status === 'certified'
                              ? 'Lab Verified'
                              : status === 'issued'
                                ? 'Code Issued'
                                : 'Pending Approval'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {status === 'pending' && (
                            <button
                              onClick={() => handleIssueLabCode(block)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition shadow-sm"
                            >
                              <Shield className="w-3.5 h-3.5" />
                              Verify & Issue Lab Code
                            </button>
                          )}
                          {status === 'issued' && certificate && (
                            <div className="flex items-center gap-2">
                              <code className="px-2 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs font-mono font-semibold text-blue-800">
                                {certificate.code}
                              </code>
                              <button
                                onClick={() => copyToClipboard(certificate.code)}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                                title="Copy code to share with beekeeper"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copy
                              </button>
                            </div>
                          )}
                          {status === 'certified' && (
                            <span className="text-xs text-green-700 font-medium">✓ Certificate applied by beekeeper</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
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
      </div>
    </div>
  );
}
