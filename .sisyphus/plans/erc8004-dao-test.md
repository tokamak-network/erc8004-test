# ERC-8004 + DAO 투표 + Agent 자동 테스트 시스템

## TL;DR

> **Quick Summary**: DAO 투표를 통해 ERC-8004 Identity Registry 기능 테스트를 자동화하는 시스템. 투표 찬성 시 Agent가 자동으로 execute 실행.
> 
> **Deliverables**:
> - 투표용 ERC-20 토큰 컨트랙트 (Sepolia 배포)
> - DAO 투표 컨트랙트 (propose, vote, execute)
> - Next.js 웹 UI (Agenda 제안, 투표, 결과 확인)
> - Vercel Cron 기반 자동 실행 Agent
> 
> **Estimated Effort**: Medium (약 3-5일)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: 컨트랙트 → 배포 → 프론트엔드 → Agent

---

## Context

### Original Request
ERC-8004를 Sepolia에서 테스트하되, DAO Agenda가 투표로 찬성 통과되면 Agent가 해당 Agenda를 자동으로 테스트하는 시스템. 웹페이지 UI로 테스트 가능해야 함.

### Interview Summary
**Key Discussions**:
- DAO 구현: 간단한 커스텀 투표 컨트랙트 (OpenZeppelin Governor 아님)
- 투표권: ERC-20 토큰 보유량에 비례
- 투표 기간: 5분 (테스트용, 빠른 사이클)
- Agent 역할: 투표 종료 시간에 자동으로 execute 호출 (Vercel Cron)
- Agenda 종류: register(), setMetadata(), setAgentURI() 등 Identity 작업
- 테스트 범위: Identity Registry만 (Reputation, Validation 제외)

