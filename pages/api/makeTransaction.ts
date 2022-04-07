import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";
import { shopAddress } from "../../lib/addresses";
import calculatePrice from "../../lib/calculatePrice";

export type MakeTransactionInputData = {
    account: string,
}

export type MakeTransactionOutputData = {
    transaction: string,
    message: string,
}

type ErrorOutput = {
    error: string,
}

export default async function handler(
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

        const buyerPublicKey = new PublicKey(account);
        const shopPublicKey = shopAddress;

        const network = WalletAdapterNetwork.Devnet
        const endpoint = clusterApiUrl(network);
        const connection = new Connection(endpoint);

        const { blockhash } = await connection.getLatestBlockhash("finalized");

        // Create a transaction
        const transaction = new Transaction({
            recentBlockhash: blockhash,
            feePayer: buyerPublicKey,
        })

        // create a transfer to the shop
        const transferInstruction = SystemProgram.transfer({
            fromPubkey: buyerPublicKey,
            toPubkey: shopPublicKey,
            lamports: amount.multipliedBy(LAMPORTS_PER_SOL).toNumber(),
        })

        // add reference to the instruction as a key so that we can query the transaction with it
        transferInstruction.keys.push({
            pubkey: new PublicKey(reference),
            isSigner: false,
            isWritable: false
        })

        // add the transfer instruction to the transaction
        transaction.add(transferInstruction)

        // serializing the transaction and convert to base64
        const serializedTransaction = transaction.serialize({
            // We will need the buyer to sign this transaction after it's returned to them
            requireAllSignatures: false
        })

        const base64 = serializedTransaction.toString("base64")

        res.status(200).json({
            transaction: base64,
            message: "Thanks for your order!",
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "error creating transaction" })
        return
    }
}