"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { encodeFunctionData } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { agendaDAOABI, identityRegistryABI } from "@/lib/contracts";
import { AGENDA_DAO_ADDRESS, IDENTITY_REGISTRY_ADDRESS } from "@/lib/constants";

type ActionType = "register" | "setMetadata" | "setAgentURI";

export function ProposalForm() {
  const { isConnected } = useAccount();
  const [description, setDescription] = useState("");
  const [actionType, setActionType] = useState<ActionType>("register");
  const [agentURI, setAgentURI] = useState("");
  const [agentId, setAgentId] = useState("");
  const [metadataKey, setMetadataKey] = useState("");
  const [metadataValue, setMetadataValue] = useState("");

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const encodeCallData = (): `0x${string}` => {
    switch (actionType) {
      case "register":
        if (agentURI) {
          return encodeFunctionData({
            abi: identityRegistryABI,
            functionName: "register",
            args: [agentURI],
          });
        }
        return encodeFunctionData({
          abi: identityRegistryABI,
          functionName: "register",
          args: [],
        });
      case "setMetadata":
        return encodeFunctionData({
          abi: identityRegistryABI,
          functionName: "setMetadata",
          args: [BigInt(agentId), metadataKey, metadataValue as `0x${string}`],
        });
      case "setAgentURI":
        return encodeFunctionData({
          abi: identityRegistryABI,
          functionName: "setAgentURI",
          args: [BigInt(agentId), agentURI],
        });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!AGENDA_DAO_ADDRESS) {
      alert("DAO contract not deployed yet");
      return;
    }

    const callData = encodeCallData();
    writeContract({
      address: AGENDA_DAO_ADDRESS as `0x${string}`,
      abi: agendaDAOABI,
      functionName: "propose",
      args: [description, callData, IDENTITY_REGISTRY_ADDRESS],
    });
  };

  const resetForm = () => {
    setDescription("");
    setAgentURI("");
    setAgentId("");
    setMetadataKey("");
    setMetadataValue("");
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Proposal</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your proposal..."
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Action Type</label>
            <Select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as ActionType)}
            >
              <option value="register">Register New Agent</option>
              <option value="setMetadata">Set Metadata</option>
              <option value="setAgentURI">Set Agent URI</option>
            </Select>
          </div>

          {actionType === "register" && (
            <div>
              <label className="text-sm font-medium">Agent URI (optional)</label>
              <Input
                value={agentURI}
                onChange={(e) => setAgentURI(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          {(actionType === "setMetadata" || actionType === "setAgentURI") && (
            <div>
              <label className="text-sm font-medium">Agent ID</label>
              <Input
                type="number"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="0"
                required
              />
            </div>
          )}

          {actionType === "setMetadata" && (
            <>
              <div>
                <label className="text-sm font-medium">Metadata Key</label>
                <Input
                  value={metadataKey}
                  onChange={(e) => setMetadataKey(e.target.value)}
                  placeholder="key"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Metadata Value (hex)</label>
                <Input
                  value={metadataValue}
                  onChange={(e) => setMetadataValue(e.target.value)}
                  placeholder="0x..."
                  required
                />
              </div>
            </>
          )}

          {actionType === "setAgentURI" && (
            <div>
              <label className="text-sm font-medium">New URI</label>
              <Input
                value={agentURI}
                onChange={(e) => setAgentURI(e.target.value)}
                placeholder="https://..."
                required
              />
            </div>
          )}

          <Button type="submit" disabled={isPending || isConfirming || !AGENDA_DAO_ADDRESS}>
            {isPending ? "Confirming..." : isConfirming ? "Processing..." : "Submit Proposal"}
          </Button>

          {isSuccess && (
            <p className="text-sm text-green-600">Proposal created successfully!</p>
          )}

          {!AGENDA_DAO_ADDRESS && (
            <p className="text-sm text-yellow-600">DAO contract not deployed yet. Please deploy first.</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
