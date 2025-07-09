import React from "react";
import { CONTRACT_RESULT_STATES } from "../../constants/roulette_constants";

const LastNumberDisplay = ({ number, getNumberBackgroundClass }) => {
  // Validate the number is within valid range (0-36)
  const isValidNumber =
    number !== null &&
    number !== undefined &&
    !isNaN(number) &&
    number >= 0 &&
    number <= 36;

  // Check for special result values
  const isRecovered = number === CONTRACT_RESULT_STATES.RECOVERED;
  const isForceStop = number === CONTRACT_RESULT_STATES.FORCE_STOPPED;
  const isSpecialResult = isRecovered || isForceStop;

  // Get appropriate background class
  const bgClass = isValidNumber
    ? getNumberBackgroundClass(number)
    : isRecovered
      ? "bg-gradient-to-br from-purple-500/90 to-purple-600/90 border-purple-400/20 text-white"
      : isForceStop
        ? "bg-gradient-to-br from-orange-500/90 to-orange-600/90 border-orange-400/20 text-white"
        : "bg-white border-gray-200";

  // Determine what to display
  const displayValue = isRecovered
    ? "R"
    : isForceStop
      ? "F"
      : isValidNumber
        ? number
        : "-";

  // Tooltip text based on result type
  const getTooltipText = () => {
    if (isRecovered) return "Recovered Game";
    if (isForceStop) return "Force Stopped";
    return "";
  };

  return (
    <div className="flex items-center justify-center w-24">
      <div className="relative w-full">
        <div className="text-sm text-gray-600 font-medium text-center mb-2">
          Last Number
        </div>
        <div
          className={`group aspect-square w-full rounded-xl flex items-center justify-center font-bold relative transform transition-all duration-500 hover:scale-105 ${bgClass} shadow-lg hover:shadow-2xl animate-float`}
        >
          <span
            className={`text-3xl font-bold ${
              isValidNumber || isSpecialResult ? "text-white" : "text-gray-400"
            } animate-fadeIn`}
          >
            {displayValue}
          </span>

          {/* Add tooltip for special result values */}
          {isSpecialResult && (
            <div className="absolute -bottom-10 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center">
              <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none">
                {getTooltipText()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LastNumberDisplay;
