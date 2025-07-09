import { BetTypes, CONTRACT_CONSTANTS } from "../constants/roulette_constants";

/**
 * Helper functions for bet validation and formatting
 */
const BetHelper = {
  // Constants from contract
  MAX_NUMBER: 36,
  MAX_BET_AMOUNT: BigInt("100000000000000000000000"), // 100k tokens
  MAX_TOTAL_BET_AMOUNT: BigInt("500000000000000000000000"), // 500k tokens
  MAX_POSSIBLE_PAYOUT: BigInt("17500000000000000000000000"), // 17.5M tokens - match with contract
  MIN_BET_AMOUNT: BigInt("1000000000000000000"), // 1 token minimum (aligned with handlePlaceBets.js)
  DENOMINATOR: 10000,

  /**
   * Format bet request for contract call
   * @param {number} betTypeId - Bet type ID
   * @param {number} number - Selected number (for straight bets)
   * @param {string} amount - Bet amount in wei
   * @returns {Object} Formatted bet request
   */
  formatBetRequest: function (betTypeId, number, amount) {
    if (!BetTypes.isValid(betTypeId)) {
      throw new Error("Invalid bet type");
    }

    if (BetTypes.requiresNumber(betTypeId) && !this.isValidNumber(number)) {
      throw new Error("Invalid number for straight bet");
    }

    try {
      const validatedAmount = this.validateAndFormatAmount(amount);
      return {
        betTypeId,
        number: BetTypes.requiresNumber(betTypeId) ? number : 0,
        amount: validatedAmount,
      };
    } catch (error) {
      throw new Error(`Error formatting bet request: ${error.message}`);
    }
  },

  /**
   * Validate and format amount to BigInt
   * @param {string|number|BigInt} amount - Amount to validate
   * @returns {BigInt} Formatted amount
   */
  validateAndFormatAmount: function (amount) {
    try {
      const bigIntAmount = BigInt(amount);
      if (bigIntAmount <= 0) {
        throw new Error("Amount must be positive");
      }
      return bigIntAmount;
    } catch (error) {
      throw new Error(`Invalid amount format: ${error.message}`);
    }
  },

  /**
   * Validate bet amount
   * @param {string} amount - Bet amount in wei
   * @param {string[]} existingBets - Array of existing bet amounts in wei
   * @returns {Object} Validation result
   */
  validateBetAmount: function (amount, existingBets = []) {
    try {
      const betAmount = this.validateAndFormatAmount(amount);

      // Check minimum bet amount
      if (betAmount < this.MIN_BET_AMOUNT) {
        return {
          valid: false,
          error: "Bet amount below minimum allowed",
        };
      }

      // Check individual bet limit
      if (betAmount > this.MAX_BET_AMOUNT) {
        return {
          valid: false,
          error: "Bet amount exceeds maximum allowed",
        };
      }

      // Validate and sum existing bets
      let totalAmount = betAmount;
      try {
        for (const existingBet of existingBets) {
          const existingAmount = this.validateAndFormatAmount(existingBet);
          totalAmount += existingAmount;

          // Check for overflow
          if (totalAmount < existingAmount) {
            return {
              valid: false,
              error: "Total amount overflow",
            };
          }
        }
      } catch (error) {
        return {
          valid: false,
          error: "Invalid existing bet amount format",
        };
      }

      // Check total bet limit
      if (totalAmount > this.MAX_TOTAL_BET_AMOUNT) {
        return {
          valid: false,
          error: "Total bet amount exceeds maximum allowed",
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Amount validation error: ${error.message}`,
      };
    }
  },

  /**
   * Calculate potential payout for a bet
   * @param {number} betTypeId - Bet type ID
   * @param {string} amount - Bet amount in wei
   * @returns {string} Potential payout in wei
   */
  calculatePotentialPayout: function (betTypeId, amount) {
    try {
      const multiplier = BetTypes.getPayoutMultiplier(betTypeId);
      const betAmount = this.validateAndFormatAmount(amount);

      // Calculate payout including original bet
      const winnings =
        (betAmount * BigInt(multiplier)) / BigInt(this.DENOMINATOR);
      const totalPayout = winnings + betAmount;

      // Check for overflow
      if (totalPayout < winnings) {
        throw new Error("Payout calculation overflow");
      }

      return totalPayout.toString();
    } catch (error) {
      throw new Error(`Error calculating payout: ${error.message}`);
    }
  },

  /**
   * Format bet for display
   * @param {Object} bet - Bet object from contract
   * @returns {Object} Formatted bet for display
   */
  formatBetForDisplay: function (bet) {
    try {
      return {
        type: BetTypes.getDisplayName
          ? BetTypes.getDisplayName(bet.betTypeId)
          : String(bet.betTypeId),
        number: bet.number > 0 ? bet.number : null,
        amount: bet.amount.toString(),
        potentialPayout: this.calculatePotentialPayout(
          bet.betTypeId,
          bet.amount,
        ),
        numbers: BetTypes.getNumbers(bet.betTypeId, bet.number),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Error formatting bet for display: ${error.message}`);
    }
  },

  /**
   * Check if a number is valid for roulette (0-36)
   * @param {number} number - Number to validate
   * @returns {boolean} Whether number is valid
   */
  isValidNumber: function (number) {
    return Number.isInteger(number) && number >= 0 && number <= this.MAX_NUMBER;
  },

  /**
   * Get color for a roulette number
   * @param {number} number - Roulette number
   * @returns {string} Color ('red', 'black', or 'green' for 0)
   */
  getNumberColor: function (number) {
    if (!this.isValidNumber(number)) {
      throw new Error("Invalid roulette number");
    }
    if (number === 0) return "green";
    return BetTypes.getNumbers(BetTypes.RED).includes(number) ? "red" : "black";
  },

  /**
   * Format amount for display
   * @param {string|number|BigInt} amount - Amount in wei
   * @param {number} decimals - Number of decimals to display
   * @returns {string} Formatted amount
   */
  formatAmount: function (amount, decimals = 18) {
    try {
      const bigIntAmount = this.validateAndFormatAmount(amount);
      const divisor = BigInt(10 ** decimals);
      const wholePart = bigIntAmount / divisor;
      const fractionalPart = bigIntAmount % divisor;

      // Format the fractional part to have correct number of digits
      let fractionalStr = fractionalPart.toString().padStart(decimals, "0");

      // Remove trailing zeros
      fractionalStr = fractionalStr.replace(/0+$/, "");

      // If all zeros, just return the whole part
      if (fractionalStr === "") {
        return wholePart.toString();
      }

      return `${wholePart}.${fractionalStr}`;
    } catch (error) {
      throw new Error(`Error formatting amount: ${error.message}`);
    }
  },

  /**
   * Validate bet request array
   * @param {Array} betRequests - Array of bet requests
   * @returns {Object} Validation result
   */
  validateBetRequests: function (betRequests) {
    // Check for empty bets array
    if (!betRequests || betRequests.length === 0) {
      return {
        valid: false,
        error: "No bets provided",
      };
    }

    // Check max bets per spin (from contract)
    const MAX_BETS_PER_SPIN = 15;
    if (betRequests.length > MAX_BETS_PER_SPIN) {
      return {
        valid: false,
        error: "Too many bets for a single spin",
      };
    }

    // Track total amount
    let totalAmount = BigInt(0);

    // Validate each bet
    for (const bet of betRequests) {
      // Validate bet type
      if (!BetTypes.isValid(bet.betTypeId)) {
        return {
          valid: false,
          error: `Invalid bet type: ${bet.betTypeId}`,
        };
      }

      // Validate number for straight bets
      if (
        BetTypes.requiresNumber(bet.betTypeId) &&
        !this.isValidNumber(bet.number)
      ) {
        return {
          valid: false,
          error: "Invalid number for straight bet",
        };
      }

      // Validate amount
      try {
        const betAmount = this.validateAndFormatAmount(bet.amount);

        // Check min/max for individual bet
        if (betAmount < this.MIN_BET_AMOUNT) {
          return {
            valid: false,
            error: "Bet amount below minimum allowed",
          };
        }

        if (betAmount > this.MAX_BET_AMOUNT) {
          return {
            valid: false,
            error: "Bet amount exceeds maximum allowed for a single bet",
          };
        }

        // Add to total
        totalAmount += betAmount;
      } catch (error) {
        return {
          valid: false,
          error: `Invalid bet amount: ${error.message}`,
        };
      }
    }

    // Check total bet amount
    if (totalAmount > this.MAX_TOTAL_BET_AMOUNT) {
      return {
        valid: false,
        error: "Total bet amount exceeds maximum allowed",
      };
    }

    return { valid: true };
  },
};

export default BetHelper;
