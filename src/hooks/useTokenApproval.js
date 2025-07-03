import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useQueryClient } from "@tanstack/react-query";
import { CONTRACT_CONSTANTS } from "../constants/roulette_constants";

/**
 * Custom hook for checking and handling token approvals
 * @param {Object} contracts - The contract instances
 * @param {string} account - The user account address
 * @param {Function} onError - The error handling function (optional)
 * @param {Function} addToast - The toast notification function (optional)
 * @returns {Object} Approval state and functions
 */
export const useTokenApproval = (contracts, account, onError, addToast) => {
  const [isApproved, setIsApproved] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  // Check token approval
  useEffect(() => {
    let mounted = true;

    const checkApproval = async () => {
      if (!contracts?.token || !account || !contracts?.roulette) {
        if (mounted) {
          setIsApproved(false);
          setIsCheckingApproval(false);
        }
        return;
      }

      try {
        // Check if contracts are properly initialized
        if (
          !contracts.token.hasOwnProperty("hasRole") ||
          typeof contracts.token.hasRole !== "function"
        ) {
          throw new Error("Token contract interface is incomplete");
        }

        // Check roles and allowance separately to isolate the issue
        let hasMinterRole = false;
        let hasBurnerRole = false;
        let allowance = BigInt(0);

        try {
          hasMinterRole = await contracts.token.hasRole(
            CONTRACT_CONSTANTS.MINTER_ROLE,
            contracts.roulette.target,
          );
        } catch (roleError) {
          // If hasRole fails, assume role is not granted
          hasMinterRole = false;
        }

        try {
          hasBurnerRole = await contracts.token.hasRole(
            CONTRACT_CONSTANTS.BURNER_ROLE,
            contracts.roulette.target,
          );
        } catch (roleError) {
          // If hasRole fails, assume role is not granted
          hasBurnerRole = false;
        }

        try {
          allowance = await contracts.token.allowance(
            account,
            contracts.roulette.target,
          );
        } catch (allowanceError) {
          // If allowance check fails, assume zero allowance
          allowance = BigInt(0);
        }

        // Contract must have both roles and sufficient allowance
        const hasRequiredRoles = hasMinterRole && hasBurnerRole;
        const hasSufficientAllowance =
          allowance >= CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT;

        if (mounted) {
          setIsApproved(hasRequiredRoles && hasSufficientAllowance);
          setIsCheckingApproval(false);
        }
      } catch (error) {
        if (mounted) {
          setIsApproved(false);
          setIsCheckingApproval(false);
        }
      }
    };

    setIsCheckingApproval(true);
    checkApproval();

    return () => {
      mounted = false;
    };
  }, [contracts?.token, contracts?.roulette, account]);

  // Handle token approval
  const handleApprove = useCallback(async () => {
    if (!contracts?.token || !account || !contracts?.roulette) {
      return;
    }

    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;

    const attemptApproval = async () => {
      try {
        setIsProcessing(true);

        // First check if roulette contract has required roles
        let hasMinterRole = false;
        let hasBurnerRole = false;
        let currentAllowance = BigInt(0);

        try {
          hasMinterRole = await contracts.token.hasRole(
            CONTRACT_CONSTANTS.MINTER_ROLE,
            contracts.roulette.target,
          );
        } catch (roleError) {
          // Continue with approval even if role check fails
        }

        try {
          hasBurnerRole = await contracts.token.hasRole(
            CONTRACT_CONSTANTS.BURNER_ROLE,
            contracts.roulette.target,
          );
        } catch (roleError) {
          // Continue with approval even if role check fails
        }

        try {
          currentAllowance = await contracts.token.allowance(
            account,
            contracts.roulette.target,
          );
        } catch (allowanceError) {
          // If allowance check fails, assume zero allowance
        }

        // Check if already approved
        if (currentAllowance >= CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT) {
          setIsApproved(true);
          addToast("Token already approved", "success");
          return;
        }

        // Only show warning if we could successfully check roles and they're missing
        if (
          (hasMinterRole === false || hasBurnerRole === false) &&
          hasMinterRole !== undefined &&
          hasBurnerRole !== undefined
        ) {
          addToast(
            "Warning: Roulette contract may be missing required roles. Proceeding with approval anyway.",
            "warning",
          );
        }

        // Get current gas price and add 20% buffer for approval
        const provider = new ethers.BrowserProvider(window.ethereum);
        const feeData = await provider.getFeeData();
        const adjustedGasPrice = (feeData.gasPrice * BigInt(120)) / BigInt(100);

        // Get signer and connect to contract
        const signer = await provider.getSigner();
        const tokenWithSigner = contracts.token.connect(signer);

        // Approve exact amount instead of max uint256 to match contract's expectations
        const tx = await tokenWithSigner.approve(
          contracts.roulette.target,
          CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT,
          {
            gasPrice: adjustedGasPrice,
          },
        );

        // Wait for confirmations with timeout
        const CONFIRMATION_TIMEOUT = 60000; // 60 seconds
        const confirmationPromise = tx.wait(2);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Approval confirmation timeout")),
            CONFIRMATION_TIMEOUT,
          ),
        );

        await Promise.race([confirmationPromise, timeoutPromise]);

        // Verify the new allowance
        let newAllowance;
        try {
          newAllowance = await contracts.token.allowance(
            account,
            contracts.roulette.target,
          );
        } catch (allowanceError) {
          // If we can't verify the allowance, assume it worked
          setIsApproved(true);
          addToast(
            "Token approval successful, but couldn't verify allowance",
            "warning",
          );
          queryClient.invalidateQueries(["balance", account]);
          return;
        }

        if (newAllowance < CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT) {
          throw new Error("Approval failed - insufficient allowance");
        }

        setIsApproved(true);
        addToast("Token approval successful", "success");

        // Invalidate balance queries
        queryClient.invalidateQueries(["balance", account]);
      } catch (error) {
        console.error("Token approval error:", error);

        // Check if error is due to network or transaction issues
        const retryableErrors = [
          "NETWORK_ERROR",
          "TIMEOUT",
          "UNPREDICTABLE_GAS_LIMIT",
          "transaction failed",
          "timeout",
          "replacement underpriced",
          "nonce has already been used",
        ];

        const shouldRetry = retryableErrors.some(
          (errMsg) =>
            error.code === errMsg ||
            error.message?.toLowerCase().includes(errMsg.toLowerCase()),
        );

        if (shouldRetry && retryCount < MAX_RETRIES) {
          retryCount++;
          addToast(
            `Approval failed, retrying... (Attempt ${retryCount}/${MAX_RETRIES})`,
            "warning",
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          return attemptApproval();
        }

        setIsApproved(false);

        // Handle specific error cases
        if (error.code === "ACTION_REJECTED") {
          addToast("Token approval was rejected by user", "warning");
        } else if (error.code === "INSUFFICIENT_FUNDS") {
          addToast("Insufficient funds to cover gas fees", "error");
        } else if (error.code === "REPLACEMENT_UNDERPRICED") {
          addToast("Transaction gas price too low. Please try again.", "error");
        } else if (error.message?.includes("insufficient allowance")) {
          addToast("Failed to approve tokens. Please try again.", "error");
        } else {
          addToast("Something went wrong. Please try again later.", "error");
          typeof onError === "function" && onError(error);
        }
      } finally {
        setIsProcessing(false);
      }
    };

    // Start the first attempt
    await attemptApproval();
  }, [
    contracts?.token,
    contracts?.roulette,
    account,
    addToast,
    onError,
    queryClient,
  ]);

  return {
    isApproved,
    isCheckingApproval,
    isProcessing,
    handleApprove,
  };
};
