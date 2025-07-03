// XDC Network chain definitions
export const xdc = {
  id: 50,
  name: "XDC Network",
  network: "xdc",
  nativeCurrency: {
    decimals: 18,
    name: "XDC",
    symbol: "XDC",
  },
  rpcUrls: {
    default: {
      http: ["https://erpc.xinfin.network"],
    },
    public: {
      http: ["https://erpc.xinfin.network"],
    },
  },
  blockExplorers: {
    default: { name: "XinFin", url: "https://explorer.xinfin.network" },
  },
  testnet: false,
};

export const xdcTestnet = {
  id: 51,
  name: "Apothem",
  network: "xdcTestnet",
  nativeCurrency: {
    decimals: 18,
    name: "XDC",
    symbol: "XDC",
  },
  rpcUrls: {
    default: {
      http: ["https://erpc.apothem.network"],
    },
    public: {
      http: ["https://erpc.apothem.network"],
    },
  },
  blockExplorers: {
    default: { name: "Apothem", url: "https://explorer.apothem.network" },
  },
  testnet: true,
};

export const SUPPORTED_CHAIN_IDS = [xdc.id, xdcTestnet.id];
