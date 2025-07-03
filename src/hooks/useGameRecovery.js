import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "./WalletContext";
import { useRouletteContract } from "./useRouletteContract";
import { useNotification } from "../contexts/NotificationContext";
import { usePollingService } from "../services/pollingService.jsx";
import { CONTRACT_CONSTANTS } from "../constants/roulette_constants";

// Constants from contract - using the ones defined in roulette_constants.js
const GAME_TIMEOUT = CONTRACT_CONSTANTS.GAME_TIMEOUT; // 1 hour in seconds
const BLOCK_THRESHOLD = CONTRACT_CONSTANTS.BLOCK_THRESHOLD;

/**
 * Hook for managing game recovery functionality
 * Aligns with contract's recoverOwnStuckGame function
 */
export const useGameRecovery = ({ onSuccess, onError } = {}) => {
  const { address: account, contracts: walletContracts } = useWallet();
  const { contract: routletteContractFromHook, contractError } =
    useRouletteContract();
  const { refreshData, gameStatus } = usePollingService();
  const { addToast } = useNotification();
  const [initialized, setInitialized] = useState(false);

  // Use contract from hook or fall back to wallet context
  const RouletteContract =
    routletteContractFromHook || walletContracts?.roulette;

  // Check contract initialization on mount and when dependencies change
  useEffect(() => {
    const hasContract = !!RouletteContract;
    setInitialized(hasContract);

    // Only show the warning if we're not in the initial loading state
    // and if the wallet has been connected for a while (to avoid showing
    // the warning during the normal connection process)
    if (!hasContract && account && !contractError) {
      // For new users, this is an expected state during initial connection
      // so we'll suppress this warning
      // console.warn(
      //   "Game recovery: Contract not initialized but wallet is connected"
      // );
    }
  }, [RouletteContract, account, contractError]);

  // Mutation for self-recovery
  const {
    mutate: recoverGame,
    isLoading: isRecovering,
    error: recoveryError,
  } = useMutation({
    mutationFn: async () => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      if (!RouletteContract) {
        throw new Error(
          "Contract not initialized. Please check your network connection.",
        );
      }

      try {
        const tx = await RouletteContract.recoverOwnStuckGame();
        const receipt = await tx.wait();
        return receipt;
      } catch (error) {
        // Enhance error message for specific contract errors
        if (error.message.includes("recovery")) {
          throw new Error(
            "Game is not eligible for recovery yet. Please wait until the timeout period.",
          );
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      addToast({
        title: "Game Recovery Successful",
        description: "Your stuck game has been recovered and refunded.",
        type: "success",
      });

      // Refresh data from polling service
      refreshData();

      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error) => {
      addToast({
        title: "Game Recovery Failed",
        description:
          error.message || "Failed to recover game. Please try again.",
        type: "error",
      });

      if (onError) {
        onError(error);
      }
    },
  });

  // Check if game is eligible for recovery
  const checkRecoveryEligibility = useCallback(
    async (playerAddress) => {
      // For new users or during initial connection, the contract might not be initialized yet
      // This is an expected state, so we'll return a more user-friendly message
      if (!RouletteContract) {
        return {
          eligible: false,
          reason: "No active game found",
          error: false,
        };
      }

      // If we need a specific address other than the current account,
      // we still need to make a direct contract call
      if (playerAddress && playerAddress !== account) {
        try {
          const status = await RouletteContract.getGameStatus(playerAddress);
          return processGameStatusForRecovery(status);
        } catch (error) {
          // If error is a decoding error for a new user, return a more specific message
          if (
            error.message &&
            error.message.includes("could not decode result data")
          ) {
            return {
              eligible: false,
              reason: "No game history found for this address",
              error: false,
            };
          }

          return {
            eligible: false,
            reason:
              "Failed to check game status: " +
              (error.message || "Unknown error"),
            error: true,
          };
        }
      }

      // For the current account, use the cached gameStatus from polling service
      if (gameStatus) {
        return processGameStatusForRecovery(gameStatus);
      }

      // Default response for new users with no game status
      return {
        eligible: false,
        reason: "No active game found",
        error: false,
      };
    },
    [RouletteContract, account, gameStatus],
  );

  // Helper function to process game status for recovery
  const processGameStatusForRecovery = (status) => {
    const {
      isActive,
      requestId,
      requestExists,
      requestProcessed,
      recoveryEligible,
      lastPlayTimestamp,
    } = status;

    if (!isActive) return { eligible: false, reason: "No active game" };

    const currentTime = Math.floor(Date.now() / 1000);
    const elapsedTime = currentTime - Number(lastPlayTimestamp);

    return {
      eligible: recoveryEligible,
      isActive,
      requestStatus: {
        id: requestId?.toString() || "0",
        exists: requestExists || false,
        processed: requestProcessed || false,
      },
      timeStatus: {
        elapsed: elapsedTime,
        timeoutReached: elapsedTime >= GAME_TIMEOUT,
        secondsUntilEligible: Math.max(0, GAME_TIMEOUT - elapsedTime),
      },
    };
  };

  return {
    // Recovery actions
    recoverGame,
    checkRecoveryEligibility,

    // Loading states
    isRecovering,
    initialized,

    // Errors
    recoveryError,
    contractError,

    // Constants
    GAME_TIMEOUT,
    BLOCK_THRESHOLD,
  };
};
