import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Products from '../components/Products'
import CouponBook from '../components/CouponBook'
import PageHeading from '../components/PageHeading'

export default function HomePage() {
  // connected wallet public key if available
  const { publicKey } = useWallet()
  return (
    <div className="flex flex-col gap-8 max-w-4xl items-stretch m-auto">
      {publicKey && <CouponBook />}
      <Products submitTarget='/checkout' enabled={publicKey !== null} />
    </div>
  )
}
