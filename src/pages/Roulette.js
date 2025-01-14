import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import bgOverlay from "../assets/bg-overlay1.jpg";

// Contract constants
const CONTRACT_CONSTANTS = {
  MAX_BETS_PER_SPIN: 15,
  MAX_BET_AMOUNT: BigInt("100000000000000000000000"), // 100k tokens
  MAX_TOTAL_BET_AMOUNT: BigInt("500000000000000000000000"), // 500k tokens
  MAX_POSSIBLE_PAYOUT: BigInt("17500000000000000000000000"), // 17.5M tokens
  MINTER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE")),
  BURNER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE")),
};

// Contract error messages
const CONTRACT_ERRORS = {
  InvalidBetParameters: "Invalid bet parameters. Please check your bets.",
  InvalidBetType: "Invalid bet type selected.",
  InsufficientUserBalance: "Insufficient balance to place bet.",
  TransferFailed: "Token transfer failed.",
  BurnFailed: "Token burn failed.",
  MintFailed: "Token mint failed.",
  MissingContractRole: "Contract is missing required roles.",
  InsufficientAllowance: "Insufficient token allowance.",
  MaxPayoutExceeded: "Maximum potential payout exceeded.",
};

// Updated BetTypes to match contract exactly
const BetTypes = {
  // Base types (matching contract)
  STRAIGHT: 0,
  DOZEN_FIRST: 1,
  DOZEN_SECOND: 2,
  DOZEN_THIRD: 3,
  COLUMN_FIRST: 4,
  COLUMN_SECOND: 5,
  COLUMN_THIRD: 6,
  RED: 7,
  BLACK: 8,
  EVEN: 9,
  ODD: 10,
  LOW: 11,
  HIGH: 12,

  // Helper functions
  isValid: function (type) {
    return type >= 0 && type <= 12;
  },

  // Get numbers for a bet type
  getNumbers: function (type) {
    switch (type) {
      case this.STRAIGHT:
        return []; // Numbers provided directly for straight bets
      case this.DOZEN_FIRST:
        return Array.from({ length: 12 }, (_, i) => i + 1);
      case this.DOZEN_SECOND:
        return Array.from({ length: 12 }, (_, i) => i + 13);
      case this.DOZEN_THIRD:
        return Array.from({ length: 12 }, (_, i) => i + 25);
      case this.COLUMN_FIRST:
        return Array.from({ length: 12 }, (_, i) => 1 + i * 3);
      case this.COLUMN_SECOND:
        return Array.from({ length: 12 }, (_, i) => 2 + i * 3);
      case this.COLUMN_THIRD:
        return Array.from({ length: 12 }, (_, i) => 3 + i * 3);
      case this.RED:
        return [
          1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
        ];
      case this.BLACK:
        return [
          2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
        ];
      case this.EVEN:
        return Array.from({ length: 18 }, (_, i) => (i + 1) * 2);
      case this.ODD:
        return Array.from({ length: 18 }, (_, i) => i * 2 + 1);
      case this.LOW:
        return Array.from({ length: 18 }, (_, i) => i + 1);
      case this.HIGH:
        return Array.from({ length: 18 }, (_, i) => i + 19);
      default:
        return [];
    }
  },
};

// Update betting options arrays to match contract order
const dozenBettingOptions = [
  { label: "1st 12", type: BetTypes.DOZEN_FIRST },
  { label: "2nd 12", type: BetTypes.DOZEN_SECOND },
  { label: "3rd 12", type: BetTypes.DOZEN_THIRD },
];

const bottomBettingOptions = [
  { label: "1-18", type: BetTypes.LOW },
  { label: "EVEN", type: BetTypes.EVEN },
  { label: "RED", type: BetTypes.RED },
  { label: "BLACK", type: BetTypes.BLACK },
  { label: "ODD", type: BetTypes.ODD },
  { label: "19-36", type: BetTypes.HIGH },
];

// Chip values for betting
const CHIP_VALUES = [
  { value: "1000000000000000000", label: "1" },
  { value: "5000000000000000000", label: "5" },
  { value: "10000000000000000000", label: "10" },
  { value: "50000000000000000000", label: "50" },
  { value: "100000000000000000000", label: "100" },
  { value: "500000000000000000000", label: "500" },
  { value: "1000000000000000000000", label: "1K" },
  { value: "5000000000000000000000", label: "5K" },
];

// Define red numbers for the roulette board
const redNumbers = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

// Helper function to check if a number is red
const isRed = (number) => redNumbers.includes(Number(number));

// Last Number Display component
const LastNumberDisplay = ({ number, getNumberBackgroundClass }) => {
  const bgClass = getNumberBackgroundClass(number);

  return (
    <div className="flex items-center justify-center w-24">
      <div className="relative w-full">
        <div className="text-sm text-secondary-300 font-medium text-center mb-2">
          Last Number
        </div>
        <div
          className={`aspect-square w-full rounded-xl flex items-center justify-center font-bold relative transform transition-all duration-500 hover:scale-105 ${bgClass} shadow-lg hover:shadow-2xl border border-white/20 animate-float`}
        >
          <span className="text-white text-3xl font-bold animate-fadeIn">
            {number !== null && number !== undefined && !isNaN(number)
              ? number
              : "-"}
          </span>
        </div>
      </div>
    </div>
  );
};

// Add BetChip component before BettingBoard
const BetChip = ({ amount, className = "", style = {} }) => (
  <div
    className={`absolute w-8 h-8 rounded-full bg-gaming-primary border-2 border-white flex items-center justify-center text-xs font-bold shadow-lg ${className}`}
    style={style}
  >
    {amount}
  </div>
);

