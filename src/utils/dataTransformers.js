import { ethers } from "ethers";
import { BetTypes } from "../constants/roulette_constants";

/**
 * Transform bet data from contract format to frontend format
 * @param {Object} betData - Raw bet data from contract
 * @returns {Object} Transformed bet data
 */
export const transformBetData = (betData) => {
  if (!betData) return null;

  return {
    timestamp: new Date(Number(betData.timestamp) * 1000),
    winningNumber: Number(betData.winningNumber),
    completed: betData.completed,
    isActive: betData.isActive,
    bets: betData.bets.map((bet) => ({
      betType: Number(bet.betType),
      numbers: bet.numbers.map((n) => Number(n)),
      amount: ethers.formatEther(bet.amount),
      payout: ethers.formatEther(bet.payout),
    })),
    totalAmount: ethers.formatEther(betData.totalAmount),
    totalPayout: ethers.formatEther(betData.totalPayout),
  };
};

/**
 * Transform game status data from contract format to frontend format
 * @param {Array} gameStatus - Raw game status from contract
 * @returns {Object} Transformed game status
 */
export const transformGameStatus = (gameStatus) => {
  if (!gameStatus) return null;

  const [
    isActive,
    isWin,
    isCompleted,
    winningNumber,
    totalAmount,
    totalPayout,
    requestId,
    requestExists,
    requestProcessed,
    recoveryEligible,
    lastPlayTimestamp,
  ] = gameStatus;

  return {
    isActive,
    isWin,
    isCompleted,
    winningNumber: Number(winningNumber),
    totalAmount: ethers.formatEther(totalAmount),
    totalPayout: ethers.formatEther(totalPayout),
    requestId: requestId.toString(),
    requestExists,
    requestProcessed,
    recoveryEligible,
    lastPlayTimestamp: new Date(Number(lastPlayTimestamp) * 1000),
    hasActiveGame: isActive,
    canRecoverGame: recoveryEligible && isActive,
  };
};

/**
 * Transform bet type info from contract format to frontend format
 * @param {Object} betTypeInfo - Raw bet type info from contract
 * @returns {Object} Transformed bet type info
 */
export const transformBetTypeInfo = (betTypeInfo) => {
  if (!betTypeInfo) return null;

  return {
    name: betTypeInfo.name,
    description: betTypeInfo.description,
    payoutMultiplier: Number(betTypeInfo.payoutMultiplier),
    minNumbers: Number(betTypeInfo.minNumbers),
    maxNumbers: Number(betTypeInfo.maxNumbers),
    betType: BetTypes[betTypeInfo.betType],
  };
};

/**
 * Transform balance data from contract format to frontend format
 * @param {Object} balanceData - Raw balance data from contract
 * @returns {Object} Transformed balance data
 */
export const transformBalanceData = (balanceData) => {
  if (!balanceData) return null;

  return {
    balance: ethers.formatEther(balanceData.balance),
    formattedBalance: ethers.formatEther(balanceData.balance, {
      commify: true,
    }),
    rawBalance: balanceData.balance,
  };
};

/**
 * Transform transaction data for UI display
 * @param {Object} txData - Transaction data
 * @returns {Object} Transformed transaction data
 */
export const transformTransactionData = (txData) => {
  if (!txData) return null;

  return {
    hash: txData.hash,
    from: txData.from,
    to: txData.to,
    value: txData.value ? ethers.formatEther(txData.value) : "0",
    timestamp: txData.timestamp
      ? new Date(txData.timestamp * 1000)
      : new Date(),
    status: txData.status,
    gasUsed: txData.gasUsed ? txData.gasUsed.toString() : "0",
    effectiveGasPrice: txData.effectiveGasPrice
      ? ethers.formatEther(txData.effectiveGasPrice)
      : "0",
  };
};
