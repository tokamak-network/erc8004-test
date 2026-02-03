import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { VoteToken, AgendaDAO } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AgendaDAO", function () {
  let voteToken: VoteToken;
  let agendaDAO: AgendaDAO;
  let identityRegistry: Awaited<ReturnType<ReturnType<typeof ethers.getContractFactory>["deploy"]>>;
  let owner: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let mockRegistry: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const VOTING_PERIOD = 5 * 60;

  beforeEach(async function () {
    [owner, voter1, voter2, mockRegistry] = await ethers.getSigners();

    const VoteTokenFactory = await ethers.getContractFactory("VoteToken");
    voteToken = await VoteTokenFactory.deploy("VoteToken", "VOTE", INITIAL_SUPPLY);

    const MockRegistryFactory = await ethers.getContractFactory("MockIdentityRegistry");
    identityRegistry = await MockRegistryFactory.deploy();
    await identityRegistry.register(owner.address);
    await identityRegistry.register(voter1.address);
    await identityRegistry.register(voter2.address);

    const AgendaDAOFactory = await ethers.getContractFactory("AgendaDAO");
    agendaDAO = await AgendaDAOFactory.deploy(
      await voteToken.getAddress(),
      await identityRegistry.getAddress()
    );

    await voteToken.transfer(voter1.address, ethers.parseEther("100000"));
    await voteToken.transfer(voter2.address, ethers.parseEther("50000"));
  });

  describe("propose", function () {
    it("should create a proposal", async function () {
      const callData = ethers.hexlify(ethers.toUtf8Bytes("test"));
      
      await expect(
        agendaDAO.propose("Test Proposal", callData, mockRegistry.address)
      ).to.emit(agendaDAO, "ProposalCreated");

      expect(await agendaDAO.getProposalCount()).to.equal(1);

      const proposal = await agendaDAO.getProposal(0);
      expect(proposal.proposer).to.equal(owner.address);
      expect(proposal.description).to.equal("Test Proposal");
    });

    it("should prevent propose without registered identity (ERC-8004)", async function () {
      const [, , , , unregistered] = await ethers.getSigners();
      const callData = ethers.hexlify(ethers.toUtf8Bytes("test"));
      await expect(
        agendaDAO.connect(unregistered).propose("Test", callData, mockRegistry.address)
      ).to.be.revertedWithCustomError(agendaDAO, "NotRegisteredIdentity");
    });
  });

  describe("vote", function () {
    beforeEach(async function () {
      const callData = ethers.hexlify(ethers.toUtf8Bytes("test"));
      await agendaDAO.propose("Test Proposal", callData, mockRegistry.address);
    });

    it("should allow token holder to vote", async function () {
      await expect(agendaDAO.connect(voter1).vote(0, true))
        .to.emit(agendaDAO, "Voted")
        .withArgs(0, voter1.address, true, ethers.parseEther("100000"));

      const proposal = await agendaDAO.getProposal(0);
      expect(proposal.forVotes).to.equal(ethers.parseEther("100000"));
    });

    it("should prevent double voting", async function () {
      await agendaDAO.connect(voter1).vote(0, true);
      
      await expect(
        agendaDAO.connect(voter1).vote(0, false)
      ).to.be.revertedWithCustomError(agendaDAO, "AlreadyVoted");
    });

    it("should prevent voting after period ends", async function () {
      await time.increase(VOTING_PERIOD + 1);
      
      await expect(
        agendaDAO.connect(voter1).vote(0, true)
      ).to.be.revertedWithCustomError(agendaDAO, "VotingEnded");
    });

    it("should prevent voting without tokens", async function () {
      const [, , , , noTokens] = await ethers.getSigners();
      await identityRegistry.register(noTokens.address);
      await expect(
        agendaDAO.connect(noTokens).vote(0, true)
      ).to.be.revertedWithCustomError(agendaDAO, "NoVotingPower");
    });

    it("should prevent vote without registered identity (ERC-8004)", async function () {
      const [, , , , unregistered] = await ethers.getSigners();
      await voteToken.transfer(unregistered.address, ethers.parseEther("1000"));
      await expect(
        agendaDAO.connect(unregistered).vote(0, true)
      ).to.be.revertedWithCustomError(agendaDAO, "NotRegisteredIdentity");
    });
  });

  describe("execute", function () {
    beforeEach(async function () {
      const callData = ethers.hexlify(ethers.toUtf8Bytes("test"));
      await agendaDAO.propose("Test Proposal", callData, mockRegistry.address);
    });

    it("should execute passed proposal after voting period", async function () {
      await agendaDAO.connect(voter1).vote(0, true);
      await time.increase(VOTING_PERIOD + 1);

      await expect(agendaDAO.execute(0)).to.emit(agendaDAO, "ProposalExecuted");

      const proposal = await agendaDAO.getProposal(0);
      expect(proposal.executed).to.be.true;
    });

    it("should prevent execute before voting ends", async function () {
      await agendaDAO.connect(voter1).vote(0, true);
      
      await expect(
        agendaDAO.execute(0)
      ).to.be.revertedWithCustomError(agendaDAO, "VotingNotEnded");
    });

    it("should prevent execute if not passed", async function () {
      await agendaDAO.connect(voter1).vote(0, false);
      await time.increase(VOTING_PERIOD + 1);
      
      await expect(
        agendaDAO.execute(0)
      ).to.be.revertedWithCustomError(agendaDAO, "NotPassed");
    });

    it("should prevent double execution", async function () {
      await agendaDAO.connect(voter1).vote(0, true);
      await time.increase(VOTING_PERIOD + 1);
      await agendaDAO.execute(0);
      
      await expect(
        agendaDAO.execute(0)
      ).to.be.revertedWithCustomError(agendaDAO, "AlreadyExecuted");
    });
  });

  describe("canExecute", function () {
    beforeEach(async function () {
      const callData = ethers.hexlify(ethers.toUtf8Bytes("test"));
      await agendaDAO.propose("Test Proposal", callData, mockRegistry.address);
    });

    it("should return true for executable proposal", async function () {
      await agendaDAO.connect(voter1).vote(0, true);
      await time.increase(VOTING_PERIOD + 1);
      
      expect(await agendaDAO.canExecute(0)).to.be.true;
    });

    it("should return false if voting not ended", async function () {
      await agendaDAO.connect(voter1).vote(0, true);
      
      expect(await agendaDAO.canExecute(0)).to.be.false;
    });

    it("should return false if not passed", async function () {
      await agendaDAO.connect(voter1).vote(0, false);
      await time.increase(VOTING_PERIOD + 1);
      
      expect(await agendaDAO.canExecute(0)).to.be.false;
    });
  });
});
