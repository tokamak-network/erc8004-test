// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice ERC-8004 Identity Registry: "owner" has at least one registered identity (agent) if balanceOf(owner) > 0
interface IIdentityRegistry {
    function balanceOf(address owner) external view returns (uint256);
}

contract AgendaDAO {
    IERC20 public immutable voteToken;
    IIdentityRegistry public immutable identityRegistry;
    
    uint256 public constant VOTING_PERIOD = 5 minutes;
    
    uint256 public proposalCount;
    
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        bytes callData;
        address target;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
    }
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        string description,
        bytes callData,
        address target,
        uint256 startTime,
        uint256 endTime
    );
    
    event Voted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votes
    );
    
    event ProposalExecuted(uint256 indexed id, bool success);
    
    error VotingNotEnded();
    error VotingEnded();
    error AlreadyVoted();
    error AlreadyExecuted();
    error NotPassed();
    error NoVotingPower();
    error NotRegisteredIdentity();

    constructor(address _voteToken, address _identityRegistry) {
        voteToken = IERC20(_voteToken);
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }
    
    function propose(
        string calldata description,
        bytes calldata callData,
        address target
    ) external returns (uint256) {
        if (identityRegistry.balanceOf(msg.sender) == 0) {
            revert NotRegisteredIdentity();
        }
        uint256 id = proposalCount++;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + VOTING_PERIOD;
        
        proposals[id] = Proposal({
            id: id,
            proposer: msg.sender,
            description: description,
            callData: callData,
            target: target,
            forVotes: 0,
            againstVotes: 0,
            startTime: startTime,
            endTime: endTime,
            executed: false
        });
        
        emit ProposalCreated(
            id,
            msg.sender,
            description,
            callData,
            target,
            startTime,
            endTime
        );
        
        return id;
    }
    
    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];

        if (block.timestamp >= proposal.endTime) {
            revert VotingEnded();
        }

        if (hasVoted[proposalId][msg.sender]) {
            revert AlreadyVoted();
        }

        uint256 votes = voteToken.balanceOf(msg.sender);
        if (votes == 0) {
            revert NoVotingPower();
        }
        
        hasVoted[proposalId][msg.sender] = true;
        
        if (support) {
            proposal.forVotes += votes;
        } else {
            proposal.againstVotes += votes;
        }
        
        emit Voted(proposalId, msg.sender, support, votes);
    }
    
    function execute(uint256 proposalId) external returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        
        if (block.timestamp < proposal.endTime) {
            revert VotingNotEnded();
        }
        
        if (proposal.executed) {
            revert AlreadyExecuted();
        }
        
        if (proposal.forVotes <= proposal.againstVotes) {
            revert NotPassed();
        }
        
        proposal.executed = true;
        
        (bool success, ) = proposal.target.call(proposal.callData);
        
        emit ProposalExecuted(proposalId, success);
        
        return success;
    }
    
    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory description,
        bytes memory callData,
        address target,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 startTime,
        uint256 endTime,
        bool executed
    ) {
        Proposal storage p = proposals[proposalId];
        return (
            p.id,
            p.proposer,
            p.description,
            p.callData,
            p.target,
            p.forVotes,
            p.againstVotes,
            p.startTime,
            p.endTime,
            p.executed
        );
    }
    
    function getProposalCount() external view returns (uint256) {
        return proposalCount;
    }
    
    function canExecute(uint256 proposalId) external view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        return (
            block.timestamp >= proposal.endTime &&
            !proposal.executed &&
            proposal.forVotes > proposal.againstVotes
        );
    }
    
    function hasUserVoted(uint256 proposalId, address user) external view returns (bool) {
        return hasVoted[proposalId][user];
    }
}
