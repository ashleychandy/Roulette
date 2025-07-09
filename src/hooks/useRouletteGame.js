import { useMemo } from "react";
import {
  useRouletteBalance,
  useTokenApproval,
  useBetHistory,
  useLastWinningNumber,
  useBetSelection,
  usePlaceBet,
  useRouletteVisuals,
  useBetAmount,
} from "./index";

/**
 * Main hook for managing the roulette game state and actions.
 * This hook composes multiple specialized hooks to provide a unified API.
 *
 * @param {Object} contracts - The contract instances
 * @param {string} account - The user account address
 * @param {Function} onError - The error handling function
 * @param {Function} addToast - The toast notification function
 * @returns {Object} Consolidated roulette game state and functions
 */
export const useRouletteGame = (contracts, account, onError, addToast) => {
  // Use balance hook
  const { balanceData } = useRouletteBalance(contracts, account);

  // Use token approval hook
  const {
    isApproved,
    isCheckingApproval,
    isProcessing: isApprovalProcessing,
    handleApprove,
  } = useTokenApproval(contracts, account, onError, addToast);

  // Use bet history hook
  const { userData, isLoadingUserData, userDataError } = useBetHistory(
    contracts,
    account,
    onError,
    addToast,
  );

  // Use last winning number hook
  const { lastWinningNumber } = useLastWinningNumber(contracts, account);

  // Use bet selection hook
  const {
    selectedBets,
    selectedChipValue,
    totalBetAmount,
    handleBetSelect,
    handleChipValueChange,
    handleClearBets,
    handleUndoBet,
  } = useBetSelection(addToast);

  // Use place bet hook
  const { isProcessing: isPlaceBetProcessing, handlePlaceBets } = usePlaceBet(
    contracts,
    account,
    selectedBets,
    totalBetAmount,
    onError,
    addToast,
    handleClearBets,
  );

  // Use visuals hook
  const { getNumberBackgroundClass } = useRouletteVisuals();

  // Use bet amount hook
  const { getBetAmount } = useBetAmount(selectedBets);

  // Consolidated processing state
  const isProcessing = useMemo(
    () => isApprovalProcessing || isPlaceBetProcessing || isRecovering,
    [isApprovalProcessing, isPlaceBetProcessing, isRecovering],
  );

  return {
    // State
    selectedBets,
    selectedChipValue,
    isProcessing,
    totalBetAmount,
    isApproved,
    isCheckingApproval,
    balanceData,
    userData,
    isLoadingUserData,
    lastWinningNumber,
    canStartNewGame,
    isRecovering,

    // Handlers
    handleBetSelect,
    handlePlaceBets,
    handleChipValueChange,
    handleClearBets,
    handleUndoBet,
    handleApprove,
    recoverStuckGame,

    // Helper functions
    getNumberBackgroundClass,
    getBetAmount,
  };
};
