import { useQuery } from "@tanstack/react-query";

/**
 * Custom hook for checking token balance
 * @param {Object} contracts - The contract instances
 * @param {string} account - The user account address
 * @returns {Object} The balance data
 */
export const useRouletteBalance = (contracts, account) => {
  // Add balance query
  const { data: balanceData, isLoading: isLoadingBalance } = useQuery({
    queryKey: ["balance", account, contracts?.token?.target],
    queryFn: async () => {
      if (!contracts?.token || !account) return null;

      try {
        const balance = await contracts.token.balanceOf(account);
        return balance.toString();
      } catch (balanceError) {
        // If we can't get balance due to decoding error, return "0"
        if (
          balanceError.message &&
          balanceError.message.includes("could not decode result data")
        ) {
          return "0";
        }
        throw balanceError;
      }
    },
    enabled: !!contracts?.token && !!account,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  return {
    balance: balanceData,
    isLoadingBalance,
  };
};
