# 社内成績管理アプリ Phase1 — 引き継ぎ / 進捗ドキュメント

このファイルは、セッションを開き直しても実装を継続できるようにするための引き継ぎ資料です。
**新セッションを開始したら、まずこのファイルと下部の要件全文を読んでから作業を再開してください。**

---

## 0. 起動・実行方法

```bash
cd C:\dev\performance-management-app
npm run dev            # 開発サーバー（http://localhost:3000）
npm run db:push        # スキーマをSupabaseへ反映（migrate devは使わない・下記参照）
npm run db:seed        # 初期データ（採番マスタ + Adminユーザー）
npm run db:studio      # Prisma Studio
npm run test:e2e       # Playwright E2E
```

- ログイン: **login_id = `admin` / password = `Admin1234!`**（seedで作成）
- `.env`（git管理外）に Supabase の `DATABASE_URL` / `DIRECT_URL` と `AUTH_SECRET` 設定済み
- このプロジェクトは **OneDrive配下ではない** `C:\dev\performance-management-app` に置いている（node_modules同期回避のため。意図的）

---

## 1. 技術スタックと決定理由

| レイヤー | 採用 | 備考 |
| ---- | ---- | ---- |
| フロント/バック | Next.js **16.2.10**（App Router, TypeScript, srcなし, `@/*`→`./*`） | 既存スキャフォルドを踏襲 |
| DB | Supabase PostgreSQL（Tokyo, ap-northeast-1） | pooled=6543 / session=5432 |
| ORM | Prisma **7.8.0** | 破壊的変更あり。下記「落とし穴」必読 |
| 認証 | Auth.js (next-auth **5.0.0-beta.31**) Credentials + JWT | Prisma Adapterは不使用（Credentialsと非両立） |
| UI | Tailwind **v4**（CSS方式 `@theme`）+ 自作UI部品（shadcn/ui相当） | shadcn CLIが対話式で自動化不可のため同等品を手書き |
| テスト | Playwright | |
| デプロイ | Vercel（将来） | postinstallで`prisma generate` |

---

## 2. ⚠️ 重要な落とし穴（バージョンが訓練データより新しい・必ず守る）

### Next.js 16
- `AGENTS.md`の指示どおり、コードを書く前に `node_modules/next/dist/docs/` の該当ガイドを参照する。
- App Router。`params` / `searchParams` は **Promise**（`await` して使う）。
- Server Actions（`"use server"`）で更新処理を実装。

### Prisma 7（従来と大きく異なる）
- ジェネレータは `prisma-client`（新）。出力先 **`app/generated/prisma`**（gitignore済み）。
- import: クライアントは `@/app/generated/prisma/client` の `PrismaClient`、Enumは `@/app/generated/prisma/enums`（`Role` / `EmploymentType` / `Gender` / `SalesStatus` は const と type の両方あり）。
- **ドライバアダプタ必須**。`new PrismaClient({ adapter })` で使う。共通インスタンスは **`lib/prisma.ts`** に実装済み（`PrismaPg` + `ssl:{rejectUnauthorized:false}`）。アプリからは常に `import { prisma } from "@/lib/prisma"`。
- 設定は **`prisma.config.ts`**。CLI（`db push`）は `DIRECT_URL`（5432セッションプーラ）を使う設定済み。
- **マイグレーションは `prisma db push` を使う**。`prisma migrate dev` はSupabaseがシャドウDB作成を許可せず失敗する。Phase1はdb pushでスキーマ同期。
- スキーマ変更後は `npm run db:push` → `npm run db:generate`。

### Supabase 接続
- `DATABASE_URL`: transaction pooler **6543**（`?pgbouncer=true`）… アプリ実行時。
- `DIRECT_URL`: session pooler **5432** … マイグレーション/db push。

### Auth.js v5（split config パターン）
- `auth.config.ts`: **Edge安全**（middleware用）。prisma/bcryptを置かない。jwt/sessionコールバックでtokenに `uid/role/login_id` を載せる。
- `auth.ts`: Credentialsプロバイダ本体（prisma + bcrypt）。`handlers/auth/signIn/signOut` をエクスポート。
- `middleware.ts`: `auth.config.ts` からNextAuthを作り、未ログインガード + Admin専用ガード。
- セッションの `session.user` は `{ id, login_id, role }`（`types/next-auth.d.ts` で型拡張済み）。
- JWTセッション戦略（アダプタ無し）。

### シェル
- Bashツールは **各コマンドでcwdがリセット**される。必ず `cd "C:/dev/performance-management-app" && ...` を付ける。

---

## 3. 進捗状況

