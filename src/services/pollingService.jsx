import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { CONTRACT_CONSTANTS } from "../constants/roulette_constants";

// Create a context to share polling data
export const PollingContext = createContext(null);

export const PollingProvider = ({
  children,
  RouletteContract,
  account,
  activeGameInterval = 3000, // Poll more frequently during active games (3 seconds)
  vrfPendingInterval = 5000, // Poll even more frequently when waiting for VRF (5 seconds)
  inactiveInterval = 10000, // Poll less frequently when idle (10 seconds)
}) => {
  // State to hold all fetched data
  const [gameData, setGameData] = useState({
    gameStatus: null,
    betHistory: [],
    isLoading: true,
    lastUpdated: null,
    error: null,
    isNewUser: true, // Add new state to track if user is new
    vrfPending: false, // Track if we're waiting for VRF
  });

  // Add state to track if there's an active game
  const [hasActiveGame, setHasActiveGame] = useState(false);

  // Use refs for values we need to access in effects but don't want to cause re-renders
  const isNewUserRef = useRef(gameData.isNewUser);
  const RouletteContractRef = useRef(RouletteContract);
  const accountRef = useRef(account);
  const vrfPendingRef = useRef(false);

  // Update refs when dependencies change
  useEffect(() => {
    isNewUserRef.current = gameData.isNewUser;
    RouletteContractRef.current = RouletteContract;
    accountRef.current = account;
    vrfPendingRef.current = gameData.vrfPending;
  }, [gameData.isNewUser, RouletteContract, account, gameData.vrfPending]);

  // Determine current polling interval based on game state
  const currentPollingInterval = useCallback(() => {
    // If waiting for VRF results, poll more frequently
    if (
      hasActiveGame &&
      gameData.gameStatus?.requestExists &&
      !gameData.gameStatus?.requestProcessed
    ) {
      return vrfPendingInterval;
    }
    // If just an active game, poll regularly
    if (hasActiveGame) {
      return activeGameInterval;
    }
    // Otherwise, poll less frequently
    return inactiveInterval;
  }, [
    hasActiveGame,
    gameData.gameStatus,
    activeGameInterval,
    inactiveInterval,
    vrfPendingInterval,
  ]);

  // Fetch data from blockchain
  const fetchData = useCallback(async () => {
    const currentContract = RouletteContractRef.current;
    const currentAccount = accountRef.current;

    if (!currentContract || !currentAccount) {
      // For new users or during initial connection, this is expected
      // Just update the loading state without showing errors
      setGameData((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
        gameStatus: null,
        betHistory: [],
        lastUpdated: Date.now(),
      }));
      return;
    }

    // Update isLoading state
    setGameData((prev) => ({ ...prev, isLoading: true }));

    try {
      // Check which methods exist on the contract
      const hasGetGameStatus =
        typeof currentContract.getGameStatus === "function";
      const hasGetBetHistory =
        typeof currentContract.getBetHistory === "function";

      // Define promises based on available methods
      let promises = [];
      let promiseTypes = [];

      // 1. Game status
      if (hasGetGameStatus) {
        promises.push(
          currentContract.getGameStatus(currentAccount).catch((error) => {
            // For new users, decoding errors are expected
            if (
              error.message &&
              error.message.includes("could not decode result data")
            ) {
              return null;
            }
            throw error; // Re-throw other errors
          }),
        );
        promiseTypes.push("gameStatus");
      } else {
        promises.push(Promise.resolve(null));
        promiseTypes.push("gameStatus");
      }

      // 2. Bet history - Only fetch if user has placed bets before or there's an active game
      // For new users without any bets yet, we'll skip this call to save resources
      const currentIsNewUser = isNewUserRef.current;
      if (hasGetBetHistory && (!currentIsNewUser || hasActiveGame)) {
        promises.push(
          currentContract.getBetHistory(currentAccount).catch((error) => {
            // For new users, decoding errors are expected
            if (
              error.message &&
              error.message.includes("could not decode result data")
            ) {
              return [];
            }
            throw error; // Re-throw other errors
          }),
        );
        promiseTypes.push("betHistory");
      } else {
        promises.push(Promise.resolve([]));
        promiseTypes.push("betHistory");
      }

      // Wait for all promises to resolve
      const results = await Promise.allSettled(promises);

      // Extract results
      let gameStatus = {};
      let betHistory = [];
      let userHasPlacedBets = false;
      let vrfPending = false;

      // Process results by checking the type we stored
      results.forEach((result, index) => {
        const type = promiseTypes[index];

        if (result.status === "fulfilled") {
          if (type === "gameStatus" && result.value) {
            const status = result.value;

            gameStatus = {
              isActive: status.isActive,
              isWin: status.isWin,
              isCompleted: status.isCompleted,
              // For Roulette, there are multiple bets possible, but for VRF tracking
              // we only need to know if there's an active game
              chosenNumbers: status.betRequests ? status.betRequests : [],
              amount: status.totalAmount ? status.totalAmount.toString() : "0",
              result: Number(status.result),
              payout: status.totalPayout ? status.totalPayout.toString() : "0",
              requestId: status.requestId ? status.requestId.toString() : "0",
              recoveryEligible: status.recoveryEligible,
              lastPlayTimestamp: Number(status.lastPlayTimestamp || 0),
              requestExists: status.requestExists,
              requestProcessed: status.requestProcessed,
              // Derive requestFulfilled from requestProcessed which is what the contract returns
              requestFulfilled: status.requestProcessed,
            };

            // Check if user has placed bets before based on lastPlayTimestamp
            if (status.lastPlayTimestamp > 0) {
              userHasPlacedBets = true;
            }

            // Check if we're waiting for VRF results
            vrfPending =
              status.isActive &&
              status.requestExists &&
              !status.requestProcessed;
          } else if (type === "betHistory") {
            betHistory = processBetHistory(result.value);

            // If we got any bet history, user is not new
            if (betHistory && betHistory.length > 0) {
              userHasPlacedBets = true;
            }
          }
        }
      });

      // Update state with all data in a single setState call to avoid multiple re-renders
      setGameData({
        gameStatus,
        betHistory,
        isLoading: false,
        lastUpdated: Date.now(),
        error: null,
        isNewUser: !userHasPlacedBets, // Update new user state
        vrfPending, // Update VRF pending status
      });

      // Update active game status after state update to avoid circular dependencies
      if (gameStatus?.isActive !== undefined) {
        setHasActiveGame(gameStatus.isActive);
      }
    } catch (error) {
      setGameData((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || "Failed to fetch game data",
        lastUpdated: Date.now(),
      }));
    }
  }, [hasActiveGame]); // Only depend on hasActiveGame, use refs for other values

  // Process bet history data
  const processBetHistory = (bets) => {
    if (!bets || !Array.isArray(bets)) return [];

    const { RESULT_FORCE_STOPPED, RESULT_RECOVERED } = CONTRACT_CONSTANTS;

    const processedBets = bets
      .map((bet) => {
        try {
          const rolledNumber = Number(bet.result);
          let resultType = "normal";

          if (rolledNumber === RESULT_FORCE_STOPPED)
            resultType = "force_stopped";
          else if (rolledNumber === RESULT_RECOVERED) resultType = "recovered";
          else if (rolledNumber < 0 || rolledNumber > 36)
            resultType = "unknown";

          return {
            timestamp: Number(bet.timestamp),
            betRequests: bet.betRequests || [],
            result: rolledNumber,
            amount: bet.totalAmount ? bet.totalAmount.toString() : "0",
            payout: bet.totalPayout ? bet.totalPayout.toString() : "0",
            isWin: bet.isWin,
            resultType,
            status:
              resultType === "force_stopped"
                ? "Force Stopped"
                : resultType === "recovered"
                  ? "Recovered"
                  : resultType === "normal"
                    ? bet.isWin
                      ? "Won"
                      : "Lost"
                    : "Unknown",
          };
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.timestamp - a.timestamp);

    return processedBets;
  };

  // Set up polling interval - Only poll if user has placed bets or has an active game
  useEffect(() => {
    // Initial fetch (we'll always do one fetch to determine if user is new)
    fetchData();

    // Only set up polling if user has placed bets or has an active game
    if (!isNewUserRef.current || hasActiveGame) {
      const interval = currentPollingInterval();
      const intervalId = setInterval(fetchData, interval);

      // Clear and recreate interval when polling frequency changes
      return () => clearInterval(intervalId);
    }

    return undefined;
  }, [fetchData, hasActiveGame, currentPollingInterval]);

  // Expose functions and state
  const value = {
    ...gameData,
    refreshData: fetchData,
    hasActiveGame,
    isVrfPending: gameData.vrfPending,
  };

  return (
    <PollingContext.Provider value={value}>{children}</PollingContext.Provider>
  );
};

// Custom hook for using the game data
export const usePollingService = () => {
  const context = useContext(PollingContext);
  if (context === null) {
    throw new Error("usePollingService must be used within a PollingProvider");
  }
  return context;
};
