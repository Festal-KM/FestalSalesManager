# 社内成績管理ツール Phase1 ― 要件・設計・実装報告書

- 作成日: 2026-07-06
- 対象: Phase1（個人別売上・成績管理のExcel脱却）
- ステータス: **実装完了**（型チェック / E2Eテスト / 本番ビルド すべて通過）

---

## 1. 概要

### 1-1. 背景
社内の個人別売上・成績を Excel で管理しているが、以下の課題があった。

- 関数投入・フォーマット作成など単純作業の工数がかかる
- レコード単位で閲覧・編集権限を制御できない
- 全員が同じ Excel を閲覧・編集できてしまう
- 登録・編集・削除・集計の履歴管理がしづらい
- メンバー別・取引先別・月/半期/年度別の集計がしづらい
- 将来的なインセンティブ計算・グレード管理に拡張しづらい

### 1-2. 目的（Phase1で実現したこと）
- 売上の登録・一覧・検索・集計の効率化
- Admin / User による権限制御（レコード単位の編集・削除制御）
- メンバー別 / 取引先別 / プロパー・外注別 / 実績・見込み別の売上確認
- 論理削除による集計崩れ防止
- 将来のインセンティブ自動計算への拡張余地の確保

---

## 2. 対象ユーザーと権限

### 2-1. Admin（主に事業部長）
ログイン / ダッシュボード / 売上の一覧・登録・編集・論理削除 / メンバーの一覧・詳細・登録・編集・無効化 / 取引先の一覧・登録・編集・無効化 / 全メンバー・プロパー外注別・実績見込み別の売上確認。

### 2-2. User（コンサル事業部メンバー）
- できること: ログイン / ダッシュボード / 売上一覧 / 自分（紐づくメンバー）の売上確認 / 取引先一覧 / メンバー詳細
- できないこと: メンバー・取引先の登録/編集/無効化 / 他者売上の編集 / 売上削除 / Admin専用画面への直接URLアクセス

---

## 3. 機能要件（Phase1スコープ）

- **認証**: ログイン / ログアウト / ログイン済み判定 / 未ログインガード / 無効ユーザーのログイン禁止
- **共通UI**: 開閉できる共通サイドナビ / 画面遷移 / 現在画面ハイライト / ログアウト導線
- **取引先管理**: 一覧 / 検索 / 登録 / 編集 / 無効化 / client_code自動採番
- **メンバー管理**: 一覧 / 検索 / 登録 / 編集 / 詳細 / 無効化 / member_code自動採番 / ログインユーザー紐づけ
- **売上管理**: 一覧 / 検索(月・半期・年) / 登録 / 編集 / 論理削除 / sales_key自動生成・重複制御 / 実績見込み・プロパー外注区分
- **ダッシュボード**: 当月の実績・見込み・プロパー・外注の売上サマリ / 主要画面への導線

### 画面一覧

| 画面ID | 画面名 | 対象 | ルート | 状態 |
| --- | --- | --- | --- | --- |
| S00 | ログイン | 全員 | `/login` | 実装 |
| S01 | ログアウト処理 | 全員 | (サイドナビから) | 実装 |
| S10 | ダッシュボード | Admin/User | `/dashboard` | 実装 |
| S20 | 売上一覧 | Admin/User | `/sales` | 実装 |
| S21 | 売上登録 | Admin/User | `/sales/new` | 実装 |
| S22 | 売上編集 | Admin/User | `/sales/[id]/edit` | 実装 |
| S30 | メンバー一覧 | Admin/User | `/members` | 実装 |
| S31 | メンバー登録・編集 | Admin | `/members/new`・`/members/[id]/edit` | 実装 |
| S32 | メンバー詳細 | Admin/User | `/members/[id]` | 実装 |
| S40 | 取引先一覧 | Admin/User | `/clients` | 実装 |
| S41 | 取引先登録・編集 | Admin | `/clients/new`・`/clients/[id]/edit` | 実装 |
| S23 | 売上集計 | Admin/User | ― | 保留（Phase1任意） |
| S50/S51 | メンバーラベル | ― | ― | 保留（Phase1任意） |
| S60 | ユーザー管理 | Admin | ― | 保留（Phase1任意） |

---

## 4. 技術設計

### 4-1. 技術スタック

