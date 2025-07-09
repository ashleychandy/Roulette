import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "./components/ErrorBoundary";
import { WalletProvider } from "./hooks/WalletContext";
import { NetworkProvider } from "./hooks/NetworkContext";

// Create a client
const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <NetworkProvider>
            <App />
          </NetworkProvider>
        </WalletProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
