# ERC-8004 기반 Agenda DAO 아키텍처

이 문서는 이 시스템에서 **ERC-8004(Identity Registry)**가 어떻게 쓰이는지 **전체 아키텍처** 관점에서 정리한 것입니다.

---

## 1. 시스템 개요

| 목적 | Agenda(제안) 생성 → 투표 → 통과 시 실행 |
|------|----------------------------------------|
| ERC-8004 역할 | **제안(propose)** 시 “등록된 identity(에이전트)만 허용”하는 **권한 레이어** |
| Identity Registry | 이미 체인에 배포된 공용 컨트랙트, DAO가 “신뢰하는 레지스트리” 주소를 참조 |

---

## 2. 전체 아키텍처 다이어그램

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    블록체인 (예: Sepolia)                  │
                    │                                                           │
  ┌─────────────────┤  ┌──────────────────┐                                    │
  │  사용자/에이전트  │  │ Identity Registry │  ◄── ERC-8004 표준 (공용 배포)     │
  │  (지갑 주소)     │  │  (ERC-8004)       │      register() / balanceOf()      │
  └────────┬────────┘  └────────┬───────────┘                                    │
           │                   │                                                │
           │ 1. register()     │ 2. balanceOf(addr)                             │
           │ ─────────────────►│     (등록 여부 조회)                            │
           │                   │                                                │
           │                   │ 3. propose() 호출 시                   │
           │                   │    AgendaDAO가 이 주소로 조회                   │
           │                   ▼                                                │
           │            ┌──────────────┐      ┌──────────────┐                  │
           │            │  AgendaDAO   │◄────►│  VoteToken   │                  │
           │            │              │      │  (ERC-20)    │                  │
           │  propose()  │  - propose() │      │              │                  │
           │  vote()     │  - vote()    │      │  잔액 =      │                  │
           │  execute()  │  - execute() │      │  투표권 수   │                  │
           │ ───────────►│              │      └──────────────┘                  │
           │            └──────┬───────┘                                        │
           │                   │                                                │
           │                   │ 4. execute 시 proposal.target.call(callData)   │
           │                   ▼                                                │
           │            [ 외부 컨트랙트 / 제안 대상 ]                             │
                    └─────────────────────────────────────────────────────────┘
                                         ▲
                                         │ 5. Cron/백엔드가 실행 가능 제안 감지 후
                                         │    execute(proposalId) 트랜잭션 전송
                                         │
                    ┌────────────────────┴────────────────────┐
                    │           오프체인 (백엔드)               │
                    │  app/api/cron/execute/route.ts           │
                    │  - 주기적으로 canExecute(id) 확인        │
                    │  - true면 execute(id) 트랜잭션 전송      │
                    └────────────────────────────────────────┘
```

---

## 3. 컴포넌트별 역할

### 3.1 Identity Registry (ERC-8004)

| 항목 | 내용 |
|------|------|
| **역할** | “이 주소가 등록된 에이전트(identity)를 갖고 있는지” 온체인에서 조회 |
| **배포** | 프로젝트에서 배포하지 않음. Sepolia 등에 **이미 배포된 공용 주소** 사용 (`0x8004...BD9e`) |
| **주요 API** | `register()` / `register(agentURI)` → 등록, `balanceOf(address)` → 소유 identity 수 |
| **이 시스템에서의 사용** | AgendaDAO가 **propose()** 호출 시 `identityRegistry.balanceOf(msg.sender)`로 “등록된 주소만 제안 가능” 검사 |

### 3.2 AgendaDAO

| 항목 | 내용 |
|------|------|
| **역할** | 제안 생성, 투표, 통과 시 실행 |
| **의존성** | VoteToken 주소, **Identity Registry 주소**(생성자에서 받음) |
| **ERC-8004 사용 위치** | `propose()`: `identityRegistry.balanceOf(msg.sender) == 0` 이면 `NotRegisteredIdentity` revert |
| **vote()** | 현재는 VoteToken 잔액만 검사. (선택) Identity 검사 추가 가능 |
| **execute()** | 현재는 누구나 호출 가능. (선택) “등록된 에이전트만 실행” 제한 추가 가능 |

### 3.3 VoteToken (ERC-20)

| 항목 | 내용 |
|------|------|
| **역할** | 투표권 수 = 잔액. 제안 권한과는 무관, **투표 시**만 사용 |
| **ERC-8004** | 사용하지 않음 |

### 3.4 Cron / Executor (오프체인)

| 항목 | 내용 |
|------|------|
| **역할** | “투표 기간 종료 + 통과”된 제안에 대해 `execute(proposalId)` 트랜잭션 전송 |
| **위치** | `app/api/cron/execute/route.ts` |
| **ERC-8004** | 사용하지 않음. 단, execute 호출 주체를 “등록된 에이전트”로 제한하려면 AgendaDAO에 검사 추가 후, 이 크론이 사용하는 지갑을 Identity Registry에 등록해 두면 됨 |

---

## 4. ERC-8004가 관여하는 흐름

### 4.1 참여자 준비 (한 번만)

```
사용자(지갑) ──► Identity Registry.register() 또는 register(agentURI)
                    │
                    └─► balanceOf(내 주소) ≥ 1 이 됨 → “등록된 identity”로 인정
