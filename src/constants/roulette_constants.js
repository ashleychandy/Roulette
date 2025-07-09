import { ethers } from "ethers";

// Contract constants - exactly matching Roulette.sol values
export const CONTRACT_CONSTANTS = {
  MAX_BETS_PER_SPIN: 15,
  MAX_BET_AMOUNT: BigInt("100000000000000000000000"), // 100k tokens
  MAX_TOTAL_BET_AMOUNT: BigInt("500000000000000000000000"), // 500k tokens
  MAX_POSSIBLE_PAYOUT: BigInt("17500000000000000000000000"), // 17.5M tokens
  DENOMINATOR: 10000, // Used for payout calculations
  RESULT_FORCE_STOPPED: 254, // Special result value for force-stopped games
  RESULT_RECOVERED: 255, // Special result value for recovered games
  MAX_HISTORY_SIZE: 10, // Max history size per user
  MINTER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE")),
  BURNER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE")),
  // Game recovery constants
  GAME_TIMEOUT: 3600, // 1 hour in seconds, matching the contract's GAME_TIMEOUT constant
  BLOCK_THRESHOLD: 300, // 300 blocks, matching the contract's BLOCK_THRESHOLD constant
};

// Contract error messages
export const CONTRACT_ERRORS = {
  GameNotActive: "No active game found",
  GameAlreadyActive: "You already have an active game",
  InvalidBetType: "Invalid bet type selected",
  InvalidBetAmount: "Invalid bet amount",
  InvalidNumbersCount: "Invalid number of numbers for this bet type",
  InvalidNumber: "One or more invalid numbers selected",
  InsufficientBalance: "Insufficient balance",
  InsufficientAllowance: "Insufficient token allowance",
  RequestNotExists: "VRF request does not exist",
  RequestAlreadyProcessed: "VRF request already processed",
  RequestNotProcessed: "VRF request not processed yet",
  NotEligibleForRecovery: "Game not eligible for recovery yet",
  InvalidRecoveryAttempt: "Invalid recovery attempt",
  OnlyOwner: "Only contract owner can perform this action",
  InvalidAddress: "Invalid address provided",
  InvalidAmount: "Invalid amount provided",
  ContractPaused: "Contract is currently paused",
  MaxBetsReached: "Maximum number of bets reached",
  BetTooLow: "Bet amount below minimum",
  BetTooHigh: "Bet amount above maximum",
  InvalidPayoutMultiplier: "Invalid payout multiplier",
  DuplicateNumbers: "Duplicate numbers in bet",
  InvalidBetCombination: "Invalid combination of bets",
  GameExpired: "Game has expired",
  RecoveryNotNeeded: "Game does not need recovery",
  TransferFailed: "Token transfer failed",
  ApprovalRequired: "Token approval required",
  InvalidGameState: "Invalid game state for this action",
  VRFRequestFailed: "VRF request failed",
  InvalidVRFResponse: "Invalid VRF response",
  NoWinningNumber: "No winning number generated yet",
  InvalidTimestamp: "Invalid timestamp",
  InvalidSignature: "Invalid signature",
  InvalidNonce: "Invalid nonce",
  InvalidFeeData: "Invalid fee data",
  MaxExposureReached: "Maximum exposure reached",
  InvalidBetStructure: "Invalid bet structure",
  InvalidConfiguration: "Invalid configuration",
  UpgradeNotAllowed: "Upgrade not allowed",
  InitializationFailed: "Initialization failed",
  AlreadyInitialized: "Already initialized",
  ZeroAddress: "Zero address not allowed",
  InvalidArrayLength: "Invalid array length",
  InvalidParameter: "Invalid parameter",
  Unauthorized: "Unauthorized action",
  InvalidState: "Invalid state",
  OperationFailed: "Operation failed",
};

// Contract Result States
export const CONTRACT_RESULT_STATES = {
  FORCE_STOPPED: CONTRACT_CONSTANTS.RESULT_FORCE_STOPPED,
  RECOVERED: CONTRACT_CONSTANTS.RESULT_RECOVERED,
};

// Game Status - aligned with contract states
export const GameStatus = {
  IDLE: "IDLE", // No active game
  ACTIVE: "ACTIVE", // Game is in progress
  COMPLETED: "COMPLETED", // Game finished normally
  PENDING_VRF: "PENDING_VRF", // Waiting for VRF response
  RECOVERY_ELIGIBLE: "RECOVERY_ELIGIBLE", // Can be recovered
  FORCE_STOPPED: "FORCE_STOPPED", // Stopped by admin
  RECOVERED: "RECOVERED", // Recovered after timeout
  ERROR: "ERROR", // Generic error state
};

