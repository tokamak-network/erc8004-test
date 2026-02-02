"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { agendaDAOABI } from "@/lib/contracts";
import { AGENDA_DAO_ADDRESS } from "@/lib/constants";
import { useEffect, useState } from "react";

interface Proposal {
  id: bigint;
  proposer: `0x${string}`;
  description: string;
  callData: `0x${string}`;
  target: `0x${string}`;
  forVotes: bigint;
  againstVotes: bigint;
  startTime: bigint;
  endTime: bigint;
  executed: boolean;
}

function getProposalStatus(proposal: Proposal): { label: string; variant: "default" | "success" | "destructive" | "secondary" } {
  const now = BigInt(Math.floor(Date.now() / 1000));
  
  if (proposal.executed) {
    return { label: "Executed", variant: "success" };
  }
  
  if (now < proposal.endTime) {
    return { label: "Active", variant: "default" };
  }
  
  if (proposal.forVotes > proposal.againstVotes) {
    return { label: "Passed", variant: "success" };
  }
  
  return { label: "Failed", variant: "destructive" };
}

function formatTimeRemaining(endTime: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Number(endTime) - now;
  
  if (remaining <= 0) return "Ended";
  
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  
  return `${minutes}m ${seconds}s`;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { address } = useAccount();
  const [timeRemaining, setTimeRemaining] = useState(formatTimeRemaining(proposal.endTime));
  const status = getProposalStatus(proposal);

  const { data: hasVoted } = useReadContract({
    address: AGENDA_DAO_ADDRESS as `0x${string}`,
    abi: agendaDAOABI,
    functionName: "hasUserVoted",
    args: [proposal.id, address!],
    query: { enabled: !!address && !!AGENDA_DAO_ADDRESS },
  });

  const { writeContract: vote, data: voteHash, isPending: isVoting } = useWriteContract();
  const { isLoading: isVoteConfirming } = useWaitForTransactionReceipt({ hash: voteHash });

  const { writeContract: execute, data: executeHash, isPending: isExecuting } = useWriteContract();
  const { isLoading: isExecuteConfirming } = useWaitForTransactionReceipt({ hash: executeHash });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(proposal.endTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [proposal.endTime]);

  const totalVotes = proposal.forVotes + proposal.againstVotes;
  const forPercent = totalVotes > 0n ? Number((proposal.forVotes * 100n) / totalVotes) : 0;

  const canVote = status.label === "Active" && !hasVoted && address;
  const canExecute = status.label === "Passed" && !proposal.executed;

  const handleVote = (support: boolean) => {
    if (!AGENDA_DAO_ADDRESS) return;
    vote({
      address: AGENDA_DAO_ADDRESS as `0x${string}`,
      abi: agendaDAOABI,
      functionName: "vote",
      args: [proposal.id, support],
    });
  };

  const handleExecute = () => {
    if (!AGENDA_DAO_ADDRESS) return;
    execute({
      address: AGENDA_DAO_ADDRESS as `0x${string}`,
      abi: agendaDAOABI,
      functionName: "execute",
      args: [proposal.id],
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">#{proposal.id.toString()}: {proposal.description}</CardTitle>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          by {truncateAddress(proposal.proposer)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>For: {Number(formatEther(proposal.forVotes)).toLocaleString()}</span>
              <span>Against: {Number(formatEther(proposal.againstVotes)).toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${forPercent}%` }}
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {status.label === "Active" ? `Time remaining: ${timeRemaining}` : `Voting ended`}
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        {canVote && (
          <>
            <Button
              size="sm"
              onClick={() => handleVote(true)}
              disabled={isVoting || isVoteConfirming}
            >
              Vote For
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleVote(false)}
              disabled={isVoting || isVoteConfirming}
            >
              Vote Against
            </Button>
          </>
        )}
        {hasVoted === true && (
          <span className="text-sm text-muted-foreground">You already voted</span>
        )}
        {canExecute && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExecute}
            disabled={isExecuting || isExecuteConfirming}
          >
            Execute
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export function ProposalList() {
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const { data: proposalCount } = useReadContract({
    address: AGENDA_DAO_ADDRESS as `0x${string}`,
    abi: agendaDAOABI,
    functionName: "getProposalCount",
    query: { enabled: !!AGENDA_DAO_ADDRESS },
  });

  useEffect(() => {
    if (!proposalCount || !AGENDA_DAO_ADDRESS) return;
    
    const fetchProposals = async () => {
      const count = Number(proposalCount);
      const proposalPromises = [];
      
      for (let i = 0; i < count; i++) {
        proposalPromises.push(
          fetch(`/api/proposal/${i}`).catch(() => null)
        );
      }
    };
    
    fetchProposals();
  }, [proposalCount]);

  if (!AGENDA_DAO_ADDRESS) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          DAO contract not deployed yet. Please deploy contracts first.
        </CardContent>
      </Card>
    );
  }

  if (!proposalCount || proposalCount === 0n) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No proposals yet. Create the first one!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Proposals</h2>
      {Array.from({ length: Number(proposalCount) }, (_, i) => (
        <ProposalItem key={i} proposalId={BigInt(i)} />
      ))}
    </div>
  );
}

function ProposalItem({ proposalId }: { proposalId: bigint }) {
  const { data } = useReadContract({
    address: AGENDA_DAO_ADDRESS as `0x${string}`,
    abi: agendaDAOABI,
    functionName: "getProposal",
    args: [proposalId],
    query: { enabled: !!AGENDA_DAO_ADDRESS },
  });

  if (!data) return null;

  const [id, proposer, description, callData, target, forVotes, againstVotes, startTime, endTime, executed] = data as [bigint, `0x${string}`, string, `0x${string}`, `0x${string}`, bigint, bigint, bigint, bigint, boolean];

  const proposal: Proposal = {
    id,
    proposer,
    description,
    callData,
    target,
    forVotes,
    againstVotes,
    startTime,
    endTime,
    executed,
  };

  return <ProposalCard proposal={proposal} />;
}