const BettingBoard = ({
  onBetSelect,
  selectedBets,
  disabled,
  selectedChipValue,
  lastWinningNumber,
  getNumberBackgroundClass,
  onUndoBet,
  onClearBets,
}) => {
  // Add hover state
  const [hoveredNumbers, setHoveredNumbers] = useState([]);

  // Helper function to check if a number is currently hovered
  const isNumberHovered = useCallback(
    (number) => {
      return hoveredNumbers.includes(number);
    },
    [hoveredNumbers]
  );

  // Update hover handlers
  const handleMouseEnter = useCallback((number) => {
    setHoveredNumbers([number]);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredNumbers([]);
  }, []);

  // Helper function to check if a bet type is currently hovered
  const isBetTypeHovered = useCallback(
    (type, numbers) => {
      if (!hoveredNumbers.length) return false;
      // Only consider this bet type hovered if ALL its numbers are hovered AND
      // the number of hovered numbers matches exactly (prevents overlap highlighting)
      return (
        numbers.every((num) => hoveredNumbers.includes(num)) &&
        hoveredNumbers.length === numbers.length
      );
    },
    [hoveredNumbers]
  );

  // Helper function to get total bet amount for a position
  const getBetAmount = useCallback(
    (numbers, type) => {
      try {
        // For straight bets
        if (type === BetTypes.STRAIGHT) {
          const bet = selectedBets.find(
            (bet) =>
              bet.type === type &&
              bet.numbers?.[0] ===
                (Array.isArray(numbers) ? numbers[0] : numbers)
          );
          return bet
            ? Math.floor(parseFloat(ethers.formatEther(bet.amount)))
            : 0;
        }

        // For all other bets
        const bet = selectedBets.find((bet) => bet.type === type);
        return bet ? Math.floor(parseFloat(ethers.formatEther(bet.amount))) : 0;
      } catch (error) {
        console.error("Error in getBetAmount:", error);
        return 0;
      }
    },
    [selectedBets]
  );

  const handleBet = useCallback(
    (numbers, type) => {
      if (!disabled) {
        onBetSelect(numbers, type);
      }
    },
    [disabled, onBetSelect]
  );

  // Define the grid layout in rows (top to bottom)
  const numberGrid = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];

  return (
    <div className="flex flex-col gap-3 p-8 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl hover:shadow-3xl transition-all duration-300 relative">
      {/* Main betting grid */}
      <div className="grid grid-cols-[auto_45px_1fr] gap-2">
        <div className="flex flex-col gap-2">
          {/* Last Winning Number Display */}
          <LastNumberDisplay
            number={lastWinningNumber}
            getNumberBackgroundClass={getNumberBackgroundClass}
          />

          {/* Action Buttons under Last Number */}
          <div className="flex flex-col gap-2">
            <button
              onClick={onUndoBet}
              className="w-24 h-10 bg-gray-900 hover:bg-gray-800 text-secondary-300 hover:text-white rounded-xl font-semibold transform hover:scale-105 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 border border-white/10"
              disabled={disabled || selectedBets.length === 0}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
              </svg>
              Undo
            </button>
            <button
              onClick={onClearBets}
              className="w-24 h-10 bg-gaming-error/10 hover:bg-gaming-error/20 text-gaming-error rounded-xl font-semibold transform hover:scale-105 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 border border-gaming-error/20"
              disabled={disabled || selectedBets.length === 0}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Zero */}
        <div className="row-span-3 flex items-stretch">
          <button
            onClick={() => handleBet([0], BetTypes.STRAIGHT)}
            onMouseEnter={() => handleMouseEnter(0)}
            onMouseLeave={handleMouseLeave}
            disabled={disabled}
            className={`w-[45px] h-[147px] rounded-xl text-white/90 font-bold flex items-center justify-center transition-all duration-300 hover:scale-105 relative
              ${
                isNumberHovered(0)
                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 shadow-emerald-500/30 ring-2 ring-offset-2 ring-offset-secondary-900 scale-105 z-10"
                  : "bg-gradient-to-br from-emerald-500/80 to-emerald-600/80 border-emerald-400/50"
              } border hover:shadow-lg hover:from-emerald-500 hover:to-emerald-600`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">0</span>
              {getBetAmount([0], BetTypes.STRAIGHT) > 0 && (
                <BetChip
                  amount={getBetAmount([0], BetTypes.STRAIGHT)}
                  className="absolute -top-3 -right-3 z-30"
                />
              )}
            </div>
          </button>
        </div>

        {/* Numbers grid */}
        <div className="grid grid-rows-3 gap-2 h-[147px]">
          {numberGrid.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-[repeat(12,minmax(45px,1fr))_45px] gap-2 h-[45px]"
            >
              {row.map((number) => (
                <button
                  key={number}
                  onClick={() => handleBet([number], BetTypes.STRAIGHT)}
                  onMouseEnter={() => handleMouseEnter(number)}
                  onMouseLeave={handleMouseLeave}
                  disabled={disabled}
                  className={`relative rounded-xl text-xl font-bold transition-all duration-300 transform border border-white/10 hover:scale-105 hover:z-10 active:scale-95 cursor-pointer backdrop-blur-sm shadow-lg hover:shadow-2xl text-white ${
                    isRed(number)
                      ? "bg-gradient-to-br from-gaming-primary/90 to-gaming-accent/90 hover:from-gaming-primary hover:to-gaming-accent border-gaming-primary/20 hover:shadow-gaming-primary/30"
                      : "bg-gradient-to-br from-gray-800/90 to-gray-900/90 hover:from-gray-700 hover:to-gray-800 border-gray-700/20 hover:shadow-gray-500/30"
                  } ${
                    isNumberHovered(number)
                      ? "ring-2 ring-offset-2 ring-offset-secondary-900 scale-105 z-10"
                      : ""
                  }`}
                >
                  <span className="text-white/90 text-xl">{number}</span>
                  {getBetAmount([number], BetTypes.STRAIGHT) > 0 && (
                    <BetChip
                      amount={getBetAmount([number], BetTypes.STRAIGHT)}
                      className="absolute -top-3 -right-3"
                    />
                  )}
                </button>
              ))}
              {/* 2:1 button for each row */}
              <button
                onClick={() => {
                  const columnType =
                    rowIndex === 0
                      ? BetTypes.COLUMN_THIRD // Top row (3,6,9...)
                      : rowIndex === 1
                      ? BetTypes.COLUMN_SECOND // Middle row (2,5,8...)
                      : BetTypes.COLUMN_FIRST; // Bottom row (1,4,7...)
                  const numbers = BetTypes.getNumbers(columnType);
                  handleBet(numbers, columnType);
                }}
                onMouseEnter={() => {
                  const columnType =
                    rowIndex === 0
                      ? BetTypes.COLUMN_THIRD
                      : rowIndex === 1
                      ? BetTypes.COLUMN_SECOND
                      : BetTypes.COLUMN_FIRST;
                  const numbers = BetTypes.getNumbers(columnType);
                  setHoveredNumbers(numbers);
                }}
                onMouseLeave={handleMouseLeave}
                disabled={disabled}
                className={`h-[45px] rounded-xl relative text-white border border-white/10 shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 
                  bg-gradient-to-br from-secondary-800/90 to-secondary-900/90 hover:from-secondary-700 hover:to-secondary-800 text-white/90 hover:shadow-secondary-500/30 ${
                    isBetTypeHovered(
                      rowIndex === 0
                        ? BetTypes.COLUMN_THIRD
                        : rowIndex === 1
                        ? BetTypes.COLUMN_SECOND
                        : BetTypes.COLUMN_FIRST,
                      BetTypes.getNumbers(
                        rowIndex === 0
                          ? BetTypes.COLUMN_THIRD
                          : rowIndex === 1
                          ? BetTypes.COLUMN_SECOND
                          : BetTypes.COLUMN_FIRST
                      )
                    )
                      ? "ring-2 ring-offset-2 ring-offset-secondary-900 scale-105 z-20 shadow-[0_0_20px_rgba(var(--gaming-primary),0.4)] border-gaming-primary/50"
                      : ""
                  } hover:z-10 active:scale-95 cursor-pointer backdrop-blur-sm`}
              >
                2:1
                {(() => {
                  const columnType =
                    rowIndex === 0
                      ? BetTypes.COLUMN_THIRD
                      : rowIndex === 1
                      ? BetTypes.COLUMN_SECOND
                      : BetTypes.COLUMN_FIRST;
                  const amount = getBetAmount([], columnType);
                  return (
                    amount > 0 && (
                      <BetChip
                        amount={amount}
                        className="absolute -top-3 -right-3"
                      />
                    )
                  );
                })()}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Dozen bets */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        {dozenBettingOptions.map((option) => (
          <button
            key={option.label}
            onClick={() => {
              const numbers = BetTypes.getNumbers(option.type);
              handleBet(numbers, option.type);
            }}
            onMouseEnter={() => {
              const numbers = BetTypes.getNumbers(option.type);
              setHoveredNumbers(numbers);
            }}
            onMouseLeave={handleMouseLeave}
            disabled={disabled}
            className={`h-[45px] rounded-xl relative text-white border border-white/10 shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 
              bg-gradient-to-br from-secondary-800/90 to-secondary-900/90 hover:from-secondary-700 hover:to-secondary-800 text-white/90 hover:shadow-secondary-500/30 ${
                isBetTypeHovered(option.type, BetTypes.getNumbers(option.type))
                  ? "ring-2 ring-offset-2 ring-offset-secondary-900 scale-105 z-20 shadow-[0_0_20px_rgba(var(--gaming-primary),0.4)] border-gaming-primary/50"
                  : ""
              } hover:z-10 active:scale-95 cursor-pointer backdrop-blur-sm`}
          >
            {option.label}
            {getBetAmount(BetTypes.getNumbers(option.type), option.type) >
              0 && (
              <BetChip
                amount={getBetAmount(
                  BetTypes.getNumbers(option.type),
                  option.type
                )}
                className="absolute -top-3 -right-3"
              />
            )}
          </button>
        ))}
      </div>

      {/* Bottom betting options */}
      <div className="grid grid-cols-6 gap-2">
        {bottomBettingOptions.map((option) => (
          <button
            key={option.label}
            onClick={() => {
              const numbers = BetTypes.getNumbers(option.type);
              handleBet(numbers, option.type);
            }}
            onMouseEnter={() => {
              const numbers = BetTypes.getNumbers(option.type);
              setHoveredNumbers(numbers);
            }}
            onMouseLeave={handleMouseLeave}
            disabled={disabled}
            className={`h-[45px] rounded-xl relative text-white border border-white/10 shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 
              ${
                option.type === BetTypes.RED
                  ? "bg-gradient-to-br from-gaming-primary/90 to-gaming-primary/80 hover:from-gaming-primary hover:to-gaming-primary/90 text-white/90 hover:shadow-gaming-primary/30"
                  : option.type === BetTypes.BLACK
                  ? "bg-gradient-to-br from-gray-800/90 to-gray-900/90 hover:from-gray-700 hover:to-gray-800 text-white/90 hover:shadow-gray-500/30"
                  : "bg-gradient-to-br from-secondary-800/90 to-secondary-900/90 hover:from-secondary-700 hover:to-secondary-800 text-white/90 hover:shadow-secondary-500/30"
              } ${
              isBetTypeHovered(option.type, BetTypes.getNumbers(option.type))
                ? "ring-2 ring-offset-2 ring-offset-secondary-900 scale-105 z-20 shadow-[0_0_20px_rgba(var(--gaming-primary),0.4)] border-gaming-primary/50"
                : ""
            } hover:z-10 active:scale-95 cursor-pointer backdrop-blur-sm`}
          >
            {option.label}
            {getBetAmount(BetTypes.getNumbers(option.type), option.type) >
              0 && (
              <BetChip
                amount={getBetAmount(
                  BetTypes.getNumbers(option.type),
                  option.type
                )}
                className="absolute -top-3 -right-3"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// Add BetControls component
const BetControls = ({
  selectedChipValue,
  onChipValueChange,
  selectedBets,
  onPlaceBets,
  onApprove,
  isApproved,
  isCheckingApproval,
  disabled,
  gameState,
}) => {
  return (
    <div className="bet-controls grid grid-cols-[2fr_1fr] gap-6">
      {/* Chip Selection */}
      <div>
        <h3 className="text-lg font-semibold text-secondary-300 mb-3">
          Select Chip Value
        </h3>
        <div className="chip-selector flex flex-wrap gap-2">
          {CHIP_VALUES.map((chip) => (
            <button
              key={chip.value}
              onClick={() => onChipValueChange(chip.value)}
              disabled={disabled}
              className={`h-12 px-6 rounded-xl flex items-center justify-center font-bold transition-all duration-300 
                ${
                  selectedChipValue === chip.value
                    ? "bg-gaming-primary text-white shadow-glow scale-105"
                    : "bg-secondary-800/50 text-secondary-300 hover:bg-secondary-700/50 hover:text-white hover:scale-105"
                } ${
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Place Bet Button */}
      <div className="flex items-end">
        {isCheckingApproval ? (
          <button
            className="h-14 w-full bg-secondary-800/50 text-secondary-300 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={true}
          >
            <LoadingSpinner size="small" />
            Checking Approval...
          </button>
        ) : isApproved ? (
          <button
            onClick={onPlaceBets}
            disabled={disabled || selectedBets.length === 0}
            className={`h-14 w-full rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300
              ${
                disabled || selectedBets.length === 0
                  ? "bg-secondary-800/50 text-secondary-300"
                  : "bg-gradient-to-br from-gray-900 to-gray-800 text-white hover:scale-105 shadow-lg hover:shadow-white/20 border border-white/10 hover:border-white/20"
              }`}
          >
            {gameState.isProcessing ? (
              <>
                <LoadingSpinner size="small" />
                Processing...
              </>
            ) : (
              <>
                <span className="text-xl">🎲</span>
                Place Bets
              </>
            )}
          </button>
        ) : (
          <button
            onClick={onApprove}
            disabled={disabled}
            className={`h-14 w-full rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300
              ${
                disabled
                  ? "bg-secondary-800/50 text-secondary-300"
                  : "bg-gradient-to-br from-gaming-success to-emerald-500 text-white hover:scale-105 shadow-lg hover:shadow-gaming-success/20"
              }`}
          >
            Approve Token
          </button>
        )}
      </div>
    </div>
  );
};

// Add helper function to get bet type name
const getBetTypeName = (betType, numbers) => {
  // Convert contract bet type (0-8) to our format (0-12)
  const convertContractBetType = (type, numbers) => {
    const t = Number(type);
    switch (t) {
      case 0:
        return BetTypes.STRAIGHT;
      case 1: // Dozen
        if (!numbers || !numbers.length) return BetTypes.DOZEN_FIRST;
        if (numbers[0] <= 12) return BetTypes.DOZEN_FIRST;
        if (numbers[0] <= 24) return BetTypes.DOZEN_SECOND;
        return BetTypes.DOZEN_THIRD;
      case 2: // Column
        if (!numbers || !numbers.length) return BetTypes.COLUMN_FIRST;
        const remainder = numbers[0] % 3;
        if (remainder === 1) return BetTypes.COLUMN_FIRST;
        if (remainder === 2) return BetTypes.COLUMN_SECOND;
        return BetTypes.COLUMN_THIRD;
      case 3:
        return BetTypes.RED;
      case 4:
        return BetTypes.BLACK;
      case 5:
        return BetTypes.EVEN;
      case 6:
        return BetTypes.ODD;
      case 7:
        return BetTypes.LOW;
      case 8:
        return BetTypes.HIGH;
      default:
        return type; // Already in our format
    }
  };

  const convertedType = convertContractBetType(betType, numbers);

  switch (convertedType) {
    case BetTypes.STRAIGHT:
      return `Number ${numbers[0]}`;
    case BetTypes.DOZEN_FIRST:
      return "First Dozen (1-12)";
    case BetTypes.DOZEN_SECOND:
      return "Second Dozen (13-24)";
    case BetTypes.DOZEN_THIRD:
      return "Third Dozen (25-36)";
    case BetTypes.COLUMN_FIRST:
      return "First Column";
    case BetTypes.COLUMN_SECOND:
      return "Second Column";
    case BetTypes.COLUMN_THIRD:
      return "Third Column";
    case BetTypes.RED:
      return "Red";
    case BetTypes.BLACK:
      return "Black";
    case BetTypes.EVEN:
      return "Even";
    case BetTypes.ODD:
      return "Odd";
    case BetTypes.LOW:
      return "Low (1-18)";
    case BetTypes.HIGH:
      return "High (19-36)";
    default:
      return "Unknown Bet";
  }
};

// Add BettingHistory component
const BettingHistory = ({ userData, isLoading, error }) => {
  const [filter, setFilter] = useState("all");
  const [isExpanded, setIsExpanded] = useState(false);

  // Group bets by timestamp
  const groupedBets = useMemo(() => {
    if (!userData || !Array.isArray(userData) || userData.length === 0) {
      return [];
    }

    return userData
      .map((bet) => ({
        timestamp: bet.timestamp,
        winningNumber: bet.winningNumber,
        bets: bet.bets,
        totalAmount: bet.totalAmount,
        totalPayout: bet.totalPayout,
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [userData]);

  // Filter bets based on selected filter
  const filteredBets = useMemo(() => {
    if (!groupedBets) return [];

    switch (filter) {
      case "wins":
        return groupedBets.filter((bet) => bet.totalPayout > bet.totalAmount);
      case "losses":
        return groupedBets.filter((bet) => bet.totalPayout < bet.totalAmount);
      default:
        return groupedBets;
    }
  }, [groupedBets, filter]);

  if (isLoading) {
    return (
      <div className="betting-history glass-panel p-6 space-y-6">
        <h3 className="text-2xl font-bold text-white/90">Recent Bets</h3>
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="betting-history glass-panel p-6 space-y-6">
        <h3 className="text-2xl font-bold text-white/90">Recent Bets</h3>
        <div className="text-center text-gaming-error py-4">
          Failed to load betting history. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="betting-history rounded-2xl border border-white/10 shadow-2xl hover:shadow-3xl transition-all duration-300 p-6 bg-secondary-900">
      {/* History Header with Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">Betting History</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === "all"
                  ? "bg-gaming-primary text-white"
                  : "text-white/70 hover:text-white bg-secondary-800 hover:bg-secondary-700"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("wins")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === "wins"
                  ? "bg-gaming-success text-white"
                  : "text-white/70 hover:text-white bg-secondary-800 hover:bg-secondary-700"
              }`}
            >
              Wins
            </button>
            <button
              onClick={() => setFilter("losses")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === "losses"
                  ? "bg-gaming-error text-white"
                  : "text-white/70 hover:text-white bg-secondary-800 hover:bg-secondary-700"
              }`}
            >
              Losses
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-white/70 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary-800"
        >
          {isExpanded ? "↑" : "↓"}
        </button>
      </div>

      {/* History List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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
                  className={`history-item p-4 rounded-xl border ${
                    group.totalPayout > group.totalAmount
                      ? "bg-gaming-success/10 border-gaming-success/30"
                      : group.totalPayout < group.totalAmount
                      ? "bg-gaming-error/10 border-gaming-error/30"
                      : "bg-secondary-800 border-secondary-700"
                  }`}
                >
                  {/* Header */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ${
                          group.winningNumber === 0
                            ? "bg-emerald-500/30 text-emerald-300"
                            : isRed(group.winningNumber)
                            ? "bg-gaming-primary/30 text-gaming-primary"
                            : "bg-gray-800 text-white"
                        }`}
                      >
                        {group.winningNumber}
                      </div>
                      <div className="text-sm text-white/90">
                        {group.bets.length > 4 ? (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {group.bets.map((bet, idx) => {
                              const betType = Number(bet.betType);
                              const numbers = bet.numbers.map((n) => Number(n));
                              return (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 rounded-lg bg-secondary-800/50 text-xs border border-white/10 hover:border-[#22AD74]/30 hover:bg-secondary-800/80 transition-all duration-300 backdrop-blur-sm"
                                >
                                  {getBetTypeName(betType, numbers)}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="mt-1">
                            {group.bets.map((bet, idx) => {
                              const betType = Number(bet.betType);
                              const numbers = bet.numbers.map((n) => Number(n));
                              return (
                                <span key={idx} className="mr-2">
                                  {getBetTypeName(betType, numbers)}
                                  {idx < group.bets.length - 1 ? ", " : ""}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        group.totalPayout > group.totalAmount
                          ? "text-gaming-success"
                          : group.totalPayout < group.totalAmount
                          ? "text-gaming-error"
                          : "text-white/70"
                      }`}
                    >
                      {group.totalPayout > group.totalAmount
                        ? "WIN"
                        : group.totalPayout < group.totalAmount
                        ? "LOSS"
                        : "EVEN"}
                    </div>
                  </div>

                  {/* Bets */}
                  <div className="space-y-2">
                    {group.bets.map((bet, i) => {
                      const betType = Number(bet.betType);
                      const numbers = bet.numbers.map((n) => Number(n));
                      return (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-white/80">
                            {getBetTypeName(betType, numbers)}
                          </span>
                          <span className="font-medium text-white">
                            {parseFloat(ethers.formatEther(bet.amount)).toFixed(
                              0
                            )}{" "}
                            GAMA
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total */}
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/70">
                        Total Payout
                      </span>
                      <span className="font-bold text-white">
                        {parseFloat(
                          ethers.formatEther(group.totalPayout)
                        ).toFixed(0)}{" "}
                        GAMA
                        {group.totalPayout > group.totalAmount && (
                          <span className="text-gaming-success ml-1">
                            (+
                            {parseFloat(
                              ethers.formatEther(
                                BigInt(group.totalPayout) -
                                  BigInt(group.totalAmount)
                              )
                            ).toFixed(0)}
                            )
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredBets.length === 0 && (
        <div className="text-center py-8 bg-secondary-800 rounded-xl border border-secondary-700">
          <div className="text-3xl mb-2 opacity-20">🎲</div>
          <div className="text-white font-medium">
            No betting history available
          </div>
          <div className="text-white/70 text-sm mt-1">
            Place your first bet to start your journey
          </div>
        </div>
      )}
    </div>
  );
};

// Add CompactHistory component
const CompactHistory = ({ userData, account, contracts }) => {
  // Add balance query
  const { data: balanceData } = useQuery({
    queryKey: ["balance", account, contracts?.token?.target],
    queryFn: async () => {
      if (!contracts?.token || !account) return null;

      const [balance, tokenAllowance] = await Promise.all([
        contracts.token.balanceOf(account),
        contracts.token.allowance(account, contracts.roulette.target),
      ]);

      return {
        balance,
        allowance: tokenAllowance,
      };
    },
    enabled: !!contracts?.token && !!account,
    refetchInterval: 5000,
  });

  // Sort bets by timestamp in descending order (most recent first)
  const sortedBets = userData
    ? [...userData].sort((a, b) => b.timestamp - a.timestamp)
    : [];

  return (
    <div className="rounded-2xl border border-white/10 shadow-2xl hover:shadow-3xl transition-all duration-300 p-4 space-y-4 bg-secondary-900/80">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-secondary-300">Last Results</h2>
      </div>

      {/* Only show bet history if there are bets */}
      {userData && userData.length > 0 && (
        <div className="flex gap-1">
          {sortedBets.slice(0, 3).map((bet, index) => (
            <div
              key={`${bet.timestamp}-${index}`}
              className={`flex-1 p-2 rounded-lg border ${
                bet.totalPayout > bet.totalAmount
                  ? "bg-gaming-success/10 border-gaming-success/20"
                  : "bg-gaming-error/10 border-gaming-error/20"
              }`}
            >
              <div
                className={`w-full h-6 rounded flex items-center justify-center text-sm font-medium ${
                  isRed(bet.winningNumber)
                    ? "bg-gaming-primary/20 text-gaming-primary"
                    : "bg-gray-800/20 text-gray-300"
                }`}
              >
                {bet.winningNumber}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Balance Display */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <span className="text-xs text-secondary-400">Balance:</span>
        {balanceData?.balance &&
        Number(ethers.formatEther(balanceData.balance)) > 0 ? (
          <span className="text-sm font-medium text-white">
            {parseFloat(ethers.formatEther(balanceData.balance)).toFixed(2)}{" "}
            GAMA
          </span>
        ) : (
          <button
            onClick={() =>
              window.open(
                "https://app.xspswap.finance/#/swap?outputCurrency=0x678adf7955d8f6dcaa9e2fcc1c5ba70bccc464e6",
                "_blank"
              )
            }
            className="text-sm px-3 py-1 rounded-lg bg-[#22AD74]/10 text-[#22AD74] hover:bg-[#22AD74]/20 transition-colors flex items-center gap-2"
          >
            <span>Get GAMA</span>
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

// Add helper functions to match contract functionality
const BetHelpers = {
  // Get bet type info (matches contract's getBetTypeInfo)
  getBetTypeInfo: (betTypeId) => {
    const type = Number(betTypeId);
    switch (type) {
      case BetTypes.STRAIGHT:
        return { name: "Straight", requiresNumber: true, multiplier: 35000 }; // 35x
      case BetTypes.DOZEN_FIRST:
        return {
          name: "First Dozen (1-12)",
          requiresNumber: false,
          multiplier: 20000,
        }; // 2x
      case BetTypes.DOZEN_SECOND:
        return {
          name: "Second Dozen (13-24)",
          requiresNumber: false,
          multiplier: 20000,
        };
      case BetTypes.DOZEN_THIRD:
        return {
          name: "Third Dozen (25-36)",
          requiresNumber: false,
          multiplier: 20000,
        };
      case BetTypes.COLUMN_FIRST:
        return {
          name: "First Column",
          requiresNumber: false,
          multiplier: 20000,
        };
      case BetTypes.COLUMN_SECOND:
        return {
          name: "Second Column",
          requiresNumber: false,
          multiplier: 20000,
        };
      case BetTypes.COLUMN_THIRD:
        return {
          name: "Third Column",
          requiresNumber: false,
          multiplier: 20000,
        };
      case BetTypes.RED:
        return { name: "Red", requiresNumber: false, multiplier: 10000 }; // 1x
      case BetTypes.BLACK:
        return { name: "Black", requiresNumber: false, multiplier: 10000 };
      case BetTypes.EVEN:
        return { name: "Even", requiresNumber: false, multiplier: 10000 };
      case BetTypes.ODD:
        return { name: "Odd", requiresNumber: false, multiplier: 10000 };
      case BetTypes.LOW:
        return { name: "Low (1-18)", requiresNumber: false, multiplier: 10000 };
      case BetTypes.HIGH:
        return {
          name: "High (19-36)",
          requiresNumber: false,
          multiplier: 10000,
        };
      default:
        throw new Error("Invalid bet type");
    }
  },

  // Validate bet parameters (matches contract's validation)
  validateBetParameters: (bet) => {
    try {
      // Check bet type range
      if (!BetTypes.isValid(bet.type)) {
        throw new Error("Invalid bet type");
      }

      // Check bet amount
      if (
        !bet.amount ||
        bet.amount <= 0 ||
        bet.amount > CONTRACT_CONSTANTS.MAX_BET_AMOUNT
      ) {
        throw new Error("Invalid bet amount");
      }

      // Check if numbers array exists
      if (!bet.numbers || !Array.isArray(bet.numbers)) {
        throw new Error("Invalid bet numbers");
      }

      // For straight bets, validate number
      if (bet.type === BetTypes.STRAIGHT) {
        if (
          bet.numbers.length !== 1 ||
          bet.numbers[0] < 0 ||
          bet.numbers[0] > 36
        ) {
          throw new Error("Invalid number for straight bet");
        }
        return true;
      }

      // Get expected numbers for this bet type
      const expectedNumbers = BetTypes.getNumbers(bet.type);

      // For dozen and column bets, check exact sequence match
      if (
        [
          BetTypes.DOZEN_FIRST,
          BetTypes.DOZEN_SECOND,
          BetTypes.DOZEN_THIRD,
          BetTypes.COLUMN_FIRST,
          BetTypes.COLUMN_SECOND,
          BetTypes.COLUMN_THIRD,
        ].includes(bet.type)
      ) {
        // Check length first
        if (bet.numbers.length !== expectedNumbers.length) {
          return true; // Allow partial matches for these bet types
        }
        // Check if all numbers are in the expected set
        const isValid = bet.numbers.every((num) =>
          expectedNumbers.includes(num)
        );
        if (!isValid) {
          throw new Error(
            `Invalid numbers for ${BetHelpers.getBetTypeInfo(bet.type).name}`
          );
        }
        return true;
      }

      // For other bet types (RED, BLACK, EVEN, ODD, LOW, HIGH)
      // Check if all numbers are in the expected set
      const isValid = bet.numbers.every((num) => expectedNumbers.includes(num));
      if (!isValid) {
        throw new Error(
          `Invalid numbers for ${BetHelpers.getBetTypeInfo(bet.type).name}`
        );
      }

      return true;
    } catch (error) {
      throw error;
    }
  },
};

const RoulettePage = ({ contracts, account, onError, addToast }) => {
  // State management
  const [selectedBets, setSelectedBets] = useState([]);
  const [selectedChipValue, setSelectedChipValue] = useState(
    CHIP_VALUES[0].value
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalBetAmount, setTotalBetAmount] = useState(BigInt(0));
  const [isApproved, setIsApproved] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(true);

  // Get React Query client
  const queryClient = useQueryClient();

  // Fetch user's betting data
  const {
    data: userData,
    isLoading: isLoadingUserData,
    error: userDataError,
  } = useQuery({
    queryKey: ["rouletteHistory", account],
    queryFn: async () => {
      if (!contracts?.roulette || !account) return null;
      try {
        const [bets] = await contracts.roulette.getUserBetHistory(
          account,
          0,
          10
        );

        if (!bets || !Array.isArray(bets) || bets.length === 0) {
          return [];
        }

        const processedBets = bets.map((bet) => {
          // Process individual bet details first
          const processedBetDetails = bet.bets.map((betDetail) => ({
            betType: Number(betDetail.betType),
            numbers: betDetail.numbers.map((n) => Number(n)),
            amount: betDetail.amount.toString(),
            payout: betDetail.payout.toString(),
          }));

          // Calculate totals after processing details
          const totalAmount = processedBetDetails.reduce(
            (sum, b) => sum + BigInt(b.amount),
            BigInt(0)
          );
          const totalPayout = processedBetDetails.reduce(
            (sum, b) => sum + BigInt(b.payout),
            BigInt(0)
          );

          return {
            timestamp: Number(bet.timestamp),
            winningNumber: Number(bet.winningNumber),
            bets: processedBetDetails,
            totalAmount,
            totalPayout,
          };
        });

        return processedBets;
      } catch (error) {
        // Throw the error to be handled by React Query's error state
        throw error;
      }
    },
    enabled: !!contracts?.roulette && !!account,
    refetchInterval: 10000,
    staleTime: 5000,
    retry: 3,
  });

  // If there's an error fetching user data, show it to the user
  useEffect(() => {
    if (userDataError) {
      addToast(
        "Failed to load betting history. Please try again later.",
        "error"
      );
      onError(userDataError);
    }
  }, [userDataError, addToast, onError]);

  // Check token approval
  useEffect(() => {
    let mounted = true;

    const checkApproval = async () => {
      if (!contracts?.token || !account || !contracts?.roulette) {
        if (mounted) {
          setIsApproved(false);
          setIsCheckingApproval(false);
        }
        return;
      }

      try {
        // Check if roulette contract has required roles
        const [hasMinterRole, hasBurnerRole, allowance] = await Promise.all([
          contracts.token.hasRole(
            CONTRACT_CONSTANTS.MINTER_ROLE,
            contracts.roulette.target
          ),
          contracts.token.hasRole(
            CONTRACT_CONSTANTS.BURNER_ROLE,
            contracts.roulette.target
          ),
          contracts.token.allowance(account, contracts.roulette.target),
          contracts.token.balanceOf(account),
        ]);

        // Contract must have both roles and sufficient allowance
        const hasRequiredRoles = hasMinterRole && hasBurnerRole;
        const hasSufficientAllowance =
          allowance >= CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT;

        if (mounted) {
          setIsApproved(hasRequiredRoles && hasSufficientAllowance);
          setIsCheckingApproval(false);
        }
      } catch (error) {
        if (mounted) {
          setIsApproved(false);
          setIsCheckingApproval(false);
        }
      }
    };

    setIsCheckingApproval(true);
    checkApproval();

    return () => {
      mounted = false;
    };
  }, [contracts?.token, contracts?.roulette, account]);

  // Handler functions
  const handleBetSelect = useCallback(
    (numbers, type) => {
      if (isProcessing) return;

      setSelectedBets((prev) => {
        try {
          // Validate bet type matches contract expectations
          if (!BetTypes.isValid(type)) {
            addToast("Invalid bet type selected", "error");
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
              expectedNumbers.includes(num)
            );
            if (!isValid) {
              addToast(`Invalid numbers for selected bet type`, "error");
              return prev;
            }
          }

          const betAmount = BigInt(selectedChipValue);

          // Validate single bet amount early
          if (betAmount > CONTRACT_CONSTANTS.MAX_BET_AMOUNT) {
            addToast("Maximum bet amount exceeded for single bet", "error");
            return prev;
          }

          // Calculate new total amount including this bet
          const newTotalAmount = prev.reduce(
            (sum, bet) => sum + BigInt(bet.amount),
            betAmount
          );

          // Validate total amount early
          if (newTotalAmount > CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT) {
            addToast("Maximum total bet amount would be exceeded", "error");
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
            addToast("Maximum potential payout would be exceeded", "error");
            return prev;
          }

          // Check maximum number of bets
          if (prev.length >= CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN) {
            addToast(
              `Maximum ${CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN} bets allowed per spin`,
              "error"
            );
            return prev;
          }

          // Add new bet
          const newBets = [...prev];
          const existingBetIndex = prev.findIndex(
            (bet) =>
              bet.type === type &&
              JSON.stringify((bet.numbers || []).sort()) ===
                JSON.stringify((formattedNumbers || []).sort())
          );

          if (existingBetIndex !== -1) {
            // Update existing bet
            const newAmount =
              BigInt(newBets[existingBetIndex].amount) + betAmount;
            if (newAmount > CONTRACT_CONSTANTS.MAX_BET_AMOUNT) {
              addToast(
                "Maximum bet amount exceeded for this position",
                "error"
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
            "error"
          );
          return prev;
        }
      });
    },
    [isProcessing, selectedChipValue, addToast]
  );

  const handlePlaceBets = useCallback(async () => {
    if (!contracts?.roulette || !account || selectedBets.length === 0) return;
    if (selectedBets.length > CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN) {
      onError(
        new Error(
          `Maximum ${CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN} bets allowed per spin`
        )
      );
      return;
    }

    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds

    const attemptTransaction = async () => {
      try {
        setIsProcessing(true);

        // Add debug checks for contract roles and balances
        const [hasMinterRole, hasBurnerRole, allowance, userBalance] =
          await Promise.all([
            contracts.token.hasRole(
              CONTRACT_CONSTANTS.MINTER_ROLE,
              contracts.roulette.target
            ),
            contracts.token.hasRole(
              CONTRACT_CONSTANTS.BURNER_ROLE,
              contracts.roulette.target
            ),
            contracts.token.allowance(account, contracts.roulette.target),
            contracts.token.balanceOf(account),
          ]);

        // Validate contract roles
        if (!hasMinterRole || !hasBurnerRole) {
          addToast(
            "Roulette contract is missing required roles. Please contact support.",
            "error"
          );
          return;
        }

        // Format bets for contract
        const betRequests = selectedBets.map((bet) => {
          // Validate bet type
          if (!BetTypes.isValid(bet.type)) {
            throw new Error(`Invalid bet type: ${bet.type}`);
          }

          // Get the correct number parameter based on bet type
          let number = 0;
          if (bet.type === BetTypes.STRAIGHT) {
            number = bet.numbers[0];
          } else if (bet.type === BetTypes.DOZEN_FIRST) {
            number = 1;
          } else if (bet.type === BetTypes.DOZEN_SECOND) {
            number = 13;
          } else if (bet.type === BetTypes.DOZEN_THIRD) {
            number = 25;
          } else if (bet.type === BetTypes.COLUMN_FIRST) {
            number = 1;
          } else if (bet.type === BetTypes.COLUMN_SECOND) {
            number = 2;
          } else if (bet.type === BetTypes.COLUMN_THIRD) {
            number = 3;
          }

          return {
            betTypeId: bet.type,
            number: number,
            amount: BigInt(bet.amount).toString(),
          };
        });

        // Calculate total amount and validate
        const totalAmount = selectedBets.reduce(
          (sum, bet) => sum + BigInt(bet.amount),
          BigInt(0)
        );

        // Calculate total potential payout
        const totalPotentialPayout = selectedBets.reduce((sum, bet) => {
          const { multiplier } = BetHelpers.getBetTypeInfo(bet.type);
          const potentialWinnings =
            (BigInt(bet.amount) * BigInt(multiplier)) / BigInt(10000);
          return sum + potentialWinnings + BigInt(bet.amount); // Add original bet amount
        }, BigInt(0));

        // Validate maximum potential payout
        if (totalPotentialPayout > CONTRACT_CONSTANTS.MAX_POSSIBLE_PAYOUT) {
          addToast("Maximum potential payout exceeded.", "error");
          return;
        }

        // Additional validations
        if (userBalance < totalAmount) {
          addToast("Insufficient balance to place bets.", "error");
          return;
        }

        // Check allowance
        if (allowance < totalAmount) {
          addToast(
            "Insufficient token allowance. Please approve more tokens.",
            "error"
          );
          return;
        }

        // Validate total amount
        if (totalAmount > CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT) {
          addToast("Total bet amount exceeds maximum allowed.", "error");
          return;
        }

        // Get current gas price and add 20% buffer
        const provider = new ethers.BrowserProvider(window.ethereum);
        const feeData = await provider.getFeeData();
        const adjustedGasPrice = (feeData.gasPrice * BigInt(120)) / BigInt(100);

        // Get signer and connect to contract
        const signer = await provider.getSigner();
        const rouletteWithSigner = contracts.roulette.connect(signer);

        // Place bets with adjusted gas settings and wait for more confirmations
        const tx = await rouletteWithSigner.placeBet(betRequests, {
          gasPrice: adjustedGasPrice,
        });

        // Wait for confirmations with timeout
        const CONFIRMATION_TIMEOUT = 60000; // 60 seconds
        const confirmationPromise = tx.wait(2);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Transaction confirmation timeout")),
            CONFIRMATION_TIMEOUT
          )
        );

        await Promise.race([confirmationPromise, timeoutPromise]);

        // Reset state and update UI
        setSelectedBets([]);
        setTotalBetAmount(BigInt(0));
        addToast("Bets placed successfully!", "success");

        // Invalidate queries to refresh data
        queryClient.invalidateQueries(["rouletteHistory", account]);
        queryClient.invalidateQueries(["balance", account]);
      } catch (error) {
        console.error("Bet placement error:", error);

        // Check if error is due to network or transaction issues
        const retryableErrors = [
          "NETWORK_ERROR",
          "TIMEOUT",
          "UNPREDICTABLE_GAS_LIMIT",
          "transaction failed",
          "timeout",
          "replacement underpriced",
          "nonce has already been used",
        ];

        const shouldRetry = retryableErrors.some(
          (errMsg) =>
            error.code === errMsg ||
            error.message?.toLowerCase().includes(errMsg.toLowerCase())
        );

        if (shouldRetry && retryCount < MAX_RETRIES) {
          retryCount++;
          addToast(
            `Transaction failed, retrying... (Attempt ${retryCount}/${MAX_RETRIES})`,
            "warning"
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          return attemptTransaction();
        }

        // Enhanced error handling
        if (error.code === "CALL_EXCEPTION") {
          // Try to extract error name from data if available
          const errorName = error.data ? error.data.split("(")[0] : null;
          const errorMessage =
            CONTRACT_ERRORS[errorName] ||
            "Something went wrong. Please try again later.";
          addToast(errorMessage, "error");
          if (!CONTRACT_ERRORS[errorName]) {
            onError(error);
          }
        } else if (error.code === "ACTION_REJECTED") {
          addToast("Transaction rejected by user", "warning");
        } else if (error.code === "INSUFFICIENT_FUNDS") {
          addToast("Insufficient funds to cover gas fees", "error");
        } else if (error.code === "REPLACEMENT_UNDERPRICED") {
          addToast("Transaction gas price too low. Please try again.", "error");
        } else {
          addToast("Something went wrong. Please try again later.", "error");
          onError(error);
        }
      } finally {
        setIsProcessing(false);
      }
    };

    // Start the first attempt
    await attemptTransaction();
  }, [
    contracts?.roulette,
    contracts?.token,
    account,
    selectedBets,
    addToast,
    onError,
    queryClient,
  ]);

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
        BigInt(0)
      );
      setTotalBetAmount(newTotalAmount);

      return newBets;
    });
  }, []);

  // Get the last winning number from the user's bet history
  const { data: lastWinningNumber } = useQuery({
    queryKey: ["lastWinningNumber", account],
    queryFn: async () => {
      if (!contracts?.roulette || !account) {
        return null;
      }
      try {
        // Get all recent bets to ensure we get the latest one
        const [bets] = await contracts.roulette.getUserBetHistory(
          account,
          0,
          10 // Get more bets to ensure we have the latest
        );

        // Return the winning number from most recent bet if exists
        if (bets && bets.length > 0) {
          // Sort bets by timestamp in descending order to get the most recent
          const sortedBets = [...bets].sort(
            (a, b) => Number(b.timestamp) - Number(a.timestamp)
          );
          const lastNumber = Number(sortedBets[0].winningNumber);
          return lastNumber;
        }
        return null;
      } catch (error) {
        return null;
      }
    },
    enabled: !!contracts?.roulette && !!account,
    refetchInterval: 10000,
    staleTime: 5000,
    cacheTime: 30000,
    retry: 3,
    retryDelay: 1000,
    structuralSharing: false,
  });

  // Get background color class based on number
  const getNumberBackgroundClass = useCallback((number) => {
    if (number === null || number === undefined) {
      return "bg-gradient-to-br from-secondary-800 to-secondary-900 border-secondary-700";
    }
    const num = Number(number);
    if (num === 0) {
      return "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400";
    }
    if (isRed(num)) {
      return "bg-gradient-to-br from-gaming-primary to-gaming-primary/90 border-gaming-primary";
    }
    return "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700";
  }, []);

  // Handle token approval
  const handleApprove = async () => {
    if (!contracts?.token || !account || !contracts?.roulette) {
      return;
    }

    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;

    const attemptApproval = async () => {
      try {
        setIsProcessing(true);

        // First check if roulette contract has required roles
        const [hasMinterRole, hasBurnerRole, currentAllowance] =
          await Promise.all([
            contracts.token.hasRole(
              CONTRACT_CONSTANTS.MINTER_ROLE,
              contracts.roulette.target
            ),
            contracts.token.hasRole(
              CONTRACT_CONSTANTS.BURNER_ROLE,
              contracts.roulette.target
            ),
            contracts.token.allowance(account, contracts.roulette.target),
          ]);

        // Check if already approved
        if (currentAllowance >= CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT) {
          setIsApproved(true);
          addToast("Token already approved", "success");
          return;
        }

        if (!hasMinterRole || !hasBurnerRole) {
          addToast(
            "Roulette contract is missing required roles. Please contact support.",
            "error"
          );
          return;
        }

        // Get current gas price and add 20% buffer for approval
        const provider = new ethers.BrowserProvider(window.ethereum);
        const feeData = await provider.getFeeData();
        const adjustedGasPrice = (feeData.gasPrice * BigInt(120)) / BigInt(100);

        // Get signer and connect to contract
        const signer = await provider.getSigner();
        const tokenWithSigner = contracts.token.connect(signer);

        // If there's an existing non-zero allowance, first reset it to 0
        if (currentAllowance > 0) {
          const resetTx = await tokenWithSigner.approve(
            contracts.roulette.target,
            0,
            {
              gasPrice: adjustedGasPrice,
            }
          );
          await resetTx.wait(1);
        }

        // Approve exact amount instead of max uint256 to match contract's expectations
        const tx = await tokenWithSigner.approve(
          contracts.roulette.target,
          CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT,
          {
            gasPrice: adjustedGasPrice,
          }
        );

        // Wait for confirmations with timeout
        const CONFIRMATION_TIMEOUT = 60000; // 60 seconds
        const confirmationPromise = tx.wait(2);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Approval confirmation timeout")),
            CONFIRMATION_TIMEOUT
          )
        );

        await Promise.race([confirmationPromise, timeoutPromise]);

        // Verify the new allowance
        const newAllowance = await contracts.token.allowance(
          account,
          contracts.roulette.target
        );

        if (newAllowance < CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT) {
          throw new Error("Approval failed - insufficient allowance");
        }

        setIsApproved(true);
        addToast("Token approval successful", "success");

        // Invalidate balance queries
        queryClient.invalidateQueries(["balance", account]);
      } catch (error) {
        console.error("Token approval error:", error);

        // Check if error is due to network or transaction issues
        const retryableErrors = [
          "NETWORK_ERROR",
          "TIMEOUT",
          "UNPREDICTABLE_GAS_LIMIT",
          "transaction failed",
          "timeout",
          "replacement underpriced",
          "nonce has already been used",
        ];

        const shouldRetry = retryableErrors.some(
          (errMsg) =>
            error.code === errMsg ||
            error.message?.toLowerCase().includes(errMsg.toLowerCase())
        );

        if (shouldRetry && retryCount < MAX_RETRIES) {
          retryCount++;
          addToast(
            `Approval failed, retrying... (Attempt ${retryCount}/${MAX_RETRIES})`,
            "warning"
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          return attemptApproval();
        }

        setIsApproved(false);

        // Handle specific error cases
        if (error.code === "ACTION_REJECTED") {
          addToast("Token approval was rejected by user", "warning");
        } else if (error.code === "INSUFFICIENT_FUNDS") {
          addToast("Insufficient funds to cover gas fees", "error");
        } else if (error.code === "REPLACEMENT_UNDERPRICED") {
          addToast("Transaction gas price too low. Please try again.", "error");
        } else if (error.message?.includes("insufficient allowance")) {
          addToast("Failed to approve tokens. Please try again.", "error");
        } else {
          addToast("Something went wrong. Please try again later.", "error");
          onError(error);
        }
      } finally {
        setIsProcessing(false);
      }
    };

    // Start the first attempt
    await attemptApproval();
  };

  return (
    <div className="min-h-screen bg-gaming-background relative">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
        style={{
          backgroundImage: `url(${bgOverlay})`,
          zIndex: 0,
        }}
      />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <div className="space-y-8">
          {/* Game Title and Description */}
          <div className="text-center space-y-6 mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-[#22AD74]/10 blur-3xl rounded-full transform -translate-y-1/2"></div>
              <h1 className="text-6xl font-bold bg-gradient-to-r from-[#22AD74] to-[#22AD74]/70 bg-clip-text text-transparent drop-shadow-xl relative">
                Roulette
              </h1>
            </div>
            <div className="relative">
              <div className="h-px w-24 bg-gradient-to-r from-[#22AD74] to-transparent absolute left-1/2 -translate-x-1/2"></div>
              <p className="text-secondary-400 text-lg max-w-2xl mx-auto mt-6 font-light tracking-wide">
                Play with GAMA Token on XDC Network for lightning-fast, secure,
                and provably fair gaming.
              </p>
            </div>
          </div>

          {/* Main Game Section */}
          <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
            {/* Left Column - Betting Board */}
            <div className="space-y-6">
              <div className="glass-panel transform hover:scale-[1.01] transition-all duration-300 hover:shadow-glow">
                <BettingBoard
                  onBetSelect={handleBetSelect}
                  selectedBets={selectedBets}
                  disabled={isProcessing}
                  selectedChipValue={selectedChipValue}
                  lastWinningNumber={lastWinningNumber}
                  getNumberBackgroundClass={getNumberBackgroundClass}
                  onUndoBet={handleUndoBet}
                  onClearBets={handleClearBets}
                />
              </div>

              <div className="glass-panel p-6 transform hover:scale-[1.01] transition-all duration-300">
                <BetControls
                  selectedChipValue={selectedChipValue}
                  onChipValueChange={handleChipValueChange}
                  selectedBets={selectedBets}
                  onPlaceBets={handlePlaceBets}
                  onApprove={handleApprove}
                  isApproved={isApproved}
                  isCheckingApproval={isCheckingApproval}
                  disabled={isProcessing}
                  gameState={{ isProcessing }}
                />
              </div>
            </div>

            {/* Right Column - Stats & Compact History */}
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-panel p-4 transform hover:scale-105 transition-all duration-300">
                  <div className="text-secondary-300 text-sm font-medium mb-1 whitespace-nowrap">
                    Total Bets
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-2xl font-bold">
                      {selectedBets.length}
                    </span>
                    <span className="text-secondary-400 text-sm">
                      positions
                    </span>
                  </div>
                </div>
                <div className="glass-panel p-4 transform hover:scale-105 transition-all duration-300">
                  <div className="text-secondary-300 text-sm font-medium mb-1 whitespace-nowrap">
                    Total Amount
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-2xl font-bold">
                      {parseFloat(ethers.formatEther(totalBetAmount)).toFixed(
                        0
                      )}
                    </span>
                    <span className="text-secondary-400 text-sm">GAMA</span>
                  </div>
                </div>
              </div>

              {/* Compact History */}
              <div className="glass-panel p-4 transform hover:scale-[1.01] transition-all duration-300">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-white/90 mb-1">
                    Recent Activity
                  </h3>
                  <div className="h-0.5 w-16 bg-gradient-to-r from-gaming-primary to-gaming-accent"></div>
                </div>
                <CompactHistory
                  userData={userData}
                  account={account}
                  contracts={contracts}
                />
              </div>
            </div>
          </div>

          {/* Bottom Section - Detailed History */}
          <div className="glass-panel p-6 transform hover:scale-[1.01] transition-all duration-300">
            <div className="mb-4">
              <h3 className="text-2xl font-semibold text-white/90 mb-2">
                Betting History
              </h3>
              <div className="h-0.5 w-24 bg-gradient-to-r from-gaming-primary to-gaming-accent"></div>
            </div>
            <BettingHistory
              userData={userData}
              isLoading={isLoadingUserData}
              error={userDataError}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Add LoadingSpinner component
const LoadingSpinner = ({ size = "default" }) => (
  <div
    className={`inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite] ${
      size === "small" ? "h-4 w-4" : "h-6 w-6"
    }`}
    role="status"
  />
);

export default RoulettePage;
