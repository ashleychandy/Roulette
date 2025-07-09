import React from "react";
import { motion } from "framer-motion";
import { useWallet } from "../../hooks/WalletContext";
import { xdc, xdcTestnet } from "../../constants/chains";

// Helper function to clear wallet connection cache
const clearWalletCache = () => {
  // Clear storage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("wc@") || key.startsWith("walletconnect")) {
      localStorage.removeItem(key);
    }
  });

  // Reload the page
  window.location.reload();
};

// Helper to format address
const formatAddress = (address) => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(
    address.length - 4,
  )}`;
};

const ConnectButton = () => {
  const { address, isConnected, chain, connectWallet, switchNetwork } =
    useWallet();

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        <motion.button
          onClick={connectWallet}
          type="button"
          className="px-6 py-2 rounded-lg bg-[#22AD74] text-white border border-[#22AD74]/20 hover:bg-[#22AD74]/90 transition-all duration-300 flex items-center gap-2"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          Connect Wallet
        </motion.button>

        <motion.button
          onClick={clearWalletCache}
          type="button"
          className="px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 hover:bg-gray-600 transition-all duration-300 text-sm"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          title="Clear Connection Cache"
        >
          Clear Cache
        </motion.button>
      </div>
    );
  }

  if (chain?.unsupported) {
    return (
      <motion.button
        onClick={() => switchNetwork(xdc.id)}
        type="button"
        className="px-6 py-2 rounded-lg bg-red-600 text-white border border-red-600/20 hover:bg-red-600/90 transition-all duration-300 flex items-center gap-2"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        Wrong network
      </motion.button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <motion.button
        onClick={() => {
          // Toggle between main and testnet
          const targetChainId = chain.id === xdc.id ? xdcTestnet.id : xdc.id;
          switchNetwork(targetChainId);
        }}
        type="button"
        className="px-4 py-2 rounded-lg bg-[#22AD74]/10 text-[#22AD74] border border-[#22AD74]/20 hover:bg-[#22AD74]/20 transition-all duration-300 flex items-center gap-2"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        {chain?.name || "Unknown Network"}
      </motion.button>

      <motion.button
        type="button"
        className="px-4 py-2 rounded-lg bg-[#22AD74]/5 border border-[#22AD74]/20 hover:bg-[#22AD74]/10 transition-all duration-300 flex items-center gap-2"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        {formatAddress(address)}
      </motion.button>
    </div>
  );
};

export default ConnectButton;
