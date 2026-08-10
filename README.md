# Artifact Hub

AI로 만든 단일 HTML 산출물 — 대시보드, 상황판, 계산기, 리포트 — 를 **내 인프라에, 비공개로, 버전과 함께** 모아두는 자체 호스팅 보관함.

Next.js 16 · Clerk · Vercel Blob(private) · Neon Postgres. Vercel 프리티어로 충분합니다.

```bash
pnpm hub:add ~/Downloads/매출\ 상황판.html
# → https://your-hub.vercel.app/a/maechul-sanghwangpan  (v1, 비공개)
```

## 왜 만들었나

Claude Code나 Cursor로 대시보드를 만들다 보면 `~/Downloads` 에 `_fixed`, `_v2`, `(1)` 이 쌓입니다. 어디에 뭐가 있는지 모르고, 보여주려면 매번 배포하고, 회사 숫자가 든 건 어디에도 못 올립니다.

**정적 사이트에 올리는 방식으로는 이 문제가 안 풀립니다.** Vite/CRA 같은 정적 SPA의 빌드 산출물에 HTML을 넣으면, 앞단에 로그인을 붙여도 CDN이 `/assets/foo-a1b2c3.html` 를 그냥 내보냅니다. 그 URL은 공개 JS 번들을 따라가면 기계적으로 찾아집니다 — 실제로 확인했고, 인증 없이 HTTP 200에 전문이 나왔습니다. Vercel의 프로덕션 Deployment Protection은 Pro 플랜 전용입니다.

그래서 여기서는 **파일을 빌드에 넣지 않습니다.** private Blob에 두고, 세션을 검증하는 라우트 핸들러로만 스트리밍합니다.

| 로그아웃 상태 요청 | 응답 |
|---|---|
| `/`, `/upload`, `/a/<slug>` | 307 → `/sign-in` |
| `/a/<slug>/raw` | **401** |
| `/p/<slug>` (비공개 아티팩트) | **404** — 존재 탐색 불가 |
| `/api/artifacts` | 401 |
| Blob 파일의 직접 URL | **403** |

인증은 경로 매칭이 아니라 리소스마다 확인합니다 (`lib/require-user.ts`). Clerk이 `createRouteMatcher` 를 deprecated 한 이유가 이것입니다 — 매처는 Next의 실제 라우팅과 어긋나 보호 대상을 노출시킬 수 있습니다.

## 하는 일

- **CLI 우선 수집** — `pnpm hub:add <파일>`. 터미널에서 바로. 여러 파일 동시 가능
- **웹 업로드** — `/upload` 에서 드래그&드롭
- **비공개 기본** — 공개는 명시적으로 토글할 때만 (`/p/<slug>`)
- **버전** — 같은 슬러그로 다시 올리면 v2, v3… 이전 파일은 보존. `_fixed` 파일명 불필요
- **제목 자동 추출** — HTML의 `<title>` 에서. 한글 유지
- **한글 파일명** — 로마자로 슬러그 생성 (`매출 상황판` → `maechul-sanghwangpan`)
- **태그·검색** — 제목/설명 검색, 태그 필터
- **민감정보 경고** — 업로드 시 이메일·전화·주민번호·카드·API 키 형식을 훑어 알림 (차단은 안 함)
- **샌드박스 렌더** — 아티팩트는 `allow-same-origin` 없는 iframe에서 실행. 셸의 세션 쿠키에 접근 불가

## 설치

전제: Node 20+, pnpm, [Vercel CLI](https://vercel.com/docs/cli), Vercel 계정.

```bash
git clone https://github.com/dataofmen/artifact-hub
cd artifact-hub
pnpm install

# 1. Vercel 프로젝트 생성 + 링크
vercel link --yes

# 2. private Blob 스토어 (파일 저장소)
vercel blob create-store artifact-hub --access private --yes

# 3. Neon Postgres (메타데이터) — 브라우저에서 약관 동의 1회 필요
vercel integration add neon --name artifact-hub-db --no-claim

# 4. 환경변수 내려받기
vercel env pull .env.local --yes

# 5. CLI 토큰 생성
echo "HUB_TOKEN=$(openssl rand -hex 32)" >> .env.local

# 6. 스키마 적용
pnpm db:push

# 7. 로컬 실행
pnpm dev
```

**Clerk 키는 로컬 개발에 필요 없습니다.** Clerk v7의 keyless 모드가 임시 개발 인스턴스를 자동 발급합니다.

## 배포

[clerk.com](https://clerk.com) 에서 앱을 만들고(무료) **API Keys** 에서 두 값을 가져옵니다.
**반드시 같은 앱의 키여야 합니다** — 섞이면 handshake 검증이 실패합니다.

```bash
read -r "pk?Publishable key (pk_...): "
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production --value "$pk" --no-sensitive --yes
read -rs "sk?Secret key (sk_...): "; echo
vercel env add CLERK_SECRET_KEY production --value "$sk" --yes
unset pk sk

vercel env add HUB_TOKEN production

vercel deploy --prod
```

`NEXT_PUBLIC_*` 는 빌드 시점에 번들에 박히므로 **먼저 등록하고 그다음 배포**해야 합니다.

배포 후 CLI가 프로덕션으로 올리도록 주소를 넣습니다:

```bash
echo "HUB_URL=https://your-hub.vercel.app" >> .env.local
```

### 나만 쓰게 잠그기

이 프로젝트는 **1인용**입니다. 로그인 가능한 사람은 Clerk 대시보드에서 제한합니다 (앱 코드에는 아무것도 넣지 않습니다):

1. **Restrictions** → **Restricted** 모드 ON
2. **Users** → **Create user** → 본인 계정 생성

이 순서를 지키면 가입이 열려 있는 구간이 생기지 않습니다.
Allowlist를 켜고 항목을 비워두면 **모든 로그인이 차단**되니 주의하세요.

## 사용

```bash
pnpm hub:add <파일...> [옵션]
```

| 옵션 | 기본값 |
|------|--------|
| `--title` | HTML의 `<title>` |
| `--slug` | 파일명에서 생성 (한글은 로마자) |
| `--tags` | 쉼표 구분 |
| `--description` / `--source` | 없음 |
| `--local` | `http://localhost:3000` 으로 업로드 |
| `--url <URL>` | 임의 주소로 업로드 |

같은 아티팩트를 갱신할 때는 파일명을 바꾸지 말고 **같은 슬러그로** 올리세요.

## 구조

```
app/
  page.tsx               보관함 (검색·태그)
  a/[slug]/page.tsx      아티팩트 뷰어
  a/[slug]/raw/route.ts  세션 확인 후 private Blob 스트리밍  ← 핵심
  p/[slug]/route.ts      공개 아티팩트만. 비공개는 404
  api/artifacts/route.ts 수집 (세션 또는 HUB_TOKEN)
  upload/                드래그&드롭
lib/
  artifacts.ts           저장·조회·버전
  ingest.ts              슬러그·제목·민감정보 스캔
  require-user.ts        페이지 가드
  schema.sql
scripts/
  hub-add.mjs            CLI 수집
  db-push.mjs            스키마 적용
```

## 안 하는 것

- **다중 사용자** — `HUB_TOKEN` 하나, 권한 구분 없음. 1인용 설계입니다
- **HTML 외 형식** — 이미지·PDF·마크다운 미지원
- **아티팩트 편집** — 보관과 열람만. 수정은 원본을 고쳐 다시 올립니다
- **협업 코멘트** — 슬라이드덱에 핀·스레드를 달고 싶으면 [DeckHub](https://github.com/dataofmen/deckhub)

## 라이선스

MIT
