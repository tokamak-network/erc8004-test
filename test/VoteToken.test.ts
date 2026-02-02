import { expect } from "chai";
import { ethers } from "hardhat";
import { VoteToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("VoteToken", function () {
  let voteToken: VoteToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;

  const NAME = "VoteToken";
  const SYMBOL = "VOTE";
  const INITIAL_SUPPLY = ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const VoteTokenFactory = await ethers.getContractFactory("VoteToken");
    voteToken = await VoteTokenFactory.deploy(NAME, SYMBOL, INITIAL_SUPPLY);
  });

  it("should mint initial supply to deployer", async function () {
    expect(await voteToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
  });

  it("should transfer tokens correctly", async function () {
    const amount = ethers.parseEther("1000");
    await voteToken.transfer(addr1.address, amount);
    expect(await voteToken.balanceOf(addr1.address)).to.equal(amount);
    expect(await voteToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - amount);
  });
});