// Transaction Status
export const TransactionStatus = {
  IDLE: "idle",
  PREPARING: "preparing",
  PENDING: "pending",
  CONFIRMING: "confirming",
  SUCCESS: "success",
  ERROR: "error",
  MONITORING: "monitoring",
};

// Roulette Numbers
export const ROULETTE_NUMBERS = Array.from({ length: 37 }, (_, i) => i);

// Red Numbers
export const RED_NUMBERS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

// Black Numbers
export const BLACK_NUMBERS = [
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
];

// Dozens
export const DOZENS = {
  FIRST: Array.from({ length: 12 }, (_, i) => i + 1),
  SECOND: Array.from({ length: 12 }, (_, i) => i + 13),
  THIRD: Array.from({ length: 12 }, (_, i) => i + 25),
};

// Columns - updated to align with contract implementation
export const COLUMNS = {
  FIRST: Array.from({ length: 12 }, (_, i) => i * 3 + 1),
  SECOND: Array.from({ length: 12 }, (_, i) => i * 3 + 2),
  THIRD: Array.from({ length: 12 }, (_, i) => i * 3 + 3),
};

// Bet Limits - updated to match contract values
export const BET_LIMITS = {
  MIN_BET: "0.01",
  MAX_BET: "100",
  MAX_TOTAL_BET: "500", // 500k tokens (matches MAX_TOTAL_BET_AMOUNT in contract)
  MAX_BETS_PER_GAME: 15, // Matches MAX_BETS_PER_SPIN in contract
};

// Time Constants - aligned with contract
export const TIME_CONSTANTS = {
  GAME_TIMEOUT: CONTRACT_CONSTANTS.GAME_TIMEOUT, // 1 hour in seconds (matches contract GAME_TIMEOUT)
  BLOCK_THRESHOLD: CONTRACT_CONSTANTS.BLOCK_THRESHOLD, // Number of blocks to wait (matches contract BLOCK_THRESHOLD)
  UI_TIMEOUT: 120, // 2 minutes in seconds (UI-specific timeout)
  POLLING_INTERVAL: 5000, // 5 seconds between status checks
  TOAST_DURATION: 5000, // 5 seconds for toast messages
  VRF_CHECK_INTERVAL: 3000, // 3 seconds between VRF status checks
};

