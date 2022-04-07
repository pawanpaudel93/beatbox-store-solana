import { createTransferCheckedInstruction, getAssociatedTokenAddress, getMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl, Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import base58 from "bs58";
import { NextApiRequest, NextApiResponse } from "next";
import { couponAddress, usdcAddress } from "../../lib/addresses";
import calculatePrice from "../../lib/calculatePrice";
import "dotenv/config"

export type MakeTransactionInputData = {
    account: string,
}

type MakeTransactionGetResponse = {
    label: string,
    icon: string
}

export type MakeTransactionOutputData = {
    transaction: string,
    message: string,
}

type ErrorOutput = {
    error: string,
}

function get(res: NextApiResponse<MakeTransactionGetResponse>) {
    res.status(200).json({
        label: "Beatbox Store",
        icon: "https://image.shutterstock.com/shutterstock/photos/1585702933/display_1500/stock-vector-beatboxing-icon-from-hobbies-collection-simple-line-element-beatboxing-symbol-for-templates-web-1585702933.jpg",
    })
}

export async function post(
    req: NextApiRequest,
    res: NextApiResponse<MakeTransactionOutputData | ErrorOutput>
) {
    try {
        const amount = calculatePrice(req.query);
        if (amount.isZero()) {
            res.status(400).json({ error: "Can't checkout with charge of 0" })
            return
        }

        const { reference } = req.query;
        if (!reference) {
            res.status(400).json({ error: "No reference provided" })
            return
        }

        const { account } = req.body as MakeTransactionInputData;
        if (!account) {
            res.status(400).json({ error: "No account provided" })
            return
        }

        const shopPrivateKey = process.env.SHOP_PRIVATE_KEY as string;
        if (!shopPrivateKey) {
            res.status(500).json({ error: "No shop private key provided" })
        }

        const shopKeypair = Keypair.fromSecretKey(base58.decode(shopPrivateKey))

        const buyerPublicKey = new PublicKey(account);
        const shopPublicKey = shopKeypair.publicKey;

        const network = WalletAdapterNetwork.Devnet
        const endpoint = clusterApiUrl(network);
        const connection = new Connection(endpoint);

        // Get the buyer and seller coupon accounts
        const buyerCouponAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            shopKeypair,
            couponAddress,
            buyerPublicKey
        )

        const buyerGetsCouponDiscount = buyerCouponAccount.amount >= 5;

        const shopCouponAddress = await getAssociatedTokenAddress(couponAddress, shopPublicKey)

        // get details about usdc token
        const usdcMint = await getMint(connection, usdcAddress);
        // get buyer usdc token account address
        const buyerUsdcAddress = await getAssociatedTokenAddress(usdcAddress, buyerPublicKey);
        const shopUsdcAddress = await getAssociatedTokenAddress(usdcAddress, shopPublicKey);

        const { blockhash } = await connection.getLatestBlockhash("finalized");

        // Create a transaction
        const transaction = new Transaction({
            recentBlockhash: blockhash,
            feePayer: buyerPublicKey,
        })

        const amountToPay = buyerGetsCouponDiscount ? amount.dividedBy(2) : amount;

        // create a transfer to the shop
        const transferInstruction = createTransferCheckedInstruction(
            buyerUsdcAddress,
            usdcAddress,
            shopUsdcAddress,
            buyerPublicKey,
            amountToPay.toNumber() * 10 ** usdcMint.decimals,
            usdcMint.decimals
        )
        // add reference to the instruction as a key so that we can query the transaction with it
        transferInstruction.keys.push({
            pubkey: new PublicKey(reference),
            isSigner: false,
            isWritable: false
        })

        const couponInstruction = buyerGetsCouponDiscount ? createTransferCheckedInstruction(
            buyerCouponAccount.address,
            couponAddress,
            shopCouponAddress,
            buyerPublicKey,
            5,
            0
        ) : createTransferCheckedInstruction(
            shopCouponAddress,
            couponAddress,
            buyerCouponAccount.address,
            shopPublicKey,
            1,
            0
        )
        // Add shop as signer to the coupon instruction
        couponInstruction.keys.push({
            pubkey: shopPublicKey,
            isSigner: true,
            isWritable: false
        })
        // add the transfer instruction to the transaction
        transaction.add(transferInstruction, couponInstruction)

        // sign the transaction as the shop to transfer the coupon
        transaction.partialSign(shopKeypair)

        // serializing the transaction and convert to base64
        const serializedTransaction = transaction.serialize({
            // We will need the buyer to sign this transaction after it's returned to them
            requireAllSignatures: false
        })

        const base64 = serializedTransaction.toString("base64")

        res.status(200).json({
            transaction: base64,
            message: buyerGetsCouponDiscount ? "Enjoy 50% Discount! 🎵" : "Thanks for your order! 🎵",
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "error creating transaction" })
        return
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<MakeTransactionOutputData | MakeTransactionGetResponse | ErrorOutput>
) {
    if (req.method === "GET") {
        return get(res)
    } else if (req.method === "POST") {
        return await post(req, res)
    } else {
        return res.status(405).json({ error: "Method not allowed" })
    }
}