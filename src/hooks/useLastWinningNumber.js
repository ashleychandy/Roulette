import { useQuery } from "@tanstack/react-query";
import { CONTRACT_RESULT_STATES } from "../constants/roulette_constants";

/**
 * Custom hook to get the last winning number from completed bets
 * @param {Object} contracts - The contract instances
 * @param {string} account - The user account address
 * @returns {Object} The last winning number data and loading state
 */
export const useLastWinningNumber = (contracts, account) => {
  const { data: lastWinningNumber, isLoading } = useQuery({
    queryKey: ["lastWinningNumber", account],
    queryFn: async () => {
      if (!contracts?.roulette || !account) {
        return null;
      }
      try {
        // Get more bets to ensure we find a completed one
        let bets = [];

        try {
          // For new users, this call might fail with decoding errors
          [bets] = await contracts.roulette.getUserBetHistory(account, 0, 20);
        } catch (historyError) {
          // For new users with no history, return null instead of failing
          if (
            historyError.message &&
            historyError.message.includes("could not decode result data")
          ) {
            return null;
          }
          // For other errors, rethrow
          throw historyError;
        }

        // Return the winning number from most recent bet if exists
        if (bets && Array.isArray(bets) && bets.length > 0) {
          // Sort bets by timestamp in descending order
          const sortedBets = [...bets].sort(
            (a, b) => Number(b.timestamp) - Number(a.timestamp),
          );

          // Find the first completed bet with a valid winning number
          // Include special result values (RECOVERED=255 and FORCE_STOPPED=254)
          const validBet = sortedBets.find(
            (bet) =>
              bet.completed === true &&
              bet.winningNumber !== undefined &&
              bet.winningNumber !== null &&
              // Standard numbers (0-36)
              ((Number(bet.winningNumber) >= 0 &&
                Number(bet.winningNumber) <= 36) ||
                // Special result values
                Number(bet.winningNumber) ===
                  CONTRACT_RESULT_STATES.RECOVERED ||
                Number(bet.winningNumber) ===
                  CONTRACT_RESULT_STATES.FORCE_STOPPED),
          );

          if (validBet) {
            return Number(validBet.winningNumber);
          }
        }
        return null;
      } catch (error) {
        console.error("Error fetching last winning number:", error);
        return null;
      }
    },
    enabled: !!contracts?.roulette && !!account,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 2000,
    retry: 3,
  });

  return {
    lastWinningNumber,
    isLoading,
  };
};
