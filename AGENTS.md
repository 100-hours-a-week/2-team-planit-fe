## 작업일지
+ 2026-02-04: `/src/api/axios.ts` 요청 인터셉터를 로그인/회원가입은 제외하도록 수정해 `/auth/login`, `/users/signup` 요청에 Authorization 헤더가 붙지 않게 함.
- 2026-02-04: 로컬 개발 시 `VITE_API_BASE_URL=http://localhost:8080/api`를 `.env.local`에 정의하고 axios가 환경변수를 우선 읽도록 변경해 dev 서버에서 localhost API를 호출하게 함.
- 2026-02-04: 로그인/회원가입 전용 `AuthPageHeader` 추가하고 상단에 렌더링해 두 페이지에서도 헤더가 나타나도록 조정함.
- 2026-02-04: 로그인/회원가입 전용 `AuthPageHeader`의 로고 배치·배경·간격·반응형 스타일을 전면 보강해 컬러 콘트라스트와 모바일 경험을 개선함.
- 2026-02-04: 로그인/회원가입 헤더를 페이지 상단에 폭 100%로 채우고 웹앱형 배경/간격/버튼 배치·모바일 반응성을 정비해 상단 영역을 단단한 헤더처럼 보이게 개선함.
- 2026-02-04: HomePage/NotificationPage/PostListPage의 lint 오류(impure/set-state-in-effect/useMemo dependencies/no-unsafe-finally)를 각각 순수 함수/지연 실행/의존성 정리를 통해 해결해 `npm run lint`를 통과시키도록 개선함.
<<<<<<< develop
- 2026-02-04: axios 인스턴스 baseURL 충돌을 해소하고 HomePage/TripCreatePage의 unread/로그 처리 루틴을 ESLint 친화적으로 정비해 `npm run lint`를 통과시킴.
- 2026-02-04: 전체 앱을 Notification/Post*/Trip*/HomePage/AppRouter/CSS를 최신 상태로 맞추고 axios/Notification API/JSON payload 설정 및 ESLint 오류를 정리해 lint를 복구함.
=======
- 2026-02-04: merge 충돌 마커 제거하고 Notification/Post*/TripCreate/HomePage/AppRouter/CSS를 최신 상태로 맞춘 뒤 axios/Notification API/JSON payload 설정 및 ESLint 오류를 정리해 `npm run lint` 통과를 복구함.
>>>>>>> main
- 2026-02-03: `fetchNotificationCount`/ProfileDropdown 드롭다운/NotificationPage의 toast 로직을 리워크해 `Date.now()` 생성 로직을 공통 `createToastInfo`로 뽑고 ESLint 오류(impure/set-state-in-effect/exhaustive-deps 등)를 정리함.
- 2026-02-03: PostListPage의 `finally` 블록에서 `return`을 제거해 `no-unsafe-finally` 오류를 해소하고 LINt가 통과하도록 재정비함.
- 2026-02-03: eslint 경고/에러를 모두 해결하여 `npm run lint`가 다시 통과하도록 정비함.
- 2026-02-03: S3/CloudFront 기반 이미지 배포를 위한 도메인 전환 및 정책/CORS/캐시/프론트 URL 가이드를 설계·문서화함.
- 2026-02-03: axios request/response 인터셉터를 정비해 accessToken을 일관 주입하고 401 시 토큰 삭제/로그인 리다이렉션으로 인증 흐름을 방어함.
- 2026-02-02: 전체 앱을 웹앱처럼 보이도록 배경/카드/글래스 레이아웃을 도입하고 `main.tsx`에서 `Router`를 `app-shell`/`app-surface`로 감싸 UI를 통일함.
- 2026-02-02: 게시글 등록/수정 FormData에 `data` JSON Blob을 붙이고 버튼 활성화·커뮤니티 카드 탐색을 기준대로 정리함.
- 2026-02-02: 댓글 생성 API를 JSON `Content-Type`으로 호출하고 submit handler에 로그를 두어 요청 흐름/토큰 적용을 추적할 수 있도록 정비함.
- 2026-02-02: 게시글 상세 헤더/시간/이미지/댓글/좋아요 영역을 UI 명세(게시판 설명, 작성 시간, 이미지 확대/제한, 댓글 리스트/삭제 흐름)와 맞춰 리팩토링함.
- 2026-02-02: 댓글 리스트 상태를 항상 배열로 안전하게 관리하고 삭제 시 전체 새로고침 대신 state에서 해당 comment만 제거하며 commentCount도 갱신하도록 방어 코드를 추가함.
- 2026-02-02: 댓글 수 표기를 `comments.length` 기반으로 바꿔 삭제 시 카운트가 목록과 항상 일치하도록 동기화함.
- 2026-02-02: `PostListPage`가 location key에 따라 state를 초기화하고 다시 fetch해, 댓글 작성/삭제 후 단순 navigation으로 진입해도 서버 데이터를 기준으로 항상 렌더링하도록 보장함.
- 2026-02-02: 알림 API 응답이 빈 배열이나 다른 필드명을 써도 에러 없이 처리하도록 guard를 추가하고, 로딩/에러 상태를 분리해 UI가 죽지 않도록 방어함.
- 2026-02-02: 알림 읽음 처리 후 `GET /notifications/unread-count`을 호출해 전역 뱃지를 갱신하고, 메인 헤더는 숫자 대신 `hasUnread` boolean으로 빨간 점만 보여주는 방식으로 단순화함.
- 2026-02-02: 알림 읽음 처리에서 POST를 PATCH로 변경하고 전체 읽음 버튼/호출을 제거해 현재 백엔드 스펙에 맞추며 즉시 상태를 업데이트함.
- 2026-02-02: NotificationPage와 관련 CSS를 추가해 리스트/토스트/상태 UI를 구현하고, cursor 기반 페이징/무한스크롤을 정비함.
- 2026-02-02: NotificationPage 헤더 및 카드 스타일을 강화해 요구 UX를 충족함.
- 2026-02-04: 백엔드가 JSON만 받도록 변경된 `/api/posts`에 맞춰 PostCreate/PostEdit가 FormData가 아닌 `imageKeys` 포함 JSON을 보내고 axios baseURL을 env로 분리하여 QA 오류를 해결함.
- 2026-02-04: POST /api/posts가 JSON만 받는 백엔드에 맞춰 게시글 작성/수정 UI에서 FormData 대신 `createPost`/`updatePost` JSON 요청을 보내고 이미지 필드는 빈 `imageKeys`로 처리함.
- 2026-02-01: 프론트 게시물 목록/상세/정렬 동작 상태를 검토해 요구사항 충족을 확인함.
- 2026-02-01: 게시물 수정 UI를 기존 게시글 정보로 초기화한 뒤 FormData로 `updatePostForm`을 호출하고 저장/취소 흐름을 구성함.
- 2026-02-01: 게시물 작성 UI를 폼/이미지 미리보기/검증/Toast 피드백과 함께 구성하고 multipart `createPostForm` helper를 추가하여 서버에 전달하도록 구현함.
<<<<<<< develop
- 2026-02-01: PostDetailResponse 기반 댓글/좋아요/삭제 API helper와 라이트박스/모달/댓글 무한스크롤 입출력 UI를 정비함.
- 2026-02-01: 게시물 목록 v1 요구사항(탭 보드, 검색 helper text, 정렬 드롭다운, 무한스크롤, 글쓰기/뒤로가기 버튼, toast 피드백)과 PostCreatePage 라우트를 반영해 리스트 UI/라우터를 재작성함.
- 2026-01-31: auth를 단일 `authStore` 객체로 재정비해 profileImageUrl 기반 localStorage 저장/복구를 보장하고 axios/라우터/마이페이지에 적용함.
- 2026-01-30: 마이페이지 UI 전면 리빌드와 Dropdown/Modal/Toast 컴포넌트를 추가하고 plan API 연동을 정비함.
- 2026-01-30: Axios 응답 인터셉터에서 401 시 로그인 유지하도록 조정하고, 메인 헤더/커뮤니티/추천 UI를 카드 중심으로 재작성함.
- 2026-01-30: AuthContext/Provider 추가 및 로컬스토리지/헤더 흐름 정비로 로그인 UX를 개선함.
- 2026-01-29: 백엔드 API 엔드포인트 및 axios 기본 설정을 실제 경로로 정비하고 PostList/Login UI를 업데이트함.
=======
- 2026-02-01: PostDetailResponse 기반 댓글/좋아요/삭제 API helper와 라이트박스/모달/댓글 무한스크롤 입출력 UI를 정비하여 상세 페이지를 재구성함.
- 2026-02-01: 게시물 목록 v1 요구사항(탭 보드, 검색 helper text, 정렬 드롭다운, 무한스크롤, 글쓰기/뒤로가기 버튼, toast 피드백)과 PostCreatePage 라우트를 반영하여 리스트 UI/라우터를 재작성함.
- 2026-01-31: auth를 단일 `authStore` 객체로 재정비해 localStorage `auth`에 user+accessToken을 저장/복구하고 axios/라우터/로그인/마이페이지가 새 store를 사용해 profileImageUrl(서버 URL) 기반 UI로 동작하게 정리함.
- 2026-01-30: 마이페이지 화면 전면 리빌드, dropdown/modal/toast 컴포넌트 추가, 탈퇴·계획·프로필/수정/plan API 연동 및 카카오 톤 CSS 확장.
- 2026-01-30: Axios 응답 인터셉터에서 401 시 전역 리다이렉트/로그아웃을 제거하고 `auth.me()`를 `/users/me`로 맞춰 오류 시점에도 로그인 유지하도록 조정함.
- 2026-01-30: 메인 페이지 헤더/커뮤니티/추천 섹션을 카드를 중심으로 재작성하고 알림 badge, 프로필 드롭다운, 로그인 안내 toast/NotificationPage 라우트를 정비함.
- 2026-01-30: Axios request 인터셉터에서 headers 초기값을 보장해 accessToken이 Authorization 헤더로 붙지 않아 발생하던 401 에러를 제거함.
- 2026-01-30: AuthContext/Provider를 추가해 로그인 시 사용자 정보를 전역으로 관리하고 Home/MyPage/Header의 프로필 업로드/프리뷰 로직을 리팩터링함.
- 2026-01-30: `src/store/index.ts` export 경로를 `.tsx`로 명시하여 Vite가 `/src/store/auth.ts` 404를 호출하지 않도록 정비하고 앱 부팅이 안전하게 유지되도록 확인함.
- 2026-01-30: Auth context를 단일 소스로 정리해 profileImageUrl/로그아웃을 공유하고 MyPage 닉네임 중복 확인·파일 업로드·헤더 드롭다운을 state/UX 요구사항에 맞게 재구성함.
- 2026-01-30: auth 상태의 저장 키를 `user`로 통합해 profileImageUrl을 포함한 전체 user 객체를 localStorage에 유지하고, MyPage에서 드롭다운 비활성화+입력 정리 및 프로필 업로드 UX를 정비함.
- 2026-01-30: ProfileDropdown 메뉴를 로그인/회원가입/로그아웃 중심으로 재정비하고, 공통 auth user.profileImageUrl이 헤더/마이페이지에 동기화되도록 구현하며 마이페이지에서는 드롭다운이 열리지 않게 제어함.
- 2026-01-29: `src/pages/HomePage.tsx` 내부 `fetch` 경로를 백엔드 실제 API 경로(`http://localhost:8080/api/posts`)로 수정함.
- 2026-01-29: posts API 응답 구조 `{ posts, hasMore }` 타입 정의와 axios 클라이언트(기본 `http://localhost:8080/api`)를 만들고 `PostListPage`에서 `getPosts`로 렌더링함.
- 2026-01-29: `src/api/axios.ts`에서 `VITE_API_BASE_URL` 전용으로 axios 인스턴스를 생성하도록 수정함.
- 2026-01-29: PostListPage에서 getPosts 호출 후 게시글 없음 메시지를 추가해 상태 처리를 보완함.
- 2026-01-29: 로그인 요청/응답 타입을 백엔드 DTO(`LoginRequest`, `LoginResponse`)에 맞춰 정리하고 `LoginPage`가 `loginId` 상태를 이용해 `/auth/login`을 호출하도록 조정함.
- 2026-01-29: LoginPage를 기능 정의서대로 helper text/유효성/메인/회원가입 이동/버튼 색상을 반영하도록 재구성함.
- 2026-01-29: PostListPage에서 타입만 import 하도록 `import type { PostListItem }`으로 정정하여 런타임 모듈 오류를 제거함.
- 2026-01-29: `AppRouter` 루트 리다이렉트와 `/home`/`/login` 분기, `PrivateRoute`에서 login 판단 상태/console.log/비로그인 시 `/login` 강제 리다이렉트 구조를 정리함.
- 2026-01-29: axios 인스턴스 baseURL을 `http://localhost:8080`으로 고정하고 auth 모듈이 이를 사용하도록 유지하여 로그인 요청이 백엔드로 향하게 함.
- 2026-01-29: 로그인/회원가입 페이지를 모바일 퍼스트 카드 레이아웃으로 전면 재작성하고 helper/중복 확인/프로필 업로드/카카오 스타일 CSS를 정비했으며 axios/auth/users API 흐름을 백엔드 스펙에 맞춰 조정함.
- 2026-01-29: axios request 인터셉터에 `localStorage`의 `accessToken`을 읽어 `Authorization: Bearer` 헤더를 붙이도록 설정함.
- 2026-01-29: `auth.ts`의 로그인 엔드포인트를 `/auth/login`으로 조정하고 `LoginRequest/LoginResponse` 타입을 명시함.
>>>>>>> main
