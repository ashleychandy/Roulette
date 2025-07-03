import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import { getBetTypeName } from "../../utils/betHelpers";
import {
  isRed,
  CONTRACT_RESULT_STATES,
  BetTypes,
} from "../../constants/roulette_constants";
import LoadingSpinner from "./LoadingSpinner";

// Ensure isRed function is consistent with contract implementation
const checkIsRed = (number) => {
  // Use imported isRed if available, but handle zero case specifically
  if (number === 0) return false;
  return isRed(Number(number));
};

const BettingHistory = ({
  bettingHistory,
  isLoading,
  historyIndex,
  maxHistorySize,
}) => {
  const [filter, setFilter] = useState("all");
  const [isExpanded, setIsExpanded] = useState(false);

  // Group and process bets using circular buffer logic
  const groupedBets = useMemo(() => {
    if (
      !bettingHistory ||
      !Array.isArray(bettingHistory) ||
      bettingHistory.length === 0
    ) {
      return [];
    }

    // Calculate the actual index in the circular buffer
    const currentIndex = historyIndex % maxHistorySize;

    // Reorder bets based on circular buffer index
    const orderedBets = [...bettingHistory];
    if (bettingHistory.length === maxHistorySize) {
      // Rotate array to show most recent bets first
      const rotateAmount = maxHistorySize - currentIndex;
      orderedBets.unshift(...orderedBets.splice(rotateAmount));
    }

    return orderedBets
      .map((bet) => {
        // Ensure all amounts are treated as BigInt
        const totalAmount = BigInt(bet.totalAmount || bet.amount || "0");
        const totalPayout = BigInt(bet.totalPayout || bet.payout || "0");

        // Handle bet data structure differences between contract and frontend
        let betDetails = {
          id:
            bet.id ||
            `bet-${bet.timestamp}-${Math.random()
              .toString(36)
              .substring(2, 9)}`,
          timestamp: bet.timestamp || Math.floor(Date.now() / 1000),
          winningNumber: bet.isWaitingForVRF ? null : bet.winningNumber || 0,
          bets: Array.isArray(bet.bets) ? bet.bets : [bet],
          totalAmount,
          totalPayout,
          txHash: bet.txHash || "",
          isActive: !!bet.isActive,
          isWaitingForVRF: !!bet.isWaitingForVRF,
          completed: !!bet.completed,
          // Explicitly check against contract's result states
          isRecovered:
            bet.isRecovered ||
            bet.winningNumber === CONTRACT_RESULT_STATES.RECOVERED,
          isForceStop:
            bet.isForceStop ||
            bet.winningNumber === CONTRACT_RESULT_STATES.FORCE_STOPPED,
        };

        // Directly determine result type from contract data without conditional check
        if (betDetails.isRecovered) {
          betDetails.resultType = "recovered";
        } else if (betDetails.isForceStop) {
          betDetails.resultType = "force_stopped";
        } else if (betDetails.isWaitingForVRF) {
          betDetails.resultType = "pending";
        } else if (betDetails.totalPayout > betDetails.totalAmount) {
          betDetails.resultType = "win";
        } else if (betDetails.totalPayout < betDetails.totalAmount) {
          betDetails.resultType = "loss";
        } else if (
          betDetails.totalPayout === betDetails.totalAmount &&
          betDetails.totalAmount > 0
        ) {
          betDetails.resultType = "even";
        } else {
          betDetails.resultType = "unknown";
        }

        return betDetails;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [bettingHistory, historyIndex, maxHistorySize]);

  // Filter bets based on selected filter
  const filteredBets = useMemo(() => {
    if (!groupedBets) return [];

    switch (filter) {
      case "wins":
        return groupedBets.filter((bet) => bet.resultType === "win");
      case "losses":
        return groupedBets.filter((bet) => bet.resultType === "loss");
      default:
        return groupedBets;
    }
  }, [groupedBets, filter]);

  // Function to format a timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      const date = new Date(timestamp * 1000);
      return date.toLocaleString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  // Helper function to map contract bet types to names
  const getBetTypeDisplay = (betDetail) => {
    // The getBetTypeName function expects the betType enum from contract (0-8)
    // We need to handle contract enums vs frontend constants
    return getBetTypeName(betDetail.betType, betDetail.numbers);
  };

  // Format amounts for display
  const formatAmount = (amount) => {
    // Handle different types of amount values
    if (typeof amount === "bigint" || amount instanceof BigInt) {
      return ethers.formatEther(amount);
    } else if (typeof amount === "string") {
      try {
        return ethers.formatEther(amount);
      } catch (e) {
        console.error("Error formatting amount:", e, amount);
        return "0";
      }
    } else if (typeof amount === "number") {
      return amount.toString();
    }
    return "0";
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!bettingHistory || bettingHistory.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-4">
        No betting history available
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
      {/* History Header with Filters and Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900">Betting History</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === "all"
                  ? "bg-gray-100 text-gray-900 border border-gray-200"
                  : "text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("wins")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === "wins"
                  ? "bg-[#22AD74]/10 text-[#22AD74] border border-[#22AD74]/50"
                  : "text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200"
              }`}
            >
              Wins
            </button>
            <button
              onClick={() => setFilter("losses")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === "losses"
                  ? "bg-red-500/10 text-red-500 border border-red-500/50"
                  : "text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200"
              }`}
            >
              Losses
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-600 hover:text-gray-900 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50 border border-gray-200"
        >
          <svg
            className={`w-5 h-5 transform transition-transform duration-300 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* History Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {filteredBets.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2 opacity-20">🎲</div>
                <div className="text-gray-900 font-medium">
                  {filter === "all"
                    ? "No betting history available"
                    : `No ${filter} found in your history`}
                </div>
                <div className="text-gray-500 text-sm mt-1">
                  {filter === "all"
                    ? "Place your first bet to start your journey"
                    : "Switch filters to see other results"}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 max-h-[600px] overflow-y-auto pr-2">
                {filteredBets.map((group, index) => (
                  <motion.div
                    key={`${group.timestamp}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      delay: index * 0.05,
                    }}
                    className={`p-4 rounded-xl border transition-all duration-300 backdrop-blur-md ${
                      group.isWaitingForVRF
                        ? "bg-purple-500/10 border-purple-500/30 hover:shadow-[0_0_15px_rgba(147,51,234,0.2)]"
                        : group.isRecovered
                          ? "bg-purple-500/10 border-purple-500/30 hover:shadow-[0_0_15px_rgba(147,51,234,0.2)]"
                          : group.isForceStop
                            ? "bg-orange-500/10 border-orange-500/30 hover:shadow-[0_0_15px_rgba(234,88,12,0.2)]"
                            : group.resultType === "win"
                              ? "bg-[#22AD74]/10 border-[#22AD74]/30 hover:shadow-[0_0_15px_rgba(34,173,116,0.2)]"
                              : group.resultType === "loss"
                                ? "bg-red-500/10 border-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                : "bg-white hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            group.isWaitingForVRF
                              ? "bg-purple-500/20 text-purple-600"
                              : group.isRecovered
                                ? "bg-purple-500/20 text-purple-600"
                                : group.isForceStop
                                  ? "bg-orange-500/20 text-orange-600"
                                  : group.winningNumber === 0
                                    ? "bg-[#22AD74]/20 text-[#22AD74]"
                                    : checkIsRed(group.winningNumber)
                                      ? "bg-red-500/20 text-red-600"
                                      : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          {group.isWaitingForVRF ? (
                            <div className="flex items-center justify-center">
                              <svg
                                className="animate-spin h-4 w-4"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  fill="none"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                            </div>
                          ) : group.isRecovered ? (
                            "R"
                          ) : group.isForceStop ? (
                            "F"
                          ) : group.winningNumber !== null &&
                            group.winningNumber !== undefined &&
                            !group.isWaitingForVRF ? (
                            group.winningNumber ===
                            CONTRACT_RESULT_STATES.RECOVERED ? (
                              "R"
                            ) : group.winningNumber ===
                              CONTRACT_RESULT_STATES.FORCE_STOPPED ? (
                              "F"
                            ) : (
                              group.winningNumber
                            )
                          ) : (
                            "?"
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDate(group.timestamp)}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          group.isWaitingForVRF
                            ? "text-purple-600"
                            : group.isRecovered ||
                                group.winningNumber ===
                                  CONTRACT_RESULT_STATES.RECOVERED
                              ? "text-purple-600"
                              : group.isForceStop ||
                                  group.winningNumber ===
                                    CONTRACT_RESULT_STATES.FORCE_STOPPED
                                ? "text-orange-600"
                                : group.resultType === "win"
                                  ? "text-[#22AD74]"
                                  : group.resultType === "loss"
                                    ? "text-red-600"
                                    : "text-gray-600"
                        }`}
                      >
                        {group.isWaitingForVRF
                          ? "WAITING VRF"
                          : group.isRecovered ||
                              group.winningNumber ===
                                CONTRACT_RESULT_STATES.RECOVERED
                            ? "RECOVERED"
                            : group.isForceStop ||
                                group.winningNumber ===
                                  CONTRACT_RESULT_STATES.FORCE_STOPPED
                              ? "FORCE STOPPED"
                              : group.resultType === "win"
                                ? "WIN"
                                : group.resultType === "loss"
                                  ? "LOSS"
                                  : "EVEN"}
                      </div>
                    </div>

                    {/* Bets */}
                    <div className="space-y-2">
                      {group.bets.map((bet, betIndex) => (
                        <div
                          key={betIndex}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-gray-600">
                            {getBetTypeDisplay(bet)}
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatAmount(bet.amount)} GAMA
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total</span>
                        <span
                          className={`font-medium ${
                            group.isWaitingForVRF
                              ? "text-purple-600"
                              : group.isRecovered ||
                                  group.winningNumber ===
                                    CONTRACT_RESULT_STATES.RECOVERED
                                ? "text-purple-600"
                                : group.isForceStop ||
                                    group.winningNumber ===
                                      CONTRACT_RESULT_STATES.FORCE_STOPPED
                                  ? "text-orange-600"
                                  : group.resultType === "win"
                                    ? "text-[#22AD74]"
                                    : group.resultType === "loss"
                                      ? "text-red-600"
                                      : "text-gray-900"
                          }`}
                        >
                          {group.isWaitingForVRF
                            ? "Pending..."
                            : `${formatAmount(group.totalPayout)} GAMA`}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BettingHistory;
