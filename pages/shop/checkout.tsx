import { useRouter } from "next/router";
import { createQR, encodeURL, EncodeURLComponents } from "@solana/pay";
import { clusterApiUrl, Keypair, Connection } from "@solana/web3.js"
import { useEffect, useMemo, useRef } from "react";
import { findTransactionSignature, validateTransactionSignature, FindTransactionSignatureError, ValidateTransactionSignatureError } from "@solana/pay";
import BackLink from "../../components/BackLink";
import PageHeading from "../../components/PageHeading";
import calculatePrice from "../../lib/calculatePrice";
import { shopAddress, usdcAddress } from "../../lib/addresses";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";


export default function Checkout() {
    const router = useRouter()
    const qrRef = useRef<HTMLDivElement>(null)

    const amount = useMemo(() => calculatePrice(router.query), [router.query])
    const reference = useMemo(() => Keypair.generate().publicKey, [])

    const connection = new Connection(clusterApiUrl(WalletAdapterNetwork.Devnet))

    const urlParams: EncodeURLComponents = {
        recipient: shopAddress,
        splToken: usdcAddress,
        amount,
        reference,
        label: "Beatbox Store",
        message: "Thank you for your order! 🎵",
        memo: "Beatbox Store",
    }

    const url = encodeURL(urlParams)

    useEffect(() => {
        const qr = createQR(url, 512, "transparent")
        if (qrRef.current && amount.isGreaterThan(0)) {
            qrRef.current.innerHTML = ""
            qr.append(qrRef.current)
        }
    })

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                // check transaction with reference
                const signatureInfo = await findTransactionSignature(connection, reference, {}, 'confirmed')
                // Validate the transaction
                await validateTransactionSignature(connection, signatureInfo.signature, shopAddress, amount, usdcAddress, reference, 'confirmed')
                router.push('/shop/confirmed')
            } catch (e) {
                if (e instanceof FindTransactionSignatureError) {
                    // No transaction found yet, ignore this error
                    return;
                }
                if (e instanceof ValidateTransactionSignatureError) {
                    // Transaction is invalid
                    console.error('Transaction is invalid', e)
                    return;
                }
                console.error('Unknown error', e)
            }
        }, 500)
        return () => {
            clearInterval(interval)
        }
    }, [])

    return (
        <div className="flex flex-col gap-8 items-center">
            <BackLink href="/shop">Cancel</BackLink>
            <PageHeading>Checkout ${amount.toString()}</PageHeading>

            <div ref={qrRef}></div>
        </div>
    )
}