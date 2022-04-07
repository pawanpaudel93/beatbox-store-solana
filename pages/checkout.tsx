import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Keypair, Transaction } from "@solana/web3.js"
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import BackLink from "../components/BackLink";
import Loading from "../components/Loading";
import PageHeading from "../components/PageHeading";
import calculatePrice from "../lib/calculatePrice";
import { findTransactionSignature, FindTransactionSignatureError } from "@solana/pay";
import { MakeTransactionInputData, MakeTransactionOutputData } from "../pages/api/makeTransaction";

export default function Checkout() {
  const router = useRouter()
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(router.query)) {
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) {
          searchParams.append(key, v);
        }
      } else {
        searchParams.append(key, value);
      }
    }
  }

  const reference = useMemo(() => Keypair.generate().publicKey, []);
  searchParams.append("reference", reference.toString());

  async function getTransaction() {
    if (!publicKey) return

    const body: MakeTransactionInputData = {
      account: publicKey.toString(),
    }

    const response = await fetch(`/api/makeTransaction?${searchParams.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    const json = await response.json() as MakeTransactionOutputData;

    if (response.status !== 200) {
      console.error(json);
      return;
    }

    const transaction = Transaction.from(Buffer.from(json.transaction, "base64"));
    setTransaction(transaction);
    setMessage(json.message);
    console.log(json);
  }

  useEffect(() => {
    getTransaction();
  }, [publicKey])

  async function trySendTransaction() {
    if (!transaction) return;
    try {
      await sendTransaction(transaction, connection)
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => { trySendTransaction() }, [transaction])

  useEffect(() => {
    // check every 0.5 secs if transaction is completed
    const interval = setInterval(async () => {
      try {
        const signatureInfo = await findTransactionSignature(connection, reference, {})
        console.log("They paid")
        clearInterval(interval)
        router.push("/confirmed")
      } catch (error) {
        if (error instanceof FindTransactionSignatureError) {
          // No transaction found yet
          return;
        }
        console.error("Unknown Error: ", error);
      }
    }
      , 500)
    return () => clearInterval(interval)
  })

  const amount = calculatePrice(router.query)

  if (!publicKey) {
    return (
      <div className="flex flex-col gap-8 items-center">
        <div><BackLink href="/">Cancel</BackLink></div>
        <PageHeading>Checkout</PageHeading>

        <WalletMultiButton />
        <p>You need to connect your wallet to make transactions.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-8 items-center">
      <div><BackLink href='/'>Cancel</BackLink></div>
      <PageHeading>Checkout</PageHeading>

      <WalletMultiButton />

      {message ? <p>{message} Please approve the transaction using your wallet</p> :
        <p>Creating transaction .... <Loading /></p>}
    </div>
  )
}
