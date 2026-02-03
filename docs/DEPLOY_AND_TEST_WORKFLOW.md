# Deploy → Env 업데이트 → 테스트 워크플로우

이 문서는 ERC8004 프로젝트의 배포(Deploy), 환경 변수(.env) 업데이트, 테스트 진행 순서를 정리합니다.

---

## 1. 사전 준비

`.env` 파일에 다음 변수들이 설정되어 있어야 합니다:

| 변수명 | 설명 |
|--------|------|
| `SEPOLIA_RPC_URL` | Sepolia 네트워크 RPC URL (Alchemy, Infura 등) |
| `PRIVATE_KEY` | 배포에 사용할 지갑의 개인키 |
| `ETHERSCAN_API_KEY` | 컨트랙트 검증용 Etherscan API 키 (선택) |

`.env.example`을 복사하여 `.env`를 만들고 값을 채우세요.

```bash
cp .env.example .env
# .env 파일을 열어 위 변수들을 입력
```

---

## 2. 배포 (Deploy)

Sepolia 테스트넷에 VoteToken, AgendaDAO 컨트랙트를 배포합니다.

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

배포가 완료되면:

- 콘솔에 VoteToken, AgendaDAO 주소가 출력됩니다.
- `deployed-addresses.json` 파일이 프로젝트 루트에 생성됩니다.

예시 `deployed-addresses.json`:

```json
{
  "voteToken": "0x...",
  "agendaDAO": "0x...",
  "identityRegistry": "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  "network": "sepolia",
  "timestamp": "..."
}
```

---

## 3. Env 업데이트

배포 결과를 `.env`에 반영합니다. `deployed-addresses.json`의 `voteToken`, `agendaDAO` 값을 아래 변수에 넣습니다.

| 변수명 | 설명 |
|--------|------|
| `NEXT_PUBLIC_VOTE_TOKEN_ADDRESS` | `deployed-addresses.json`의 `voteToken` 값 |
| `NEXT_PUBLIC_AGENDA_DAO_ADDRESS` | `deployed-addresses.json`의 `agendaDAO` 값 |

`.env` 예시:

```env
# ... 기존 변수들 ...

# Deployed contract addresses (배포 후 업데이트)
NEXT_PUBLIC_VOTE_TOKEN_ADDRESS=0x1234...
NEXT_PUBLIC_AGENDA_DAO_ADDRESS=0x5678...
```

### 자동으로 env 업데이트하는 방법 (선택)

`deployed-addresses.json`을 읽어 `.env`를 갱신하는 스크립트를 사용할 수 있습니다:

```bash
# deployed-addresses.json이 있다는 가정 하에
VOTE=$(jq -r '.voteToken' deployed-addresses.json)
DAO=$(jq -r '.agendaDAO' deployed-addresses.json)
echo "NEXT_PUBLIC_VOTE_TOKEN_ADDRESS=$VOTE" >> .env
echo "NEXT_PUBLIC_AGENDA_DAO_ADDRESS=$DAO" >> .env
```

또는 `.env`에 이미 해당 변수가 있으면 직접 수정하세요.

---

## 4. 테스트 진행

### 4.1 컨트랙트 단위 테스트 (Unit Test)

Hardhat 로컬 네트워크에서 컨트랙트를 새로 배포해 테스트합니다. `.env`의 주소 값은 사용하지 않습니다.

```bash
npm test
# 또는
npx hardhat test
```

### 4.2 앱 테스트 (로컬)

Next.js 앱이 `.env`의 `NEXT_PUBLIC_VOTE_TOKEN_ADDRESS`, `NEXT_PUBLIC_AGENDA_DAO_ADDRESS`를 사용합니다. 배포된 컨트랙트와 연동해 확인하려면:

1. `.env`가 3단계처럼 업데이트된 상태인지 확인
2. 개발 서버 실행 후 브라우저에서 확인

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 후 DAO 기능(제안 생성, 투표 등)을 수동으로 테스트합니다.

### 4.3 Vercel Cron (Execute) 테스트 (선택)

자동 실행(execute) 기능을 사용한다면 `.env`에 다음도 필요합니다:

| 변수명 | 설명 |
|--------|------|
| `EXECUTOR_PRIVATE_KEY` | Execute 트랜잭션에 사용할 지갑 개인키 |
| `CRON_SECRET` | Vercel Cron 인증용 시크릿 |

---

## 5. 전체 워크플로우 요약

```
1. .env 사전 설정 (SEPOLIA_RPC_URL, PRIVATE_KEY 등)
        ↓
2. npx hardhat run scripts/deploy.ts --network sepolia
        ↓
3. deployed-addresses.json 확인 후 .env에 주소 반영
   - NEXT_PUBLIC_VOTE_TOKEN_ADDRESS
   - NEXT_PUBLIC_AGENDA_DAO_ADDRESS
        ↓
4. npm test          → 컨트랙트 단위 테스트
   npm run dev       → 앱 로컬 실행 후 기능 테스트
```

---

## 참고

- **컨트랙트 검증**: 배포 완료 후 콘솔에 출력되는 `npx hardhat verify` 명령어를 사용하면 Etherscan에서 소스 코드를 공개할 수 있습니다.
- **배포 주소 출력 경로**: `scripts/deploy.ts` 실행 시 결과는 프로젝트 루트(`erc8004-test/`)의 `deployed-addresses.json`에 저장됩니다.