| Step | 内容 | 状態 |
| ---- | ---- | ---- |
| 1 | 環境構築 | ✅ 完了 |
| 2 | DBスキーマ/型/Enum | ✅ 完了（`prisma db push`済み・テーブル作成済み） |
| 3 | 初期データseed | ✅ 完了（採番3件 + admin + user1） |
| 4 | 認証・権限（S00/S01） | ✅ 完了 |
| 5 | 共通UI（C-NAV/レイアウト） | ✅ 完了 |
| 6 | 取引先管理（S40/S41） | ✅ 完了 |
| 7 | メンバー管理（S30/S31/S32） | ✅ 完了 |
| 8 | 売上管理（S20/S21/S22） | ✅ 完了 |
| 9 | ダッシュボード（S10） | ✅ 完了 |
| 10 | テスト・動作確認 | ✅ 完了（Playwright 3件パス / 本番ビルド成功 / tsc成功） |

**Phase1 実装完了。** `middleware.ts` は Next 16 の `proxy.ts` に移行済み。E2Eは `e2e/smoke.spec.ts`（`npm run test:e2e`）。
Phase1任意項目（S23売上集計 / S50-51メンバーラベル / S60ユーザー管理）は未実装。

---

## 4. 作成済みファイル一覧

```
prisma/schema.prisma          全モデル+Enum
prisma/seed.ts                採番3件 + admin
prisma.config.ts              CLIはDIRECT_URL使用
.env                          Supabase URL + AUTH_SECRET（git管理外）
lib/prisma.ts                 Prismaクライアント（PrismaPgアダプタ）
lib/utils.ts                  cn()
lib/format.ts                 formatYen/formatNumber/formatYearMonth/formatDate
lib/date.ts                   normalizeToMonthStart / deriveYearHalfMonth / toYYYYMM 他
lib/sales-key.ts              buildSalesKey()
lib/numbering.ts              nextCode(tx, seqKey)  ※トランザクション内で呼ぶ
lib/enums.ts                  日本語ラベル + select用オプション
lib/auth-helpers.ts           getCurrentUser/requireUser/requireAdmin/isAdmin/getCurrentDbUser
components/ui/{button,input,label,textarea,select,card,table,badge}.tsx
app/globals.css               要件12章カラーを@themeトークン化
app/layout.tsx                （metadataはまだ"Create Next App"のまま→要更新）
auth.config.ts / auth.ts      Auth.js split config
middleware.ts                 未ログイン/Admin専用ガード
types/next-auth.d.ts          セッション型拡張
app/api/auth/[...nextauth]/route.ts
app/login/login-form.tsx      useActionStateでログイン
app/login/actions.ts          loginAction（signIn credentials）
app/auth-actions.ts           signOutAction（ログアウト）
scripts/check-db.ts           接続確認用
```

---

## 5. 画面→ルート対応（この方針で実装する）

認証必須ページは **ルートグループ `app/(app)/`** に置き、共通レイアウト（サイドナビ）を当てる。

| 画面 | ルート | 種別 |
| ---- | ---- | ---- |
| S00 ログイン | `/login` | 済 |
| S10 ダッシュボード | `/dashboard` | (app) |
| S20 売上一覧 | `/sales` | (app) |
| S21 売上登録 | `/sales/new` | (app) |
| S22 売上編集 | `/sales/[id]/edit` | (app) |
| S30 メンバー一覧 | `/members` | (app) |
| S31 メンバー登録/編集 | `/members/new`, `/members/[id]/edit` | (app, Admin) |
| S32 メンバー詳細 | `/members/[id]` | (app) |
| S40 取引先一覧 | `/clients` | (app) |
| S41 取引先登録/編集 | `/clients/new`, `/clients/[id]/edit` | (app, Admin) |

- 遷移で「対象レコードを渡す」→ URLの `[id]` で渡す（Bubbleの"Data to send"相当）。
- S32→S20の「売上を見る」は `/sales?member_id=xxx` でフィルタ。
- 一覧の検索条件はURLの `searchParams` で保持（サーバーコンポーネントで絞り込み）。

## 6. 権限ルール実装方針
- middleware: 未ログイン→`/login`、Admin専用パス（`/members|clients/(new|*/edit)`）にUserが来たら→`/dashboard`。
- 各ページ/サーバーアクションでも `requireUser()` / `requireAdmin()` で二重防御（UI非表示だけに頼らない）。
- User: 閲覧中心。売上編集ボタンは Admin のみ、または `member = linked_member` の自分の売上のみ。売上削除・マスタ登録編集は Admin のみ。

## 7. 実装の要点（要件由来の必須ルール）
- 論理削除: 売上は `is_deleted=true`。一覧/集計は必ず `is_deleted=false`。
- `period_month` は月初1日で保存（`normalizeToMonthStart`）。`year/half/month` は `deriveYearHalfMonth` で自動設定。
- `sales_key = ${member_code}_${client_code}_${YYYYMM}_${status}`（`buildSalesKey`）。
  - S21登録: 同一sales_keyが既存なら**新規作成せず更新（upsert）**。
  - S22編集: 変更後sales_keyが**自分以外**に存在したら重複エラーで中止。
