import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "./WalletContext";
import RouletteABI from "../contracts/abi/Roulette.json";
import { xdc, xdcTestnet } from "../constants/chains";

/**
 * Hook for interacting with the Roulette contract
 * Provides access to the contract instance and related helper functions
 */
export const useRouletteContract = () => {
  const { address, provider, chainId, contracts } = useWallet();
  const [contract, setContract] = useState(null);
  const [contractError, setContractError] = useState(null);

  // Get contract address based on current network
  const getContractAddress = useCallback(() => {
    // Check mainnet
    if (chainId === xdc.id) {
      return process.env.REACT_APP_ROULETTE_ADDRESS;
    }
    // Check testnet
    if (chainId === xdcTestnet.id) {
      return process.env.REACT_APP_APOTHEM_ROULETTE_ADDRESS;
    }
    return null;
  }, [chainId]);

  // Initialize contract instance
  useEffect(() => {
    const initContract = async () => {
      try {
        // Reset contract and error state
        setContract(null);
        setContractError(null);

        // First check if we already have an initialized contract from WalletContext
        if (contracts?.roulette) {
          setContract(contracts.roulette);
          return;
        }

        // Ensure we have all required dependencies
        if (!provider || !address) {
          return;
        }

        const contractAddress = getContractAddress();
        if (!contractAddress) {
          setContractError("Unsupported network");
          return;
        }

        // Make sure the ABI is properly accessed - RouletteABI contains an 'abi' property
        const abi = RouletteABI.abi;

        if (!abi || !Array.isArray(abi)) {
          throw new Error("Invalid ABI format: ABI is not an array");
        }

        // Create contract instance
        const contractInstance = new ethers.Contract(
          contractAddress,
          abi, // Use the actual ABI array from the JSON
          provider.getSigner(),
        );

        setContract(contractInstance);
      } catch (error) {
        console.error("Error initializing Roulette contract:", error);
        setContractError(
          error.message || "Failed to initialize Roulette contract",
        );
      }
    };

    initContract();
  }, [provider, address, getContractAddress, contracts]);

  return {
    contract,
    contractError,
    isContractReady: !!contract,
    contractAddress: getContractAddress(),
  };
};
