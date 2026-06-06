# 라이온즈 양도 게시판

Supabase를 데이터베이스로 사용하는 삼성 라이온즈 티켓/굿즈 양도 게시판입니다. 게시글 등록, 목록 조회, 거래완료 상태 변경, Realtime 실시간 갱신을 포함합니다.

## 프로젝트 구조

```text
lions-transfer-site/
  index.html
  package.json
  vercel.json
  .env.example
  src/
    main.js
    styles.css
  supabase/
    schema.sql
```

## Supabase 설정

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/schema.sql` 전체를 실행합니다.
3. Project Settings > API에서 Project URL과 anon public key를 확인합니다.
4. `.env.example`을 복사해 `.env.local`을 만들고 값을 넣습니다.

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

관리자 로그인 없이 누구나 읽기, 등록, 거래완료 상태 변경이 가능하도록 RLS 정책을 열어두었습니다. 익명 사용자의 수정 권한은 `is_done` 컬럼으로 제한했습니다. 실제 공개 서비스에서는 스팸 방지를 위해 추후 인증, 신고, 삭제, rate limit 같은 운영 장치를 추가하는 것이 좋습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## Vercel 배포

1. 이 폴더를 GitHub 저장소에 올립니다.
2. Vercel에서 New Project로 저장소를 연결합니다.
3. Environment Variables에 아래 값을 추가합니다.
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Build Command는 `npm run build`, Output Directory는 `dist`입니다.
5. Deploy를 누르면 배포됩니다.

`vercel.json`에 Vite 빌드 설정이 들어 있어 Vercel이 자동으로 정적 사이트로 배포할 수 있습니다.
