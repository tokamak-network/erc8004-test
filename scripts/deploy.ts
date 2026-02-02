import { ethers } from "hardhat";

async function main() {
  const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
  const INITIAL_SUPPLY = ethers.parseEther("1000000");

  console.log("Deploying contracts to Sepolia...\n");

  const VoteTokenFactory = await ethers.getContractFactory("VoteToken");
  const voteToken = await VoteTokenFactory.deploy("VoteToken", "VOTE", INITIAL_SUPPLY);
  await voteToken.waitForDeployment();
  const voteTokenAddress = await voteToken.getAddress();
  console.log(`VoteToken deployed to: ${voteTokenAddress}`);

  const AgendaDAOFactory = await ethers.getContractFactory("AgendaDAO");
  const agendaDAO = await AgendaDAOFactory.deploy(voteTokenAddress, IDENTITY_REGISTRY);
  await agendaDAO.waitForDeployment();
  const agendaDAOAddress = await agendaDAO.getAddress();
  console.log(`AgendaDAO deployed to: ${agendaDAOAddress}`);

  console.log("\n--- Deployment Summary ---");
  console.log(`VoteToken: ${voteTokenAddress}`);
  console.log(`AgendaDAO: ${agendaDAOAddress}`);
  console.log(`Identity Registry: ${IDENTITY_REGISTRY}`);

  console.log("\n--- Verification Commands ---");
  console.log(`npx hardhat verify --network sepolia ${voteTokenAddress} "VoteToken" "VOTE" "${INITIAL_SUPPLY}"`);
  console.log(`npx hardhat verify --network sepolia ${agendaDAOAddress} "${voteTokenAddress}" "${IDENTITY_REGISTRY}"`);

  const fs = await import("fs");
  const deployedAddresses = {
    voteToken: voteTokenAddress,
    agendaDAO: agendaDAOAddress,
    identityRegistry: IDENTITY_REGISTRY,
    network: "sepolia",
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync("deployed-addresses.json", JSON.stringify(deployedAddresses, null, 2));
  console.log("\nAddresses saved to deployed-addresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
