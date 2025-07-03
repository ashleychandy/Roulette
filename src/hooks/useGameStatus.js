import { usePollingService } from "../services/pollingService.jsx";

/**
 * Hook for accessing the current game status with VRF information
 * This hook wraps the polling service and adds additional derived data
 */
export const useGameStatus = () => {
  const { gameStatus, isLoading, error, refreshData, isVrfPending } =
    usePollingService();

  // Derived state specifically for VRF tracking
  const vrfStatus = gameStatus
    ? {
        isActive: gameStatus.isActive,
        isWaitingForVRF: isVrfPending,
        requestExists: gameStatus.requestExists,
        requestProcessed: gameStatus.requestProcessed,
        recoveryEligible: gameStatus.recoveryEligible,
        requestId: gameStatus.requestId,
        lastPlayTimestamp: gameStatus.lastPlayTimestamp,
      }
    : null;

  return {
    gameStatus,
    vrfStatus,
    isLoading,
    error,
    refetch: refreshData,
    isVrfPending,
  };
};
