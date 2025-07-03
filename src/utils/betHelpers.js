import { ethers } from "ethers";
import { BetTypes, CONTRACT_CONSTANTS } from "../constants/roulette_constants";

// Helper function to get bet type name
export const getBetTypeName = (betType, numbers) => {
  // Convert contract bet type (0-8) to our format (0-12)
  const convertContractBetType = (type, numbers) => {
    const t = Number(type);
    switch (t) {
      case 0:
        return BetTypes.STRAIGHT;
      case 1: // Dozen
        if (!numbers || !numbers.length) return BetTypes.DOZEN_FIRST;
        if (numbers[0] <= 12) return BetTypes.DOZEN_FIRST;
        if (numbers[0] <= 24) return BetTypes.DOZEN_SECOND;
        return BetTypes.DOZEN_THIRD;
      case 2: // Column
        if (!numbers || !numbers.length) return BetTypes.COLUMN_FIRST;
        const remainder = numbers[0] % 3;
        if (remainder === 1) return BetTypes.COLUMN_FIRST;
        if (remainder === 2) return BetTypes.COLUMN_SECOND;
        return BetTypes.COLUMN_THIRD;
      case 3:
        return BetTypes.RED;
      case 4:
        return BetTypes.BLACK;
      case 5:
        return BetTypes.EVEN;
      case 6:
        return BetTypes.ODD;
      case 7:
        return BetTypes.LOW;
      case 8:
        return BetTypes.HIGH;
      default:
        return type; // Already in our format
    }
  };

  const convertedType = convertContractBetType(betType, numbers);

  switch (convertedType) {
    case BetTypes.STRAIGHT:
      return numbers && numbers.length > 0
        ? `Number ${numbers[0]}`
        : "Straight";
    case BetTypes.DOZEN_FIRST:
      return "First Dozen (1-12)";
    case BetTypes.DOZEN_SECOND:
      return "Second Dozen (13-24)";
    case BetTypes.DOZEN_THIRD:
      return "Third Dozen (25-36)";
    case BetTypes.COLUMN_FIRST:
      return "First Column";
    case BetTypes.COLUMN_SECOND:
      return "Second Column";
    case BetTypes.COLUMN_THIRD:
      return "Third Column";
    case BetTypes.RED:
      return "Red";
    case BetTypes.BLACK:
      return "Black";
    case BetTypes.EVEN:
      return "Even";
    case BetTypes.ODD:
      return "Odd";
    case BetTypes.LOW:
      return "Low (1-18)";
    case BetTypes.HIGH:
      return "High (19-36)";
    default:
      return "Unknown Bet";
  }
};

