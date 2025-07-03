import React from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

// Function to handle WalletConnect recovery
const clearWalletConnectStorage = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("wc@") || key.startsWith("walletconnect")) {
      localStorage.removeItem(key);
    }
  });
  window.location.reload();
};

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  const isWalletConnectError =
    error.message &&
    (error.message.includes("session topic") ||
      error.message.includes("walletconnect") ||
      error.message.includes("WalletConnect"));

  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md my-4 flex flex-col items-center">
      <h3 className="font-bold text-lg mb-2">Something went wrong</h3>
      <p className="mb-4">{error.message || "An unexpected error occurred"}</p>

      {isWalletConnectError ? (
        <>
          <p className="mb-2 text-sm">
            This appears to be a WalletConnect session error. Clearing the
            session cache might fix it.
          </p>
          <button
            onClick={() => {
              clearWalletConnectStorage();
              resetErrorBoundary();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Clear WalletConnect Cache & Retry
          </button>
        </>
      ) : (
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

// Error boundary component
const ErrorBoundary = ({ children }) => {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset the state of your app here
        console.log("Error boundary reset");
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};

export default ErrorBoundary;
