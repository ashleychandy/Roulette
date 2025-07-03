import React from "react";
import { useWallet } from "../../hooks/WalletContext";
import { xdc } from "../../constants/chains";

const NetworkInfo = () => {
  const { chain } = useWallet();

  return (
    <div className="text-sm text-gray-600">
      {chain && (
        <div className="flex items-center gap-2">
          <span className="font-medium">{chain.name}</span>
          <span className="text-xs bg-gray-200 px-2 py-1 rounded">
            {chain.id === xdc.id ? "Mainnet" : "Testnet"}
          </span>
        </div>
      )}
    </div>
  );
};

export default NetworkInfo;
