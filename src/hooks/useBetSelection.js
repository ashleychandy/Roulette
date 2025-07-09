import { useState, useCallback } from "react";
import { ethers } from "ethers";
import {
  CONTRACT_CONSTANTS,
  BetTypes,
  CHIP_VALUES,
  isRed,
} from "../constants/roulette_constants";
import { BetHelpers } from "../utils/betHelpers";

export const useBetSelection = (addToast) => {
  // State management
  const [selectedBets, setSelectedBets] = useState([]);
  const [selectedChipValue, setSelectedChipValue] = useState(
    CHIP_VALUES[0].value,
  );
  const [totalBetAmount, setTotalBetAmount] = useState(BigInt(0));

  const handleBetSelect = useCallback(
    (numbers, type) => {
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

          // Additional validation for straight bets
          if (type === BetTypes.STRAIGHT) {
            if (formattedNumbers.length !== 1) {
              addToast("Straight bets must have exactly one number", "error");
              return prev;
            }
          }

          // Validate numbers match bet type
          const expectedNumbers = BetTypes.getNumbers(type);
          if (type !== BetTypes.STRAIGHT) {
            const isValid = formattedNumbers.every((num) =>
              expectedNumbers.includes(num),
            );
            if (!isValid) {
              addToast(`Invalid numbers for selected bet type`, "error");
              return prev;
            }
          }

          const betAmount = BigInt(selectedChipValue);

          // Validate single bet amount early
          if (betAmount > CONTRACT_CONSTANTS.MAX_BET_AMOUNT) {
            addToast(
              `Maximum bet amount per position is ${ethers.formatEther(
                CONTRACT_CONSTANTS.MAX_BET_AMOUNT,
              )} GAMA`,
              "error",
            );
            return prev;
          }

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

          // Calculate potential payout for all bets including new bet
          const allBets = [...prev, { type, amount: betAmount.toString() }];
          const totalPotentialPayout = allBets.reduce((sum, bet) => {
            const { multiplier } = BetHelpers.getBetTypeInfo(bet.type);
            const potentialWinnings =
              (BigInt(bet.amount) * BigInt(multiplier)) / BigInt(10000);
            return sum + potentialWinnings + BigInt(bet.amount);
          }, BigInt(0));

          // Validate maximum potential payout early
          if (totalPotentialPayout > CONTRACT_CONSTANTS.MAX_POSSIBLE_PAYOUT) {
            addToast(
              `Maximum potential payout of ${ethers.formatEther(
                CONTRACT_CONSTANTS.MAX_POSSIBLE_PAYOUT,
              )} GAMA would be exceeded`,
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
            error.message || "Invalid bet parameters. Please try again.",
            "error",
          );
          return prev;
        }
      });
    },
    [selectedChipValue, addToast],
  );

  const handleChipValueChange = useCallback((value) => {
    setSelectedChipValue(value);
  }, []);

  const handleClearBets = useCallback(() => {
    setSelectedBets([]);
    setTotalBetAmount(BigInt(0));
  }, []);

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

  const getNumberBackgroundClass = useCallback((number) => {
    if (number === null || number === undefined) {
      return "bg-white border-gray-200";
    }
    const num = Number(number);
    if (num === 0) {
      return "bg-gradient-to-br from-[#22AD74]/90 to-[#22AD74]/70 border-[#22AD74]/20 text-white";
    }
    if (isRed(num)) {
      return "bg-gradient-to-br from-gaming-primary/90 to-gaming-accent/90 border-gaming-primary/20 text-white";
    }
    return "bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-gray-700/20 text-white";
  }, []);

  return {
    // State
    selectedBets,
    selectedChipValue,
    totalBetAmount,

    // Handlers
    handleBetSelect,
    handleChipValueChange,
    handleClearBets,
    handleUndoBet,
    getNumberBackgroundClass,

    // Setters for external manipulation
    setSelectedBets,
    setTotalBetAmount,
  };
};
