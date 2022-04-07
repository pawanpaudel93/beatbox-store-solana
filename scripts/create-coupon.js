import { createAssociatedTokenAccount, createMint, getAccount, mintToChecked } from "@solana/spl-token";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import base58 from "bs58";


import "dotenv/config"

const network = WalletAdapterNetwork.Devnet
const connection = new Connection(clusterApiUrl(network))

const shopPrivateKey = process.env.SHOP_PRIVATE_KEY
if(!shopPrivateKey) {
    throw new Error("SHOP_PRIVATE_KEY is not set")
}
const shopAccount = Keypair.fromSecretKey(base58.decode(shopPrivateKey))

console.log("Creating token...")
const myCouponAddress = await createMint(
    connection,
    shopAccount,
    shopAccount.publicKey,
    shopAccount.publicKey,
    0 // decomals(0 = whole numbers)
)
console.log("Token created:", myCouponAddress.toString())

console.log("Creating token account for the shop...")
const shopCoupinAddress = await createAssociatedTokenAccount(
    connection,
    shopAccount,
    myCouponAddress,
    shopAccount.publicKey
)

console.log("Token account created:", shopCoupinAddress.toString())

console.log("Minting 1 million coupons to the shop account...")

await mintToChecked(
    connection,
    shopAccount,
    myCouponAddress,
    shopCoupinAddress,
    shopAccount,
    1_000_000,
    0
)

console.log("Minted 1 million coupons to the shop account")

const {amount} = await getAccount(connection, shopCoupinAddress)
console.log({
    myCouponAddress: myCouponAddress.toString(),
    balance: amount.toLocaleString()
})