| レイヤー | 採用技術 | 選定理由 |
| --- | --- | --- |
| フロント/バック | Next.js 16（App Router, TypeScript） | 画面とサーバー処理を1プロジェクトで完結。型定義と親和性が高い |
| サーバー処理 | Server Actions / Route Handlers | フォーム送信〜DB更新を型安全に実装 |
| DB | Supabase PostgreSQL（東京リージョン） | クラウドで運用可・Vercelと相性良。連番の重複防止にトランザクション利用 |
| ORM | Prisma 7 | 型安全なDBアクセス・スキーマ管理 |
| 認証 | Auth.js (next-auth v5) Credentials + JWT | ID/PWログイン・is_active制御・パスワードハッシュ化に対応 |
| UI | Tailwind CSS v4 + 自作UIコンポーネント（shadcn/ui相当） | 指定カラーでの業務アプリUIを構築 |
| テスト | Playwright | 主要画面の通しテスト（E2E） |
| デプロイ想定 | Vercel | （Phase1では未実施） |

### 4-2. アーキテクチャの要点
- **画面**: App Router のサーバーコンポーネントで一覧・詳細を描画。フォームは Client Component + Server Action。
- **認証**: `auth.ts`（Credentials＋bcrypt＋Prisma）と、Edgeで動く `auth.config.ts`（proxy用）に分離。セッションはJWT。
- **アクセス制御**: `proxy.ts`（Next.js 16での旧middleware）で未ログイン/Admin専用ガード。各ページ・アクションでも `requireUser` / `requireAdmin` により**サーバー側で二重に**制御。
- **DB接続**: Prisma 7 はドライバアダプタ必須のため `@prisma/adapter-pg` を使用。アプリ実行はSupabaseのトランザクションプーラ(6543)、スキーマ反映はセッションプーラ(5432)。

### 4-3. ディレクトリ構成（抜粋）
```
app/
  login/                 S00 ログイン（page/form/actions）
  auth-actions.ts        ログアウト
  api/auth/[...nextauth] 認証エンドポイント
  (app)/                 認証必須ページ（共通サイドナビ付き）
    layout.tsx           サイドナビ + 未ログインガード
    dashboard/           S10
    sales/               S20/S21/S22（page・new・[id]/edit・sales-form・actions）
    members/             S30/S31/S32（page・new・[id]・[id]/edit・member-form・actions）
    clients/             S40/S41（page・new・[id]/edit・client-form・actions）
components/
  sidebar.tsx            共通サイドナビ（C-NAV）
  page-header.tsx / empty-state.tsx
  ui/                    button/input/label/select/textarea/card/table/badge
lib/
  prisma.ts              Prismaクライアント（pgアダプタ）
  auth-helpers.ts        getCurrentUser/requireUser/requireAdmin ほか
  numbering.ts           採番（トランザクション）
  sales-key.ts           sales_key生成
  date.ts                月初正規化・year/half/month算出
  format.ts / enums.ts   表示整形・日本語ラベル
auth.ts / auth.config.ts / proxy.ts
prisma/
  schema.prisma          スキーマ / seed.ts 初期データ
e2e/smoke.spec.ts        E2Eテスト
```

---

## 5. データ設計

### 5-1. User（ユーザー）
| フィールド | 型 | 必須 | 一意 | 説明 |
| --- | --- | --- | --- | --- |
| role | Role | ● | | Admin / User |
| login_id | string | ● | ● | ログインID |
| login_pw | string | ● | | bcryptハッシュ（平文保存しない） |
| is_active | boolean | ● | | false でログイン不可 |
| linked_member | Member? | | | メンバーとの1:1紐づけ |

### 5-2. Member（メンバー）
| フィールド | 型 | 必須 | 一意 | 説明 |
| --- | --- | --- | --- | --- |
| member_code | string | ● | ● | M-000001形式（自動採番） |
| name | string | ● | | 氏名 |
| age | number? | | | 年齢 |
| gender | Gender? | | | Male/Female/Other/Unknown |
| employment_type | EmploymentType | ● | | Proper / Outsource |
| linked_user | User? | | ●(FK) | ログインユーザー（1ユーザー1メンバー） |
| is_active | boolean | ● | | 退職・非稼働管理 |

### 5-3. Client（取引先）
| フィールド | 型 | 必須 | 一意 | 説明 |
| --- | --- | --- | --- | --- |
| client_code | string | ● | ● | C-000001形式（自動採番） |
| company_name | string | ● | | 会社名 |
| address | string? | | | 所在地 |
| billing_contact_name | string? | | | 請求担当者 |
| billing_contact_email | string? | | | 請求担当者メール |
| is_active | boolean | ● | | 取引停止管理 |

