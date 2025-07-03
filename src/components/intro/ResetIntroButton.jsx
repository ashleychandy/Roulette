import React from "react";
import { motion } from "framer-motion";

/**
 * A button component that allows users to reset the intro screen
 * and see the welcome tour again.
 */
const ResetIntroButton = ({ className = "" }) => {
  const handleResetIntro = () => {
    // Remove the flag from localStorage
    localStorage.removeItem("gamaRoulette_hasSeenIntro");

    // Reload the page to show the intro
    window.location.reload();
  };

  return (
    <motion.button
      onClick={handleResetIntro}
      className={`px-4 py-2 bg-white/80 hover:bg-white/90 text-[#22AD74] border border-[#22AD74]/30 rounded-lg shadow-sm hover:shadow transition-all duration-300 text-sm font-medium flex items-center gap-2 ${className}`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      Show Welcome Tour
    </motion.button>
  );
};

export default ResetIntroButton;
