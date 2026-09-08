import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, CheckCircle, XCircle, Package, MapPin, Calendar, User, Sparkles, ShieldCheck, Camera, X } from 'lucide-react';
import { honeyChain } from '../../utils/blockchain';
import { sanitizeString } from '../../utils/validation';
import { isLabCertified } from '../../utils/labCertificates';
import { api } from '../../utils/api';
import toast from 'react-hot-toast';

export default function ConsumerVerification({ initialBatchId }) {
  const [batchId, setBatchId] = useState(initialBatchId || '');
  const [batch, setBatch] = useState(null);
  const [chainValid, setChainValid] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const scannerRef = useRef(null);
  const scannerContainerRef = useRef(null);

  const verifyBatch = useCallback(async (idToVerify) => {
    const sanitizedBatchId = sanitizeString((idToVerify || batchId).trim());

    if (!sanitizedBatchId) {
      toast.error('Please enter a batch ID');
      return;
    }

    if (sanitizedBatchId.length > 50) {
      toast.error('Invalid batch ID format');
      return;
    }

    // Try server-side public verification first
    try {
      const serverRes = await api.batches.verifyPublic(sanitizedBatchId);
      if (serverRes?.data) {
        const d = serverRes.data;
        const mappedBlock = {
          index: d.blockchain.blockIndex,
          timestamp: d.blockchain.timestamp,
          hash: d.blockchain.hash,
          previousHash: d.blockchain.previousHash,
          data: {
            batchId: d.batchId,
            beekeeperId: d.beekeeperId,
            beekeeper: d.beekeeper,
            hiveId: d.hiveId,
            quantity: d.quantity,
            floralSource: d.floralSource,
            location: d.location,
            harvestDate: d.harvestDate,
            notes: d.notes,
            status: d.status,
            labTested: d.labTested,
          },
        };
        setBatch(mappedBlock);
        setChainValid(d.ledgerIntegrity);
        if (d.ledgerIntegrity.chainValid) {
          toast.success('Batch verified — authentic KVIC Honey!');
        } else {
          toast.error('Warning: Tampering detected in blockchain ledger!');
        }
        return;
      }
    } catch {
      // Fallback to local chain
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

      if (validation.valid) {
        toast.success('Batch verified — authentic KVIC Honey!');
      } else {
        toast.error('Warning: Tampering detected in blockchain ledger!');
      }
    } catch (error) {
      toast.error('Error verifying batch');
      console.error('Verification error:', error);
    }
  }, [batchId]);


  const handleVerify = () => verifyBatch(batchId);

  const startScanner = async () => {
    setScannerOpen(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      await new Promise(r => setTimeout(r, 100));

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          let extractedBatchId = decodedText;

          try {
            const url = new URL(decodedText);
            const params = new URLSearchParams(url.search);
            const batchParam = params.get('batch');
            if (batchParam) {
              extractedBatchId = batchParam;
            }
          } catch {
            // Not a URL, use as-is
          }

          setBatchId(extractedBatchId);
          stopScanner();
          toast.success('QR code scanned! Verifying...');
          setTimeout(() => verifyBatch(extractedBatchId), 300);
        },
        () => {}
      );
    } catch (err) {
      console.error('QR scanner error:', err);
      toast.error('Camera access denied or not available. Please enter batch ID manually.');
      setScannerOpen(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScannerOpen(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

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

        {/* QR Scanner */}
        {scannerOpen && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-600" />
                Scan QR Code
              </h3>
              <button
                onClick={stopScanner}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                title="Close scanner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center">
              <div id="qr-reader" className="w-full max-w-md rounded-xl overflow-hidden" ref={scannerContainerRef}></div>
            </div>
            <p className="text-xs text-gray-500 text-center mt-3">Point your camera at the QR code on the honey jar label.</p>
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
                aria-label="Honey batch identification code"
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
                onClick={startScanner}
                className="bg-amber-50 text-amber-900 border border-amber-300 px-4 py-3 rounded-xl font-semibold hover:bg-amber-100 transition shrink-0 flex items-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Scan QR Code
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
                    {chainValid.valid ? 'Verified Authentic KVIC Honey' : 'Tampering Detected on Ledger'}
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
                    <p className={`font-semibold ${isLabCertified(batch) ? 'text-green-600' : 'text-amber-700'}`}>
                      {isLabCertified(batch) ? 'KVIC Standard Lab Tested' : 'Awaiting Lab Assay'}
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
              <li>Scan the QR code on your honey jar label using the <strong>"Scan QR Code"</strong> button, or enter the batch ID manually.</li>
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
