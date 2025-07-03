import React, { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "../roulette/Navbar";
import { useWallet } from "../../hooks/WalletContext";
import { useNetwork } from "../../hooks/NetworkContext";
import { VrfStatusGlobal, VrfRecoveryModal } from "../vrf";
import ResetIntroButton from "../intro/ResetIntroButton";

// Import the background image
import gamaBg from "../../assets/bg-overlay1.jpg";

const Layout = ({ children, showNetworkWarning = true }) => {
  const { address, isConnected, chainId } = useWallet();
  const { currentNetwork } = useNetwork();
  const [isVrfModalOpen, setIsVrfModalOpen] = useState(false);

  // Check if we're on a supported network
  const isUnsupportedNetwork =
    chainId &&
    chainId !== 50 && // XDC Mainnet
    chainId !== 51; // Apothem Testnet

  // Handler to open the VRF recovery modal
  const handleOpenRecovery = () => {
    setIsVrfModalOpen(true);
  };

  return (
    <div className="min-h-screen relative">
      {/* Background image covering the entire page */}
      <div
        className="fixed top-0 left-0 w-full h-full bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${gamaBg})` }}
      />

      {/* Navbar placed outside the relative container */}
      <Navbar />

      <div className="relative z-10 flex flex-col min-h-screen pt-16">
        {/* Content area with transparent background */}
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow">
          {children}
        </main>

        {/* Global VRF Status Notification */}
        <VrfStatusGlobal onOpenRecovery={handleOpenRecovery} />

        {/* Footer */}
        <motion.div
          className="relative z-10 py-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="space-y-2">
            <p className="text-gray-600 text-sm">
              Crafted with <span className="text-[#22AD74] mx-1">♥</span> and
              built on{" "}
              <a
                href="https://xdc.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#22AD74] hover:text-[#1a8f5e] transition-colors cursor-pointer"
              >
                XDC
              </a>
            </p>
            <p className="text-gray-500 text-xs">
              GAMA © 2025. Open source, for everyone.{" "}
              <span className="text-[#22AD74]">#BuildOnXDC</span>
            </p>
            <div className="mt-4 flex justify-center">
              <ResetIntroButton />
            </div>
          </div>
        </motion.div>
      </div>

      {/* VRF Recovery Modal */}
      <VrfRecoveryModal
        isOpen={isVrfModalOpen}
        onClose={() => setIsVrfModalOpen(false)}
      />
    </div>
  );
};

export default Layout;