### 5-4. SalesEntry（売上）
| フィールド | 型 | 必須 | 一意 | 説明 |
| --- | --- | --- | --- | --- |
| sales_key | string | ● | ● | 重複防止キー（生成規則は下記） |
| member | Member | ● | | 売上対象者 |
| client | Client | ● | | 取引先 |
| period_month | date | ● | | 月初1日で保存 |
| amount | Decimal(14,2) | ● | | 売上金額（円） |
| status | SalesStatus | ● | | Actual / Forecast |
| memo | string? | | | 補足 |
| year / half / month | number | ● | | period_monthから自動算出 |
| created_by / updated_by | User | | | 登録者 / 更新者 |
| is_deleted | boolean | ● | | 論理削除フラグ |

### 5-5. NumberSequence（採番管理）
| seq_key | prefix | pad_digits | 用途 |
| --- | --- | --- | --- |
| MEMBER | M- | 6 | メンバーID（M-000001） |
| CLIENT | C- | 6 | 取引先ID（C-000001） |
| LABEL | L- | 3 | メンバーラベル（Phase1未使用） |

### 5-6. Enum
- Role: Admin / User
- EmploymentType: Proper / Outsource
- Gender: Male / Female / Other / Unknown
- SalesStatus: Actual / Forecast

### 5-7. 重要な業務ルール
- **sales_key** = `${member_code}_${client_code}_${YYYYMM}_${status}`（例: `M-000001_C-000010_202601_Actual`）
  - S21登録: 同一 sales_key が既存なら**新規作成せず更新（upsert）**
  - S22編集: 変更後 sales_key が**自分以外**に存在すれば重複エラーで中止
- **period_month** は必ず月初1日に正規化して保存。`half` は 1〜6月=1 / 7〜12月=2。
- **論理削除**: 売上削除は `is_deleted=true`。一覧・集計は必ず `is_deleted=false` のみ対象。
- **無効化**: メンバー・取引先は物理削除せず `is_active=false`。
- **採番**: NumberSequence をトランザクション内で +1 して払い出し（連番重複を防止）。member_code / client_code / sales_key は画面から直接編集不可。

---

## 6. 画面設計（要点）

- **S00 ログイン**: login_id / password。未入力・不一致・無効ユーザーはエラー。成功でS10へ。ログイン済みでS00に来たらS10へ。
- **S10 ダッシュボード**: 対象月選択。KPI（当月実績=Actual合計 / 当月見込み=Forecast合計 / プロパー=Proper合計 / 外注=Outsource合計、すべて is_deleted=false）。主要画面への導線。
- **S20 売上一覧**: 期間タイプ(月/半期/年)・予実・雇用区分・メンバー・取引先・キーワードで検索。編集ボタンはAdmin、Userは自分の売上のみ。メンバー詳細からの遷移で該当メンバーに絞り込み。
- **S21 売上登録**: メンバー・取引先・対象月・金額・予実・メモ。sales_keyは自動表示（read-only）。upsert挙動。
- **S22 売上編集**: 各項目編集、sales_key再生成＋重複チェック。削除は論理削除（Adminのみ）。
- **S30 メンバー一覧**: キーワード(氏名/M-コード)・雇用区分・有効無効で検索。登録/編集はAdminのみ、詳細は全員。
- **S31 メンバー登録・編集（Admin専用）**: 氏名必須・雇用区分必須・年齢0以上・linked_user重複チェック。member_codeは自動採番・read-only。
- **S32 メンバー詳細**: 各項目表示。編集(Admin)・売上を見る(該当メンバーで売上一覧へ)。
- **S40 取引先一覧**: キーワード(会社名/C-コード)・有効無効で検索。client_code昇順。登録/編集はAdminのみ。
- **S41 取引先登録・編集（Admin専用）**: 会社名必須・メール形式チェック。client_codeは自動採番・read-only。

---

## 7. 権限・バリデーション・エラーメッセージ

### 7-1. 権限制御
- 未ログイン→S00（proxy）
- Admin専用（S31/S41）へUserが直接URLアクセス→ダッシュボードへ（proxy＋各ページの requireAdmin）
- 売上削除・マスタ登録編集はAdminのみ。Userの売上編集は自分（linked_member）分のみ。
- UI非表示だけでなく、Server Action側でも権限チェック。

### 7-2. バリデーション（サーバー側で実施）
- ログイン: ID/PW必須、不一致エラー、is_active=falseは不可
- Member: name必須 / employment_type必須 / age0以上 / linked_user重複不可
- Client: company_name必須 / メール形式チェック
- SalesEntry: member/client/period_month/amount/status必須、amount0以上、sales_key重複制御

