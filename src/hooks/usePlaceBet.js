import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { useQueryClient } from "@tanstack/react-query";
import {
  CONTRACT_CONSTANTS,
  CONTRACT_ERRORS,
  BetTypes,
} from "../constants/roulette_constants";
import { toast } from "react-toastify";

/**
 * Custom hook for placing bets in the roulette game
 * @param {Object} contracts - The contract instances
 * @param {string} account - The user account address
 * @param {Array} selectedBets - The currently selected bets
 * @param {BigInt} totalBetAmount - The total amount being bet
 * @param {Function} onError - Error handler function (optional)
 * @param {Function} addToast - Toast notification function
 * @param {Function} resetBets - Function to reset bets after successful placement
 * @returns {Object} Bet placing state and function
 */
export const usePlaceBet = (
  contracts,
  account,
  selectedBets,
  totalBetAmount,
  onError,
  addToast,
  resetBets,
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentVrfRequestId, setCurrentVrfRequestId] = useState(null);
  const [isVrfPending, setIsVrfPending] = useState(false);
  const queryClient = useQueryClient();

  // Using a timer to automatically reset VRF request ID after a timeout
  useEffect(() => {
    if (currentVrfRequestId) {
      const timeoutId = setTimeout(() => {
        console.log("Auto timeout clearing VRF request ID");
        setCurrentVrfRequestId(null);
        setIsVrfPending(false);
      }, 60000); // 1 minute timeout

      return () => clearTimeout(timeoutId);
    }
  }, [currentVrfRequestId]);

  const handlePlaceBets = useCallback(async () => {
    if (!contracts?.roulette || !account || selectedBets.length === 0) return;

    // Constants for retry and timeout
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds
    const TRANSACTION_TIMEOUT = 60000; // 60 seconds

    console.log(
      "Starting bet placement, current VRF request ID:",
      currentVrfRequestId,
    );

    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
      try {
        setIsProcessing(true);

        // 1. Validate and format bets
        const betRequests = selectedBets.map((bet) => {
          // Validate bet type
          if (!BetTypes.isValid(bet.type)) {
            throw new Error(`Invalid bet type: ${bet.type}`);
          }

          let betTypeId = bet.type;
          let number = 0; // Default to 0 for most bet types

          // Handle specific bet types
          switch (bet.type) {
            case BetTypes.STRAIGHT:
              // For straight bets, we need the actual number
              number = bet.numbers?.[0] || 0;
              if (number < 0 || number > 36) {
                throw new Error(`Invalid number for straight bet: ${number}`);
              }
              break;

            case BetTypes.DOZEN_FIRST:
              number = 1; // First number in dozen
              break;

            case BetTypes.DOZEN_SECOND:
              number = 13; // First number in dozen
              break;

            case BetTypes.DOZEN_THIRD:
              number = 25; // First number in dozen
              break;

            case BetTypes.COLUMN_FIRST:
              number = 1; // First number in column
              break;

            case BetTypes.COLUMN_SECOND:
              number = 2; // First number in column
              break;

            case BetTypes.COLUMN_THIRD:
              number = 3; // First number in column
              break;

            // For all other bet types (RED, BLACK, EVEN, ODD, LOW, HIGH)
            // number remains 0 as they don't require a specific number
          }

          return {
            betTypeId: betTypeId,
            number: number,
            amount: bet.amount,
          };
        });

        // 2. Calculate total amount
        const calculatedTotalAmount = betRequests.reduce(
          (sum, bet) => sum + BigInt(bet.amount),
          BigInt(0),
        );

        // Ensure calculated total matches expected total
        if (calculatedTotalAmount !== totalBetAmount) {
          throw new Error(
            `Total bet amount mismatch. Expected: ${totalBetAmount}, Got: ${calculatedTotalAmount}`,
          );
        }

        // 3. Pre-transaction checks
        const [balance, allowance] = await Promise.all([
          contracts.token.balanceOf(account),
          contracts.token.allowance(account, contracts.roulette.target),
        ]);

        if (balance < totalBetAmount) {
          throw new Error(
            `Insufficient balance. Required: ${ethers.formatEther(
              totalBetAmount,
            )} GAMA`,
          );
        }

        if (allowance < totalBetAmount) {
          throw new Error(`Insufficient allowance. Please approve more tokens`);
        }

        // 4. Place bet transaction
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const rouletteWithSigner = contracts.roulette.connect(signer);

        // Get gas options with buffer
        const gasEstimate =
          await rouletteWithSigner.placeBet.estimateGas(betRequests);
        const feeData = await provider.getFeeData();
        const adjustedGasLimit = (gasEstimate * BigInt(120)) / BigInt(100); // 20% buffer
        const adjustedGasPrice = (feeData.gasPrice * BigInt(120)) / BigInt(100); // 20% buffer

        // Execute transaction
        const tx = await rouletteWithSigner.placeBet(betRequests, {
          gasLimit: adjustedGasLimit,
          gasPrice: adjustedGasPrice,
        });

        addToast("Bet placed! Waiting for confirmation...", "info");

        // 5. Wait for transaction confirmation
        const receipt = await tx.wait(2); // Wait for 2 confirmations

        if (receipt.status === 1) {
          // Transaction was successful
          addToast("Bet placed successfully! Waiting for result...", "info");

          // Find the requestId from transaction events
          let requestId = null;
          try {
            // Get the game status to find the current requestId
            try {
              const gameStatus =
                await contracts.roulette.getGameStatus(account);
              requestId = gameStatus[6]?.toString(); // requestId is at index 6
            } catch (statusError) {
              // If we can't get the game status due to decoding error, continue without requestId
              if (
                !statusError.message ||
                !statusError.message.includes("could not decode result data")
              ) {
                throw statusError;
              }
            }

            if (requestId && requestId !== "0") {
              setCurrentVrfRequestId(requestId);
              setIsVrfPending(true);
            }
          } catch (error) {
            // Don't fail the whole transaction if we can't get the requestId
            console.error("Failed to get requestId:", error);
          }

          // Reset UI
          resetBets();

          // Invalidate queries
          queryClient.invalidateQueries(["balance", account]);
          queryClient.invalidateQueries(["rouletteHistory", account]);
          queryClient.invalidateQueries(["gameStatus", account]);
        }

        break; // Exit retry loop on success
      } catch (error) {
        console.error("Bet placement error:", error);

        // Handle specific error cases
        if (error.code === "CALL_EXCEPTION") {
          const errorName = error.data ? error.data.split("(")[0] : null;
          const errorMessage =
            CONTRACT_ERRORS[errorName] ||
            "Transaction failed. Please try again.";
          addToast(errorMessage, "error");
          // When there's a contract error, we should reset the VRF request ID
          setCurrentVrfRequestId(null);
          setIsVrfPending(false);
          break; // Don't retry on contract errors
        } else if (error.code === "ACTION_REJECTED") {
          addToast("Transaction rejected by user", "warning");
          // Reset VRF request ID when user rejects
          setCurrentVrfRequestId(null);
          setIsVrfPending(false);
          break; // Don't retry on user rejection
        } else if (error.code === "INSUFFICIENT_FUNDS") {
          addToast("Insufficient funds to cover gas fees", "error");
          // Reset VRF request ID on insufficient funds
          setCurrentVrfRequestId(null);
          setIsVrfPending(false);
          break; // Don't retry on insufficient funds
        } else if (error.code === "REPLACEMENT_UNDERPRICED") {
          retryCount++;
          if (retryCount < MAX_RETRIES) {
            addToast(
              `Transaction underpriced. Retrying... (${retryCount}/${MAX_RETRIES})`,
              "warning",
            );
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
            continue; // Retry with higher gas price
          }
        }

        // Generic error handling
        addToast(
          "Failed to place bet: " + (error.reason || error.message),
          "error",
        );
        // Always reset the VRF request ID when there's an error
        setCurrentVrfRequestId(null);
        setIsVrfPending(false);
        typeof onError === "function" && onError(error);
        break;
      } finally {
        setIsProcessing(false);
      }
    }
  }, [
    contracts?.roulette,
    contracts?.token,
    account,
    selectedBets,
    totalBetAmount,
    addToast,
    onError,
    queryClient,
    resetBets,
    currentVrfRequestId,
  ]);

  return {
    isProcessing,
    currentVrfRequestId,
    handlePlaceBets,
    isVrfPending,
  };
};
