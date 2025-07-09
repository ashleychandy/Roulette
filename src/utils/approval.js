// Handle token approval
const handleApprove = async () => {
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
      const [hasMinterRole, hasBurnerRole, currentAllowance] =
        await Promise.all([
          contracts.token.hasRole(
            CONTRACT_CONSTANTS.MINTER_ROLE,
            contracts.roulette.target,
          ),
          contracts.token.hasRole(
            CONTRACT_CONSTANTS.BURNER_ROLE,
            contracts.roulette.target,
          ),
          contracts.token.allowance(account, contracts.roulette.target),
        ]);

      // Check if already approved
      if (currentAllowance >= CONTRACT_CONSTANTS.MAX_TOTAL_BET_AMOUNT) {
        setIsApproved(true);
        addToast("Token already approved", "success");
        return;
      }

      if (!hasMinterRole || !hasBurnerRole) {
        addToast(
          "Roulette contract is missing required roles. Please contact support.",
          "error",
        );
        return;
      }

      // Get current gas price and add 20% buffer for approval
      const provider = new ethers.BrowserProvider(window.ethereum);
      const feeData = await provider.getFeeData();
      const adjustedGasPrice = (feeData.gasPrice * BigInt(120)) / BigInt(100);

      // Get signer and connect to contract
      const signer = await provider.getSigner();
      const tokenWithSigner = contracts.token.connect(signer);

      // If there's an existing non-zero allowance, first reset it to 0
      if (currentAllowance > 0) {
        const resetTx = await tokenWithSigner.approve(
          contracts.roulette.target,
          0,
          {
            gasPrice: adjustedGasPrice,
          },
        );
        await resetTx.wait(1);
      }

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
      const newAllowance = await contracts.token.allowance(
        account,
        contracts.roulette.target,
      );

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
};
return (
  <div className="min-h-screen bg-white relative overflow-x-hidden">
    <div
      className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-50 pointer-events-none"
      style={{
        backgroundImage: `url(${bgOverlay})`,
        zIndex: 0,
      }}
    />
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
      <div className="space-y-8">
        {/* Game Title and Description */}
        <div className="text-center space-y-6 mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-[#22AD74]/10 blur-3xl rounded-full transform -translate-y-1/2"></div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-[#22AD74] to-[#22AD74]/70 bg-clip-text text-transparent drop-shadow-xl relative">
              Roulette
            </h1>
          </div>
          <div className="relative">
            <div className="h-px w-24 bg-gradient-to-r from-[#22AD74] to-transparent absolute left-1/2 -translate-x-1/2"></div>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto mt-6 font-light tracking-wide">
              Play with GAMA Token on XDC Network for lightning-fast, secure,
              and provably fair gaming.
            </p>
          </div>
        </div>

        {/* Main Game Section */}
        <div className="grid lg:grid-cols-[2fr_1fr] gap-8 h-full">
          {/* Left Column - Betting Board */}
          <div className="h-full">
            <div className="bg-white p-6 rounded-xl border border-gray-200 transform hover:scale-[1.01] transition-all duration-300 hover:shadow-lg h-full">
              <BettingBoard
                onBetSelect={handleBetSelect}
                selectedBets={selectedBets}
                disabled={isProcessing}
                selectedChipValue={selectedChipValue}
                lastWinningNumber={lastWinningNumber}
                getNumberBackgroundClass={getNumberBackgroundClass}
                onUndoBet={handleUndoBet}
                onClearBets={handleClearBets}
              />
            </div>
          </div>

          {/* Right Column - Betting Controls */}
          <div className="h-full">
            <div className="lg:sticky lg:top-6 h-full">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.01] hover:border-[#22AD74]/20 flex flex-col h-full">
                {/* Stats Cards */}
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 transform hover:scale-[1.02] transition-all duration-300 hover:shadow-lg hover:border-[#22AD74]/20 group">
                      <div className="text-gray-400 text-[10px] uppercase tracking-wider font-medium group-hover:text-[#22AD74] transition-colors">
                        Bets
                      </div>
                      <div className="flex items-center gap-1 whitespace-nowrap mt-0.5 w-full overflow-hidden">
                        <span className="text-gray-900 text-sm font-semibold min-w-[10px] text-right shrink-0 group-hover:text-[#22AD74] transition-colors">
                          {selectedBets.length}
                        </span>
                        <span className="text-[#22AD74] text-[9px] uppercase tracking-wider font-medium shrink-0">
                          positions
                        </span>
                      </div>
                    </div>
                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 transform hover:scale-[1.02] transition-all duration-300 hover:shadow-lg hover:border-[#22AD74]/20 group">
                      <div className="text-gray-400 text-[10px] uppercase tracking-wider font-medium group-hover:text-[#22AD74] transition-colors">
                        Amount
                      </div>
                      <div className="flex items-center gap-1 whitespace-nowrap mt-0.5 w-full overflow-hidden">
                        <span className="text-gray-900 text-sm font-semibold min-w-[10px] text-right shrink-0 group-hover:text-[#22AD74] transition-colors">
                          {parseFloat(
                            ethers.formatEther(totalBetAmount),
                          ).toFixed(0)}
                        </span>
                        <span className="text-[#22AD74] text-[9px] uppercase tracking-wider font-medium shrink-0">
                          GAMA
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="bg-white px-2.5 py-2 rounded-lg border border-gray-200 transform hover:scale-[1.02] transition-all duration-300 hover:shadow-lg hover:border-[#22AD74]/20 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 text-[10px] uppercase tracking-wider font-medium group-hover:text-[#22AD74] transition-colors">
                          Balance
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-900 text-sm font-semibold tracking-tight group-hover:text-[#22AD74] transition-colors">
                          {balanceData?.balance
                            ? Number(
                                ethers.formatEther(balanceData.balance),
                              ).toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })
                            : "0"}
                        </span>
                        <span className="text-[#22AD74] text-[9px] uppercase tracking-wider font-medium">
                          GAMA
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chip Selection */}
                  <div className="space-y-2 transform hover:scale-[1.01] transition-all duration-300">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-[10px] uppercase tracking-wider font-medium text-gray-400">
                        Chip Value
                      </h3>
                    </div>
                    <div className="chip-selector grid grid-cols-3 grid-rows-2 gap-2.5">
                      {CHIP_VALUES.map((chip) => (
                        <button
                          key={chip.value}
                          onClick={() => handleChipValueChange(chip.value)}
                          disabled={isProcessing}
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 relative group
                              ${
                                selectedChipValue === chip.value
                                  ? "bg-gradient-to-br from-[#22AD74] to-[#1a8f5e] text-white shadow-xl ring-2 ring-[#22AD74]/20 ring-offset-2 scale-110 z-10"
                                  : "bg-gradient-to-br from-white to-gray-50 text-gray-700 hover:text-[#22AD74] border border-gray-200 hover:border-[#22AD74]/20 hover:shadow-lg hover:z-10"
                              } ${
                                isProcessing
                                  ? "opacity-50 cursor-not-allowed"
                                  : "cursor-pointer hover:scale-105"
                              }`}
                        >
                          <span className="text-[13px] transform -translate-y-px">
                            {chip.label}
                          </span>
                          {selectedChipValue === chip.value && (
                            <div className="absolute -inset-0.5 rounded-full bg-[#22AD74]/10 animate-pulse pointer-events-none" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Place Bet Button */}
                <div className="mt-4 transform hover:scale-[1.01] transition-all duration-300">
                  {isCheckingApproval ? (
                    <button
                      className="h-9 w-full bg-white text-gray-600 rounded-lg font-medium text-xs flex items-center justify-center gap-2 disabled:opacity-50 border border-gray-200 hover:shadow-lg transition-all duration-300"
                      disabled={true}
                    >
                      <LoadingSpinner size="small" />
                      Checking Approval...
                    </button>
                  ) : isApproved ? (
                    <button
                      onClick={handlePlaceBets}
                      disabled={isProcessing || selectedBets.length === 0}
                      className={`h-9 w-full rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg
                          ${
                            isProcessing || selectedBets.length === 0
                              ? "bg-white text-gray-400 border border-gray-200"
                              : "bg-[#22AD74] text-white hover:scale-[1.02] shadow-md hover:shadow-lg border border-[#22AD74] hover:bg-[#22AD74]/90"
                          }`}
                    >
                      {isProcessing ? (
                        <>
                          <LoadingSpinner size="small" />
                          Processing...
                        </>
                      ) : (
                        "Place Bets"
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className={`h-9 w-full rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg
                          ${
                            isProcessing
                              ? "bg-white text-gray-400 border border-gray-200"
                              : "bg-white text-[#22AD74] hover:scale-[1.02] shadow-md hover:shadow-lg border border-[#22AD74] hover:bg-[#22AD74]/5"
                          }`}
                    >
                      Approve Token
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Detailed History */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 transform hover:scale-[1.01] transition-all duration-300">
          <div className="mb-4">
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              Betting History
            </h3>
            <div className="h-0.5 w-24 bg-gradient-to-r from-[#22AD74] to-[#22AD74]/20"></div>
          </div>
          <BettingHistory
            userData={userData}
            isLoading={isLoadingUserData}
            error={userDataError}
          />
        </div>
      </div>
    </div>

    {/* Footer */}
    <div className="relative z-10 py-8 text-center">
      <div className="space-y-2">
        <p className="text-gray-600 text-sm">
          Crafted with <span className="text-[#22AD74] mx-1">♥</span> and built
          on{" "}
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
          GAMA © 2024. Open source, for everyone.{" "}
          <span className="text-[#22AD74]">#BuildOnXDC</span>
        </p>
      </div>
    </div>
  </div>
);