```

- 제안을 하려면 **반드시** 이 단계가 선행되어야 함.
- 투표만 하려면 현재 구현에서는 Identity 검사 없음(VoteToken 잔액만 필요).

### 4.2 제안 생성 (propose)

```
사용자 ──► AgendaDAO.propose(description, callData, target)
                    │
                    ├─► [1] identityRegistry.balanceOf(msg.sender) == 0 ?
                    │         YES → revert NotRegisteredIdentity  ◄── ERC-8004 사용 지점
                    │         NO  → 계속
                    │
                    └─► [2] 제안 생성 (proposalCount++, 저장, 이벤트)
```

- **ERC-8004가 쓰이는 곳**: `propose()` 진입 시, Identity Registry에 등록된 주소인지 확인.

### 4.3 투표 (vote)

```
사용자 ──► AgendaDAO.vote(proposalId, support)
                    │
                    ├─► 투표 기간 / 중복 투표 / VoteToken 잔액 검사
                    └─► 찬성/반대 반영
```

- 현재 구현에서는 **vote() 경로에는 ERC-8004 조회 없음**. (원하면 동일하게 `balanceOf(msg.sender)` 검사 추가 가능)

### 4.4 실행 (execute)

```
누군가(또는 Cron) ──► AgendaDAO.execute(proposalId)
                    │
                    ├─► 기간 종료 여부, 이미 실행 여부, 통과 여부 검사
                    └─► proposal.target.call(proposal.callData)
```

- **실행 트리거**: 주로 오프체인 Cron이 `canExecute(id)` 확인 후 `execute(id)` 트랜잭션 전송.
- 현재 **execute() 호출자에 대한 ERC-8004 검사는 없음**. “등록된 에이전트만 실행”으로 바꾸려면 여기에 `identityRegistry.balanceOf(msg.sender) > 0` (또는 특정 에이전트만) 조건 추가 가능.

---

## 5. 배포 아키텍처

```
scripts/deploy.ts
       │
       ├─► VoteToken 배포 (name, symbol, initialSupply)
       │
       ├─► Identity Registry 는 배포하지 않음
       │   └─► 상수: IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" (Sepolia)
       │
       └─► AgendaDAO 배포 (voteToken 주소, IDENTITY_REGISTRY 주소)
                 │
                 └─► 생성 시 identityRegistry 로 위 주소 저장 (immutable)
```

- **한 체인에 Identity Registry는 하나(또는 공용 주소)** 를 쓰고, **여러 DAO/앱이 같은 Registry 주소를 참조**하는 구조입니다.
- 다른 네트워크(Mainnet 등)에 배포할 때는 해당 네트워크의 ERC-8004 Identity Registry 주소로 교체해야 합니다.

---

## 6. 요약 표

| 구분 | ERC-8004 사용 여부 | 비고 |
|------|-------------------|------|
| **Identity Registry** | 표준 자체 | register / balanceOf 등, 공용 배포 |
| **propose()** | ✅ 사용 | `balanceOf(msg.sender) == 0` 이면 revert |
| **vote()** | ❌ 미사용 | (선택) 동일 검사 추가 가능 |
| **execute()** | ❌ 미사용 | (선택) “등록된 에이전트만 실행” 제한 추가 가능 |
| **Cron/Executor** | ❌ 미사용 | 실행 트리거만 담당, 필요 시 실행자 지갑을 Registry에 등록해 두고 execute에 검사 추가 |

---

## 7. 관련 문서

- **사용 방법**: [ERC8004_USAGE.md](./ERC8004_USAGE.md) — 사용자가 어떻게 등록·제안·투표하는지
- **배포·테스트**: [DEPLOY_AND_TEST_WORKFLOW.md](./DEPLOY_AND_TEST_WORKFLOW.md) — 배포 및 테스트 워크플로우
