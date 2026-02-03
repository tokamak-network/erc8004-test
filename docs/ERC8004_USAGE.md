# ERC-8004 사용 가이드

이 문서는 **ERC-8004(Identity Registry)**가 무엇인지, 이 프로젝트의 DAO에서 **어떻게 쓰이는지**, 그리고 **실제로 어떻게 사용하면 되는지** 정리한 내용입니다.

---

## 1. ERC-8004가 뭔가요?

**ERC-8004**는 **Identity Registry** 표준입니다.

- **역할**: “이 지갑 주소가 **등록된 신원(identity/agent)**을 가지고 있는지”를 블록체인에서 확인할 수 있게 해 줍니다.
- **비유**: 특정 서비스에 “회원 가입”한 주소만 사용할 수 있게 하고, 그 “회원 여부”를 스마트 컨트랙트가 조회할 수 있게 하는 레지스트리입니다.
- **주요 함수** (이 프로젝트에서 쓰는 부분):
  - `register()` / `register(agentURI)`: 내 주소를 “신원 등록”함 → `balanceOf(내 주소)`가 1 이상이 됨
  - `balanceOf(address owner)`: 해당 주소가 **몇 개의 identity(agent)**를 갖고 있는지 반환 (0이면 “미등록”)

즉, **ERC-8004를 이용한다 = Identity Registry 컨트랙트에 등록된 주소만** 어떤 행동(여기서는 제안·투표)을 할 수 있게 하는 것입니다.

---

## 2. 이 프로젝트에서 ERC-8004는 어디에 쓰이나요?

이 프로젝트에서는 **AgendaDAO**가 ERC-8004를 사용합니다.

| 구성요소 | 설명 |
|----------|------|
| **Identity Registry** | 이미 체인에 배포된 ERC-8004 컨트랙트 (예: Sepolia `0x8004A818BFB912233c491871b3d84c89A494BD9e`) |
| **AgendaDAO** | 배포 시 “어떤 Identity Registry를 볼지” 주소를 받고, **제안(propose)**과 **투표(vote)** 전에 그 레지스트리를 조회합니다. |

AgendaDAO는 다음처럼 동작합니다.

1. **제안(`propose`)**
   - `identityRegistry.balanceOf(msg.sender)`를 확인합니다.
   - **0이면** → “등록된 신원이 없다”고 보고 `NotRegisteredIdentity` 에러로 revert.
   - **1 이상이면** → 제안 생성 진행 (그 다음 VoteToken 잔액 등은 기존처럼 사용).

2. **투표(`vote`)**
   - 마찬가지로 `identityRegistry.balanceOf(msg.sender)`를 확인합니다.
   - **0이면** → `NotRegisteredIdentity`로 revert.
   - **1 이상이면** → 기존처럼 VoteToken 잔액으로 투표권 계산 후 투표 처리.

정리하면, **ERC-8004를 “이용한다” = AgendaDAO가 Identity Registry를 보고, “등록된 주소만 제안·투표 가능”하도록 하는 것**입니다.

---

## 3. 사용자 입장에서: ERC-8004를 이용해 DAO에 참여하는 방법

“내 지갑으로 이 DAO에 제안/투표하고 싶다”면, **먼저** 해당 DAO가 사용하는 Identity Registry에 **신원 등록**이 되어 있어야 합니다.

### 3.1 전체 흐름 (한 줄 요약)

1. **Identity Registry에 등록** (`register()` 호출)
2. (선택) **VoteToken** 보유
3. **제안** 또는 **투표** (AgendaDAO의 `propose` / `vote` 호출)

### 3.2 단계별로 하기

#### Step 1: Identity Registry에 등록하기

- DAO가 사용하는 **Identity Registry 주소**를 확인합니다.  
  (이 프로젝트는 Sepolia 기준 `0x8004A818BFB912233c491871b3d84c89A494BD9e` 사용)
- 그 컨트랙트에 다음 중 하나를 호출합니다.
  - `register()` — 인자 없이 “내 주소”를 등록
  - `register(agentURI)` — agent URI(문자열)와 함께 등록
- 트랜잭션을 보내는 주소 = 나중에 제안/투표할 지갑 주소입니다.
- 등록이 끝나면 `balanceOf(내 주소)`가 1 이상이 됩니다.

#### Step 2: VoteToken 보유 (투표/제안을 하려면)

