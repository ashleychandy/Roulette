import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faRandom,
  faChartLine,
  faDice,
} from "@fortawesome/free-solid-svg-icons";

/**
 * Game Rules and Odds component for Roulette
 * Shows information about game rules, odds, and payouts in a collapsible panel
 */
const GameRulesAndOdds = () => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="bg-white/90 backdrop-blur-md rounded-xl border border-[#22AD74]/20 shadow-xl relative overflow-hidden"
    >
      {/* Decorative elements */}
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#22AD74]/10 rounded-full opacity-30 blur-2xl pointer-events-none"></div>
      <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-[#22AD74]/10 rounded-full opacity-30 blur-3xl pointer-events-none"></div>

      <div
        className="p-8 flex justify-between items-center cursor-pointer relative z-10 hover:bg-[#22AD74]/5 transition-colors duration-200"
        onClick={() => setIsRulesOpen(!isRulesOpen)}
        role="button"
        aria-expanded={isRulesOpen}
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setIsRulesOpen(!isRulesOpen);
          }
        }}
      >
        <h2 className="text-2xl font-bold text-[#22AD74] bg-clip-text text-transparent bg-gradient-to-r from-[#22AD74] to-[#22AD74]/70">
          Game Rules & Odds
        </h2>
        <motion.div
          animate={{ rotate: isRulesOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="w-10 h-10 bg-[#22AD74]/10 rounded-full flex items-center justify-center text-[#22AD74] hover:bg-[#22AD74]/20"
        >
          <FontAwesomeIcon icon={faChevronDown} className="text-lg" />
        </motion.div>

        {/* Invisible overlay to increase clickable area */}
        <div
          className="absolute inset-0 z-0"
          onClick={() => setIsRulesOpen(!isRulesOpen)}
        ></div>
      </div>

      <AnimatePresence>
        {isRulesOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden relative z-0"
          >
            <div className="px-8 pb-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* How to Play */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/60 backdrop-blur-sm rounded-xl border border-[#22AD74]/10 p-6 shadow-sm transition-all hover:shadow-md hover:border-[#22AD74]/30"
                >
                  <div className="w-12 h-12 rounded-full bg-[#22AD74]/10 flex items-center justify-center mb-4">
                    <FontAwesomeIcon
                      icon={faDice}
                      className="text-[#22AD74] text-xl"
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-[#22AD74]">
                    How to Play
                  </h3>
                  <ul className="space-y-3.5 text-gray-700">
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#22AD74]/20 flex flex-shrink-0 items-center justify-center text-xs text-[#22AD74] font-bold mt-0.5">
                        1
                      </div>
                      <span>
                        Choose your bet type (straight, dozen, column, etc.)
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#22AD74]/20 flex flex-shrink-0 items-center justify-center text-xs text-[#22AD74] font-bold mt-0.5">
                        2
                      </div>
                      <span>
                        Select a chip value and place your bets on the board
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#22AD74]/20 flex flex-shrink-0 items-center justify-center text-xs text-[#22AD74] font-bold mt-0.5">
                        3
                      </div>
                      <span>Click "Place Bets" to confirm your wagers</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#22AD74]/20 flex flex-shrink-0 items-center justify-center text-xs text-[#22AD74] font-bold mt-0.5">
                        4
                      </div>
                      <span>Wait for the blockchain verification</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#22AD74]/20 flex flex-shrink-0 items-center justify-center text-xs text-[#22AD74] font-bold mt-0.5">
                        5
                      </div>
                      <span>If your bet is successful, you win instantly!</span>
                    </li>
                  </ul>
                </motion.div>

                {/* Odds & Payouts */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/60 backdrop-blur-sm rounded-xl border border-[#22AD74]/10 p-6 shadow-sm transition-all hover:shadow-md hover:border-[#22AD74]/30"
                >
                  <div className="w-12 h-12 rounded-full bg-[#22AD74]/10 flex items-center justify-center mb-4">
                    <FontAwesomeIcon
                      icon={faChartLine}
                      className="text-[#22AD74] text-xl"
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-[#22AD74]">
                    Odds & Payouts
                  </h3>
                  <div className="space-y-3 text-gray-700">
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-2">Straight (Single number):</td>
                          <td className="py-2 text-right font-semibold text-[#22AD74]">
                            36x
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2">Dozen (1-12, 13-24, 25-36):</td>
                          <td className="py-2 text-right font-semibold text-[#22AD74]">
                            3x
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2">Column (1st, 2nd, 3rd):</td>
                          <td className="py-2 text-right font-semibold text-[#22AD74]">
                            3x
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2">Red/Black:</td>
                          <td className="py-2 text-right font-semibold text-[#22AD74]">
                            2x
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2">Even/Odd:</td>
                          <td className="py-2 text-right font-semibold text-[#22AD74]">
                            2x
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-2">Low (1-18)/High (19-36):</td>
                          <td className="py-2 text-right font-semibold text-[#22AD74]">
                            2x
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-xs text-[#22AD74] italic mt-2">
                      Note: All payouts shown include your original bet amount
                      (win amount + original bet)
                    </p>
                  </div>
                </motion.div>

                {/* Blockchain Verification */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/60 backdrop-blur-sm rounded-xl border border-[#22AD74]/10 p-6 shadow-sm transition-all hover:shadow-md hover:border-[#22AD74]/30"
                >
                  <div className="w-12 h-12 rounded-full bg-[#22AD74]/10 flex items-center justify-center mb-4">
                    <FontAwesomeIcon
                      icon={faRandom}
                      className="text-[#22AD74] text-xl"
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-[#22AD74]">
                    Verifiable Fairness
                  </h3>
                  <div className="space-y-3.5 text-gray-700">
                    <p>
                      GAMA ROULETTE uses{" "}
                      <span className="font-medium">
                        Plugin&apos;s Verifiable Random Function (VRF)
                      </span>{" "}
                      to ensure complete fairness and transparency.
                    </p>
                    <div className="bg-[#22AD74]/5 rounded-lg p-4 text-sm">
                      <p className="font-medium mb-2">How VRF works:</p>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>
                          When you place a bet, GAMA tokens are burned from your
                          wallet
                        </li>
                        <li>
                          A cryptographically secure random number is requested
                          from Plugin
                        </li>
                        <li>
                          When received, the result determines the winning
                          position from 0-36
                        </li>
                        <li>
                          Winning bets receive instant payouts to your wallet
                        </li>
                        <li>
                          Every transaction is recorded on the blockchain and
                          can be verified
                        </li>
                      </ol>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      GAMA ROULETTE offers true odds with all results determined
                      by a provably fair system!
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GameRulesAndOdds;
