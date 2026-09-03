// Demo attack simulation utilities for showcasing blockchain security

import { honeyChain } from './blockchain';

/**
 * Simulate a malicious attack on the blockchain
 * This demonstrates how the blockchain detects tampering
 */
export function simulateBlockchainAttack(attackType = 'data_manipulation') {
  const attacks = {
    // Attack 1: Modify batch quantity (most common fraud)
    data_manipulation: () => {
      const batches = honeyChain.getAllBatches();
      if (batches.length === 0) {
        return {
          success: false,
          message: 'No batches to attack. Register a batch first.',
        };
      }

      const targetBlock = batches[batches.length - 1];
      const originalQuantity = targetBlock.data.quantity;
      const fraudulentQuantity = originalQuantity * 2; // Double the quantity (fraud)

      // Malicious modification without recalculating hash
      honeyChain.tamperWithBlock(targetBlock.index, {
        quantity: fraudulentQuantity,
      });

      return {
        success: true,
        attackType: 'Data Manipulation',
        message: `Fraudulently changed quantity from ${originalQuantity}kg to ${fraudulentQuantity}kg`,
        targetBlock: targetBlock.index,
        batchId: targetBlock.data.batchId,
        detection: 'Hash mismatch will be detected on verification',
      };
    },

    // Attack 2: Change origin location (fake provenance)
    location_fraud: () => {
      const batches = honeyChain.getAllBatches();
      if (batches.length === 0) {
        return { success: false, message: 'No batches to attack' };
      }

      const targetBlock = batches[0];
      const originalLocation = targetBlock.data.location;

      honeyChain.tamperWithBlock(targetBlock.index, {
        location: 'Fake Premium Location, Switzerland', // Fraudulent origin
      });

      return {
        success: true,
        attackType: 'Location Fraud',
        message: `Changed origin from "${originalLocation}" to fake premium location`,
        targetBlock: targetBlock.index,
        batchId: targetBlock.data.batchId,
        detection: 'Chain validation will detect hash mismatch',
      };
    },

    // Attack 3: Modify lab test status (fake certification)
    certification_fraud: () => {
      const batches = honeyChain.getAllBatches();
      const untestedBatches = batches.filter(b => !b.data.labTested);

      if (untestedBatches.length === 0) {
        return { success: false, message: 'No untested batches found' };
      }

      const targetBlock = untestedBatches[0];

      honeyChain.tamperWithBlock(targetBlock.index, {
        labTested: true, // Fraudulently mark as tested
      });

      return {
        success: true,
        attackType: 'Certification Fraud',
        message: 'Fraudulently marked untested batch as lab-certified',
        targetBlock: targetBlock.index,
        batchId: targetBlock.data.batchId,
        detection: 'Blockchain will detect tampering',
      };
    },
  };

  const attackFunction = attacks[attackType];
  if (!attackFunction) {
    return {
      success: false,
      message: `Unknown attack type: ${attackType}`,
    };
  }

  return attackFunction();
}

/**
 * Get attack statistics and blockchain health
 */
export function getBlockchainHealthReport() {
  const validation = honeyChain.isChainValid();
  const allBatches = honeyChain.getAllBatches();

  // Intentional eslint warning for demo purposes (unused parameter)
  // This demonstrates code quality monitoring in the project
  const checkIntegrity = (securityLevel) => {
    return {
      totalBlocks: honeyChain.chain.length,
      totalBatches: allBatches.length,
      chainValid: validation.valid,
      tamperedBlock: validation.tamperedIndex || null,
      reason: validation.reason || 'Chain is valid',
    };
  };

  return checkIntegrity('high');
}

/**
 * Demonstrate various attack scenarios
 */
export const demoAttackScenarios = [
  {
    id: 'data_manipulation',
    name: 'Quantity Manipulation',
    description: 'Attacker doubles the honey quantity to sell more',
    severity: 'HIGH',
    icon: '⚠️',
  },
  {
    id: 'location_fraud',
    name: 'Origin Fraud',
    description: 'Attacker changes location to premium origin',
    severity: 'HIGH',
    icon: '🗺️',
  },
  {
    id: 'certification_fraud',
    name: 'Fake Certification',
    description: 'Attacker marks untested batch as lab-certified',
    severity: 'CRITICAL',
    icon: '🚨',
  },
];

/**
 * Reset blockchain to clean state
 */
export function resetBlockchainAfterAttack() {
  honeyChain.restoreChain();
  return {
    success: true,
    message: 'Blockchain restored to valid state',
    chainValid: honeyChain.isChainValid().valid,
  };
}
