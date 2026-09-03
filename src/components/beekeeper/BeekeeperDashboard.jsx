import { useState } from 'react';
import { Package, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, Shield, BarChart3, Sparkles, Trash2 } from 'lucide-react';
import { honeyChain } from '../../utils/blockchain';
import { generateSensorData, detectAlerts, predictYield, floralSources } from '../../utils/mockData';
import { loadBeekeepers } from '../../utils/beekeepers';
import { sanitizeString } from '../../utils/validation';
import SensorChart from '../SensorChart';
import toast from 'react-hot-toast';

export default function BeekeeperDashboard({ onNavigate }) {
  const [beekeepers] = useState(() => loadBeekeepers());
  const [selectedBeekeeper, setSelectedBeekeeper] = useState(() => beekeepers[0] || null);
  const [batches, setBatches] = useState(() =>
    beekeepers[0] ? honeyChain.getBatchesByBeekeeper(beekeepers[0].id) : []
  );
  const [selectedHive, setSelectedHive] = useState(() => beekeepers[0]?.hives[0] || '');
  const [sensorData, setSensorData] = useState(() =>
    beekeepers[0]?.hives[0] ? generateSensorData(7, beekeepers[0].hives[0]) : []
  );
  const [alerts, setAlerts] = useState(() => (sensorData.length > 0 ? detectAlerts(sensorData) : []));
  const [prediction, setPrediction] = useState(() => (sensorData.length > 0 ? predictYield(sensorData) : null));
  const [showBatchForm, setShowBatchForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    quantity: '',
    floralSource: floralSources[0],
    labTested: false,
    notes: '',
  });

  const handleBeekeeperChange = (beekeeperId) => {
    const beekeeper = beekeepers.find(b => b.id === beekeeperId);
    if (!beekeeper) return;

    const nextHive = beekeeper.hives[0] || '';

    setSelectedBeekeeper(beekeeper);
    setBatches(honeyChain.getBatchesByBeekeeper(beekeeperId));
    setSelectedHive(nextHive);

    if (!nextHive) {
      setSensorData([]);
      setAlerts([]);
      setPrediction(null);
      return;
    }

    const newSensorData = generateSensorData(7, nextHive);
    setSensorData(newSensorData);
    setAlerts(detectAlerts(newSensorData));
    setPrediction(predictYield(newSensorData));
  };

  const handleHiveChange = (hiveId) => {
    setSelectedHive(hiveId);
    const newSensorData = generateSensorData(7, hiveId);
    setSensorData(newSensorData);
    setAlerts(detectAlerts(newSensorData));
    setPrediction(predictYield(newSensorData));
  };

  const handleRegisterBatch = (e) => {
    e.preventDefault();

    if (!selectedBeekeeper) {
      toast.error('Add a beekeeper profile before registering a batch');
      return;
    }

    if (!selectedHive) {
      toast.error('Add at least one hive before registering a batch');
      return;
    }

    // Validate quantity
    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0 || quantity > 1000) {
      toast.error('Please enter a valid quantity (0-1000 kg)');
      return;
    }

    // Validate notes length
    if (formData.notes && formData.notes.length > 500) {
      toast.error('Notes too long (max 500 characters)');
      return;
    }

    const batchId = `HB-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const batchData = {
      type: 'honey_batch',
      batchId,
      beekeeperId: selectedBeekeeper.id,
      beekeeper: sanitizeString(selectedBeekeeper.name),
      hiveId: selectedHive,
      quantity: quantity,
      floralSource: sanitizeString(formData.floralSource),
      location: sanitizeString(selectedBeekeeper.location),
      harvestDate: new Date().toISOString(),
      labTested: formData.labTested,
      notes: sanitizeString(formData.notes),
      status: 'registered',
    };

    try {
      honeyChain.addBlock(batchData);
      setBatches(honeyChain.getBatchesByBeekeeper(selectedBeekeeper.id));
      toast.success(`Batch ${batchId} registered on blockchain!`);

      setFormData({
        quantity: '',
        floralSource: floralSources[0],
        labTested: false,
        notes: '',
      });
      setShowBatchForm(false);
    } catch (error) {
      toast.error(`Failed to register batch: ${error.message}`);
      console.error('Batch registration error:', error);
    }
  };

  const handleDeleteBatch = (batchId) => {
    if (!confirm(`Delete honey batch ${batchId}? This removes it from the local blockchain demo.`)) return;

    const deleted = honeyChain.deleteBatch(batchId);
    if (!deleted) {
      toast.error('Failed to delete batch');
      return;
    }

    setBatches(honeyChain.getBatchesByBeekeeper(selectedBeekeeper.id));
    toast.success(`Deleted batch ${batchId}`);
  };

  if (!selectedBeekeeper) {
    return (
      <div className="min-h-screen bg-amber-50/30 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-1">
              <Sparkles className="w-4 h-4" />
              <span>KVIC Honey Mission Partner Portal</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Smart Beekeeper Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Add a beekeeper profile in the KVIC admin dashboard to start registering honey batches.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-amber-100">
            <div className="max-w-2xl">
              <Package className="w-12 h-12 text-amber-500 mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">No Beekeeper Profiles Found</h2>
              <p className="text-sm text-gray-600 mb-5">
                The registry is empty. Create a beekeeper profile with a location and hive IDs before using the partner portal.
              </p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="inline-flex items-center gap-2 bg-amber-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-amber-700 transition shadow-sm"
                >
                  <BarChart3 className="w-4 h-4" />
                  Open KVIC Admin
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasHive = selectedBeekeeper.hives.length > 0;

  return (
    <div className="min-h-screen bg-amber-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Unique Page Heading */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-1">
            <Sparkles className="w-4 h-4" />
            <span>KVIC Honey Mission Partner Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Smart Beekeeper Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Manage honey harvest batches on SHA-256 blockchain and monitor real-time IoT hive telemetry.
          </p>
        </div>

        {/* Beekeeper Selector & Context Bar */}
        <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-amber-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <label className="block text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
              Active Beekeeper Profile
            </label>
            <select
              value={selectedBeekeeper.id}
              onChange={(e) => handleBeekeeperChange(e.target.value)}
              className="w-full md:w-72 px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/50 font-medium text-gray-900"
            >
              {beekeepers.map(bk => (
                <option key={bk.id} value={bk.id}>
                  {bk.name} — {bk.location}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Nav Shortcuts */}
          {onNavigate && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-500 hidden sm:inline">Jump to:</span>
              <button
                onClick={() => onNavigate('consumer')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100 transition font-medium border border-amber-200"
              >
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                Consumer Verification
              </button>
              <button
                onClick={() => onNavigate('admin')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100 transition font-medium border border-amber-200"
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                KVIC Analytics
              </button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100 rounded-bl-full -mr-6 -mt-6 opacity-40"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Registered Batches</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{batches.length}</p>
                <p className="text-xs text-amber-700 mt-1 font-medium">Secured on Blockchain</p>
              </div>
              <Package className="w-12 h-12 text-amber-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-100 rounded-bl-full -mr-6 -mt-6 opacity-40"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active IoT Hives</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{selectedBeekeeper.hives.length}</p>
                <p className="text-xs text-green-700 mt-1 font-medium">Telemetry Connected</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-100 rounded-bl-full -mr-6 -mt-6 opacity-40"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Quality Rating</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">★ {selectedBeekeeper.rating}</p>
                <p className="text-xs text-yellow-700 mt-1 font-medium">KVIC Verified Quality</p>
              </div>
              <CheckCircle className="w-12 h-12 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Register Batch Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowBatchForm(!showBatchForm)}
            disabled={!hasHive}
            className="bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-amber-700 hover:to-yellow-700 transition shadow-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {showBatchForm ? 'Cancel' : '+ Register New Honey Batch'}
          </button>
          {!hasHive && (
            <p className="text-sm text-amber-800 mt-2">
              Add at least one hive ID to this beekeeper profile before registering a batch.
            </p>
          )}
        </div>

        {/* Batch Registration Form */}
        {showBatchForm && hasHive && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-200 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Register Honey Batch on Ledger</h2>
            <p className="text-sm text-gray-600 mb-4">Each batch receives an immutable SHA-256 block hash for consumer QR verification.</p>
            <form onSubmit={handleRegisterBatch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Harvest Hive ID</label>
                  <select
                    value={selectedHive}
                    onChange={(e) => handleHiveChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {selectedBeekeeper.hives.map(hive => (
                      <option key={hive} value={hive}>{hive}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Harvest Quantity (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. 15.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Floral Source</label>
                  <select
                    value={formData.floralSource}
                    onChange={(e) => setFormData({ ...formData, floralSource: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {floralSources.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="labTested"
                    checked={formData.labTested}
                    onChange={(e) => setFormData({ ...formData, labTested: e.target.checked })}
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <label htmlFor="labTested" className="ml-2 text-sm font-medium text-gray-700">
                    KVIC Lab Quality Tested
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Harvest Notes & Moisture Content</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows="3"
                  maxLength="500"
                  placeholder="Record moisture levels, pollen density, or specific apiary observations..."
                />
                <p className="text-xs text-gray-500 mt-1">{formData.notes.length}/500 characters</p>
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 text-white py-3 rounded-lg font-semibold hover:from-amber-700 hover:to-yellow-700 transition shadow-sm"
              >
                Sign & Mine to Honey Chain
              </button>
            </form>
          </div>
        )}

        {/* Hive Health Monitoring */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100 mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900">IoT Hive Health Telemetry{selectedHive ? ` — ${selectedHive}` : ''}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Real-time DHT22 + HX711 simulated sensor streams</p>
            </div>
            {hasHive && (
              <select
                value={selectedHive}
                onChange={(e) => handleHiveChange(e.target.value)}
                className="px-4 py-2 border border-amber-200 bg-amber-50/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-sm text-gray-800"
              >
                {selectedBeekeeper.hives.map(hive => (
                  <option key={hive} value={hive}>{hive}</option>
                ))}
              </select>
            )}
          </div>

          {/* Alerts */}
          {hasHive && alerts.length > 0 && (
            <div className="mb-6 space-y-2">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`flex items-start p-4 rounded-xl ${
                    alert.severity === 'high'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-amber-50 border border-amber-200'
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 mr-3 mt-0.5 shrink-0 ${
                      alert.severity === 'high' ? 'text-red-500' : 'text-amber-600'
                    }`}
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{alert.message}</p>
                    <p className="text-sm text-gray-600 mt-1">{alert.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasHive ? (
            <>
              {/* Sensor Charts */}
              <SensorChart data={sensorData} />

              {/* Yield Prediction */}
              {prediction && (
                <div className="mt-6 bg-gradient-to-br from-amber-500/10 via-yellow-500/10 to-orange-500/10 p-6 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <h3 className="text-lg font-bold text-gray-900">AI Yield Optimization & Harvest Forecast</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/70 p-4 rounded-lg border border-amber-100">
                      <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Estimated Next Harvest Yield</p>
                      <p className="text-3xl font-extrabold text-amber-700 mt-1">{prediction.estimatedYield} kg</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Confidence: <span className="font-semibold text-gray-800 capitalize">{prediction.confidence}</span>
                      </p>
                    </div>
                    <div className="bg-white/70 p-4 rounded-lg border border-amber-100">
                      <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Recommended Harvest Window</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{prediction.nextHarvestEstimate}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Hive Environmental Optimality: <span className="font-semibold text-gray-800">{prediction.optimalityScore}%</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center border border-dashed border-amber-200 rounded-xl bg-amber-50/50">
              <TrendingUp className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <p className="font-semibold text-gray-900">No IoT Hives Configured</p>
              <p className="text-sm text-gray-600 mt-1">Add hive IDs to this beekeeper profile in the admin dashboard.</p>
            </div>
          )}
        </div>

        {/* Recent Batches */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Your Registered Honey Batches</h2>
            <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-full">
              {batches.length} On-Chain Records
            </span>
          </div>
          {batches.length === 0 ? (
            <p className="text-gray-500">No batches registered yet. Register your first batch above!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-amber-50/50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Batch ID</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Hive</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Quantity</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Floral Source</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Status</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-amber-900 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batches.map((block) => (
                    <tr key={block.data.batchId} className="hover:bg-amber-50/40 transition">
                      <td className="py-3 px-4 text-sm font-mono font-medium text-amber-700">{block.data.batchId}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{block.data.hiveId}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{block.data.quantity} kg</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{block.data.floralSource}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(block.data.harvestDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          block.data.labTested
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {block.data.labTested ? 'Lab Tested ✓' : 'Pending Test'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-3">
                          {onNavigate && (
                            <button
                              onClick={() => onNavigate('consumer', block.data.batchId)}
                              className="text-xs text-amber-600 hover:text-amber-800 font-semibold inline-flex items-center gap-1 hover:underline"
                            >
                              Verify <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBatch(block.data.batchId)}
                            className="text-xs text-red-600 hover:text-red-800 font-semibold inline-flex items-center gap-1 hover:underline"
                            title="Delete batch"
                          >
                            Delete <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
