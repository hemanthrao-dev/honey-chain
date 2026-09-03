import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, AlertTriangle, Package, MapPin, Calendar, User, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { honeyChain } from '../../utils/blockchain';
import { sanitizeString } from '../../utils/validation';
import toast from 'react-hot-toast';

export default function ConsumerVerification({ initialBatchId, onNavigate }) {
  const [batchId, setBatchId] = useState(initialBatchId || '');
  const [batch, setBatch] = useState(null);
  const [chainValid, setChainValid] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [tamperMode, setTamperMode] = useState(false);
  const [tamperData, setTamperData] = useState({ quantity: '', location: '' });

  useEffect(() => {
    if (initialBatchId) {
      setBatchId(initialBatchId);
      verifyBatch(initialBatchId);
    }
  }, [initialBatchId]);

  const verifyBatch = (idToVerify) => {
    const sanitizedBatchId = sanitizeString((idToVerify || batchId).trim());

    if (!sanitizedBatchId) {
      toast.error('Please enter a batch ID');
      return;
    }

    if (sanitizedBatchId.length > 50) {
      toast.error('Invalid batch ID format');
      return;
    }

    const block = honeyChain.getBatchById(sanitizedBatchId);

    if (!block) {
      toast.error('Batch not found on blockchain ledger');
      setBatch(null);
      setChainValid(null);
      return;
    }

    try {
      const validation = honeyChain.isChainValid();
      setBatch(block);
      setChainValid(validation);
      setShowQR(true);

      if (validation.valid) {
        toast.success('Batch verified — authentic KVIC Honey!');
      } else {
        toast.error('Warning: Tampering detected in blockchain ledger!');
      }
    } catch (error) {
      toast.error('Error verifying batch');
      console.error('Verification error:', error);
    }
  };

  const handleVerify = () => verifyBatch(batchId);

  const handleTamper = () => {
    if (!batch) return;

    const updates = {};
    if (tamperData.quantity) updates.quantity = parseFloat(tamperData.quantity);
    if (tamperData.location) updates.location = sanitizeString(tamperData.location);

    honeyChain.tamperWithBlock(batch.index, updates);

    toast.error('Batch data tampered with! Verify again to see cryptographic failure.');

    setTamperMode(false);
    setTamperData({ quantity: '', location: '' });
    setBatch(null);
    setChainValid(null);
  };

  const handleRestore = () => {
    honeyChain.restoreChain();
    toast.success('Blockchain chain integrity restored!');
    setBatch(null);
    setChainValid(null);
    setBatchId('');
  };

  const getSampleBatchId = () => {
    const batches = honeyChain.getAllBatches();
    if (batches.length > 0) {
      const sampleId = batches[batches.length - 1].data.batchId;
      setBatchId(sampleId);
      toast.success('Sample batch ID loaded. Click "Verify" to validate.');
    } else {
      toast.error('No batches registered yet. Use the Beekeeper dashboard to register one.');
    }
  };

  return (
    <div className="min-h-screen bg-amber-50/30 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Unique Page Heading */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-amber-700 text-sm font-medium bg-amber-100/60 px-3.5 py-1 rounded-full mb-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Cryptographic Proof of Authenticity</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Verify Honey Authenticity
          </h1>
          <p className="text-gray-600 mt-2 max-w-xl mx-auto">
            Scan your jar's QR code or enter the batch ID below to verify source apiaries, harvest timestamps, and cryptographic integrity.
          </p>
        </div>

        {/* Quick Nav Shortcuts */}
        {onNavigate && (
          <div className="mb-6 flex justify-center gap-3 text-sm">
            <button
              onClick={() => onNavigate('beekeeper')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition font-medium border border-amber-200 shadow-sm"
            >
              ← Beekeeper Portal
            </button>
            <button
              onClick={() => onNavigate('admin')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition font-medium border border-amber-200 shadow-sm"
            >
              KVIC Admin Overview →
            </button>
          </div>
        )}

        {/* Search Box */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-amber-900 uppercase tracking-wider mb-2">
                Honey Batch Identification Code (on packaging)
              </label>
              <input
                type="text"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-gray-900"
                placeholder="e.g. HB-DEMO-001-KVIC"
                maxLength="50"
              />
            </div>
            <div className="flex gap-2 items-end">
              <button
                onClick={handleVerify}
                className="bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-amber-700 hover:to-yellow-700 transition shadow-sm flex items-center gap-2 shrink-0"
              >
                <Search className="w-5 h-5" />
                Verify
              </button>
              <button
                onClick={getSampleBatchId}
                className="bg-amber-50 text-amber-900 border border-amber-300 px-4 py-3 rounded-xl font-semibold hover:bg-amber-100 transition shrink-0"
              >
                Try Sample
              </button>
            </div>
          </div>
        </div>

        {/* Verification Result */}
        {batch && chainValid && (
          <div className="space-y-6">
            {/* Verification Status */}
            <div
              className={`p-6 rounded-2xl shadow-sm border-2 ${
                chainValid.valid
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400'
                  : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-400'
              }`}
            >
              <div className="flex items-center gap-4">
                {chainValid.valid ? (
                  <CheckCircle className="w-16 h-16 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="w-16 h-16 text-red-600 shrink-0" />
                )}
                <div>
                  <h2 className={`text-2xl font-bold ${chainValid.valid ? 'text-green-900' : 'text-red-900'}`}>
                    {chainValid.valid ? '✓ Verified Authentic KVIC Honey' : '⚠ Tampering Detected on Ledger'}
                  </h2>
                  <p className={`text-sm mt-1 ${chainValid.valid ? 'text-green-700' : 'text-red-700'}`}>
                    {chainValid.valid
                      ? 'Cryptographic SHA-256 block hash verified intact across the decentralized honey ledger.'
                      : `Chain integrity broken at Block #${chainValid.tamperedIndex}: ${chainValid.reason}. Data altered post-harvest.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Batch Details */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <h3 className="text-xl font-bold text-gray-900">Batch Origin & Harvest Specs</h3>
                <span className="text-xs font-mono bg-amber-100 text-amber-900 font-semibold px-2.5 py-1 rounded-full">
                  Block #{batch.index}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-amber-600 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Batch ID</p>
                    <p className="font-mono font-semibold text-gray-900">{batch.data.batchId}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-amber-600 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Registered Beekeeper</p>
                    <p className="font-semibold text-gray-900">{batch.data.beekeeper}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-amber-600 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Apiary Geographic Origin</p>
                    <p className="font-semibold text-gray-900">{batch.data.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-amber-600 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Harvest Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(batch.data.harvestDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-amber-600 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Harvest Weight</p>
                    <p className="font-semibold text-gray-900">{batch.data.quantity} kg</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-600 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Primary Floral Source</p>
                    <p className="font-semibold text-gray-900">{batch.data.floralSource}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-amber-600 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Source Hive Unit</p>
                    <p className="font-semibold text-gray-900">{batch.data.hiveId}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-amber-600 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">KVIC Lab Certification</p>
                    <p className={`font-semibold ${batch.data.labTested ? 'text-green-600' : 'text-amber-700'}`}>
                      {batch.data.labTested ? 'KVIC Standard Lab Tested ✓' : 'Awaiting Lab Assay'}
                    </p>
                  </div>
                </div>
              </div>
              {batch.data.notes && (
                <div className="mt-4 p-4 bg-amber-50/60 rounded-xl border border-amber-100">
                  <p className="text-xs font-semibold text-amber-900 uppercase">Harvest Notes & Moisture Assay</p>
                  <p className="text-gray-800 text-sm mt-1">{batch.data.notes}</p>
                </div>
              )}
            </div>

            {/* Chain of Custody */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Cryptographic Chain of Custody</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                  <div className="w-3 h-3 bg-green-500 rounded-full shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 uppercase">Current Block #{batch.index}</p>
                    <p className="text-xs font-mono text-gray-600 truncate">Hash: {batch.hash}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="w-3 h-3 bg-blue-500 rounded-full shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 uppercase">Previous Block Link #{batch.index - 1}</p>
                    <p className="text-xs font-mono text-gray-600 truncate">Previous Hash: {batch.previousHash}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                  <div className="w-3 h-3 bg-amber-500 rounded-full shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 uppercase">Ledger Mining Timestamp</p>
                    <p className="text-xs font-mono text-gray-600">
                      {new Date(batch.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code */}
            {showQR && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Consumer QR Verification Tag</h3>
                <p className="text-sm text-gray-600 mb-4">Printable label QR for affixing to KVIC honey retail packaging.</p>
                <div className="inline-block p-4 bg-white border-4 border-amber-500 rounded-2xl shadow-inner">
                  <QRCodeSVG value={`https://honeychain.in/consumer?batch=${batch.data.batchId}`} size={200} level="H" />
                </div>
                <p className="text-xs font-mono text-amber-800 mt-3 font-semibold">{batch.data.batchId}</p>
              </div>
            )}

            {/* Tampering Demo */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl shadow-sm border-2 border-purple-200">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-purple-600 mt-1 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-purple-900">Judge / Security Demo: Tamper Detection</h3>
                  <p className="text-sm text-purple-700">
                    Simulate data falsification on this block to see how SHA-256 chain links instantly catch fraud.
                  </p>
                </div>
              </div>

              {!tamperMode ? (
                <button
                  onClick={() => setTamperMode(true)}
                  className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition shadow-sm"
                >
                  Simulate Data Tampering
                </button>
              ) : (
                <div className="space-y-4 bg-white/80 p-4 rounded-xl border border-purple-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-purple-900 uppercase mb-1">Falsified Quantity (kg)</label>
                      <input
                        type="number"
                        value={tamperData.quantity}
                        onChange={(e) => setTamperData({ ...tamperData, quantity: e.target.value })}
                        className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder={`Original: ${batch.data.quantity}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-purple-900 uppercase mb-1">Falsified Location</label>
                      <input
                        type="text"
                        value={tamperData.location}
                        onChange={(e) => setTamperData({ ...tamperData, location: e.target.value })}
                        className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder={`Original: ${batch.data.location}`}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleTamper}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition shadow-sm"
                    >
                      Apply Tampering
                    </button>
                    <button
                      onClick={() => setTamperMode(false)}
                      className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!chainValid.valid && (
                <div className="mt-4">
                  <button
                    onClick={handleRestore}
                    className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition shadow-sm"
                  >
                    Restore Blockchain Ledger Integrity
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!batch && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              How Honey Chain Verification Works
            </h3>
            <ol className="list-decimal list-inside space-y-2.5 text-gray-700 text-sm">
              <li>Each honey batch is recorded as a cryptographically linked block on the ledger.</li>
              <li>Enter the unique batch ID printed on your honey jar label or click <strong>"Try Sample"</strong>.</li>
              <li>The verification engine re-hashes every previous block to prove zero data manipulation.</li>
              <li>View complete transparent traceability: apiary location, beekeeper identity, and lab results.</li>
              <li>A green badge guarantees 100% authentic pure honey certified under the KVIC Honey Mission.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
