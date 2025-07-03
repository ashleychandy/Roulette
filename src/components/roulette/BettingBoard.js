import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  BetTypes,
  isRed,
  dozenBettingOptions,
  bottomBettingOptions,
} from "../../constants/roulette_constants";
import BetChip from "./BetChip";
import LastNumberDisplay from "./LastNumberDisplay";
import { usePollingService } from "../../services/pollingService.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRecycle } from "@fortawesome/free-solid-svg-icons";

const BettingBoard = ({
  onBetSelect,
  selectedBets,
  disabled,
  selectedChipValue,
  lastWinningNumber,
  getNumberBackgroundClass,
  onUndoBet,
  onClearBets,
  onRecoverBets,
  getBetAmount,
}) => {
  // Get game status for recovery button
  const { gameStatus } = usePollingService();

  // Add hover state
  const [hoveredNumbers, setHoveredNumbers] = useState([]);

  // Helper function to check if a number is currently hovered
  const isNumberHovered = useCallback(
    (number) => {
      return hoveredNumbers.includes(number);
    },
    [hoveredNumbers],
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
    [hoveredNumbers],
  );

  const handleBet = useCallback(
    (numbers, type) => {
      if (!disabled) {
        onBetSelect(numbers, type);
      }
    },
    [disabled, onBetSelect],
  );

  // Define the grid layout in rows (top to bottom)
  const numberGrid = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];

  return (
    <>
      {/* Main content with conditional blur */}
      <div
        className={`flex flex-col gap-6 relative transition-all duration-300`}
      >
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
                className="w-24 h-10 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 rounded-xl font-semibold transform hover:scale-105 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 border border-gray-200"
                disabled={disabled || selectedBets.length === 0}
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
                </svg>
                Undo
              </button>
              <button
                onClick={onClearBets}
                className="w-24 h-10 bg-white hover:bg-red-50 text-red-600 rounded-xl font-semibold transform hover:scale-105 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 border border-red-200"
                disabled={disabled || selectedBets.length === 0}
              >
                Clear
              </button>
              {gameStatus?.isActive &&
              (gameStatus?.recoveryEligible ||
                (gameStatus?.requestExists &&
                  !gameStatus?.requestProcessed)) ? (
                <button
                  onClick={onRecoverBets}
                  className={`w-24 h-10 rounded-xl font-semibold transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 border
                    ${
                      gameStatus?.recoveryEligible
                        ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
                        : "bg-white hover:bg-purple-50 text-purple-600 border-purple-200"
                    }`}
                  title={
                    gameStatus?.recoveryEligible
                      ? "Recover your stuck game"
                      : "Check recovery options"
                  }
                >
                  <FontAwesomeIcon icon={faRecycle} className="w-3 h-3" />
                  {gameStatus?.recoveryEligible ? "Recover" : "VRF"}
                </button>
              ) : (
                <div className="w-24 h-10"></div> /* Empty div to maintain layout */
              )}
            </div>
          </div>

          {/* Zero */}
          <div className="row-span-3 flex items-stretch">
            <button
              onClick={() => handleBet([0], BetTypes.STRAIGHT)}
              onMouseEnter={() => handleMouseEnter(0)}
              onMouseLeave={handleMouseLeave}
              disabled={disabled}
              className={`relative rounded-xl text-xl font-bold transition-all duration-300 transform border hover:z-10 active:scale-95 cursor-pointer w-[45px] h-[147px] flex items-center justify-center shadow-lg
                ${
                  isNumberHovered(0)
                    ? "bg-gradient-to-br from-[#22AD74] to-[#22AD74]/80 ring-2 ring-offset-2 ring-[#22AD74] scale-105 z-10 border-[#22AD74]"
                    : "bg-gradient-to-br from-[#22AD74]/90 to-[#22AD74]/70 border-[#22AD74]/20 hover:scale-105 hover:from-[#22AD74] hover:to-[#22AD74]"
                }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-white text-2xl">0</span>
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
                    className={`relative rounded-xl text-xl font-bold transition-all duration-300 transform border border-gray-200 hover:scale-105 hover:z-10 active:scale-95 cursor-pointer bg-white shadow-lg hover:shadow-2xl text-gray-900 ${
                      isRed(number)
                        ? "bg-gradient-to-br from-gaming-primary/90 to-gaming-accent/90 hover:from-gaming-primary hover:to-gaming-accent border-gaming-primary/20 hover:shadow-gaming-primary/30"
                        : "bg-gradient-to-br from-gray-800/90 to-gray-900/90 hover:from-gray-700 hover:to-gray-800 border-gray-700/20 hover:shadow-gray-500/30"
                    } ${
                      isNumberHovered(number)
                        ? "ring-2 ring-offset-2 ring-[#22AD74] scale-105 z-10 bg-[#22AD74]/10"
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
                  className={`h-[45px] rounded-xl relative text-[#22AD74] border border-[#22AD74] shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 
                  bg-white hover:bg-[#22AD74]/5 hover:shadow-[#22AD74]/30`}
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
        <div className="grid grid-cols-3 gap-2 -mt-32 w-[calc(85%-92px)] ml-[160px]">
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
              className={`h-[45px] rounded-xl relative text-[#22AD74] border border-[#22AD74] shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 
                bg-white hover:bg-[#22AD74]/5 hover:shadow-[#22AD74]/30`}
            >
              {option.label}
              {getBetAmount(BetTypes.getNumbers(option.type), option.type) >
                0 && (
                <BetChip
                  amount={getBetAmount(
                    BetTypes.getNumbers(option.type),
                    option.type,
                  )}
                  className="absolute -top-3 -right-3"
                />
              )}
            </button>
          ))}
        </div>

        {/* Bottom betting options */}
        <div className="grid grid-cols-6 gap-2 -mt-1 w-[calc(85%-92px)] ml-[160px]">
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
              className={`h-[45px] rounded-xl relative ${
                option.type === BetTypes.RED
                  ? "bg-gradient-to-br from-gaming-primary/90 to-gaming-accent/90 hover:from-gaming-primary hover:to-gaming-accent border-gaming-primary/20 hover:shadow-gaming-primary/30 text-white"
                  : option.type === BetTypes.BLACK
                    ? "bg-gradient-to-br from-gray-800/90 to-gray-900/90 hover:from-gray-700 hover:to-gray-800 border-gray-700/20 hover:shadow-gray-500/30 text-white"
                    : "text-[#22AD74] border border-[#22AD74] bg-white hover:bg-[#22AD74]/10 hover:shadow-[#22AD74]/30"
              } shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 ${
                isBetTypeHovered(option.type, BetTypes.getNumbers(option.type))
                  ? "ring-2 ring-offset-2 ring-[#22AD74] scale-105 z-10 bg-[#22AD74]/10"
                  : ""
              }`}
            >
              {option.label}
              {getBetAmount(BetTypes.getNumbers(option.type), option.type) >
                0 && (
                <BetChip
                  amount={getBetAmount(
                    BetTypes.getNumbers(option.type),
                    option.type,
                  )}
                  className="absolute -top-3 -right-3"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default BettingBoard;