// Updated BetTypes to match contract exactly
export const BetTypes = {
  // Base types (matching contract constants in Roulette.sol)
  STRAIGHT: 0,
  DOZEN_FIRST: 1,
  DOZEN_SECOND: 2,
  DOZEN_THIRD: 3,
  COLUMN_FIRST: 4,
  COLUMN_SECOND: 5,
  COLUMN_THIRD: 6,
  RED: 7,
  BLACK: 8,
  EVEN: 9,
  ODD: 10,
  LOW: 11,
  HIGH: 12,

  // Helper functions
  isValid: function (type) {
    return type >= 0 && type <= 12;
  },

  // Get numbers for a bet type
  getNumbers: function (type, start = null) {
    // For straight bets, a specific number must be provided elsewhere
    // Return an empty array as the number will be handled separately
    if (type === this.STRAIGHT) return []; // For straight bets, number is provided separately

    // For dozens
    if (type === this.DOZEN_FIRST)
      return Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
    if (type === this.DOZEN_SECOND)
      return Array.from({ length: 12 }, (_, i) => i + 13); // 13-24
    if (type === this.DOZEN_THIRD)
      return Array.from({ length: 12 }, (_, i) => i + 25); // 25-36

    // For columns - ensure correct column implementation matching contract
    if (type === this.COLUMN_FIRST)
      return Array.from({ length: 12 }, (_, i) => 1 + i * 3); // 1,4,7...
    if (type === this.COLUMN_SECOND)
      return Array.from({ length: 12 }, (_, i) => 2 + i * 3); // 2,5,8...
    if (type === this.COLUMN_THIRD)
      return Array.from({ length: 12 }, (_, i) => 3 + i * 3); // 3,6,9...

    // Other bet types
    if (type === this.RED)
      return [
        1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
      ];
    if (type === this.BLACK)
      return [
        2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
      ];
    if (type === this.EVEN)
      return Array.from({ length: 18 }, (_, i) => (i + 1) * 2);
    if (type === this.ODD)
      return Array.from({ length: 18 }, (_, i) => i * 2 + 1);
    if (type === this.LOW) return Array.from({ length: 18 }, (_, i) => i + 1);
    if (type === this.HIGH) return Array.from({ length: 18 }, (_, i) => i + 19);

    return [];
  },

  // Get bet type ID for contract interactions
  getBetTypeId: function (type, numbers) {
    return type;
  },

  // Check if bet type requires specific number
  requiresNumber: function (betTypeId) {
    // Only straight bets require a specific number
    return Number(betTypeId) === this.STRAIGHT;
  },

  // Get payout multiplier for a bet type (matches contract implementation)
  getPayoutMultiplier: function (betTypeId) {
    const type = Number(betTypeId);
    const DENOMINATOR = 10000;

    if (type === this.STRAIGHT) return 35 * DENOMINATOR; // 35:1 payout

    if (
      type === this.DOZEN_FIRST ||
      type === this.DOZEN_SECOND ||
      type === this.DOZEN_THIRD ||
      type === this.COLUMN_FIRST ||
      type === this.COLUMN_SECOND ||
      type === this.COLUMN_THIRD
    ) {
      return 2 * DENOMINATOR; // 2:1 payout
    }

    if (
      type === this.RED ||
      type === this.BLACK ||
      type === this.EVEN ||
      type === this.ODD ||
      type === this.LOW ||
      type === this.HIGH
    ) {
      return DENOMINATOR; // 1:1 payout
    }

    throw new Error(`Invalid bet type: ${betTypeId}`);
  },

  // Get display name for a bet type
  getDisplayName: function (betTypeId) {
    const type = Number(betTypeId);

    switch (type) {
      case this.STRAIGHT:
        return "Straight";
      case this.DOZEN_FIRST:
        return "First Dozen (1-12)";
      case this.DOZEN_SECOND:
        return "Second Dozen (13-24)";
      case this.DOZEN_THIRD:
        return "Third Dozen (25-36)";
      case this.COLUMN_FIRST:
        return "First Column";
      case this.COLUMN_SECOND:
        return "Second Column";
      case this.COLUMN_THIRD:
        return "Third Column";
      case this.RED:
        return "Red";
      case this.BLACK:
        return "Black";
      case this.EVEN:
        return "Even";
      case this.ODD:
        return "Odd";
      case this.LOW:
        return "Low (1-18)";
      case this.HIGH:
        return "High (19-36)";
      default:
        throw new Error(`Invalid bet type: ${betTypeId}`);
    }
  },

  // Check if a number is valid for a specific bet type
  isValidNumber: function (betTypeId, number) {
    // Only straight bets need number validation
    if (Number(betTypeId) !== this.STRAIGHT) {
      return true; // Other bet types don't require specific number
    }

    // For straight bets, number must be 0-36
    return Number.isInteger(number) && number >= 0 && number <= 36;
  },

  // Helper to get starting number for a column/dozen
  getColumnStart: function (columnType) {
    if (columnType === "FIRST") return 1;
    if (columnType === "SECOND") return 2;
    if (columnType === "THIRD") return 3;
    return 1;
  },

  getDozenStart: function (dozenType) {
    if (dozenType === "FIRST") return 1;
    if (dozenType === "SECOND") return 13;
    if (dozenType === "THIRD") return 25;
    return 1;
  },
};

// Define red numbers for the roulette board
export const redNumbers = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

// Helper function to check if a number is red
export const isRed = (number) => redNumbers.includes(Number(number));

// Update betting options arrays to match contract order and position
export const dozenBettingOptions = [
  { label: "1st 12", type: BetTypes.DOZEN_FIRST }, // 1-12
  { label: "2nd 12", type: BetTypes.DOZEN_SECOND }, // 13-24
  { label: "3rd 12", type: BetTypes.DOZEN_THIRD }, // 25-36
];

export const columnBettingOptions = [
  { label: "2:1", type: BetTypes.COLUMN_FIRST }, // First column (1,4,7...)
  { label: "2:1", type: BetTypes.COLUMN_SECOND }, // Second column (2,5,8...)
  { label: "2:1", type: BetTypes.COLUMN_THIRD }, // Third column (3,6,9...)
];

export const bottomBettingOptions = [
  { label: "1-18", type: BetTypes.LOW },
  { label: "EVEN", type: BetTypes.EVEN },
  { label: "RED", type: BetTypes.RED },
  { label: "BLACK", type: BetTypes.BLACK },
  { label: "ODD", type: BetTypes.ODD },
  { label: "19-36", type: BetTypes.HIGH },
];

// Chip values for betting - ensuring values don't exceed MAX_BET_AMOUNT (100k tokens)
export const CHIP_VALUES = [
  { value: "1000000000000000000", label: "1" }, // 1 token
  { value: "5000000000000000000", label: "5" }, // 5 tokens
  { value: "10000000000000000000", label: "10" }, // 10 tokens
  { value: "25000000000000000000", label: "25" }, // 25 tokens
  { value: "50000000000000000000", label: "50" }, // 50 tokens
  { value: "100000000000000000000", label: "100" }, // 100 tokens
];
