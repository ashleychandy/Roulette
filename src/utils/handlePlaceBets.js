const handlePlaceBets = useCallback(async () => {
  if (!contracts?.roulette || !account || selectedBets.length === 0) return;

  // Store previous state for rollback
  const previousState = {
    bets: [...selectedBets],
    totalAmount: totalBetAmount,
  };

  // Constants for retry and timeout
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds
  const TRANSACTION_TIMEOUT = 60000; // 60 seconds
  const MIN_BET_AMOUNT = ethers.parseEther("1"); // 1 token minimum bet

  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      setIsProcessing(true);

      // 1. Validate and format bets
      const seenBetTypes = new Set();
      const betRequests = selectedBets.map((bet) => {
        // Validate bet type
        if (!BetTypes.isValid(bet.type)) {
          throw new Error(`Invalid bet type: ${bet.type}`);
        }

        // Prevent duplicate bet types except for straight bets
        if (bet.type !== BetTypes.STRAIGHT && seenBetTypes.has(bet.type)) {
          throw new Error(
            `Duplicate bet type detected: ${getBetTypeName(
              bet.type,
              bet.numbers,
            )}`,
          );
        }
        seenBetTypes.add(bet.type);

        // Get the correct number parameter based on bet type
        let number;
        switch (bet.type) {
          case BetTypes.STRAIGHT:
            // Improved straight bet validation
            if (!bet.numbers || bet.numbers.length !== 1) {
              throw new Error("Straight bet must have exactly one number");
            }

            const straightNumber = Number(bet.numbers[0]);

            // Check if it's a valid number (0-36)
            if (
              !Number.isInteger(straightNumber) ||
              straightNumber < 0 ||
              straightNumber > 36
            ) {
              throw new Error(
                `Invalid number for straight bet: ${bet.numbers[0]}. Must be between 0 and 36`,
              );
            }

            number = straightNumber;
            break;

          case BetTypes.DOZEN_FIRST:
            // Validate dozen bet numbers
            if (!bet.numbers?.every((n) => n >= 1 && n <= 12)) {
              throw new Error("Invalid numbers for first dozen bet");
            }
            number = 1;
            break;

          case BetTypes.DOZEN_SECOND:
            if (!bet.numbers?.every((n) => n >= 13 && n <= 24)) {
              throw new Error("Invalid numbers for second dozen bet");
            }
            number = 13;
            break;

          case BetTypes.DOZEN_THIRD:
            if (!bet.numbers?.every((n) => n >= 25 && n <= 36)) {
              throw new Error("Invalid numbers for third dozen bet");
            }
            number = 25;
            break;

          case BetTypes.COLUMN_FIRST:
            if (!bet.numbers?.every((n) => (n - 1) % 3 === 0)) {
              throw new Error("Invalid numbers for first column bet");
            }
            number = 1;
            break;

          case BetTypes.COLUMN_SECOND:
            if (!bet.numbers?.every((n) => (n - 2) % 3 === 0)) {
              throw new Error("Invalid numbers for second column bet");
            }
            number = 2;
            break;

          case BetTypes.COLUMN_THIRD:
            if (!bet.numbers?.every((n) => n % 3 === 0)) {
              throw new Error("Invalid numbers for third column bet");
            }
            number = 3;
            break;

          case BetTypes.RED:
            if (!bet.numbers?.every((n) => isRed(n))) {
              throw new Error("Invalid numbers for red bet");
            }
            number = 0;
            break;

          case BetTypes.BLACK:
            if (!bet.numbers?.every((n) => !isRed(n) && n !== 0)) {
              throw new Error("Invalid numbers for black bet");
            }
            number = 0;
            break;

          case BetTypes.EVEN:
            if (!bet.numbers?.every((n) => n % 2 === 0 && n !== 0)) {
              throw new Error("Invalid numbers for even bet");
            }
            number = 0;
            break;

          case BetTypes.ODD:
            if (!bet.numbers?.every((n) => n % 2 === 1)) {
              throw new Error("Invalid numbers for odd bet");
            }
            number = 0;
            break;

          case BetTypes.LOW:
            if (!bet.numbers?.every((n) => n >= 1 && n <= 18)) {
              throw new Error("Invalid numbers for low bet");
            }
            number = 0;
            break;

          case BetTypes.HIGH:
            if (!bet.numbers?.every((n) => n >= 19 && n <= 36)) {
              throw new Error("Invalid numbers for high bet");
            }
            number = 0;
            break;

          default:
            throw new Error(`Unsupported bet type: ${bet.type}`);
        }

        // Validate amount
        const amount = BigInt(bet.amount);
        if (amount < MIN_BET_AMOUNT) {
          throw new Error(`Minimum bet amount is 1 GAMA token`);
        }
        if (amount > CONTRACT_CONSTANTS.MAX_BET_AMOUNT) {
          throw new Error(
            `Maximum bet amount per position is ${ethers.formatEther(
              CONTRACT_CONSTANTS.MAX_BET_AMOUNT,
            )} GAMA`,
          );
        }

        return {
          betTypeId: bet.type,
          number: number,
          amount: amount.toString(),
        };
      });

      // 2. Validate total bets and amounts
      if (betRequests.length > CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN) {
        throw new Error(
          `Maximum ${CONTRACT_CONSTANTS.MAX_BETS_PER_SPIN} bets allowed per spin`,
        );
      }

      const totalAmount = betRequests.reduce(
        (sum, bet) => sum + BigInt(bet.amount),
        BigInt(0),
      );

      if (totalAmount > CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT) {
        throw new Error(
          `Total bet amount cannot exceed ${ethers.formatEther(
            CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT,
          )} GAMA`,
        );
      }

      // 3. Pre-transaction checks
      const [balance, allowance] = await Promise.all([
        contracts.token.balanceOf(account),
        contracts.token.allowance(account, contracts.roulette.target),
      ]);

      if (balance < totalAmount) {
        throw new Error(
          `Insufficient balance. Required: ${ethers.formatEther(
            totalAmount,
          )} GAMA`,
        );
      }

      if (allowance < totalAmount) {
        throw new Error(`Insufficient allowance. Please approve more tokens`);
      }

      // 4. Gas estimation and optimization
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const rouletteWithSigner = contracts.roulette.connect(signer);

      // Dynamic gas estimation
      const gasEstimate =
        await rouletteWithSigner.placeBet.estimateGas(betRequests);
      const feeData = await provider.getFeeData();
      const adjustedGasLimit = (gasEstimate * BigInt(120)) / BigInt(100); // 20% buffer
      const adjustedGasPrice = (feeData.gasPrice * BigInt(120)) / BigInt(100); // 20% buffer

      // 5. Execute transaction with timeout
      const tx = await rouletteWithSigner.placeBet(betRequests, {
        gasLimit: adjustedGasLimit,
        gasPrice: adjustedGasPrice,
      });

      // Wait for confirmation with timeout
      const confirmationPromise = tx.wait(2); // Wait for 2 confirmations
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Transaction confirmation timeout")),
          TRANSACTION_TIMEOUT,
        ),
      );

      await Promise.race([confirmationPromise, timeoutPromise]);

      // 6. Success handling
      setSelectedBets([]);
      setTotalBetAmount(BigInt(0));
      addToast("Bets placed successfully!", "success");

      // 7. Refresh data
      queryClient.invalidateQueries(["rouletteHistory", account]);
      queryClient.invalidateQueries(["balance", account]);

      break; // Exit retry loop on success
    } catch (error) {
      console.error("Bet placement error:", error);

      // Rollback state on failure
      setSelectedBets(previousState.bets);
      setTotalBetAmount(previousState.totalAmount);

      // Handle specific error cases
      if (error.code === "CALL_EXCEPTION") {
        const errorName = error.data ? error.data.split("(")[0] : null;
        const errorMessage =
          CONTRACT_ERRORS[errorName] || "Transaction failed. Please try again.";
        addToast(errorMessage, "error");
        break; // Don't retry on contract errors
      } else if (error.code === "ACTION_REJECTED") {
        addToast("Transaction rejected by user", "warning");
        break; // Don't retry on user rejection
      } else if (error.code === "INSUFFICIENT_FUNDS") {
        addToast("Insufficient funds to cover gas fees", "error");
        break; // Don't retry on insufficient funds
      } else if (error.code === "REPLACEMENT_UNDERPRICED") {
        retryCount++;
        if (retryCount < MAX_RETRIES) {
          addToast(
            `Transaction underpriced. Retrying... (${retryCount}/${MAX_RETRIES})`,
            "warning",
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          continue; // Retry with higher gas price
        }
      }

      // Generic error handling for other cases
      addToast(error.message || "Failed to place bets", "error");
      typeof onError === "function" && onError(error);
    } finally {
      setIsProcessing(false);
    }
  }
}, [
  contracts?.roulette,
  contracts?.token,
  account,
  selectedBets,
  totalBetAmount,
  addToast,
  onError,
  queryClient,
]);
