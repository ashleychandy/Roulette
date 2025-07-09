import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from "react";
import { ethers } from "ethers";
import { xdc, xdcTestnet, SUPPORTED_CHAIN_IDS } from "../constants/chains";
import TokenABI from "../contracts/abi/GamaToken.json";
import RouletteABI from "../contracts/abi/Roulette.json";

// Network configuration
const NETWORKS = {
  MAINNET: {
    chainId: xdc.id, // 50
    name: xdc.name,
    contracts: {
      token: process.env.REACT_APP_TOKEN_ADDRESS,
      roulette: process.env.REACT_APP_ROULETTE_ADDRESS,
    },
  },
  APOTHEM: {
    chainId: xdcTestnet.id, // 51
    name: xdcTestnet.name,
    contracts: {
      token: process.env.REACT_APP_APOTHEM_TOKEN_ADDRESS,
      roulette: process.env.REACT_APP_APOTHEM_ROULETTE_ADDRESS,
    },
  },
};

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contracts, setContracts] = useState({
    token: null,
    roulette: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNetworkSupported, setIsNetworkSupported] = useState(false);

  // Create a ref to hold current provider
  const providerRef = useRef(null);

  // Update the ref whenever provider changes
  useEffect(() => {
    providerRef.current = provider;
  }, [provider]);

  // Handle account changes
  const handleAccountsChanged = useCallback((accounts) => {
    if (accounts.length === 0) {
      // User disconnected
      setAddress(null);
      setIsConnected(false);
      setSigner(null);
    } else {
      // Account changed
      setAddress(accounts[0]);
      setIsConnected(true);

      // Need to update signer using the ref instead of the state
      if (providerRef.current) {
        providerRef.current
          .getSigner()
          .then((newSigner) => {
            setSigner(newSigner);
          })
          .catch((err) => {
            console.error("Failed to get signer after account change:", err);
          });
      }
    }
  }, []); // No dependencies means this callback doesn't recreate

  // Initialize provider
  useEffect(() => {
    const initProvider = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          setProvider(provider);

          // Get the network
          const network = await provider.getNetwork();
          const chainIdDecimal = Number(network.chainId);
          setChainId(chainIdDecimal);

          // Check if the network is supported
          setIsNetworkSupported(SUPPORTED_CHAIN_IDS.includes(chainIdDecimal));

          // Get accounts
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setAddress(accounts[0].address);
            setIsConnected(true);

            // Get signer
            const signer = await provider.getSigner();
            setSigner(signer);
          }
        } catch (err) {
          console.error("Error initializing provider:", err);
          setError(err.message || "Failed to initialize provider");
        } finally {
          setLoading(false);
        }
      } else {
        setError(
          "No Ethereum provider found. Please install MetaMask or another wallet.",
        );
        setLoading(false);
      }
    };

    initProvider();

    // Setup event listeners
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      // window.ethereum.on("chainChanged", handleChainChanged); // Removed to avoid conflicting reload logic

      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged,
        );
        // window.ethereum.removeListener("chainChanged", handleChainChanged); // Removed
      };
    }
  }, [handleAccountsChanged]); // Removed handleChainChanged from dependencies

  // Initialize contracts when connected and on a supported network
  useEffect(() => {
    const initContracts = async () => {
      if (!isConnected || !signer) {
        setContracts({ token: null, roulette: null });
        return;
      }

      try {
        setError(null);

        if (!isNetworkSupported) {
          setContracts({ token: null, roulette: null });
          return;
        }

        // Get network configuration based on chain ID
        const networkKey = chainId === xdc.id ? "MAINNET" : "APOTHEM";
        const networkConfig = NETWORKS[networkKey];

        if (!networkConfig) {
          throw new Error(
            `Network configuration not found for chain ID ${chainId}`,
          );
        }

        // Initialize contracts
        const tokenAbi = TokenABI.abi;
        const rouletteAbi = RouletteABI.abi;

        // Validate ABI formats
        if (!tokenAbi || !Array.isArray(tokenAbi)) {
          throw new Error("Invalid Token ABI format: ABI is not an array");
        }

        if (!rouletteAbi || !Array.isArray(rouletteAbi)) {
          throw new Error("Invalid Roulette ABI format: ABI is not an array");
        }

        const tokenContract = new ethers.Contract(
          networkConfig.contracts.token,
          tokenAbi,
          signer,
        );

        const rouletteContract = new ethers.Contract(
          networkConfig.contracts.roulette,
          rouletteAbi,
          signer,
        );

        setContracts({
          token: tokenContract,
          roulette: rouletteContract,
        });
      } catch (err) {
        console.error("Error initializing contracts:", err);
        setError(err.message || "Failed to initialize contracts");
        setContracts({ token: null, roulette: null });
      }
    };

    initContracts();
  }, [isConnected, signer, chainId, isNetworkSupported]);

  // Connect wallet function
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError(
        "No Ethereum provider found. Please install MetaMask or another wallet.",
      );
      return;
    }

    try {
      setLoading(true);

      // Request accounts access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);

        // Update provider and signer
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);

        const signer = await provider.getSigner();
        setSigner(signer);

        // Get and set chain ID
        const network = await provider.getNetwork();
        const chainIdDecimal = Number(network.chainId);
        setChainId(chainIdDecimal);

        // Check if network is supported
        setIsNetworkSupported(SUPPORTED_CHAIN_IDS.includes(chainIdDecimal));
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        chainId,
        provider,
        signer,
        contracts,
        loading,
        error,
        isNetworkSupported,
        connectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