- **제안**: Identity만 등록되어 있으면 가능 (토큰 없어도 제안은 됨).
- **투표**: VoteToken 잔액이 있어야 합니다. 토큰이 없으면 `NoVotingPower`로 revert됩니다.
- 필요하면 VoteToken을 받거나 구매해서 보유합니다.

#### Step 3: 제안(propose) / 투표(vote) 호출

- **제안**: AgendaDAO의 `propose(description, callData, target)`를 **등록된 지갑**으로 호출.
- **투표**: AgendaDAO의 `vote(proposalId, support)`를 **등록된 지갑**으로 호출.

여기서 “ERC-8004를 이용한다”는 것은, **Step 1을 반드시 먼저 해야 한다**는 뜻입니다.  
등록하지 않은 주소로는 `propose`/`vote` 시 `NotRegisteredIdentity`가 나옵니다.

---

## 4. 배포할 때 Identity Registry 주소를 넣는 이유

`scripts/deploy.ts`에서 다음처럼 되어 있습니다.

```ts
const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
// ...
agendaDAO = await AgendaDAOFactory.deploy(voteTokenAddress, IDENTITY_REGISTRY);
```

- **의미**: “이 DAO는 **이 주소의 Identity Registry**를 신뢰한다. 제안/투표 시 이 컨트랙트의 `balanceOf(msg.sender)`를 조회해서 등록 여부를 판단한다.”
- **왜 넣나요?**  
  Identity Registry는 보통 **한 번 배포해 두고 여러 서비스(DAO, 앱)가 같이 쓰는** 구조입니다.  
  그래서 우리는 **새로 Registry를 배포하지 않고**, 이미 Sepolia에 있는 공용 주소를 넣어 두는 것입니다.
- **다른 네트워크**: Mainnet이나 다른 체인에 배포할 때는, 그 체인에 배포된 ERC-8004 Identity Registry 주소로 바꿔야 합니다.

---

## 5. 코드에서 ERC-8004가 쓰이는 부분 요약

### 5.1 AgendaDAO 컨트랙트 (`contracts/AgendaDAO.sol`)

- **인터페이스**
  - `IIdentityRegistry`: `balanceOf(address owner)` 만 사용.
- **상태**
  - `identityRegistry`: 생성자에서 받은 Identity Registry 주소 (타입은 `IIdentityRegistry`).
- **제안**
  - `propose()` 맨 앞에서 `identityRegistry.balanceOf(msg.sender) == 0` 이면 `NotRegisteredIdentity()` revert.
- **투표**
  - `vote()` 맨 앞에서 같은 조건으로 `NotRegisteredIdentity()` revert.
- **에러**
  - `NotRegisteredIdentity` 추가.

### 5.2 배포 스크립트 (`scripts/deploy.ts`)

- `IDENTITY_REGISTRY` 상수로 Sepolia Identity Registry 주소 지정.
- AgendaDAO 배포 시 두 번째 인자로 전달: `deploy(voteTokenAddress, IDENTITY_REGISTRY)`.

### 5.3 테스트 (`test/AgendaDAO.test.ts`)

- **MockIdentityRegistry**를 배포해, 테스트에서 “등록된 주소”를 흉내 냄.
- `beforeEach`에서 `owner`, `voter1`, `voter2` 등을 Mock에 `register`.
- “등록되지 않은 주소는 제안/투표 시 `NotRegisteredIdentity`” 테스트 추가.

---

## 6. 한 페이지 요약

| 질문 | 답 |
|------|----|
| **ERC-8004를 “이용한다”는 게 뭔가요?** | Identity Registry에 등록된 주소만 제안·투표할 수 있게 DAO가 레지스트리를 조회하는 것입니다. |
| **사용자는 뭘 해야 하나요?** | 1) Identity Registry에서 `register()` (또는 `register(agentURI)`) 호출 → 2) 필요하면 VoteToken 보유 → 3) 제안/투표. |
| **배포 시 Identity Registry 주소는 왜 넣나요?** | “이 DAO가 어떤 Registry를 신뢰할지” 정해 주기 위해서입니다. 그 주소의 `balanceOf(msg.sender)`로 등록 여부를 판단합니다. |
| **다른 체인에 배포하려면?** | 해당 체인에 배포된 ERC-8004 Identity Registry 주소를 찾아서 `IDENTITY_REGISTRY`를 그 주소로 바꾸면 됩니다. |

이렇게 이해하고 사용하면, “ERC-8004를 이용해서 이 DAO를 쓴다”는 흐름을 끝까지 따라갈 수 있습니다.
