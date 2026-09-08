import CryptoJS from 'crypto-js';
import { validateBlockStructure, sanitizeObject, validateBatchData } from './validation';
import { loadBeekeepers, saveBeekeepers } from './beekeepers';

// Simple hash-chained blockchain for honey traceability
export class HoneyBlock {
  constructor(index, timestamp, data, previousHash = '', nonce = 0) {
    this.index = index;
    this.timestamp = timestamp;
    this.data = sanitizeObject(data); // Sanitize data to prevent injection
    this.previousHash = previousHash;
    this.nonce = nonce;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return CryptoJS.SHA256(
      this.index +
      this.previousHash +
      this.timestamp +
      JSON.stringify(this.data) +
      this.nonce
    ).toString();
  }

  // Simple proof of work (optional for production)
  mineBlock(difficulty = 2) {
    const target = Array(difficulty + 1).join('0');
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
  }
}

export class HoneyChain {
  constructor() {
    this.chain = this.loadChain();
    if (this.chain.length === 0) {
      this.chain = [this.createGenesisBlock()];
      this.saveChain();
    }
    this.initializeDemoBatches();
  }

  createGenesisBlock() {
    return new HoneyBlock(
      0,
      Date.now(),
      { type: 'genesis', message: 'KVIC Honey Mission — Genesis Block' },
      '0'
    );
  }

  // Pre-populate demo batches if chain is fresh
  initializeDemoBatches() {
    // Only seed demo batches when there are beekeepers defined
    const mockBeekeepers = loadBeekeepers();
    if (this.chain.length === 1 && mockBeekeepers.length === 0) {
      // Skip demo data — admin will add their own
      return;
    }

    if (this.chain.length === 1 && mockBeekeepers.length > 0) {
      const demoBatches = mockBeekeepers.flatMap(bk => {
        const floralOptions = ['Wild Forest', 'Multiflora (Mixed)', 'Acacia', 'Mustard', 'Eucalyptus'];
        return bk.hives.map((hiveId, idx) => ({
          type: 'honey_batch',
          batchId: `HB-DEMO-${bk.id}-${hiveId}`,
          beekeeperId: bk.id,
          beekeeper: bk.name,
          hiveId,
          quantity: 10 + Math.random() * 20,
          floralSource: floralOptions[idx % floralOptions.length],
          location: bk.location,
          harvestDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          labTested: true,
          notes: `Harvest from ${bk.name}'s apiary at ${hiveId}.`,
          status: 'registered',
        }));
      });

      for (const batch of demoBatches) {
        this.addBlock(batch);
      }
    }
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(data) {
    // Validate batch data before adding to blockchain
    if (data.type === 'honey_batch') {
      const validation = validateBatchData(data);
      if (!validation.valid) {
        throw new Error(`Invalid batch data: ${validation.errors.join(', ')}`);
      }
      // Use sanitized data
      data = validation.sanitized;
    }

    const newBlock = new HoneyBlock(
      this.chain.length,
      Date.now(),
      data,
      this.getLatestBlock().hash
    );

    // Optional: mine block with proof of work (disabled for demo performance)
    // newBlock.mineBlock(2);

    this.chain.push(newBlock);
    this.saveChain();
    return newBlock;
  }

  // Validate chain integrity
  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Validate block structure
      if (!validateBlockStructure(currentBlock)) {
        return { valid: false, tamperedIndex: i, reason: 'Invalid block structure' };
      }

      // Recalculate hash to detect tampering
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return { valid: false, tamperedIndex: i, reason: 'Block hash mismatch' };
      }

      // Check if previous hash link is intact
      if (currentBlock.previousHash !== previousBlock.hash) {
        return { valid: false, tamperedIndex: i, reason: 'Previous hash mismatch' };
      }
    }
    return { valid: true };
  }

  // Get batch by ID
  getBatchById(batchId) {
    return this.chain.find(block => block.data.batchId === batchId);
  }

  // Get all honey batches (skip genesis)
  getAllBatches() {
    return this.chain.slice(1).filter(block => block.data.type === 'honey_batch');
  }

  // Get batches by beekeeper
  getBatchesByBeekeeper(beekeeperId) {
    return this.chain.filter(
      block => block.data.type === 'honey_batch' && block.data.beekeeperId === beekeeperId
    );
  }

  // Delete a batch by ID
  deleteBatch(batchId) {
    const initialLength = this.chain.length;
    this.chain = this.chain.filter(
      block => !(block.data.type === 'honey_batch' && block.data.batchId === batchId)
    );
    if (this.chain.length !== initialLength) {
      this.saveChain();
      return true;
    }
    return false;
  }

  // Delete a beekeeper and all their batches
  deleteBeekeeper(beekeeperId) {
    const initialChainLength = this.chain.length;
    const initialBatches = this.getBatchesByBeekeeper(beekeeperId).length;

    // Remove all batches for this beekeeper
    this.chain = this.chain.filter(
      block => !(block.data.type === 'honey_batch' && block.data.beekeeperId === beekeeperId)
    );

    // Remove any mock beekeeper data
    const mockBeekeepers = loadBeekeepers();
    const updatedBeekeepers = mockBeekeepers.filter(bk => bk.id !== beekeeperId);
    saveBeekeepers(updatedBeekeepers);

    if (this.chain.length !== initialChainLength || initialBatches > 0) {
      this.saveChain();
      return true;
    }
    return false;
  }

  // Simulate tampering (for demo)
  tamperWithBlock(index, newData) {
    if (index > 0 && index < this.chain.length) {
      this.chain[index].data = { ...this.chain[index].data, ...newData };
      // Don't recalculate hash — leave it broken to demonstrate detection
      this.saveChain();
    }
  }

  // Restore original chain
  restoreChain() {
    this.chain = this.chain.map(block => {
      const restored = new HoneyBlock(
        block.index,
        block.timestamp,
        block.data,
        block.previousHash
      );
      return restored;
    });
    this.saveChain();
  }

  // Persistence with error handling
  saveChain() {
    try {
      // Check storage quota
      const chainString = JSON.stringify(this.chain);
      if (chainString.length > 5 * 1024 * 1024) { // 5MB limit
        console.warn('Chain size exceeds 5MB, consider archiving old blocks');
      }
      localStorage.setItem('honeyChain', chainString);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded. Unable to save blockchain.');
        // In production, implement archival strategy
      } else {
        console.error('Error saving chain:', error);
      }
      throw error;
    }
  }

  loadChain() {
    try {
      const saved = localStorage.getItem('honeyChain');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map(block => {
          // Validate and sanitize loaded blocks
          if (!validateBlockStructure(block)) {
            throw new Error(`Invalid block structure at index ${block.index}`);
          }
          const b = new HoneyBlock(
            block.index,
            block.timestamp,
            sanitizeObject(block.data),
            block.previousHash,
            block.nonce || 0
          );
          b.hash = block.hash; // Preserve existing hash (may be tampered)
          return b;
        });
      }
    } catch (error) {
      console.error('Error loading chain:', error);
      // Return empty array to reinitialize with genesis block
    }
    return [];
  }

  // Reset entire chain (for demo purposes)
  resetChain() {
    localStorage.removeItem('honeyChain');
    this.chain = [this.createGenesisBlock()];
    this.saveChain();
  }
}

// Singleton instance
export const honeyChain = new HoneyChain();
