"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "./ui/button";
import { formatEther } from "viem";
import { useReadContract } from "wagmi";
import { voteTokenABI } from "@/lib/contracts";
import { VOTE_TOKEN_ADDRESS } from "@/lib/constants";
import { useMemo } from "react";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Header() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const { data: balance } = useReadContract({
    address: VOTE_TOKEN_ADDRESS as `0x${string}`,
    abi: voteTokenABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!VOTE_TOKEN_ADDRESS },
  });

  const injectedConnector = useMemo(() => {
    return connectors.find((c) => c.id === "injected");
  }, [connectors]);

  const handleConnect = () => {
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <h1 className="text-xl font-bold">ERC-8004 DAO</h1>

        <div className="flex items-center gap-4">
          {isConnected && balance !== undefined && VOTE_TOKEN_ADDRESS && (
            <span className="text-sm text-muted-foreground">
              {Number(formatEther(balance as bigint)).toLocaleString()} VOTE
            </span>
          )}

          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {truncateAddress(address!)}
              </span>
              <Button variant="outline" size="sm" onClick={() => disconnect()}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={handleConnect} size="sm" disabled={!injectedConnector}>
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
