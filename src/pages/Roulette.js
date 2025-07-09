import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import bgOverlay from "../assets/bg-overlay1.jpg";
import LoadingSpinner from "../components/roulette/LoadingSpinner";
import LastNumberDisplay from "../components/roulette/LastNumberDisplay";
import BetChip from "../components/roulette/BetChip";
import BettingBoard from "../components/roulette/BettingBoard";
import BettingHistory from "../components/roulette/BettingHistory";
import WelcomeBanner from "../components/roulette/WelcomeBanner";
import ApprovalGuide from "../components/roulette/ApprovalGuide";
import GameRulesAndOdds from "../components/roulette/GameRulesAndOdds";
import { VrfRecoveryModal } from "../components/vrf";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faSync } from "@fortawesome/free-solid-svg-icons";
import {
  CHIP_VALUES,
  CONTRACT_CONSTANTS,
  BetTypes,
  isRed,
} from "../constants/roulette_constants";
import { usePlaceBet } from "../hooks/usePlaceBet";
import { useRouletteVisuals } from "../hooks/useRouletteVisuals";
import { useLastWinningNumber } from "../hooks/useLastWinningNumber";
import { useBetHistory } from "../hooks/useBetHistory";
import { useGameRecovery } from "../hooks/useGameRecovery";
import { usePollingService } from "../services/pollingService.jsx";
import { useWallet } from "../hooks/WalletContext";

