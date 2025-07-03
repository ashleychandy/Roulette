import { useMemo, useEffect } from "react";

import {
  useBetSelection,
  useTokenApproval,
  useRouletteBalance,
  useLastWinningNumber,
  useBetHistory,
  usePlaceBet,
  useBetTypes,
  useDetailedBetInfo,
  useRouletteAdmin,
} from "./index";

/**
 * Main roulette hook that composes all other roulette-related hooks
 * @param {Object} contracts - The contract instances
 * @param {string} account - The user account address
 * @param {Function} onError - The error handling function
 * @param {Function} addToast - The toast notification function
 * @returns {Object} Consolidated roulette state and functions
 */
export const useRoulette = (contracts, account, onError, addToast) => {
  // Use specialized hooks for different concerns
  const { balanceData } = useRouletteBalance(contracts, account);

  const {
    isApproved,
    isCheckingApproval,
    isProcessing: isApprovalProcessing,
    handleApprove,
  } = useTokenApproval(contracts, account, onError, addToast);

  const { lastWinningNumber } = useLastWinningNumber(contracts, account);

  const {
    userData,
    isLoading: isLoadingUserData,
    error: userDataError,
  } = useBetHistory(contracts, account, onError, addToast);

  const {
    selectedBets,
    selectedChipValue,
    totalBetAmount,
    handleBetSelect,
    handleChipValueChange,
    handleClearBets,
    handleUndoBet,
    getNumberBackgroundClass,
  } = useBetSelection(addToast);

  const { isProcessing: isPlaceBetProcessing, handlePlaceBets } = usePlaceBet(
    contracts,
    account,
    selectedBets,
    totalBetAmount,
    onError,
    addToast,
    handleClearBets,
  );

  // New hooks integration
  const {
    betTypes,
    betTypeInfo,
    winningNumbersMap,
    isLoading: isLoadingBetTypes,
  } = useBetTypes(contracts);

  const {
    isAdmin,
    isProcessing: isAdminProcessing,
    handlePause,
    handleUnpause,
    handleForceStop,
  } = useRouletteAdmin(contracts, account, onError, addToast);

  // Consolidated processing state
  const isProcessing = useMemo(
    () => isApprovalProcessing || isPlaceBetProcessing || isAdminProcessing,
    [isApprovalProcessing, isPlaceBetProcessing, isAdminProcessing],
  );

  return {
    // State
    selectedBets,
    selectedChipValue,
    isProcessing,
    totalBetAmount,
    isApproved,
    isCheckingApproval,

    // Data
    balanceData,
    userData,
    isLoadingUserData,
    userDataError,
    lastWinningNumber,

    // Bet Types and Info
    betTypes,
    betTypeInfo,
    winningNumbersMap,
    isLoadingBetTypes,

    // Admin Functions
    isAdmin,
    handlePause,
    handleUnpause,
    handleForceStop,

    // Handlers
    handleBetSelect,
    handlePlaceBets,
    handleChipValueChange,
    handleClearBets,
    handleUndoBet,
    handleApprove,
    getNumberBackgroundClass,
  };
};