**Research Findings**:
- ERC-8004 Sepolia Identity Registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e` (이미 배포됨)
- ERC-8004는 ERC-721 기반 Agent 식별 + 메타데이터 관리 표준
- 주요 함수: register(), setMetadata(), setAgentURI(), setAgentWallet()

### Metis Review
**Identified Gaps** (addressed):
- Agent 실행 지갑 관리: 환경변수로 private key 관리
- Gas 비용: Sepolia faucet 활용
- 동시 투표 처리: 각 Proposal 독립 처리
- 실패 처리: 단순 로깅 (재시도 없음)
- Quorum: 단순 과반수 (최소 참여 요건 없음)

---

## Work Objectives

### Core Objective
DAO 투표 시스템을 통해 ERC-8004 Identity Registry 기능을 Sepolia 테스트넷에서 자동으로 테스트하는 E2E 시스템 구축

### Concrete Deliverables
1. `contracts/VoteToken.sol` - ERC-20 투표 토큰
2. `contracts/AgendaDAO.sol` - DAO 투표 컨트랙트
3. `app/` - Next.js 14 웹 애플리케이션
4. `app/api/cron/execute/route.ts` - Vercel Cron 엔드포인트

### Definition of Done
- [ ] Sepolia에 토큰 + DAO 컨트랙트 배포 완료
- [ ] 웹 UI에서 Agenda 제안, 투표, 결과 확인 가능
- [ ] 투표 종료 후 Agent가 자동으로 execute 호출
- [ ] ERC-8004 Identity Registry에 실제 트랜잭션 발생 확인

### Must Have
- 토큰 보유자만 투표 가능
- 과반수 찬성 시에만 execute 실행
- 웹 UI에서 지갑 연결 (MetaMask 등)
- 투표 상태 실시간 표시

### Must NOT Have (Guardrails)
- ❌ Reputation Registry 연동
- ❌ Validation Registry 연동
- ❌ 사용자 인증/로그인 시스템
- ❌ 위임 투표 (Delegation)
- ❌ 모바일 반응형 UI
- ❌ 프론트엔드 자동화 테스트
- ❌ OpenZeppelin Governor 사용 (커스텀 간단 구현)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (새 프로젝트)
- **User wants tests**: YES (컨트랙트 단위 테스트만)
- **Framework**: Hardhat (Solidity 테스트)

### Contract Testing
- Hardhat으로 컨트랙트 단위 테스트 작성
- 로컬 네트워크에서 테스트 후 Sepolia 배포

### Manual Verification (Frontend)
- Sepolia에서 직접 웹 UI로 E2E 테스트
- MetaMask 연결 → Agenda 제안 → 투표 → execute 확인

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: 프로젝트 초기 설정
└── Task 2: ERC-8004 ABI/타입 준비

Wave 2 (After Wave 1):
├── Task 3: VoteToken 컨트랙트
├── Task 4: AgendaDAO 컨트랙트
└── Task 5: 컨트랙트 테스트

Wave 3 (After Wave 2):
├── Task 6: Sepolia 배포 스크립트
└── Task 7: 컨트랙트 배포

Wave 4 (After Wave 3):
├── Task 8: Next.js 프론트엔드 기초
├── Task 9: 지갑 연결 + 토큰 정보 표시
└── Task 10: Agenda 제안 UI

Wave 5 (After Task 10):
├── Task 11: 투표 UI
└── Task 12: Agenda 목록 + 결과 표시

Wave 6 (After Wave 5):
├── Task 13: Vercel Cron Agent
└── Task 14: E2E 통합 테스트

Critical Path: Task 1 → 3 → 4 → 7 → 8 → 10 → 11 → 13 → 14
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 4, 8 | 2 |
| 2 | None | 8 | 1 |
| 3 | 1 | 5, 7 | 4 |
| 4 | 1 | 5, 7 | 3 |
| 5 | 3, 4 | 7 | - |
| 6 | 1 | 7 | 3, 4, 5 |
| 7 | 5, 6 | 8, 9, 10 | - |
| 8 | 1, 2, 7 | 9, 10 | - |
| 9 | 8 | 11 | 10 |
| 10 | 8 | 11, 12 | 9 |
| 11 | 9, 10 | 13 | 12 |
| 12 | 10 | 14 | 11 |
| 13 | 11 | 14 | 12 |
| 14 | 12, 13 | None | - |

---

## TODOs

### Phase 1: 프로젝트 설정

- [ ] 1. 프로젝트 초기 설정

  **What to do**:
  - Hardhat 프로젝트 초기화 (`npx hardhat init`)
  - Next.js 14 App Router 프로젝트 생성 (`npx create-next-app@latest`)
  - 필요한 패키지 설치:
    - Hardhat: `@nomicfoundation/hardhat-toolbox`, `@openzeppelin/contracts`
    - Next.js: `wagmi`, `viem`, `@tanstack/react-query`, `tailwindcss`, `shadcn/ui`
  - 프로젝트 구조 설정:
    ```
    /
    ├── contracts/          # Solidity 컨트랙트
    ├── test/               # Hardhat 테스트
    ├── scripts/            # 배포 스크립트
    ├── app/                # Next.js App Router
    ├── lib/                # 공용 유틸리티
    └── hardhat.config.ts
    ```
  - Sepolia 네트워크 설정 (hardhat.config.ts)
  - 환경변수 파일 설정 (.env.example, .env.local)

  **Must NOT do**:
  - OpenZeppelin Governor 패턴 사용하지 않음
  - 불필요한 의존성 추가하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 초기 설정은 표준 명령어 실행이 대부분
  - **Skills**: [`git-master`]
    - `git-master`: git init 및 초기 커밋

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: 3, 4, 8
  - **Blocked By**: None

  **References**:
  - Hardhat 공식 문서: https://hardhat.org/hardhat-runner/docs/getting-started
  - Next.js 14 공식 문서: https://nextjs.org/docs/getting-started
  - wagmi v2 문서: https://wagmi.sh/react/getting-started
  - shadcn/ui 설치: https://ui.shadcn.com/docs/installation/next

  **Acceptance Criteria**:
  - [ ] `npx hardhat compile` → 성공 (에러 없음)
  - [ ] `npm run dev` → Next.js 개발 서버 시작 (localhost:3000)
  - [ ] `hardhat.config.ts`에 Sepolia 네트워크 설정 존재
  - [ ] `.env.example`에 필요한 환경변수 목록 존재

  **Commit**: YES
  - Message: `chore: initialize project with Hardhat and Next.js`
  - Files: `package.json`, `hardhat.config.ts`, `next.config.js`, `tailwind.config.ts`

---

- [ ] 2. ERC-8004 ABI/타입 준비

  **What to do**:
  - ERC-8004 Identity Registry ABI 가져오기
    - Sepolia Etherscan에서 ABI 추출: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
  - `lib/abi/IdentityRegistry.json` 파일 생성
  - TypeScript 타입 정의 (`lib/types/erc8004.ts`)
  - 컨트랙트 주소 상수 파일 (`lib/constants.ts`)

  **Must NOT do**:
  - ERC-8004 컨트랙트 직접 배포하지 않음 (기존 것 사용)
  - Reputation/Validation Registry ABI 가져오지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: ABI 복사 및 타입 정의는 단순 작업
  - **Skills**: []
    - 특별한 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: 8
  - **Blocked By**: None

  **References**:
  - ERC-8004 Identity Registry ABI: https://sepolia.etherscan.io/address/0x8004A818BFB912233c491871b3d84c89A494BD9e#code
  - ERC-8004 공식 사양: https://eips.ethereum.org/EIPS/eip-8004

  **Acceptance Criteria**:
  - [ ] `lib/abi/IdentityRegistry.json` 파일 존재
  - [ ] `lib/constants.ts`에 `IDENTITY_REGISTRY_ADDRESS` 상수 존재
  - [ ] TypeScript 컴파일 에러 없음 (`npx tsc --noEmit`)

  **Commit**: YES
  - Message: `feat: add ERC-8004 Identity Registry ABI and types`
  - Files: `lib/abi/`, `lib/types/`, `lib/constants.ts`

---

### Phase 2: 스마트 컨트랙트

- [ ] 3. VoteToken 컨트랙트 개발

  **What to do**:
  - `contracts/VoteToken.sol` 생성
  - OpenZeppelin ERC-20 상속
  - 기능:
    - `constructor(string name, string symbol, uint256 initialSupply)`
    - 배포자에게 초기 공급량 민팅
    - 표준 transfer, approve, transferFrom
  - 테스트용이므로 간단하게 유지

  **Must NOT do**:
  - ERC-20Votes 확장 사용하지 않음 (OpenZeppelin Governor용)
  - 복잡한 민팅/버닝 로직 추가하지 않음

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: 표준 ERC-20 구현, 복잡하지 않음
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: 5, 7
  - **Blocked By**: 1

  **References**:
  - OpenZeppelin ERC-20: https://docs.openzeppelin.com/contracts/5.x/erc20

  **Acceptance Criteria**:
  - [ ] `npx hardhat compile` → 성공
  - [ ] VoteToken.sol이 ERC-20 인터페이스 구현

  **Commit**: YES (Task 4와 함께)
  - Message: `feat(contracts): add VoteToken ERC-20 contract`

---

- [ ] 4. AgendaDAO 컨트랙트 개발

  **What to do**:
  - `contracts/AgendaDAO.sol` 생성
  - 구조체 및 상태:
    ```solidity
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        bytes callData;        // ERC-8004 호출 데이터
        address target;        // Identity Registry 주소
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        mapping(address => bool) hasVoted;
    }
    ```
  - 함수:
    ```solidity
    function propose(string description, bytes callData, address target) returns (uint256 proposalId)
    function vote(uint256 proposalId, bool support) external
    function execute(uint256 proposalId) external
    function getProposal(uint256 proposalId) external view returns (...)
    function getProposalCount() external view returns (uint256)
    function canExecute(uint256 proposalId) external view returns (bool)
    ```
  - 규칙:
    - 투표권 = 토큰 보유량 (투표 시점 기준)
    - 과반수 = forVotes > againstVotes
    - 투표 기간: 5분 (상수로 정의, 나중에 변경 가능하게)
    - 한 주소당 한 번만 투표 가능
    - 종료 후에만 execute 가능

  **Must NOT do**:
  - 위임 투표 구현하지 않음
  - Quorum(최소 참여 요건) 구현하지 않음
  - Timelock 구현하지 않음

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 핵심 비즈니스 로직이 포함된 컨트랙트
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: 5, 7
  - **Blocked By**: 1

  **References**:
  - ERC-8004 Identity Registry 함수 시그니처:
    - `register() returns (uint256)`
    - `register(string agentURI) returns (uint256)`
    - `setMetadata(uint256 agentId, string metadataKey, bytes metadataValue)`
    - `setAgentURI(uint256 agentId, string newURI)`
  - 참고: Compound Governor Alpha (단순화 버전으로)

  **Acceptance Criteria**:
  - [ ] `npx hardhat compile` → 성공
  - [ ] propose, vote, execute 함수 존재
  - [ ] 투표 기간 5분 상수 정의

  **Commit**: YES (Task 3과 함께)
  - Message: `feat(contracts): add AgendaDAO voting contract`

---

- [ ] 5. 컨트랙트 단위 테스트

  **What to do**:
  - `test/VoteToken.test.ts` 생성:
    - 초기 공급량 민팅 테스트
    - transfer 테스트
  - `test/AgendaDAO.test.ts` 생성:
    - propose 테스트: Proposal 생성 확인
    - vote 테스트: 찬성/반대 투표, 이중 투표 방지
    - execute 테스트: 과반수 찬성 시 실행, 반대 시 실패
    - 시간 테스트: 투표 기간 중 execute 불가, 종료 후 가능
  - Hardhat 네트워크의 `evm_increaseTime` 활용

  **Must NOT do**:
  - 프론트엔드 테스트 작성하지 않음
  - 가스 최적화 테스트하지 않음

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 컨트랙트 로직 검증이 중요
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 7
  - **Blocked By**: 3, 4

  **References**:
  - Hardhat Testing: https://hardhat.org/hardhat-runner/docs/guides/test-contracts
  - Chai Matchers: https://hardhat.org/hardhat-chai-matchers/docs/overview

  **Acceptance Criteria**:
  - [ ] `npx hardhat test` → 모든 테스트 통과
  - [ ] VoteToken 테스트: 최소 2개
  - [ ] AgendaDAO 테스트: 최소 5개 (propose, vote, execute 포함)

  **Commit**: YES
  - Message: `test(contracts): add unit tests for VoteToken and AgendaDAO`

---

- [ ] 6. Sepolia 배포 스크립트 작성

  **What to do**:
  - `scripts/deploy.ts` 생성
  - 배포 순서:
    1. VoteToken 배포 (초기 공급량: 1,000,000 토큰)
    2. AgendaDAO 배포 (VoteToken 주소, Identity Registry 주소 전달)
  - 배포 후 주소 출력 및 `deployed-addresses.json` 저장
  - Etherscan verify 스크립트 포함 (`scripts/verify.ts`)

  **Must NOT do**:
  - ERC-8004 컨트랙트 배포하지 않음 (기존 것 사용)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 표준 배포 스크립트
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2/3 (with 3, 4, 5)
  - **Blocks**: 7
  - **Blocked By**: 1

  **References**:
  - Hardhat Deploy: https://hardhat.org/hardhat-runner/docs/guides/deploying

  **Acceptance Criteria**:
  - [ ] `scripts/deploy.ts` 파일 존재
  - [ ] 스크립트 실행 시 에러 없음 (dry-run with local network)

  **Commit**: YES
  - Message: `feat(scripts): add Sepolia deployment script`

---

- [ ] 7. Sepolia 컨트랙트 배포

  **What to do**:
  - Sepolia faucet에서 테스트 ETH 확보
  - `npx hardhat run scripts/deploy.ts --network sepolia` 실행
  - 배포된 주소를 `lib/constants.ts`에 업데이트
  - Etherscan에서 컨트랙트 verify
  - 배포 주소 기록:
    - VoteToken: `0x...`
    - AgendaDAO: `0x...`

  **Must NOT do**:
  - Mainnet 배포하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 명령어 실행
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 8, 9, 10
  - **Blocked By**: 5, 6

  **References**:
  - Sepolia Faucet: https://sepoliafaucet.com/
  - Hardhat Verify: https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify

  **Acceptance Criteria**:
  - [ ] VoteToken, AgendaDAO 주소가 Sepolia Etherscan에서 확인됨
  - [ ] 컨트랙트 verified 상태
  - [ ] `lib/constants.ts`에 배포 주소 업데이트됨

  **Commit**: YES
  - Message: `chore: deploy contracts to Sepolia`

---

### Phase 3: 프론트엔드

- [ ] 8. Next.js 프론트엔드 기초 설정

  **What to do**:
  - wagmi + viem 설정:
    - `lib/wagmi.ts`: wagmi config (Sepolia 체인)
    - `app/providers.tsx`: WagmiProvider + QueryClientProvider
    - `app/layout.tsx`: Providers 래핑
  - shadcn/ui 컴포넌트 설치:
    - Button, Card, Input, Badge, Tabs
  - 기본 레이아웃:
    - 헤더 (로고 + 지갑 연결 버튼)
    - 메인 컨텐츠 영역
  - 배포된 컨트랙트 ABI import

  **Must NOT do**:
  - 모바일 반응형 레이아웃 구현하지 않음
  - 다크 모드 구현하지 않음

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 설정 및 레이아웃 작업
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: shadcn/ui 및 Tailwind 스타일링

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 9, 10
  - **Blocked By**: 1, 2, 7

  **References**:
  - wagmi 설정: https://wagmi.sh/react/getting-started
  - shadcn/ui 컴포넌트: https://ui.shadcn.com/docs/components/button

  **Acceptance Criteria**:
  - [ ] `npm run dev` → localhost:3000에서 페이지 로드
  - [ ] 헤더에 지갑 연결 버튼 표시
  - [ ] wagmi 설정에 Sepolia 체인 포함

  **Commit**: YES
  - Message: `feat(frontend): setup wagmi and base layout`

---

- [ ] 9. 지갑 연결 + 토큰 정보 표시

  **What to do**:
  - 지갑 연결 버튼 (wagmi `useConnect`, `useDisconnect`)
  - 연결된 주소 표시
  - 토큰 잔액 표시 (wagmi `useBalance` 또는 `useReadContract`)
  - 연결 상태에 따른 UI 변경

  **Must NOT do**:
  - 여러 지갑 프로바이더 지원하지 않음 (Injected만)
  - 토큰 전송 UI 구현하지 않음

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트 개발
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 10)
  - **Blocks**: 11
  - **Blocked By**: 8

  **References**:
  - wagmi useConnect: https://wagmi.sh/react/api/hooks/useConnect
  - wagmi useBalance: https://wagmi.sh/react/api/hooks/useBalance

  **Acceptance Criteria**:
  ```
  # Playwright로 검증:
  1. http://localhost:3000 접속
  2. "Connect Wallet" 버튼 클릭
  3. MetaMask 연결 (Sepolia)
  4. 연결된 주소 표시 확인 (0x...)
  5. VoteToken 잔액 표시 확인
  ```

  **Commit**: YES
  - Message: `feat(frontend): add wallet connection and token balance`

---

- [ ] 10. Agenda 제안 UI

  **What to do**:
  - "New Proposal" 폼:
    - Description (텍스트 입력)
    - Action Type (드롭다운: register, setMetadata, setAgentURI)
    - Action Type별 추가 입력 필드:
      - `register`: agentURI (optional)
      - `setMetadata`: agentId, key, value
      - `setAgentURI`: agentId, newURI
  - callData 인코딩 (viem의 `encodeFunctionData`)
  - `propose` 트랜잭션 실행 (wagmi `useWriteContract`)
  - 제안 성공/실패 피드백

  **Must NOT do**:
  - 이미지 업로드 기능 추가하지 않음
  - Markdown 에디터 사용하지 않음

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 폼 UI 및 컨트랙트 연동
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 9)
  - **Blocks**: 11, 12
  - **Blocked By**: 8

  **References**:
  - viem encodeFunctionData: https://viem.sh/docs/contract/encodeFunctionData
  - wagmi useWriteContract: https://wagmi.sh/react/api/hooks/useWriteContract
  - ERC-8004 함수 시그니처 (Task 2에서 정의)

  **Acceptance Criteria**:
  ```
  # Playwright로 검증:
  1. "New Proposal" 폼 표시 확인
  2. Action Type "register" 선택
  3. Description 입력
  4. "Submit" 클릭 → 트랜잭션 발생
  5. 성공 메시지 표시
  ```

  **Commit**: YES
  - Message: `feat(frontend): add proposal creation form`

---

- [ ] 11. 투표 UI

  **What to do**:
  - Proposal 상세 페이지 또는 카드 내 투표 섹션:
    - 찬성/반대 버튼
    - 현재 투표 수 표시 (For / Against)
    - 남은 시간 표시 (카운트다운)
    - 투표 상태 표시 (Active, Passed, Failed, Executed)
  - `vote` 트랜잭션 실행
  - 이미 투표한 경우 버튼 비활성화

  **Must NOT do**:
  - 투표 위임 UI 구현하지 않음
  - 투표 변경 기능 구현하지 않음

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 투표 UI 및 실시간 상태 표시
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Task 12)
  - **Blocks**: 13
  - **Blocked By**: 9, 10

  **References**:
  - wagmi useReadContract: https://wagmi.sh/react/api/hooks/useReadContract
  - React countdown: 직접 구현 또는 라이브러리

  **Acceptance Criteria**:
  ```
  # Playwright로 검증:
  1. Proposal 카드에 투표 섹션 표시
  2. "For" 버튼 클릭 → 트랜잭션 발생
  3. 투표 후 버튼 비활성화 확인
  4. 투표 수 업데이트 확인
  ```

  **Commit**: YES
  - Message: `feat(frontend): add voting UI`

---

- [ ] 12. Agenda 목록 + 결과 표시

  **What to do**:
  - Proposal 목록 페이지:
    - 모든 Proposal 카드 형태로 표시
    - 상태별 필터 (All, Active, Passed, Failed, Executed)
  - 각 Proposal 카드:
    - ID, Description, Proposer
    - 투표 현황 (진행률 바)
    - 상태 Badge
    - 종료 시간
  - 결과 표시:
    - Executed 상태면 트랜잭션 해시 표시
    - Etherscan 링크

  **Must NOT do**:
  - 페이지네이션 구현하지 않음 (전체 로드)
  - 검색 기능 구현하지 않음

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 목록 UI 및 상태 표시
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Task 11)
  - **Blocks**: 14
  - **Blocked By**: 10

  **References**:
  - wagmi useReadContracts (multicall): https://wagmi.sh/react/api/hooks/useReadContracts
  - Sepolia Etherscan: https://sepolia.etherscan.io/

  **Acceptance Criteria**:
  ```
  # Playwright로 검증:
  1. Proposal 목록 페이지 접속
  2. 최소 1개 Proposal 카드 표시
  3. 상태 Badge 표시 확인
  4. 필터 클릭 시 목록 변경 확인
  ```

  **Commit**: YES
  - Message: `feat(frontend): add proposal list and result display`

---

### Phase 4: Agent + 통합

- [ ] 13. Vercel Cron Agent 구현

  **What to do**:
  - `app/api/cron/execute/route.ts` 생성
  - 로직:
    1. 모든 Proposal 조회 (getProposalCount, getProposal)
    2. 각 Proposal에 대해:
       - 종료 시간 지남 + 과반수 찬성 + 미실행 → execute 호출
    3. 실행 결과 로깅
  - Vercel Cron 설정 (`vercel.json`):
    ```json
    {
      "crons": [{
        "path": "/api/cron/execute",
        "schedule": "* * * * *"
      }]
    }
    ```
  - 환경변수:
    - `EXECUTOR_PRIVATE_KEY`: execute 호출용 지갑 private key
  - 보안: Vercel Cron 헤더 검증 (`CRON_SECRET`)

  **Must NOT do**:
  - 실패 시 재시도 로직 구현하지 않음
  - 알림 시스템 (이메일, 슬랙) 구현하지 않음

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 백엔드 로직 + 보안 고려
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Task 14 preparation)
  - **Blocks**: 14
  - **Blocked By**: 11

  **References**:
  - Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
  - viem 서버사이드 사용: https://viem.sh/docs/getting-started

  **Acceptance Criteria**:
  - [ ] `/api/cron/execute` 엔드포인트 존재
  - [ ] `vercel.json`에 cron 설정 존재
  - [ ] 로컬에서 API 호출 테스트:
    ```bash
    curl -X GET http://localhost:3000/api/cron/execute \
      -H "Authorization: Bearer $CRON_SECRET"
    # 200 OK 응답
    ```

  **Commit**: YES
  - Message: `feat(agent): add Vercel Cron execute agent`

---

- [ ] 14. E2E 통합 테스트 (수동)

  **What to do**:
  - Sepolia에서 전체 플로우 수동 테스트:
    1. VoteToken 토큰 보유 확인
    2. Agenda 제안 (register 액션)
    3. 투표 (찬성)
    4. 5분 대기 (또는 테스트용으로 시간 단축)
    5. Cron 실행 (수동 트리거 또는 자동)
    6. ERC-8004 Identity Registry에서 새 Agent 등록 확인
  - 테스트 결과 문서화
  - 스크린샷 저장

  **Must NOT do**:
  - 자동화된 E2E 테스트 스크립트 작성하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 수동 테스트 가이드 실행
  - **Skills**: [`playwright`]
    - `playwright`: 브라우저 자동화로 UI 검증

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Final (Sequential)
  - **Blocks**: None
  - **Blocked By**: 12, 13

  **References**:
  - ERC-8004 Identity Registry (Sepolia): https://sepolia.etherscan.io/address/0x8004A818BFB912233c491871b3d84c89A494BD9e

  **Acceptance Criteria**:
  ```
  # Playwright로 전체 플로우 검증:
  1. 웹 UI에서 새 Proposal 생성 (register 액션)
  2. 투표 진행 (찬성)
  3. 투표 종료 후 Cron 트리거
  4. Proposal 상태가 "Executed"로 변경 확인
  5. Sepolia Etherscan에서 ERC-8004 트랜잭션 확인
  ```
  - [ ] 새 Agent가 Identity Registry에 등록됨 (Etherscan에서 확인)
  - [ ] 전체 플로우 스크린샷 `.sisyphus/evidence/`에 저장

  **Commit**: YES
  - Message: `docs: add E2E test results and evidence`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `chore: initialize project` | package.json, configs | npm run dev |
| 2 | `feat: add ERC-8004 ABI` | lib/ | tsc --noEmit |
| 3, 4 | `feat(contracts): add VoteToken and AgendaDAO` | contracts/ | hardhat compile |
| 5 | `test(contracts): add unit tests` | test/ | hardhat test |
| 6 | `feat(scripts): add deploy script` | scripts/ | - |
| 7 | `chore: deploy to Sepolia` | lib/constants.ts | etherscan verify |
| 8 | `feat(frontend): setup wagmi` | app/, lib/ | npm run dev |
| 9 | `feat(frontend): wallet connection` | app/components/ | manual test |
| 10 | `feat(frontend): proposal form` | app/ | manual test |
| 11 | `feat(frontend): voting UI` | app/ | manual test |
| 12 | `feat(frontend): proposal list` | app/ | manual test |
| 13 | `feat(agent): Vercel Cron` | app/api/, vercel.json | curl test |
| 14 | `docs: E2E test results` | .sisyphus/evidence/ | - |

---

## Success Criteria

### Verification Commands
```bash
# 컨트랙트 테스트
npx hardhat test                    # Expected: All tests pass

# 프론트엔드 빌드
npm run build                       # Expected: Build successful

# 로컬 Cron 테스트
curl http://localhost:3000/api/cron/execute  # Expected: 200 OK
```

### Final Checklist
- [ ] VoteToken, AgendaDAO Sepolia 배포 완료
- [ ] 웹 UI에서 Proposal 생성, 투표, 조회 가능
- [ ] Vercel Cron이 종료된 투표 자동 실행
- [ ] ERC-8004 Identity Registry에 실제 트랜잭션 발생
- [ ] 모든 "Must NOT Have" 항목이 구현되지 않음
