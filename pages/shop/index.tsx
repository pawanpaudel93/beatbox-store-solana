import { useWallet } from '@solana/wallet-adapter-react'
import Products from '../../components/Products'
import CouponBook from '../../components/CouponBook'

export default function HomePage() {
    // connected wallet public key if available
    const { publicKey } = useWallet()
    return (
        <div className="flex flex-col gap-8 max-w-4xl items-stretch m-auto">
            {publicKey && <CouponBook />}
            <Products submitTarget='/shop/checkout' enabled={publicKey !== null} />
        </div>
    )
}
