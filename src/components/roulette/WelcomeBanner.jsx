import React from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins, faCubes } from "@fortawesome/free-solid-svg-icons";

/**
 * Welcome banner component that displays when the user is not connected
 * Provides information about the game and a connect wallet button
 */
const WelcomeBanner = ({ onConnectClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="backdrop-blur-md bg-white/40 rounded-2xl p-8 shadow-lg border border-[#22AD74]/20 mb-8 relative overflow-hidden"
  >
    {/* Decorative elements that complement the site's green-to-white gradient */}
    <div className="absolute top-0 right-0 w-64 h-64 bg-[#22AD74]/10 rounded-full blur-3xl -mr-32 -mt-32 opacity-60"></div>
    <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#22AD74]/15 rounded-full blur-2xl -ml-20 -mb-20 opacity-60"></div>
    <div className="absolute top-1/2 left-1/3 w-20 h-20 bg-[#22AD74]/10 rounded-full blur-xl opacity-40"></div>

    <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-[#22AD74]/30 backdrop-blur-sm rounded-full shadow-sm">
            <FontAwesomeIcon
              icon={faCoins}
              className="text-[#22AD74] text-xl"
            />
          </div>
          <h2 className="text-3xl font-bold text-[#22AD74] bg-clip-text text-transparent bg-gradient-to-r from-[#22AD74] to-[#22AD74]/70">
            Welcome to GAMA ROULETTE
          </h2>
        </div>

        <p className="text-gray-700 mb-5 text-lg">
          Place your bets on the roulette table and spin the wheel for a chance
          to win up to 36x your stake!
        </p>

        <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-[#22AD74]/15 mb-4 shadow-sm">
          <h3 className="font-semibold text-[#22AD74] mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faCubes} className="text-[#22AD74]" />
            How to Play:
          </h3>
          <ul className="grid gap-2.5 text-gray-600">
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-xs text-[#22AD74] font-bold shadow-inner">
                1
              </div>
              <span>Connect your wallet to start playing</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-xs text-[#22AD74] font-bold shadow-inner">
                2
              </div>
              <span>
                Choose your bet type and place your bet with GAMA tokens
              </span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#22AD74]/20 flex items-center justify-center text-xs text-[#22AD74] font-bold shadow-inner">
                3
              </div>
              <span>Win instantly when the roulette wheel stops</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex-shrink-0">
        <motion.button
          onClick={onConnectClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 bg-gradient-to-r from-[#22AD74] to-[#22AD74]/80 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-medium flex items-center gap-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z"
              clipRule="evenodd"
            />
          </svg>
          Connect Wallet
        </motion.button>
      </div>
    </div>
  </motion.div>
);

export default WelcomeBanner;
