import { useQuery } from "@tanstack/react-query";

/**
 * Custom hook for fetching detailed bet information
 * @param {Object} contracts - The contract instances
 * @param {string} account - The user account address
 * @param {number} betIndex - The index of the bet to fetch details for
 * @returns {Object} Detailed bet information and loading state
 */
export const useDetailedBetInfo = (contracts, account, betIndex) => {
  // Get detailed bet information
  const {
    data: betDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = useQuery({
    queryKey: ["betDetails", account, betIndex],
    queryFn: async () => {
      if (!contracts?.roulette || !account || betIndex === undefined)
        return null;
      try {
        let details;
        try {
          details = await contracts.roulette.getBetDetails(account, betIndex);
        } catch (detailsError) {
          // If we can't get bet details due to decoding error, return null
          if (
            detailsError.message &&
            detailsError.message.includes("could not decode result data")
          ) {
            return null;
          }
          throw detailsError;
        }

        return {
          timestamp: Number(details.timestamp),
          winningNumber: Number(details.winningNumber),
          completed: details.completed,
          isActive: details.isActive,
          bets: details.bets.map((bet) => ({
            betType: Number(bet.betType),
            numbers: bet.numbers.map((n) => Number(n)),
            amount: bet.amount.toString(),
            payout: bet.payout.toString(),
          })),
          totalAmount: details.totalAmount.toString(),
          totalPayout: details.totalPayout.toString(),
        };
      } catch (error) {
        console.error("Error fetching bet details:", error);
        throw error;
      }
    },
    enabled: !!contracts?.roulette && !!account && betIndex !== undefined,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
    cacheTime: 30000,
    retry: 2,
  });

  return {
    betDetails,
    isLoadingDetails,
    detailsError,
  };
};
