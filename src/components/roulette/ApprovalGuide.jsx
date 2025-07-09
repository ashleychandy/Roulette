import React from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faArrowRight } from "@fortawesome/free-solid-svg-icons";

/**
 * ApprovalGuide component that explains token approval to users
 * in a simple, user-friendly way with modern aesthetics
 */
const ApprovalGuide = ({ onApproveClick }) => {
  // Animation variants for staggered children
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-xs mx-auto"
    >
      {/* Modern Title with Gradient */}
      <motion.h3
        variants={item}
        className="text-lg font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-purple-600 to-purple-500 mb-3 text-center"
      >
        Ready to Play?
      </motion.h3>

      {/* Stylish explanation with arrow */}
      <motion.div variants={item} className="relative mb-4">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-px bg-gradient-to-r from-transparent via-purple-200 to-transparent"></div>
        <p className="text-sm text-purple-600/90 text-center leading-relaxed flex items-center justify-center gap-2">
          <span>Approve tokens once</span>
          <motion.span
            animate={{ x: [0, 3, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <FontAwesomeIcon
              icon={faArrowRight}
              className="text-xs text-purple-400"
            />
          </motion.span>
          <span>Place bets anytime</span>
        </p>
      </motion.div>

      {/* Modern security note with subtle glow */}
      <motion.div
        variants={item}
        className="flex items-center justify-center gap-2.5 px-3 py-2 bg-purple-50/80 rounded-lg border border-purple-100/80 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-100/0 via-purple-100/30 to-purple-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div className="bg-purple-100 p-1.5 rounded-full relative z-10">
          <FontAwesomeIcon icon={faLock} className="text-xs text-purple-500" />
        </div>
        <span className="text-xs text-purple-600 font-medium relative z-10">
          Your tokens remain secure in your wallet
        </span>
      </motion.div>
    </motion.div>
  );
};

export default ApprovalGuide;
