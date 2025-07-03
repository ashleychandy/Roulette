import React from "react";

const BetChip = ({ amount, className = "", style = {} }) => {
  // Helper function to format large numbers
  const formatAmount = (value) => {
    const num = Number(value);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    // For small numbers, ensure at least one decimal place if not whole
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
  };

  return (
    <div
      className={`absolute w-8 h-8 rounded-full bg-[#22AD74] border-2 border-white/50 flex items-center justify-center text-[11px] font-bold shadow-lg text-white transform hover:scale-110 transition-all duration-300 group ${className}`}
      style={style}
    >
      <span className="group-hover:opacity-0 transition-opacity duration-200">
        {formatAmount(amount)}
      </span>
      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {amount}
      </span>
    </div>
  );
};

export default BetChip;