const RoulettePage = ({
  contracts,
  account,
  handleError,
  addToast,
  isConnected,
  isNetworkSupported,
  loadingStates,
}) => {
  // State management
  const [selectedBets, setSelectedBets] = useState([]);
  const [selectedChipValue, setSelectedChipValue] = useState(
    CHIP_VALUES[0].value,
  );
  const [totalBetAmount, setTotalBetAmount] = useState(BigInt(0));
  const [isApproved, setIsApproved] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(true);
  const [isVrfModalOpen, setIsVrfModalOpen] = useState(false);

  // Get game status for recovery
  const { gameStatus } = usePollingService();
  const { isRecovering } = useGameRecovery();

  // Get React Query client
  const queryClient = useQueryClient();

  // Fetch betting history using the hook
  const {
    userData: bettingHistory,
    isLoadingUserData: isLoadingBettingHistory,
    userDataError,
  } = useBetHistory(contracts, account, handleError, addToast);

  // Get the wallet connect function
  const { connectWallet } = useWallet();

  // Handle clear bets
  const handleClearBets = useCallback(() => {
    setSelectedBets([]);
    setTotalBetAmount(BigInt(0));
  }, []);

  // Handle undo bet (remove last bet)
  const handleUndoBet = useCallback(() => {
    setSelectedBets((prev) => {
      const newBets = [...prev];
      newBets.pop(); // Remove the last bet

      // Update total bet amount
      const newTotalAmount = newBets.reduce(
        (sum, bet) => sum + BigInt(bet.amount),
        BigInt(0),
      );
      setTotalBetAmount(newTotalAmount);

      return newBets;
    });
  }, []);

  // Get the place bet hook - simplified from original by removing VRF tracking
  const { handlePlaceBets, isProcessing } = usePlaceBet(
    contracts,
    account,
    selectedBets,
    totalBetAmount,
    handleError,
    addToast,
    handleClearBets,
  );

  // Add balance query
  const { data: balanceData } = useQuery({
    queryKey: ["balance", account, contracts?.token?.target],
    queryFn: async () => {
      if (!contracts?.token || !account) return null;

      const balance = await contracts.token.balanceOf(account);
      return { balance };
    },
    enabled: !!contracts?.token && !!account,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  // Get the last winning number using the hook
  const { lastWinningNumber } = useLastWinningNumber(contracts, account);

  // Get visual helpers
  const { getNumberBackgroundClass } = useRouletteVisuals();

  // Get bet amount for a position
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

  // Handle bet selection
  const handleBetSelect = useCallback(
    (numbers, type) => {
      if (!isConnected) {
        // If not connected, prompt to connect wallet
        addToast("Please connect your wallet to place bets", "info");
        return;
      }

      setSelectedBets((prev) => {
        try {
          // Validate bet type matches contract expectations
          if (!BetTypes.isValid(type)) {
            addToast("Invalid bet type selected", "error");
            return prev;
          }

          // Check max bets per spin limit
          if (prev.length >= CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN) {
            addToast(
              `Maximum ${CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN} bets allowed per spin`,
              "error",
            );
            return prev;
          }

          // Format and validate numbers array
          const formattedNumbers = numbers.map((n) => {
            const num = Number(n);
            if (isNaN(num) || num < 0 || num > 36) {
              throw new Error(`Invalid number: ${n}`);
            }
            return num;
          });

          const betAmount = BigInt(selectedChipValue);

          // Calculate new total amount including this bet
          const newTotalAmount = prev.reduce(
            (sum, bet) => sum + BigInt(bet.amount),
            betAmount,
          );

          // Validate total amount early
          if (newTotalAmount > CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT) {
            addToast(
              `Maximum total bet amount is ${ethers.formatEther(
                CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT,
              )} GAMA`,
              "error",
            );
            return prev;
          }

          // Add new bet
          const newBets = [...prev];
          const existingBetIndex = prev.findIndex(
            (bet) =>
              bet.type === type &&
              JSON.stringify((bet.numbers || []).sort()) ===
                JSON.stringify((formattedNumbers || []).sort()),
          );

          if (existingBetIndex !== -1) {
            // Update existing bet
            const newAmount =
              BigInt(newBets[existingBetIndex].amount) + betAmount;
            if (newAmount > CONTRACT_CONSTANTS.MAX_BET_AMOUNT) {
              addToast(
                `Maximum bet amount per position is ${ethers.formatEther(
                  CONTRACT_CONSTANTS.MAX_BET_AMOUNT,
                )} GAMA`,
                "error",
              );
              return prev;
            }
            newBets[existingBetIndex] = {
              ...newBets[existingBetIndex],
              amount: newAmount.toString(),
            };
          } else {
            // Add new bet
            newBets.push({
              numbers: formattedNumbers,
              type,
              amount: betAmount.toString(),
            });
          }

          setTotalBetAmount(newTotalAmount);
          return newBets;
        } catch (error) {
          console.error("Bet selection error:", error);
          addToast(
            error?.message || "Invalid bet parameters. Please try again.",
            "error",
          );
          return prev;
        }
      });
    },
    [selectedChipValue, addToast, isConnected],
  );

  // Handle token approval
  const handleApprove = useCallback(async () => {
    if (!contracts?.token || !account || !contracts?.roulette) return;

    try {
      // Check roles separately to isolate issues
      let hasMinterRole = false;
      let hasBurnerRole = false;

      try {
        hasMinterRole = await contracts.token.hasRole(
          CONTRACT_CONSTANTS.MINTER_ROLE,
          contracts.roulette.target,
        );
      } catch (roleError) {
        // Continue with approval even if role check fails
      }

      try {
        hasBurnerRole = await contracts.token.hasRole(
          CONTRACT_CONSTANTS.BURNER_ROLE,
          contracts.roulette.target,
        );
      } catch (roleError) {
        // Continue with approval even if role check fails
      }

      // Only show warning if we could successfully check roles and they're missing
      if (
        (hasMinterRole === false || hasBurnerRole === false) &&
        hasMinterRole !== undefined &&
        hasBurnerRole !== undefined
      ) {
        addToast(
          "Warning: Roulette contract may be missing required roles. Proceeding with approval anyway.",
          "warning",
        );
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenWithSigner = contracts.token.connect(signer);

      // Approve a slightly higher amount to provide a buffer
      // Convert to BigInt, add 5% more, and convert back to string
      const requiredAmount = BigInt(
        CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT.toString(),
      );
      const bufferAmount =
        requiredAmount + (requiredAmount * BigInt(5)) / BigInt(100);

      // Approve with the buffer amount
      const tx = await tokenWithSigner.approve(
        contracts.roulette.target,
        bufferAmount.toString(),
      );

      addToast("Approval transaction submitted...", "info");

      await tx.wait();

      addToast("Token approval successful!", "success");

      // Refresh approval status
      setIsApproved(true);

      // Invalidate queries
      queryClient.invalidateQueries(["balance", account]);
    } catch (error) {
      const errorMessage = error?.reason || error?.message || "Unknown error";
      addToast("Failed to approve token: " + errorMessage, "error");
      if (error) {
        handleError(error);
      }
    }
  }, [
    contracts?.token,
    contracts?.roulette,
    account,
    addToast,
    handleError,
    queryClient,
  ]);

  // If there's an error fetching user data, show it to the user
  useEffect(() => {
    // We should NOT show an error message when data is loading
    // Only show error if there's an actual error in the userDataError
    if (userDataError && !isLoadingBettingHistory) {
      addToast(
        "Failed to load betting history. Please try again later.",
        "error",
      );
    }
  }, [userDataError, isLoadingBettingHistory, addToast, handleError]);

  // Check token approval
  const checkApprovalStatus = useCallback(async () => {
    if (!contracts?.token || !account || !contracts?.roulette) {
      setIsApproved(false);
      setIsCheckingApproval(false);
      return;
    }

    setIsCheckingApproval(true);
    try {
      // Check roles and allowance separately to isolate the issue
      let hasMinterRole = false;
      let hasBurnerRole = false;
      let allowance = BigInt(0);

      try {
        hasMinterRole = await contracts.token.hasRole(
          CONTRACT_CONSTANTS.MINTER_ROLE,
          contracts.roulette.target,
        );
      } catch (roleError) {
        // If hasRole fails, assume role is not granted
        hasMinterRole = false;
      }

      try {
        hasBurnerRole = await contracts.token.hasRole(
          CONTRACT_CONSTANTS.BURNER_ROLE,
          contracts.roulette.target,
        );
      } catch (roleError) {
        // If hasRole fails, assume role is not granted
        hasBurnerRole = false;
      }

      try {
        allowance = await contracts.token.allowance(
          account,
          contracts.roulette.target,
        );
      } catch (allowanceError) {
        // If allowance check fails, assume zero allowance
        allowance = BigInt(0);
      }

      // Contract must have both roles and sufficient allowance
      const hasRequiredRoles = hasMinterRole && hasBurnerRole;

      // Convert allowance to a comparable format
      const allowanceBN = BigInt(allowance.toString());
      const requiredAllowance = BigInt(
        CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT.toString(),
      );

      // Allow for a reasonable threshold (90% of required amount)
      const reasonableThreshold =
        (requiredAllowance * BigInt(90)) / BigInt(100);
      const hasSufficientAllowance = allowanceBN >= reasonableThreshold;

      const isApproved = hasRequiredRoles && hasSufficientAllowance;
      setIsApproved(isApproved);

      if (isApproved) {
        addToast("Token approval confirmed!", "success");
      } else if (allowanceBN > 0) {
        // If there's some allowance but not enough, show a different message
        addToast(
          "Partial approval detected. You may need to approve more tokens.",
          "info",
        );
      }
    } catch (error) {
      setIsApproved(false);
    } finally {
      setIsCheckingApproval(false);
    }
  }, [contracts?.token, contracts?.roulette, account, addToast]);

  // Run approval check on mount and when dependencies change
  useEffect(() => {
    let mounted = true;

    const runCheck = async () => {
      if (!mounted) return;
      await checkApprovalStatus();
    };

    runCheck();

    return () => {
      mounted = false;
    };
  }, [checkApprovalStatus]);

  // Handler for opening VRF recovery modal
  const handleOpenVrfRecovery = useCallback(() => {
    setIsVrfModalOpen(true);
  }, []);

  // Add animation variants for page transitions
  const pageVariants = useMemo(
    () => ({
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    }),
    [],
  );

  return (
    <motion.div
      className="min-h-screen relative overflow-x-hidden"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-50 pointer-events-none"
        style={{
          backgroundImage: `url(${bgOverlay})`,
          zIndex: 0,
        }}
      />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <div className="space-y-8">
          {/* Game Title and Description */}
          <motion.div
            className="text-center space-y-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-[#22AD74]/10 blur-3xl rounded-full transform -translate-y-1/2"></div>
              <h1 className="text-6xl font-bold bg-gradient-to-r from-[#22AD74] to-[#22AD74]/70 bg-clip-text text-transparent drop-shadow-xl relative">
                Roulette
              </h1>
            </div>
            <div className="relative">
              <div className="h-px w-24 bg-gradient-to-r from-[#22AD74] to-transparent absolute left-1/2 -translate-x-1/2"></div>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto mt-6 font-light tracking-wide">
                Play with GAMA Token on XDC Network for lightning-fast, secure,
                and provably fair gaming.
              </p>
            </div>
          </motion.div>

          {/* Welcome Banner (shown when not connected) */}
          {!isConnected && <WelcomeBanner onConnectClick={connectWallet} />}

          {/* Main Game Section (always shown, but with different functionality based on connection status) */}
          <div className="grid lg:grid-cols-[2fr_1fr] gap-8 h-full">
            {/* Left Column - Betting Board */}
            <motion.div
              className="h-full"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div
                className={`bg-white p-6 rounded-xl border border-gray-200 transform hover:scale-[1.01] transition-all duration-300 hover:shadow-lg h-full relative overflow-visible ${!isConnected ? "opacity-90 pointer-events-none" : ""}`}
              >
                <BettingBoard
                  onBetSelect={handleBetSelect}
                  selectedBets={selectedBets}
                  disabled={isProcessing || !isConnected}
                  selectedChipValue={selectedChipValue}
                  lastWinningNumber={lastWinningNumber}
                  getNumberBackgroundClass={getNumberBackgroundClass}
                  onUndoBet={handleUndoBet}
                  onClearBets={handleClearBets}
                  onRecoverBets={handleOpenVrfRecovery}
                  getBetAmount={getBetAmount}
                />

                {/* Overlay with connect button when not connected */}
                {!isConnected && (
                  <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center">
                    <motion.button
                      onClick={connectWallet}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 bg-gradient-to-r from-[#22AD74] to-[#22AD74]/80 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-medium flex items-center gap-3"
                    >
                      Connect Wallet to Play
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right Column - Betting Controls */}
            <motion.div
              className="h-full"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="lg:sticky lg:top-6 h-full">
                <div
                  className={`bg-white p-4 rounded-xl border border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] hover:border-[#22AD74]/20 flex flex-col h-full ${!isConnected ? "opacity-90" : ""}`}
                >
                  {/* Show Approval UI when connected but not approved */}
                  {isConnected && !isApproved && !isCheckingApproval ? (
                    <div className="flex-1 flex flex-col justify-between h-full">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 text-[10px] uppercase tracking-wider font-medium">
                              Balance
                            </span>
                            <motion.button
                              onClick={checkApprovalStatus}
                              disabled={isCheckingApproval}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="ml-1 text-purple-500 hover:text-purple-700 transition-colors"
                              title="Refresh approval status"
                            >
                              <FontAwesomeIcon
                                icon={faSync}
                                className={`text-xs ${isCheckingApproval ? "animate-spin" : ""}`}
                              />
                            </motion.button>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-900 text-sm font-semibold tracking-tight">
                              {balanceData?.balance && isConnected
                                ? Number(
                                    ethers.formatEther(balanceData.balance),
                                  ).toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  })
                                : "0"}
                            </span>
                            <span className="text-[#22AD74] text-[9px] uppercase tracking-wider font-medium">
                              GAMA
                            </span>
                          </div>
                        </div>
                      </motion.div>

                      {/* Simple Approval Message */}
                      <div className="flex-1 flex flex-col justify-center items-center text-center px-2 py-4">
                        <ApprovalGuide onApproveClick={handleApprove} />
                      </div>

                      {/* Approval Button */}
                      <motion.button
                        onClick={handleApprove}
                        disabled={isProcessing}
                        whileHover={isProcessing ? {} : { scale: 1.02 }}
                        whileTap={isProcessing ? {} : { scale: 0.98 }}
                        className={`w-full py-3 rounded-lg font-medium transition-all shadow-md text-sm ${
                          isProcessing
                            ? "bg-purple-100 text-purple-700 cursor-not-allowed"
                            : "bg-gradient-to-r from-purple-700 to-purple-500 text-white hover:shadow-lg"
                        }`}
                      >
                        {isProcessing ? (
                          <div className="flex items-center justify-center gap-2">
                            <LoadingSpinner size="small" />
                            <span>Approving tokens...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <FontAwesomeIcon icon={faCheckCircle} />
                            <span className="tracking-wide">
                              Approve Tokens
                            </span>
                          </div>
                        )}
                      </motion.button>
                      <p className="text-[10px] text-purple-500/70 text-center mt-1.5">
                        One-time wallet confirmation
                      </p>
                    </div>
                  ) : (
                    /* Stats Cards - Show when connected and approved or checking approval */
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 transform hover:scale-[1.02] transition-all duration-300 hover:shadow-lg hover:border-[#22AD74]/20 group">
                          <div className="text-gray-400 text-[10px] uppercase tracking-wider font-medium group-hover:text-[#22AD74] transition-colors">
                            Bets
                          </div>
                          <div className="flex items-center gap-1 whitespace-nowrap mt-0.5 w-full overflow-hidden">
                            <span className="text-gray-900 text-sm font-semibold min-w-[10px] text-right shrink-0 group-hover:text-[#22AD74] transition-colors">
                              {selectedBets.length}
                            </span>
                            <span className="text-[#22AD74] text-[9px] uppercase tracking-wider font-medium shrink-0">
                              positions
                            </span>
                          </div>
                        </div>
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 transform hover:scale-[1.02] transition-all duration-300 hover:shadow-lg hover:border-[#22AD74]/20 group">
                          <div className="text-gray-400 text-[10px] uppercase tracking-wider font-medium group-hover:text-[#22AD74] transition-colors">
                            Amount
                          </div>
                          <div className="flex items-center gap-1 whitespace-nowrap mt-0.5 w-full overflow-hidden">
                            <span className="text-gray-900 text-sm font-semibold min-w-[10px] text-right shrink-0 group-hover:text-[#22AD74] transition-colors">
                              {parseFloat(
                                ethers.formatEther(totalBetAmount),
                              ).toFixed(0)}
                            </span>
                            <span className="text-[#22AD74] text-[9px] uppercase tracking-wider font-medium shrink-0">
                              GAMA
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Balance Display */}
                      <div className="bg-white px-2.5 py-2 rounded-lg border border-gray-200 transform hover:scale-[1.02] transition-all duration-300 hover:shadow-lg hover:border-[#22AD74]/20 group z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 text-[10px] uppercase tracking-wider font-medium group-hover:text-[#22AD74] transition-colors">
                              Balance
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-900 text-sm font-semibold tracking-tight group-hover:text-[#22AD74] transition-colors">
                              {balanceData?.balance && isConnected
                                ? Number(
                                    ethers.formatEther(balanceData.balance),
                                  ).toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  })
                                : "0"}
                            </span>
                            <span className="text-[#22AD74] text-[9px] uppercase tracking-wider font-medium">
                              GAMA
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Chip Selection */}
                      <div className="space-y-2 transform hover:scale-[1.01] transition-all duration-300">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-[10px] uppercase tracking-wider font-medium text-gray-400">
                            Chip Value
                          </h3>
                        </div>
                        <div className="chip-selector grid grid-cols-3 grid-rows-2 gap-2.5">
                          {CHIP_VALUES.map((chip) => (
                            <button
                              key={chip.value}
                              onClick={() => setSelectedChipValue(chip.value)}
                              disabled={isProcessing || !isConnected}
                              className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all duration-300 relative group
                                ${
                                  selectedChipValue === chip.value
                                    ? "bg-gradient-to-br from-[#22AD74] to-[#1a8f5e] text-white shadow-xl ring-2 ring-[#22AD74]/20 ring-offset-2 scale-110 z-10"
                                    : "bg-gradient-to-br from-white to-gray-50 text-gray-700 hover:text-[#22AD74] border border-gray-200 hover:border-[#22AD74]/20 hover:shadow-lg hover:z-10"
                                } ${
                                  isProcessing || !isConnected
                                    ? "opacity-50 cursor-not-allowed"
                                    : "cursor-pointer hover:scale-105"
                                }`}
                            >
                              <span className="text-[15px] transform -translate-y-px">
                                {chip.label}
                              </span>
                              {selectedChipValue === chip.value && (
                                <div className="absolute -inset-0.5 rounded-full bg-[#22AD74]/10 animate-pulse pointer-events-none" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Place Bet Button or Connect Wallet Button */}
                  <div className="mt-4 transform hover:scale-[1.01] transition-all duration-300">
                    {!isConnected ? (
                      <button
                        onClick={connectWallet}
                        className="h-9 w-full bg-[#22AD74] text-white rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] shadow-md hover:shadow-lg border border-[#22AD74] hover:bg-[#22AD74]/90"
                      >
                        Connect Wallet
                      </button>
                    ) : isCheckingApproval ? (
                      <button
                        className="h-9 w-full bg-white text-gray-600 rounded-lg font-medium text-xs flex items-center justify-center gap-2 disabled:opacity-50 border border-gray-200 hover:shadow-lg transition-all duration-300"
                        disabled={true}
                      >
                        <LoadingSpinner size="small" />
                        Checking Approval...
                      </button>
                    ) : isApproved ? (
                      <button
                        onClick={handlePlaceBets}
                        disabled={isProcessing || selectedBets.length === 0}
                        className={`h-9 w-full rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg
                          ${
                            isProcessing || selectedBets.length === 0
                              ? "bg-white text-gray-400 border border-gray-200"
                              : "bg-[#22AD74] text-white hover:scale-[1.02] shadow-md hover:shadow-lg border border-[#22AD74] hover:bg-[#22AD74]/90"
                          }`}
                      >
                        {isProcessing ? (
                          <>
                            <LoadingSpinner size="small" />
                            Processing...
                          </>
                        ) : (
                          "Place Bets"
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Section - Detailed History */}
          <AnimatePresence mode="sync">
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.5 }}
              className={`bg-white p-6 rounded-xl border border-gray-200 transform hover:scale-[1.01] transition-all duration-300 ${!isConnected ? "opacity-90" : ""}`}
            >
              <div className="mb-4">
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  Betting History
                </h3>
                <div className="h-0.5 w-24 bg-gradient-to-r from-[#22AD74] to-[#22AD74]/20"></div>
              </div>
              {!isConnected ? (
                <div className="text-center py-8 text-gray-500">
                  Connect your wallet to view your betting history
                </div>
              ) : (
                <BettingHistory
                  bettingHistory={bettingHistory || []}
                  isLoading={isLoadingBettingHistory}
                  address={account}
                  refreshHistory={() => {
                    queryClient.invalidateQueries(["rouletteHistory", account]);
                  }}
                />
              )}
            </motion.div>

            {/* Game Rules and Odds Component */}
            <motion.div
              key="game-rules"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.6 }}
              className="mt-6"
            >
              <GameRulesAndOdds />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* VRF Recovery Modal */}
      <AnimatePresence mode="sync">
        {isVrfModalOpen && (
          <VrfRecoveryModal
            isOpen={isVrfModalOpen}
            onClose={() => setIsVrfModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RoulettePage;
