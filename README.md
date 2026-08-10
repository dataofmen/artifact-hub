# Artifact Hub

바이브 코딩 산출물(단일 HTML 대시보드·도구·문서)을 한곳에 모아두는 개인 보관함.

Next.js 16 (App Router) · Clerk · Vercel Blob(private) · Neon Postgres · Vercel 배포.

## 왜 이 구조인가

`0017` 이전에 같은 목적으로 두 번 시도했고, 각각의 한계가 이 설계를 만들었습니다.

| | MyAdmin (Vite SPA) | DeckHub | Artifact Hub |
|---|---|---|---|
| 추가 방법 | 파일 복사 → 빌드 → 재배포 | 드래그&드롭 | 드래그&드롭 + CLI |
| 파일 저장 | 빌드 산출물 (CDN 정적 에셋) | Supabase Storage | Vercel Blob (private) |
| **비공개 가능** | **불가능** | 가능 | **가능 (기본값)** |
| 인증 | Clerk (화면만 보호) | 없음 | Clerk (파일까지 보호) |

핵심은 **파일이 빌드 산출물이 아니라는 것**입니다. 정적 SPA에 HTML을 넣으면
CDN이 `/assets/foo-a1b2c3.html` 로 인증 없이 내보내고, 그 URL은 공개 JS 번들에서
기계적으로 발견됩니다. 클라이언트 인증으로는 막을 수 없습니다.

여기서는 파일이 private Blob에 있고 `/a/<slug>/raw` 라우트가 Clerk 세션을 확인한
뒤에만 스트리밍합니다. **이 검사를 우회하는 URL이 존재하지 않습니다.**

검증된 동작 (로그아웃 상태):

| 경로 | 결과 |
|------|------|
| `/`, `/upload`, `/a/<slug>` | 307 → `/sign-in` |
| `/a/<slug>/raw` | **401** |
| `/p/<slug>` (비공개 아티팩트) | **404** — 존재 탐색 불가 |
| `/api/artifacts` | 401 |
| Blob 직접 URL | **403** — MyAdmin에서 200으로 전문이 새던 경로 |

인증은 경로 매칭이 아니라 **리소스마다** 확인합니다 (`lib/require-user.ts`).
Clerk이 `createRouteMatcher` 를 deprecated 한 이유가 이것입니다 — 매처는 Next의
실제 라우팅과 어긋나 보호 대상을 노출시킬 수 있습니다.

## 아티팩트 올리기

```bash
# CLI (Claude Code에서 쓰는 경로)
pnpm hub:add ~/Downloads/dashboard.html
pnpm hub:add ~/Downloads/*.html --tags 대시보드,개인
pnpm hub:add x.html --title '매출 상황판' --slug sales-status --source 0015

# 또는 웹에서 /upload
```

| 옵션 | 설명 |
|------|------|
| `--title` | 비우면 HTML의 `<title>` 에서 가져옴 (한글 유지) |
| `--slug` | 비우면 파일명에서 생성. 한글은 로마자로 변환 |
| `--tags` | 쉼표 구분 |
| `--description` / `--source` | 메타데이터 |

**모든 아티팩트는 비공개로 들어옵니다.** 같은 슬러그로 다시 올리면 덮어쓰지 않고
버전이 올라가며 이전 파일은 `artifact_versions` 에 남습니다 — `_fixed`, `_v2` 같은
파일명 중복이 필요 없어집니다.

업로드 시 이메일·전화번호·주민번호·카드번호·API 키 형식을 훑어 경고합니다.
차단하지는 않되, 공개로 바꾸기 전에 확인할 수 있게 알려줍니다.

## 공개하기

아티팩트 화면의 `공개로` 버튼을 누르면 `/p/<slug>` 에서 로그인 없이 열립니다.
비공개 아티팩트는 이 경로에서 404를 반환하므로, 존재 여부를 탐색하는 데 쓸 수 없습니다.

## 셋업

```bash
pnpm install
vercel integration add neon --name artifact-hub-db --no-claim  # 약관 동의 1회 필요
vercel env pull .env.local --yes
echo "HUB_TOKEN=$(openssl rand -hex 32)" >> .env.local
pnpm db:push
pnpm dev
```

**Clerk 키는 로컬 개발에 필요하지 않습니다.** Clerk v7의 keyless 모드가 임시 개발
인스턴스를 자동 발급합니다. 배포할 때만 실제 키가 필요합니다.

필요한 환경변수:

| 이름 | 용도 | 출처 |
|------|------|------|
| `BLOB_READ_WRITE_TOKEN` | 파일 저장 | `vercel blob create-store` 가 자동 설정 |
| `DATABASE_URL` | 메타데이터 | Neon 통합이 자동 설정 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | 인증 (클라이언트). 배포 시에만 | Clerk 대시보드 → API Keys |
| `CLERK_SECRET_KEY` | 인증 (서버). 배포 시에만 | Clerk 대시보드 → API Keys. **비밀** |
| `HUB_TOKEN` | CLI 업로드 | 직접 생성한 랜덤 문자열 |

`HUB_TOKEN` 은 셸에 Clerk 세션이 없기 때문에 필요합니다. 미설정 시 CLI 경로가
**비활성화**되며(전체 허용이 아니라), 토큰 비교는 타이밍 공격에 안전하게 합니다.

## 배포

```bash
vercel deploy --prod
```

환경변수는 Vercel에도 동일하게 등록해야 합니다:

```bash
vercel env add CLERK_SECRET_KEY production
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production --no-sensitive
vercel env add HUB_TOKEN production
```

Clerk는 로그인 가능한 사람을 대시보드에서 제한합니다 (Restrictions → Restricted
모드 + Users에서 직접 생성). 앱 코드에는 넣지 않습니다.
