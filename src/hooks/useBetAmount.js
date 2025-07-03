import { useCallback } from "react";
import { ethers } from "ethers";
import { BetTypes } from "../constants/roulette_constants";

/**
 * Custom hook for getting bet amounts for specific positions
 * @param {Array} selectedBets - The current selected bets
 * @returns {Object} Bet amount query function
 */
export const useBetAmount = (selectedBets) => {
  // Helper function to get total bet amount for a position
  const getBetAmount = useCallback(
    (numbers, type) => {
      try {
        // For straight bets
        if (type === BetTypes.STRAIGHT) {
          const bet = selectedBets.find(
            (bet) =>
              bet.type === type &&
              bet.numbers?.[0] ===
                (Array.isArray(numbers) ? numbers[0] : numbers),
          );
          // Return exact amount without rounding for small numbers
          return bet ? parseFloat(ethers.formatEther(bet.amount)) : 0;
        }

        // For all other bets
        const bet = selectedBets.find((bet) => bet.type === type);
        // Return exact amount without rounding for small numbers
        return bet ? parseFloat(ethers.formatEther(bet.amount)) : 0;
      } catch (error) {
        console.error("Error in getBetAmount:", error);
        return 0;
      }
    },
    [selectedBets],
  );

  return {
    getBetAmount,
  };
};
