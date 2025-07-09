# GAMA Roulette

A blockchain-based roulette game running on the XDC network.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run start

# Build for production
npm run build

# Run tests
npm run test

# Format code
npm run format
```

The production build will create a `build` directory with optimized files ready for deployment. This includes minified JavaScript bundles, compressed assets, and an index.html file.

## Features

- Decentralized roulette game on XDC blockchain
- Interactive roulette wheel with animations powered by Framer Motion
- Real-time game statistics and betting history
- Responsive design with Tailwind CSS
- VRF (Verifiable Random Function) based fair gameplay
- Wallet integration for XDC network

## Environment Variables

Create a `.env` file in the root directory with these variables:

```
# XDC Mainnet
REACT_APP_TOKEN_ADDRESS=<mainnet-token-contract-address>
REACT_APP_ROULETTE_ADDRESS=<mainnet-roulette-contract-address>
REACT_APP_XDC_MAINNET_RPC=https://erpc.xinfin.network

# XDC Testnet (Apothem)
REACT_APP_APOTHEM_TOKEN_ADDRESS=<testnet-token-contract-address>
REACT_APP_APOTHEM_ROULETTE_ADDRESS=<testnet-roulette-contract-address>
REACT_APP_XDC_APOTHEM_RPC=https://erpc.apothem.network

# Default Network (mainnet or testnet)
REACT_APP_DEFAULT_NETWORK=mainnet
```

## Game Features

- Place multiple types of bets on the roulette board
- Real-time updates of game state
- Bet history tracking
- VRF-powered fair random number generation
- Automatic recovery of interrupted games
 Framer Motion for animations

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

