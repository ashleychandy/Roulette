import React, { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";

import RoulettePage from "./pages/Roulette";
import Layout from "./components/layout/Layout";
import { useWallet } from "./hooks/WalletContext";
import { PollingProvider } from "./services/pollingService";
import { VrfRecoveryModal } from "./components/vrf";
import IntroScreen from "./components/intro/IntroScreen";
import {
  NotificationProvider,
  useNotification,
} from "./contexts/NotificationContext";
import { useQueryClient } from "@tanstack/react-query";
import { NetworkProvider } from "./hooks/NetworkContext";

function App() {
  const [isVrfModalOpen, setIsVrfModalOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Use our custom wallet hook
  const { address, isConnected, isNetworkSupported, contracts, loading } =
    useWallet();

  // Check local storage to see if the user has already seen the intro
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem("gamaRoulette_hasSeenIntro");
    if (hasSeenIntro === "true") {
      setShowIntro(false);
    }
  }, []);

  // Function to handle the completion of the intro
  const handleIntroComplete = () => {
    localStorage.setItem("gamaRoulette_hasSeenIntro", "true");
    setShowIntro(false);
  };

  // Create a wrapped component that has access to the notification context
  const AppContent = () => {
    const { addToast } = useNotification();
    const queryClient = useQueryClient();

    // Force refresh VRF state when component mounts
    useEffect(() => {
      // We'll refresh VRF-related queries when the component mounts
      // This ensures the VRF state is current
      if (contracts?.roulette && address) {
        queryClient.invalidateQueries(["gameStatus", address]);
      }
    }, [queryClient, contracts?.roulette, address]);

    // Enhanced error handler with notification context
    const handleError = useCallback(
      (error, context = "") => {
        // If error is null or undefined, use a default error object
        if (!error) {
          addToast("Something went wrong. Please try again later.", "error");
          return "Something went wrong. Please try again later.";
        }

        // Prevent duplicate toasts by checking the error message and timestamp
        const errorKey = `${error?.message || "Unknown error"}_${Math.floor(
          Date.now() / 1000,
        )}`;

        // Don't show another toast if the same error occurred in the last second
        if (window._lastErrorKey === errorKey) {
          return;
        }
        window._lastErrorKey = errorKey;

        let errorMessage = "Something went wrong. Please try again later.";
        let errorType = "error";

        if (error.code === 4001) {
          errorMessage = "Transaction cancelled by user";
          errorType = "warning";
        } else if (error.code === -32002) {
          errorMessage =
            "Please check your wallet - a connection request is pending";
          errorType = "warning";
        } else if (error.code === -32603) {
          errorMessage =
            "Network connection issue. Please check your wallet connection.";
          errorType = "error";
        } else if (error?.message?.includes("insufficient allowance")) {
          errorMessage =
            "Insufficient token allowance. Please approve tokens first.";
          errorType = "error";
        } else if (error?.message?.includes("insufficient balance")) {
          errorMessage = "Insufficient token balance for this transaction.";
          errorType = "error";
        } else if (error?.message?.includes("VRF request")) {
          errorMessage = error.message;
          errorType = "info";
        }

        addToast({
          title: context ? `Error: ${context}` : "Error",
          description: errorMessage,
          type: errorType,
        });
        return errorMessage;
      },
      [addToast],
    );

    return (
      <NetworkProvider>
        <PollingProvider
          RouletteContract={contracts?.roulette}
          account={address}
        >
          <AnimatePresence mode="sync">
            {showIntro ? (
              <IntroScreen onComplete={handleIntroComplete} />
            ) : (
              <Layout>
                <RoulettePage
                  contracts={contracts}
                  account={address}
                  addToast={addToast}
                  handleError={handleError}
                  isConnected={isConnected}
                  isNetworkSupported={isNetworkSupported}
                  loadingStates={{
                    provider: false,
                    contracts: loading,
                    wallet: false,
                  }}
                />

                {/* VRF Recovery Modal */}
                <AnimatePresence mode="sync">
                  {isVrfModalOpen && (
                    <VrfRecoveryModal
                      isOpen={isVrfModalOpen}
                      onClose={() => setIsVrfModalOpen(false)}
                    />
                  )}
                </AnimatePresence>
              </Layout>
            )}
          </AnimatePresence>
        </PollingProvider>
      </NetworkProvider>
    );
  };

  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}

export default App;
