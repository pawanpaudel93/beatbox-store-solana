import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Layout from '../components/Layout'
import Head from 'next/head'
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { clusterApiUrl } from "@solana/web3.js"

// Default styles for wallet ui
require('@solana/wallet-adapter-react-ui/styles.css');

function MyApp({ Component, pageProps }: AppProps) {
  // networks such as devnet, testnet, mainnet-beta, etc.
  const network = WalletAdapterNetwork.Devnet;

  // Custom RPC endpoint can also be used
  const endpoint = clusterApiUrl(network);

  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network })
  ];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Layout>
            <Head>
              <title>Beatbox Store</title>
            </Head>
            <Component {...pageProps} />
          </Layout>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export default MyApp
