import {
  GenesisBlock,
  WalletInitOptions,
  WalletModule,
  WalletSelectModuleOptions,
} from 'bnc-onboard/dist/src/interfaces'
import { Hardfork } from '@ethereumjs/common'
import { getRpcServiceUrl, getDisabledWallets, getChainById } from 'src/config'
import { ChainId, CHAIN_ID, WALLETS } from 'src/config/chain.d'
import { FORTMATIC_KEY, PORTIS_ID, WC_BRIDGE } from 'src/utils/constants'
import getPairingModule from 'src/logic/wallets/pairing/module'
import { isPairingSupported } from 'src/logic/wallets/pairing/utils'
import { getChains } from 'src/config/cache/chains'
import getE2EWalletModule from '../e2e-wallet/module'

type Wallet = (WalletInitOptions | WalletModule) & {
  desktop: boolean // Whether wallet supports desktop app
  walletName: WALLETS
}

const wallets = (chainId: ChainId): Wallet[] => {
  // Ensure RPC matches chainId drilled from Onboard init
  const { rpcUri } = getChainById(chainId)
  const rpcUrl = getRpcServiceUrl(rpcUri)
  // Custrom network configuration for hardware wallets
  // with dummy genesis block and hardforks just to satisfy `bnc-onboard` lib
  // and allow it to handle non-default chains
  const custmoNetwork = {
    networkId: parseInt(chainId, 10),
    genesis: {} as any as GenesisBlock,
    hardforks: [{ name: Hardfork.Berlin, block: 0, forkHash: '0x00' }],
    bootstrapNodes: [],
  }

  return [
    { walletName: WALLETS.METAMASK, preferred: true, desktop: false },
    { walletName: WALLETS.TALLYHO, preferred: false, desktop: false },
    {
      walletName: WALLETS.WALLET_CONNECT,
      rpc: getChains().reduce((map, { chainId, rpcUri }) => {
        return {
          ...map,
          [chainId]: getRpcServiceUrl(rpcUri),
        }
      }, {}),
      bridge: WC_BRIDGE,
      preferred: true,
      desktop: true,
    },
    {
      walletName: WALLETS.TREZOR,
      appUrl: 'gnosis-safe.io',
      preferred: true,
      email: 'support@safe.global',
      desktop: true,
      rpcUrl,
      customNetwork: custmoNetwork,
    },
    {
      walletName: WALLETS.LEDGER,
      desktop: true,
      preferred: true,
      rpcUrl,
      LedgerTransport: (window as any).TransportNodeHid,
      customNetwork: custmoNetwork,
    },
    {
      walletName: WALLETS.KEYSTONE,
      desktop: false,
      rpcUrl,
      appName: 'Safe',
      customNetwork: custmoNetwork,
    },
    { walletName: WALLETS.TRUST, preferred: true, desktop: false },
    {
      walletName: WALLETS.LATTICE,
      rpcUrl,
      appName: 'Safe',
      desktop: false,
    },
    {
      walletName: WALLETS.FORTMATIC,
      apiKey: FORTMATIC_KEY,
      desktop: true,
    },
    {
      walletName: WALLETS.PORTIS,
      apiKey: PORTIS_ID,
      desktop: true,
    },
    { walletName: WALLETS.AUTHEREUM, desktop: false },
    { walletName: WALLETS.TORUS, desktop: true },
    { walletName: WALLETS.COINBASE, desktop: false },
    { walletName: WALLETS.WALLET_LINK, rpcUrl, desktop: false },
    { walletName: WALLETS.OPERA, desktop: false },
    { walletName: WALLETS.OPERA_TOUCH, desktop: false },
  ]
}

export const isSupportedWallet = (name: WALLETS | string): boolean => {
  return !getDisabledWallets().some((walletName) => {
    // walletName is config wallet name, name is the wallet module name and differ
    return walletName.replace(/\s/g, '').toLowerCase() === name.replace(/\s/g, '').toLowerCase()
  })
}

export const getSupportedWallets = (chainId: ChainId): WalletSelectModuleOptions['wallets'] => {
  const supportedWallets: WalletSelectModuleOptions['wallets'] = wallets(chainId)
    .filter(({ walletName, desktop }) => {
      if (!isSupportedWallet(walletName)) {
        return false
      }
      // Desktop vs. Web app wallet support
      return window.isDesktop ? desktop : true
    })
    .map(({ desktop: _, ...rest }) => rest)

  if (chainId === CHAIN_ID.RINKEBY && window.Cypress && window.Cypress.env('CYPRESS_MNEMONIC')) {
    supportedWallets.push(getE2EWalletModule())
  }

  return isPairingSupported() ? [getPairingModule(chainId), ...supportedWallets] : supportedWallets
}
