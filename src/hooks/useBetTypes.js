import { useQuery } from "@tanstack/react-query";
import { BetTypes } from "../constants/roulette_constants";
import BetHelper from "../bet-helper/betHelper";

/**
 * Custom hook for managing bet types and validation
 * @param {Object} contracts - The contract instances
 * @returns {Object} Bet types information and validation functions
 */
export const useBetTypes = (contracts) => {
  // Get all available bet types from contract
  const { data: contractBetTypes, isLoading: isLoadingBetTypes } = useQuery({
    queryKey: ["contractBetTypes"],
    queryFn: async () => {
      if (!contracts?.roulette) return null;
      try {
        let betTypeIds = [];
        let names = [];
        let requiresNumbers = [];
        let payoutMultipliers = [];

        try {
          [betTypeIds, names, requiresNumbers, payoutMultipliers] =
            await contracts.roulette.getAllBetTypes();
        } catch (decodeError) {
          // If we can't get bet types from the contract, return a default set
          if (
            decodeError.message &&
            decodeError.message.includes("could not decode result data")
          ) {
            // Return null and let the UI handle it with defaults
            return null;
          }
          throw decodeError;
        }

        return betTypeIds.map((id, index) => ({
          id: Number(id),
          name: names[index],
          requiresNumber: requiresNumbers[index],
          payoutMultiplier: Number(payoutMultipliers[index]),
        }));
      } catch (error) {
        console.error("Error fetching bet types:", error);
        return null;
      }
    },
    enabled: !!contracts?.roulette,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // Get winning numbers for each bet type
  const { data: winningNumbersMap, isLoading: isLoadingWinningNumbers } =
    useQuery({
      queryKey: ["winningNumbers"],
      queryFn: async () => {
        if (!contracts?.roulette) return null;
        try {
          const numbersMap = {};
          // Only fetch for bet types that have fixed winning numbers
          const betTypesToFetch = [
            BetTypes.RED_BET,
            BetTypes.BLACK_BET,
            BetTypes.EVEN_BET,
            BetTypes.ODD_BET,
            BetTypes.LOW_BET,
            BetTypes.HIGH_BET,
          ];

          for (const betType of betTypesToFetch) {
            try {
              const numbers =
                await contracts.roulette.getPossibleWinningNumbers(betType);
              numbersMap[betType] = numbers.map((n) => Number(n));
            } catch (decodeError) {
              // If we can't get winning numbers for a specific bet type, use defaults
              if (
                decodeError.message &&
                decodeError.message.includes("could not decode result data")
              ) {
                numbersMap[betType] = BetTypes.getNumbers(betType);
              } else {
                throw decodeError;
              }
            }
          }
          return numbersMap;
        } catch (error) {
          console.error("Error fetching winning numbers:", error);
          return null;
        }
      },
      enabled: !!contracts?.roulette,
      staleTime: Infinity,
      cacheTime: Infinity,
    });

  // Helper functions
  const getBetTypeInfo = (betTypeId) => {
    if (!contractBetTypes) return null;
    return contractBetTypes.find((type) => type.id === betTypeId);
  };

  const getWinningNumbers = (betTypeId, selectedNumber = 0) => {
    // For dynamic bet types (straight, dozen, column), use local calculation
    if (BetTypes.requiresNumber(betTypeId)) {
      return BetTypes.isValidNumber(betTypeId, selectedNumber)
        ? [selectedNumber]
        : [];
    }

    // For fixed bet types, use contract data if available, otherwise fallback to local
    return winningNumbersMap?.[betTypeId] || BetTypes.getNumbers(betTypeId);
  };

  const validateBet = (
    betTypeId,
    number = 0,
    amount = "0",
    existingBets = [],
  ) => {
    // Check if contracts are available
    if (!contracts?.roulette) {
      return { valid: false, error: "Contract not initialized" };
    }

    // Validate bet type
    if (!BetTypes.isValid(betTypeId)) {
      return { valid: false, error: "Invalid bet type" };
    }

    // Get bet type info
    const info = getBetTypeInfo(betTypeId);
    if (!info) {
      return { valid: false, error: "Could not get bet type information" };
    }

    // Validate number for straight bets
    if (info.requiresNumber) {
      if (!BetTypes.isValidNumber(betTypeId, number)) {
        return {
          valid: false,
          error: "Invalid number for straight bet (must be 0-36)",
        };
      }
    } else if (number !== 0) {
      return {
        valid: false,
        error: "Number should not be specified for this bet type",
      };
    }

    // Validate amount
    try {
      const amountValidation = BetHelper.validateBetAmount(
        amount,
        existingBets,
      );
      if (!amountValidation.valid) {
        return amountValidation;
      }
    } catch (error) {
      return { valid: false, error: "Invalid bet amount format" };
    }

    // All validations passed
    return { valid: true };
  };

  return {
    betTypes: contractBetTypes,
    getBetTypeInfo,
    getWinningNumbers,
    validateBet,
    isLoading: isLoadingBetTypes || isLoadingWinningNumbers,
    BetTypes, // Export the BetTypes constants for direct access
  };
};