### 7-3. エラーメッセージ（日本語）
```
IDとパスワードを入力してください / IDまたはパスワードが違います / 必須項目を入力してください /
売上金額は0以上で入力してください / 入力内容を確認してください / 同一条件の売上が既に存在します（重複）/
会社名は必須です / メールアドレスの形式が正しくありません / 年齢は0以上で入力してください /
このユーザーは既に他のメンバーに紐付いています / 権限がありません
```

---

## 8. 実装内容（作業報告）

### 8-1. 実施したステップ
1. 環境構築（Next.js 16 プロジェクト確認、Prisma / Auth.js / Tailwind / Playwright 導入）
2. DBスキーマ・型・Enum 定義、Supabaseへ反映
3. 初期データ投入（採番マスタ3件、Adminユーザー、動作確認用Userユーザー）
4. 認証・権限制御（S00/S01、未ログイン/Admin専用ガード）
5. 共通UI（開閉サイドナビ、共通レイアウト、現在画面ハイライト）
6. 取引先管理（S40/S41）
7. メンバー管理（S30/S31/S32）
8. 売上管理（S20/S21/S22、sales_key・upsert・論理削除・多条件検索）
9. ダッシュボード（S10、KPI集計）
10. テスト・動作確認

### 8-2. 検証結果
- **TypeScript 型チェック**: `tsc --noEmit` エラー0
- **E2Eテスト**: Playwright 3件パス
  - 未ログイン時の保護画面アクセス→ログインへリダイレクト
  - Admin通し（取引先→メンバー→売上登録→**upsert更新**→編集→**論理削除**）
  - User権限（マスタ登録ボタン非表示・Admin専用URLは弾かれる）
- **本番ビルド**: `next build` 成功（全ルート生成）

### 8-3. 初期ログイン情報
- 管理者: `admin` / `Admin1234!`
- 一般ユーザー: `user1` / `User1234!`
（パスワードは運用前に変更を推奨）

---

## 9. 環境構築・実行手順

```bash
cd C:\dev\performance-management-app
npm install            # 依存インストール（初回）
npm run db:push        # スキーマをDBへ反映
npm run db:seed        # 初期データ投入
npm run dev            # 開発サーバー（http://localhost:3000）

npm run test:e2e       # Playwright E2E
npm run build          # 本番ビルド確認
npm run db:studio      # データ確認（Prisma Studio）
```
- 接続情報・認証シークレットは `.env`（git管理外）に設定済み。

---

## 10. 技術的判断・仕様調整（依頼書との差分）

いずれも動作確認済み。理由とともに記録する。

1. **認証方式**: 依頼書は「Auth.js + Prisma Adapter」だったが、Prisma Adapter は Credentials（ID/PW）方式と併用できない仕様のため、**Prismaで直接ユーザー照合 + JWTセッション**とした。パスワードは bcrypt でハッシュ化し平文保存しない（要件どおり）。
2. **UIライブラリ**: shadcn/ui のCLIが対話式で自動導入できなかったため、**同等構成のUIコンポーネントを直接実装**（Tailwind v4 + `cn()`ユーティリティ）。見た目・使い勝手はshadcn相当。
3. **スキーマ反映**: SupabaseがマイグレーションのシャドウDB作成を許可しないため、開発では **`prisma db push`** を採用。将来はマイグレーション運用へ移行可能。
4. **Next.js 16対応**: `middleware` 規約が非推奨となったため `proxy.ts` に移行。
5. **開発フォルダ**: OneDrive同期による不具合回避のため、プロジェクトは同期対象外の `C:\dev\performance-management-app` に配置。

---

## 11. 未実装・今後（Phase2候補）

- **Phase1任意項目**: S23 売上集計（月/半期/年 × 個人/取引先/全体）、S50・S51 メンバーラベル、S60 ユーザー管理
- **運用面**: Vercelへのデプロイ（環境変数設定）、パスワードリセット/変更UI、本番用マイグレーション運用
- **将来拡張**: インセンティブ自動計算、グレード・ミッション・評定管理

---

## 12. 既知の注意点（バージョン固有）

- Next.js 16 / Prisma 7 / Tailwind v4 / Auth.js v5 は比較的新しいメジャーバージョンで、従来と作法が異なる点がある。詳細な落とし穴と対処は `docs/HANDOFF.md` に集約している（Prismaのドライバアダプタ必須、Supabaseプーラのポート使い分け、Auth.jsの設定分離 等）。
- 開発DBはSupabase（東京）。E2Eテスト実行時は実DBにデータが作成される点に留意（採番も進む）。
