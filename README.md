# GAMA Roulette

A decentralized roulette game built on the XDC Network using React and smart contracts.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MetaMask wallet extension
- XDC Network account with some XDC tokens

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
REACT_APP_XDC_MAINNET_RPC=https://rpc.xinfin.network
REACT_APP_XDC_APOTHEM_RPC=https://rpc.apothem.network
REACT_APP_TOKEN_ADDRESS=your_mainnet_token_address
REACT_APP_ROULETTE_ADDRESS=your_mainnet_roulette_address
REACT_APP_APOTHEM_TOKEN_ADDRESS=your_testnet_token_address
REACT_APP_APOTHEM_ROULETTE_ADDRESS=your_testnet_roulette_address
```

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd Roulette
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

## Running the Application

1. Start the development server:

```bash
npm start
# or
yarn start
```

## Connecting to the Network

1. Make sure you have MetaMask installed and set up
2. Add XDC Network to MetaMask:

   - **XDC Mainnet**:

     - Network Name: XDC Mainnet
     - RPC URL: https://erpc.xinfin.network
     - Chain ID: 50
     - Symbol: XDC
     - Block Explorer: https://explorer.xinfin.network

   - **XDC Apothem Testnet**:
     - Network Name: XDC Apothem Testnet
     - RPC URL: https://erpc.apothem.network
     - Chain ID: 51
     - Symbol: XDC
     - Block Explorer: https://explorer.apothem.network

## Features

- Connect wallet using MetaMask
- Switch between XDC Mainnet and Apothem Testnet
- Place bets using GAMA tokens
- Beautiful and responsive UI with animations
- Real-time updates and notifications

## Support

For any queries or support, please visit [https://gamacoin.ai/](https://gamacoin.ai/)
