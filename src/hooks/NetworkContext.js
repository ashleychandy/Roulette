import React, { createContext, useContext, useState, useEffect } from "react";
import { useWallet } from "./WalletContext";
import { xdc, xdcTestnet } from "../constants/chains";

// Define available networks
export const NETWORKS = {
  MAINNET: {
    id: "mainnet",
    name: "XDC Mainnet",
    chainId: xdc.id,
    color: "#2DD4BF",
    rpc: process.env.REACT_APP_XDC_MAINNET_RPC || "https://rpc.xinfin.network",
    explorer: "https://explorer.xinfin.network",
    rouletteAddress: process.env.REACT_APP_ROULETTE_ADDRESS,
    tokenAddress: process.env.REACT_APP_TOKEN_ADDRESS,
  },
  APOTHEM: {
    id: "testnet",
    name: "XDC Apothem",
    chainId: xdcTestnet.id,
    color: "#818CF8",
    rpc: process.env.REACT_APP_XDC_APOTHEM_RPC || "https://rpc.apothem.network",
    explorer: "https://explorer.apothem.network",
    rouletteAddress: process.env.REACT_APP_APOTHEM_ROULETTE_ADDRESS,
    tokenAddress: process.env.REACT_APP_APOTHEM_TOKEN_ADDRESS,
  },
};

// Create the context
const NetworkContext = createContext(null);

// Provider component
export const NetworkProvider = ({ children }) => {
  const { provider, chainId } = useWallet();
  const [currentNetwork, setCurrentNetwork] = useState(
    // Default to env setting or Apothem
    process.env.REACT_APP_DEFAULT_NETWORK === "mainnet"
      ? NETWORKS.MAINNET
      : NETWORKS.APOTHEM,
  );
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);
  const [networkError, setNetworkError] = useState(null);

  // Detect the current network from chainId when available
  useEffect(() => {
    if (!chainId) return;

    // XDC Mainnet is 50, Apothem is 51
    if (chainId === xdc.id) {
      setCurrentNetwork(NETWORKS.MAINNET);
    } else if (chainId === xdcTestnet.id) {
      setCurrentNetwork(NETWORKS.APOTHEM);
    }
  }, [chainId]);

  // Switch network function
  const switchNetwork = async (networkId) => {
    if (!window.ethereum) {
      setNetworkError("Wallet not connected");
      return false;
    }

    setIsNetworkSwitching(true);
    setNetworkError(null);

    const targetNetwork =
      networkId === "mainnet" ? NETWORKS.MAINNET : NETWORKS.APOTHEM;

    try {
      // Request network switch via wallet
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${targetNetwork.chainId.toString(16)}` }],
      });

      // Update state (the effect above will detect the change too)
      setCurrentNetwork(targetNetwork);

      // Reload the page to ensure full state synchronization
      window.location.reload();
      return true;
    } catch (error) {
      console.error("Network switch failed:", error);
      setNetworkError(error.message || "Failed to switch network");

      // Handle the case where the chain hasn't been added to the wallet (Error 4902)
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${targetNetwork.chainId.toString(16)}`,
                chainName: targetNetwork.name,
                nativeCurrency: {
                  name: "XDC",
                  symbol: "XDC",
                  decimals: 18,
                },
                rpcUrls:
                  targetNetwork.id === "mainnet"
                    ? [process.env.REACT_APP_XDC_MAINNET_RPC]
                    : [process.env.REACT_APP_XDC_APOTHEM_RPC],
                blockExplorerUrls:
                  targetNetwork.id === "mainnet"
                    ? ["https://xdcscan.com/"]
                    : ["https://testnet.xdcscan.com/"],
              },
            ],
          });
          // After adding, try switching again
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${targetNetwork.chainId.toString(16)}` }],
          });
          setCurrentNetwork(targetNetwork);
          // Reload the page to ensure full state synchronization after adding and switching
          window.location.reload();
          return true;
        } catch (addError) {
          console.error("Failed to add network:", addError);
          setNetworkError(
            addError.message || "Failed to add and switch network",
          );
          return false;
        }
      } else if (error.code === 4001) {
        // User rejected the network switch
        setNetworkError("Network switch rejected by user.");
        return false;
      }
      return false;
    } finally {
      setIsNetworkSwitching(false);
    }
  };

  return (
    <NetworkContext.Provider
      value={{
        currentNetwork,
        networks: NETWORKS,
        switchNetwork,
        isNetworkSwitching,
        networkError,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

// Hook for using the network context
export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
};
