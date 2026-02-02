import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const AGENDA_DAO_ADDRESS = process.env.NEXT_PUBLIC_AGENDA_DAO_ADDRESS as `0x${string}`;
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY as `0x${string}`;

const agendaDAOABI = [
  {
    inputs: [],
    name: "getProposalCount",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "proposalId", type: "uint256" }],
    name: "canExecute",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "proposalId", type: "uint256" }],
    name: "execute",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!AGENDA_DAO_ADDRESS || !EXECUTOR_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "Missing environment variables" },
      { status: 500 }
    );
  }

  try {
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(process.env.SEPOLIA_RPC_URL),
    });

    const account = privateKeyToAccount(EXECUTOR_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(process.env.SEPOLIA_RPC_URL),
    });

    const proposalCount = await publicClient.readContract({
      address: AGENDA_DAO_ADDRESS,
      abi: agendaDAOABI,
      functionName: "getProposalCount",
    });

    const results: { proposalId: number; executed: boolean; txHash?: string; error?: string }[] = [];

    for (let i = 0; i < Number(proposalCount); i++) {
      const canExecute = await publicClient.readContract({
        address: AGENDA_DAO_ADDRESS,
        abi: agendaDAOABI,
        functionName: "canExecute",
        args: [BigInt(i)],
      });

      if (canExecute) {
        try {
          const hash = await walletClient.writeContract({
            address: AGENDA_DAO_ADDRESS,
            abi: agendaDAOABI,
            functionName: "execute",
            args: [BigInt(i)],
          });

          results.push({ proposalId: i, executed: true, txHash: hash });
        } catch (error) {
          results.push({
            proposalId: i,
            executed: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalProposals: Number(proposalCount),
      executed: results.filter((r) => r.executed).length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
