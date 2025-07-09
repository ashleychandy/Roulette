import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CONTRACT_RESULT_STATES } from "../constants/roulette_constants";

/**
 * Custom hook for fetching user bet history
 * @param {Object} contracts - The contract instances
 * @param {string} account - The user account address
 * @param {Function} onError - Error handler function (optional)
 * @param {Function} addToast - Toast notification function
 * @returns {Object} The betting history data and loading state
 */
export const useBetHistory = (contracts, account, onError, addToast) => {
  // Fetch user's betting data
  const {
    data: userData,
    isLoading: isLoadingUserData,
    error: userDataError,
  } = useQuery({
    queryKey: ["rouletteHistory", account],
    queryFn: async () => {
      if (!contracts?.roulette || !account) return null;
      try {
        // Use the updated getUserBetHistory function from the contract
        // which returns an array of bets and the total count
        let bets = [];
        let total = 0;

        try {
          // For new users, this call might fail with decoding errors
          [bets, total] = await contracts.roulette.getUserBetHistory(
            account,
            0,
            10,
          );
        } catch (historyError) {
          // For new users with no history, return empty array instead of failing
          if (
            historyError.message &&
            historyError.message.includes("could not decode result data")
          ) {
            return [];
          }
          // For other errors, rethrow
          throw historyError;
        }

        if (!bets || !Array.isArray(bets) || bets.length === 0) {
          return [];
        }

        // Process all bets, including active ones
        const processedBets = bets.map((bet) => {
          // Process individual bet details first
          const processedBetDetails = bet.bets.map((betDetail) => ({
            betType: Number(betDetail.betType),
            numbers: betDetail.numbers.map((n) => Number(n)),
            amount: betDetail.amount.toString(),
            payout: betDetail.payout.toString(),
          }));

          // Calculate totals after processing details
          const totalAmount = processedBetDetails.reduce(
            (sum, b) => sum + BigInt(b.amount),
            BigInt(0),
          );
          const totalPayout = processedBetDetails.reduce(
            (sum, b) => sum + BigInt(b.payout),
            BigInt(0),
          );

          // Get special result values from constants
          const RESULT_FORCE_STOPPED = CONTRACT_RESULT_STATES.FORCE_STOPPED; // 254
          const RESULT_RECOVERED = CONTRACT_RESULT_STATES.RECOVERED; // 255

          // Consider a number valid if it's between 0-36 or one of the special values
          const winningNum = Number(bet.winningNumber);
          const isSpecialResult =
            winningNum === RESULT_FORCE_STOPPED ||
            winningNum === RESULT_RECOVERED;

          // Modified logic: For active and uncompleted bets, don't treat 0 as a valid winning number
          // For completed bets, 0 can be a valid winning number
          const hasValidWinningNumber =
            isSpecialResult ||
            (bet.completed && winningNum >= 0 && winningNum <= 36) ||
            (!bet.completed && winningNum > 0 && winningNum <= 36);

          // A bet is waiting for VRF ONLY if:
          // 1. It's marked as active in the contract
          // 2. It's NOT marked as completed
          // 3. It does NOT have a valid winning number yet
          const isWaitingForVRF =
            bet.isActive && !bet.completed && !hasValidWinningNumber;

          // Only show winning number if bet is completed or we have a valid number
          // For completed bets, always show the winning number even if it's 0
          const winningNumber =
            bet.completed || hasValidWinningNumber
              ? Number(bet.winningNumber)
              : null;

          // Add detailed debug information for this bet
          console.log(`Bet details: 
            - winningNumber: ${winningNumber}
            - isActive: ${bet.isActive}
            - completed: ${bet.completed}
            - isWaitingForVRF: ${isWaitingForVRF}
            - totalAmount: ${totalAmount.toString()}
            - totalPayout: ${totalPayout.toString()}
            - Win/Loss: ${
              totalPayout > totalAmount
                ? "WIN"
                : totalPayout < totalAmount
                  ? "LOSS"
                  : "EVEN"
            }
          `);

          // Special debugging for zero result bets

          // Determine result type directly from contract data
          let resultType;
          if (winningNum === RESULT_RECOVERED) {
            resultType = "recovered";
          } else if (winningNum === RESULT_FORCE_STOPPED) {
            resultType = "force_stopped";
          } else if (isWaitingForVRF) {
            resultType = "pending";
          } else if (totalPayout > totalAmount) {
            resultType = "win";
          } else if (totalPayout < totalAmount) {
            resultType = "loss";
          } else if (totalPayout === totalAmount && totalAmount > 0) {
            resultType = "even";
          } else {
            resultType = "unknown";
          }

          return {
            timestamp: Number(bet.timestamp),
            winningNumber,
            bets: processedBetDetails,
            totalAmount: totalAmount.toString(),
            totalPayout: totalPayout.toString(),
            isWaitingForVRF,
            isActive: bet.isActive,
            completed: bet.completed,
            txHash: bet.txHash,
            isRecovered: winningNum === RESULT_RECOVERED,
            isForceStop: winningNum === RESULT_FORCE_STOPPED,
            resultType,
          };
        });

        // Log final processed bets
        console.log(
          "Final processed bets:",
          processedBets.map((bet) => ({
            timestamp: bet.timestamp,
            winningNumber: bet.winningNumber,
            isWaitingForVRF: bet.isWaitingForVRF,
            totalAmount: bet.totalAmount,
            totalPayout: bet.totalPayout,
            resultType: bet.resultType,
          })),
        );

        return processedBets;
      } catch (error) {
        console.error("Error fetching bet history:", error);
        if (typeof onError === "function") {
          onError(error);
        }
        return [];
      }
    },
    enabled: !!contracts?.roulette && !!account,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  // Handle error display
  useEffect(() => {
    if (userDataError && !userDataError._handled) {
      // Mark the error as handled to prevent infinite loops
      userDataError._handled = true;

      // Only show error message for actual errors, not for empty results
      if (
        userDataError.message &&
        !userDataError.message.includes("could not decode result data")
      ) {
        if (typeof onError === "function") {
          onError(userDataError);
        }

        // Display toast notification
        if (typeof addToast === "function") {
          addToast("Error fetching betting history", "error");
        }
      }
    }
  }, [userDataError, onError, addToast]);

  return {
    userData,
    isLoadingUserData,
    userDataError,
  };
};