// Helper functions to match contract functionality
export const BetHelpers = {
  // Get bet type info (matches contract's getBetTypeInfo)
  getBetTypeInfo: (betTypeId) => {
    const type = Number(betTypeId);
    switch (type) {
      case BetTypes.STRAIGHT:
        return { name: "Straight", requiresNumber: true, multiplier: 35000 }; // 35x
      case BetTypes.DOZEN_FIRST:
        return {
          name: "First Dozen (1-12)",
          requiresNumber: false,
          multiplier: 20000,
        }; // 2x
      case BetTypes.DOZEN_SECOND:
        return {
          name: "Second Dozen (13-24)",
          requiresNumber: false,
          multiplier: 20000,
        };
      case BetTypes.DOZEN_THIRD:
        return {
          name: "Third Dozen (25-36)",
          requiresNumber: false,
          multiplier: 20000,
        };
      case BetTypes.COLUMN_FIRST:
        return {
          name: "First Column",
          requiresNumber: false,
          multiplier: 20000,
        };
      case BetTypes.COLUMN_SECOND:
        return {
          name: "Second Column",
          requiresNumber: false,
          multiplier: 20000,
        };
      case BetTypes.COLUMN_THIRD:
        return {
          name: "Third Column",
          requiresNumber: false,
          multiplier: 20000,
        };
      case BetTypes.RED:
        return { name: "Red", requiresNumber: false, multiplier: 10000 }; // 1x
      case BetTypes.BLACK:
        return { name: "Black", requiresNumber: false, multiplier: 10000 };
      case BetTypes.EVEN:
        return { name: "Even", requiresNumber: false, multiplier: 10000 };
      case BetTypes.ODD:
        return { name: "Odd", requiresNumber: false, multiplier: 10000 };
      case BetTypes.LOW:
        return { name: "Low (1-18)", requiresNumber: false, multiplier: 10000 };
      case BetTypes.HIGH:
        return {
          name: "High (19-36)",
          requiresNumber: false,
          multiplier: 10000,
        };
      default:
        throw new Error("Invalid bet type");
    }
  },

  // Validate bet parameters (matches contract's validation)
  validateBetParameters: (bet) => {
    try {
      // Check bet type range
      if (!BetTypes.isValid(bet.type)) {
        throw new Error("Invalid bet type");
      }

      // Check bet amount
      if (
        !bet.amount ||
        bet.amount <= 0 ||
        bet.amount > CONTRACT_CONSTANTS.MAX_BET_AMOUNT
      ) {
        throw new Error("Invalid bet amount");
      }

      // Check if numbers array exists
      if (!bet.numbers || !Array.isArray(bet.numbers)) {
        throw new Error("Invalid bet numbers");
      }

      // For straight bets, validate number
      if (bet.type === BetTypes.STRAIGHT) {
        if (
          bet.numbers.length !== 1 ||
          bet.numbers[0] < 0 ||
          bet.numbers[0] > 36
        ) {
          throw new Error("Invalid number for straight bet");
        }
        return true;
      }

      // Get expected numbers for this bet type
      const expectedNumbers = BetTypes.getNumbers(bet.type);

      // For dozen and column bets, check exact sequence match
      if (
        [
          BetTypes.DOZEN_FIRST,
          BetTypes.DOZEN_SECOND,
          BetTypes.DOZEN_THIRD,
          BetTypes.COLUMN_FIRST,
          BetTypes.COLUMN_SECOND,
          BetTypes.COLUMN_THIRD,
        ].includes(bet.type)
      ) {
        // Check length first
        if (bet.numbers.length !== expectedNumbers.length) {
          return true; // Allow partial matches for these bet types
        }
        // Check if all numbers are in the expected set
        const isValid = bet.numbers.every((num) =>
          expectedNumbers.includes(num),
        );
        if (!isValid) {
          throw new Error(
            `Invalid numbers for ${BetHelpers.getBetTypeInfo(bet.type).name}`,
          );
        }
        return true;
      }

      // For other bet types (RED, BLACK, EVEN, ODD, LOW, HIGH)
      // Check if all numbers are in the expected set
      const isValid = bet.numbers.every((num) => expectedNumbers.includes(num));
      if (!isValid) {
        throw new Error(
          `Invalid numbers for ${BetHelpers.getBetTypeInfo(bet.type).name}`,
        );
      }

      return true;
    } catch (error) {
      throw error;
    }
  },

  // Format a bet request for the contract
  formatBetRequest: (bet, isRed) => {
    if (!BetTypes.isValid(bet.type)) {
      throw new Error(`Invalid bet type: ${bet.type}`);
    }

    // Get the correct number parameter based on bet type
    let number;
    switch (bet.type) {
      case BetTypes.STRAIGHT:
        // Improved straight bet validation
        if (!bet.numbers || bet.numbers.length !== 1) {
          throw new Error("Straight bet must have exactly one number");
        }

        const straightNumber = Number(bet.numbers[0]);

        // Check if it's a valid number (0-36)
        if (
          !Number.isInteger(straightNumber) ||
          straightNumber < 0 ||
          straightNumber > 36
        ) {
          throw new Error(
            `Invalid number for straight bet: ${bet.numbers[0]}. Must be between 0 and 36`,
          );
        }

        number = straightNumber;
        break;

      case BetTypes.DOZEN_FIRST:
        // Validate dozen bet numbers
        if (!bet.numbers?.every((n) => n >= 1 && n <= 12)) {
          throw new Error("Invalid numbers for first dozen bet");
        }
        number = 1;
        break;

      case BetTypes.DOZEN_SECOND:
        if (!bet.numbers?.every((n) => n >= 13 && n <= 24)) {
          throw new Error("Invalid numbers for second dozen bet");
        }
        number = 13;
        break;

      case BetTypes.DOZEN_THIRD:
        if (!bet.numbers?.every((n) => n >= 25 && n <= 36)) {
          throw new Error("Invalid numbers for third dozen bet");
        }
        number = 25;
        break;

      case BetTypes.COLUMN_FIRST:
        if (!bet.numbers?.every((n) => (n - 1) % 3 === 0)) {
          throw new Error("Invalid numbers for first column bet");
        }
        number = 1;
        break;

      case BetTypes.COLUMN_SECOND:
        if (!bet.numbers?.every((n) => (n - 2) % 3 === 0)) {
          throw new Error("Invalid numbers for second column bet");
        }
        number = 2;
        break;

      case BetTypes.COLUMN_THIRD:
        if (!bet.numbers?.every((n) => n % 3 === 0)) {
          throw new Error("Invalid numbers for third column bet");
        }
        number = 3;
        break;

      case BetTypes.RED:
        if (!bet.numbers?.every((n) => isRed(n))) {
          throw new Error("Invalid numbers for red bet");
        }
        number = 0;
        break;

      case BetTypes.BLACK:
        if (!bet.numbers?.every((n) => !isRed(n) && n !== 0)) {
          throw new Error("Invalid numbers for black bet");
        }
        number = 0;
        break;

      case BetTypes.EVEN:
        if (!bet.numbers?.every((n) => n % 2 === 0 && n !== 0)) {
          throw new Error("Invalid numbers for even bet");
        }
        number = 0;
        break;

      case BetTypes.ODD:
        if (!bet.numbers?.every((n) => n % 2 === 1)) {
          throw new Error("Invalid numbers for odd bet");
        }
        number = 0;
        break;

      case BetTypes.LOW:
        if (!bet.numbers?.every((n) => n >= 1 && n <= 18)) {
          throw new Error("Invalid numbers for low bet");
        }
        number = 0;
        break;

      case BetTypes.HIGH:
        if (!bet.numbers?.every((n) => n >= 19 && n <= 36)) {
          throw new Error("Invalid numbers for high bet");
        }
        number = 0;
        break;

      default:
        throw new Error(`Unsupported bet type: ${bet.type}`);
    }

    // Validate amount
    const amount = BigInt(bet.amount);
    if (amount < ethers.parseEther("1")) {
      throw new Error(`Minimum bet amount is 1 GAMA token`);
    }
    if (amount > CONTRACT_CONSTANTS.MAX_BET_AMOUNT) {
      throw new Error(
        `Maximum bet amount per position is ${ethers.formatEther(
          CONTRACT_CONSTANTS.MAX_BET_AMOUNT,
        )} GAMA`,
      );
    }

    return {
      betTypeId: bet.type,
      number: number,
      amount: amount.toString(),
    };
  },
};