- 採番: `prisma.$transaction` 内で `nextCode(tx, "MEMBER"|"CLIENT")` を呼び、同一txでエンティティ作成。
- 金額は `Decimal`。表示は `formatYen`。サーバーからクライアントに渡す時は `.toString()`/`Number()` で変換。
- バリデーションはzodでサーバー側にも必ず入れる。エラーメッセージは要件26章の日本語文言を使う。
- 空データ時は「データがありません」、保存中は二重送信防止（Buttonの`loading`）。

---

# 付録: 要件全文（Phase1 詳細実装指示）

> 以下は発注者から受領した要件の要約全文。実装の一次情報。

（要件0〜33章。詳細は元依頼を参照。主要点は本文4〜7章に反映済み。以下に画面仕様の要点を再掲）

## 画面仕様の要点

### S10 ダッシュボード
- 対象月選択（初期=当月1日）。KPI（すべて `is_deleted=false` かつ `period_month=対象月`）:
  当月実績(status=Actual合計) / 当月見込み(Forecast合計) / プロパー(employment_type=Proper合計) / 外注(Outsource合計)。
- 導線ボタン: 売上一覧/売上登録/メンバー一覧/取引先一覧。

### S20 売上一覧
- 検索: 期間タイプ(month/half/year)・対象月・年・半期・予実(all/Actual/Forecast)・雇用区分(all/Proper/Outsource)・メンバー・取引先・キーワード。
- 期間: month→period_month一致 / half→year&half / year→year。
- キーワード: member_code/member.name/client_code/client.company_name。
- 一覧列: 対象月/メンバーコード/メンバー名/雇用区分/取引先コード/取引先名/金額/予実/メモ/sales_key/編集。
- URLに`member_id`があればメンバー絞り込み。編集ボタンはAdmin（Userは自分の売上のみ）。

### S21 売上登録
- 入力: メンバー/取引先/対象月/金額/予実/メモ。sales_key表示(read-only)。
- 対象月は月初正規化→year/half/month算出。sales_key生成→既存(is_deleted=false)があれば更新、なければ新規。
- バリデーション: member/client/status/対象月/amount必須, amount>=0。文言は要件26章。

### S22 売上編集
- `/sales/[id]/edit`。編集可: member/client/period_month/status/amount/memo。sales_keyはread-only（再生成）。
- 変更後sales_keyが自分以外(is_deleted=false, id!=自分)に存在→「同一条件の売上が既に存在します（重複）」で中止。
- 削除ボタン=論理削除(is_deleted=true, updated_by)。Adminのみ表示。

### S30 メンバー一覧
- 検索: キーワード/雇用区分/有効無効(active_only初期)。keyword `M-`始まり→member_code、他→name。
- 列: member_code/氏名/年齢/性別/雇用区分/linked_user/有効/詳細/編集。登録・編集ボタンはAdminのみ。詳細は全員。

### S31 メンバー登録・編集（Admin専用）
- new/edit。member_codeはread-only（新規は保存時に採番M-000001）。
- 入力: 氏名(必須)/年齢(>=0)/性別/雇用区分(必須)/linked_user/is_active。
- linked_user重複チェック（他Memberが同じlinked_userを使用→エラー、DBでも@unique）。
- 無効化(編集時のみ): is_active=false。

### S32 メンバー詳細
- 表示: member_code/氏名/年齢/性別/雇用区分/linked_user/is_active。
- ボタン: 一覧に戻る/編集(Adminのみ)/売上を見る(`/sales?member_id=`)。

### S40 取引先一覧
- 検索: キーワード/有効無効。keyword `C-`始まり→client_code、他→company_name。client_code昇順。
- 列: client_code/会社名/所在地/請求担当者/請求担当者メール/有効/編集。登録・編集はAdminのみ。

### S41 取引先登録・編集（Admin専用）
- new/edit。client_codeはread-only（新規は採番C-000001）。
- 入力: 会社名(必須)/所在地/請求担当者/請求担当者メール(入力時はメール形式チェック)/is_active。
- 無効化(編集時のみ): is_active=false。

## エラーメッセージ（要件26章）
```
IDとパスワードを入力してください / IDまたはパスワードが違います / 必須項目を入力してください /
売上金額は0以上で入力してください / 入力内容を確認してください / 同一条件の売上が既に存在します（重複）/
会社名は必須です / メールアドレスの形式が正しくありません / 年齢は0以上で入力してください /
このユーザーは既に他のメンバーに紐付いています / 権限がありません
```
