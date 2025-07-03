import React from "react";
import NetworkSwitcher from "../NetworkSwitcher";

const ChainSwitcher = () => {
  return (
    <div className="flex flex-col sm:flex-row gap-2 p-2 bg-gray-800 rounded-lg mb-4">
      <div className="text-white font-medium mb-2 sm:mb-0 sm:mr-4 flex items-center">
        Network:
      </div>
      <NetworkSwitcher />
    </div>
  );
};

export default ChainSwitcher;
