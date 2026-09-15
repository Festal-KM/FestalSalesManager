# Railway 一本化 — 設計レビュー

対象: Festal Sales Manager (performance-management-app)
現構成: Supabase PostgreSQL (Tokyo) + Vercel
目標構成: Railway 単一プロジェクト（アプリ + DB）

> **前提: 既存データの移行は対象外**（2026-09-14 決定）。
> Railway 側は**空の DB を新規構築**し、`prisma migrate deploy` + `npm run db:seed` で初期化する。
> これにより **dump/restore・業務停止・件数照合・ロールバック計画が丸ごと不要**になり、
> 移行は「新規構築して向き先を変える」だけの作業になった。

---

## 0. 結論

**移行可能。アプリケーションコードの変更は実質 1 ファイル（`lib/prisma.ts`）だけ。**

理由は、このアプリが Supabase / Vercel の固有機能をほぼ使っていないため。
ただし **インフラ設定と運用設計には、対応しないと壊れる箇所が 4 つ**ある（2 章）。

さらに、移行を機に **`prisma db push` 運用を卒業してマイグレーション履歴を持てる**ようになる。
これは副産物ではなく、**本番運用の安全性という観点では移行の最大のメリット**。

---

## 1. 現状依存の実測結果

コード全体を走査した結果。推測ではなく実測値。

### Supabase 依存

| 機能 | 使用 | 備考 |
| --- | --- | --- |
| PostgreSQL | ✅ 使用 | **これだけ** |
| Supabase Auth | ❌ 未使用 | Auth.js v5 + Credentials の自前実装 |
| RLS (Row Level Security) | ❌ 未使用 | 権限は `lib/auth-helpers.ts` のアプリ層で実装 |
| Storage | ❌ 未使用 | ファイルアップロード機能なし |
| Realtime / Edge Functions | ❌ 未使用 | — |
| `@supabase/*` パッケージ | ❌ 不使用 | `package.json` に一切なし |
| Postgres 拡張 / 非標準型 | ❌ 未使用 | `@db.Decimal` `@db.Date` のみ = 標準 SQL |

→ **Supabase 依存 = 接続文字列のみ。**

### Vercel 依存

| 項目 | 状態 |
| --- | --- |
| `vercel.json` | 存在しない |
| `@vercel/*` パッケージ | 不使用 |
| `export const runtime = "edge"` | 宣言ゼロ |
| `process.env.VERCEL*` 参照 | ゼロ |
| `next/image`（Vercel 画像最適化） | **使用箇所ゼロ**（ロゴは `<img>` / CSS） |
| ISR / On-demand Revalidation | 未使用（全ページ動的・認証必須） |
| Vercel Cron | 未使用 |

→ **Vercel 依存 = ゼロ。** ロックインなし。

---

## 2. 対応しないと壊れる箇所（必須）

### 2-1.【推奨】`lib/prisma.ts` の SSL ハードコード

> **訂正（実機検証済み）**: 当初この項目を「対応しないと接続できない最重要項目」とし、
> 理由を「Railway の private network は TLS を張らないため」と記載していたが、**これは誤り**。
> 実機で確認した事実は次のとおり:
>
> - Railway の Postgres テンプレートのイメージは **`ghcr.io/railwayapp-templates/postgres-ssl:18`**
>   で、`SSL_CERT_DAYS` 変数も存在する。つまり**サーバー側は TLS に対応している**（自己署名証明書）
> - 一方、注入される内部 URL は `postgresql://...@postgres.railway.internal:5432/railway` で
>   **`sslmode` を含まない**。node-postgres は `sslmode` 未指定時に TLS を使わないため、平文接続になる
>
> **追加検証で確定（2026-09-15）: 元の `ssl:{rejectUnauthorized:false}` でも接続できる。**
> `prisma/seed.ts` は同じハードコードを持ったまま移行作業中ずっと残っており、
> `railway ssh --service web -- npm run db:seed` で
> `postgres.railway.internal` への接続に**成功していた**。
> つまりサーバーの自己署名証明書を受理する形で TLS 接続が成立する。
>
> よって本項目は**接続可否の問題ではない**。「必須」ではなく
> **移植性のための設計是正**として扱うこと。

```ts
// 現状 — lib/prisma.ts
const adapter = new PrismaPg({
  connectionString,
  ssl: { rejectUnauthorized: false },   // ← Supabase pooler 前提でハードコード
});
```

問題は接続可否ではなく、**接続先ホスティングの都合がアプリコードに固定されている**こと。
この形では Railway / Supabase / ローカルを env だけで切り替えられない。

**推奨する直し方 — `ssl` オプションを消し、接続文字列の `sslmode` に判断を委ねる:**

```ts
// 変更後 — lib/prisma.ts
const adapter = new PrismaPg({ connectionString });
// SSL は DATABASE_URL の ?sslmode= で制御する
//   Railway 内部接続  : sslmode 指定なし（同一プライベート網）
//   Railway 外部接続  : ?sslmode=require
//   Supabase（併用期）: ?sslmode=no-verify   ← 現状の rejectUnauthorized:false と等価
```

`node-postgres` は接続文字列の `sslmode`（`disable` / `require` / `no-verify` / `verify-full`）を解釈する。
**環境ごとの分岐をコードから env に追い出せる**ので、移行期間中に Supabase と Railway を
切り替えながら検証できる。これは「Railway 対応」ではなく **設計の是正**
（接続先の都合がアプリコードに漏れていた）。

### 2-2. Auth.js v5 のホスト検出

Vercel では `VERCEL_URL` を Auth.js が自動検出するが、**Railway では検出されない**。
リバースプロキシ配下でホスト名判定に失敗し、コールバック URL がずれてログインできなくなる。

```
AUTH_TRUST_HOST=true            # 必須。プロキシ配下でのホスト信頼
AUTH_URL=https://<本番ドメイン>   # 必須
```

> **`AUTH_SECRET` は新規生成してよい。**
> 通常なら「値を変えると発行済み JWT が無効になり全ユーザーが強制ログアウトされる」ため
> 現行値の持ち込みが必須だが、**今回はデータ移行しないためユーザーが seed で作り直される**。
> 旧 JWT は存在しないユーザー ID を指すことになり、いずれにせよ無効。
> むしろ**この機会に新しい値へローテーションする方が望ましい**。
>
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
> ```

### 2-3. マイグレーションの実行場所

**Railway の private network はランタイムのみ有効で、ビルド時には使えない。**
`prisma migrate deploy` をビルドコマンドに入れると `postgres.railway.internal` を
解決できずに失敗する。同じ理由で **`railway run npx prisma migrate deploy` も失敗する**
（`railway run` は環境変数だけを注入してローカルで実行するため、内部ホスト名を解決できない）。

> ⚠️ **訂正（実機検証済み）**: 当初ここに `railway.json` の `preDeployCommand` を使う設計を
> 記載していたが、**CLI（`railway up`）によるディレクトリアップロードでは `railway.json` が
> 適用されない**ことを確認した。
>
> 根拠 — Railway が返すデプロイの `serviceManifest`（実際に適用された設定）:
>
> ```
> builder          = "RAILPACK"   ← railway.json は "NIXPACKS" を指定
> healthcheckPath  = null         ← "/api/health" を指定
> preDeployCommand = null         ← コマンドを指定
> startCommand     = null         ← "npm run start" を指定
> ```
>
> デプロイの `meta.propertyFileMapping` には指定キーが載るが、これは**ファイルを解析した
> 記録であって適用の証拠ではない**。初回デプロイ・再デプロイ・新規アップロードの
> 3 パターンすべてで適用されなかった。
> `railway.json` が効くのは GitHub 連携デプロイの場合と考えられる（未検証）。

**採用した方式 — `package.json` の `start` に含める:**

```json
"start": "prisma migrate deploy && next start"
```

ビルダーが自動検出する起動コマンドなので、**Railway 側の設定適用の有無に左右されない**。

- `migrate deploy` は冪等。未適用が無ければ即座に終了する
- 失敗するとコンテナが起動しない = **誤ったスキーマのまま配信されない**（安全側に倒れる）
- Prisma がアドバイザリロックを取るため、複数レプリカの同時起動でも競合しない
- `prisma` は `devDependencies` ではなく `dependencies` にあるため本番コンテナでも利用可能

**検証済みの実行ログ:**

```
> prisma migrate deploy && next start
Datasource "db": PostgreSQL database "railway" at "postgres.railway.internal:5432"
Applying migration `00000000000000_init`
The following migration(s) have been applied:
  └─ 00000000000000_init/migration.sql
▲ Next.js 16.2.10  ✓ Ready
```

`railway.json` は GitHub 連携に切り替えた場合に備えて残すが、
**現状の CLI デプロイでは無効**であることを前提に運用すること。
`preDeployCommand` は二重実行を避けるため削除済み。

`postinstall: prisma generate` は既にあるため Prisma Client の生成はビルド時に自動で走る
（`app/generated/prisma` は gitignore 対象だが、`npm ci` → `postinstall` → `next build`
の順に実行されるので問題なし）。

### 2-4. ヘルスチェック用エンドポイントが無い

`proxy.ts` が `/login` 以外の全パスを未ログインでリダイレクトするため、
Railway のヘルスチェックが認証リダイレクトに阻まれる。

matcher は `api` を除外しているので、**`app/api/health/route.ts` を新設**するのが素直:

```ts
// app/api/health/route.ts
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true });
}
```

> DB 接続まで見に行くヘルスチェックにすると、DB の瞬断でアプリごと再起動ループに入る。
> **ヘルスチェックはプロセスの生存確認に留める**（上記のまま）ことを推奨。

---

## 3. 移行を機にやるべき設計改善

### 3-1.【推奨】`db push` → `prisma migrate` へ移行

現行 `docs/HANDOFF.md` の記述:

> マイグレーションは `prisma db push` を使う。`prisma migrate dev` は
> **Supabase がシャドウ DB 作成を許可せず失敗する**。

**これは Supabase の制約であって、Railway では解消する。**
Railway Postgres は superuser 権限があるため、シャドウ DB の作成が可能。

現状の `db push` 運用のリスク:

- スキーマ変更履歴が残らない → **いつ何を変えたか追跡不能**
- 差分適用がツールの推測任せ → **列リネームがデータ消失を伴う drop + add になり得る**
- ロールバック手段がない
- 本番 / 開発でスキーマが乖離しても検知できない

既存 DB からベースラインを切る手順:

```bash
mkdir -p prisma/migrations/00000000000000_init

# Prisma 7 では --to-schema-datamodel は廃止。--to-schema を使う。
npx prisma migrate diff \
  --from-empty --to-schema prisma/schema.prisma \
  --script > prisma/migrations/00000000000000_init/migration.sql

```

> **✅ 生成済み**（251行 / 全 Enum・テーブル・インデックス・外部キーを含む）。
> `prisma/migrations/` は git 管理下に入れること（`.gitignore` の除外対象外であることを確認済み）。

**空の Railway DB に対しては `migrate deploy` がこの SQL をそのまま適用するだけ**なので、
`migrate resolve --applied` によるベースライン宣言は**不要**。
（`resolve --applied` が要るのは、既にスキーマが存在する DB を後から migrate 管理下に置く場合。
 今回はデータ移行しないため該当しない。）

以降は `prisma migrate dev`（開発）/ `prisma migrate deploy`（本番・preDeploy）。
**`prisma/migrations/` は git 管理下に入れる。**

### 3-2. `DIRECT_URL` の廃止

Supabase では pooler の都合で 2 系統必要だった:

| | Supabase | Railway |
| --- | --- | --- |
| アプリ実行時 | `DATABASE_URL` = 6543 (transaction pooler / pgbouncer) | `DATABASE_URL` = internal 5432 |
| CLI (`db push` / `migrate`) | `DIRECT_URL` = 5432 (session pooler) | **同上（1 本でよい）** |

`prisma.config.ts` は `DIRECT_URL ?? DATABASE_URL` のフォールバックなので、
**`DIRECT_URL` を未設定にするだけで動く。コード変更は不要。**
移行完了後、混乱の元なので設定・ドキュメントから削除する。

> pgbouncer 経由が無くなることで、`prisma.$transaction` を使う箇所
> （`nextCode()` の採番処理など）が **prepared statement の制約から解放される**のも地味に効く。

### 3-3. `auth.config.ts` / `auth.ts` の分割は**維持する**

Railway では `proxy.ts` が Node ランタイムで動くため、
「Edge 安全のため Prisma / bcrypt を分離する」という制約自体は不要になる。

**が、統合しないことを推奨する。**

- 統合して得られる利益はファイル数 −1 のみ
- 認証の中枢を移行と同時に触るのはリスクに見合わない
- 将来 Edge に戻す / CDN 前段に出す選択肢を捨てることになる

**移行では触らない。**

---

## 4. トレードオフ

### 4-1. レイテンシ —「悪化」ではなく「構造が変わる」

Railway に日本リージョンはなく、最寄りは **Singapore**。
実機で確認した利用可能リージョンは以下の 4 つ（`railway scale` に不正な値を渡すと一覧が出る）:

```
eu-west          EU West (Amsterdam, Netherlands)
us-west          US West (California, USA)
us-east          US East (Virginia, USA)
southeast-asia   Southeast Asia (Singapore, Singapore)   ← 採用
```

> ⚠️ **リージョン識別子の落とし穴（実機で踏んだ）**
> サービス作成直後の既定リージョンは内部的に **`sfo`** というキーで保持されるが、
> CLI が受け付ける識別子は **`us-west`**。両者は**別リージョンとして扱われる**。
>
> ```bash
> # ❌ sfo が残り、レプリカが 2 つになる（DB でこれをやると危険）
> railway scale --service web southeast-asia=1 us-west=0
> #    → regions: Southeast Asia (1) · sfo (1) · US West (0)   … 2 replicas
>
> # ✅ 内部キーである sfo を明示的に 0 にする
> railway scale --service web southeast-asia=1 sfo=0
> #    → regions: Southeast Asia (1) · sfo (0)                 … 1 replica
> ```
>
> 移動後は必ず `railway status --json` の `multiRegionConfig` でレプリカ数を確認すること。
> **アプリと DB は必ず同一リージョンに揃える**（別々だと private network が
> リージョン跨ぎになり、下表の「≒ 0ms」が成立しなくなる）。

| 経路 | 現状 (Vercel + Supabase Tokyo) | 移行後 (Railway Singapore) |
| --- | --- | --- |
| ユーザー(日本) ⇄ アプリ | 数 ms〜（Vercel エッジ） | **+60〜80ms** ⬇️ |
| アプリ ⇄ DB | Vercel 実行リージョン次第で**毎クエリ**往復 | **同一プライベート網 ≒ 0ms** ⬆️ |

**このアプリでは後者の改善が効く可能性が高い。** 理由:

- 全ページ SSR / 動的レンダリング（キャッシュされない）
- ダッシュボード・一覧はページあたり**複数クエリ**を発行する
- クエリ N 本分の DB 往復が消え、**ユーザー往復 1 回分の増加**に置き換わる

→ N が 3 以上なら実質改善。**ただし体感は要実測**
（移行後にダッシュボードの TTFB を計測して判断する）。

### 4-2. Preview 環境の機能差

Vercel の Preview Deployment（PR ごとに自動 URL）は開発体験として強い。
Railway にも PR Environment があるが、**PR ごとに Postgres インスタンスも複製される**ため、
使い方を決めないとコストが膨らむ。

→ Phase1 完了済みの社内ツールという性質上、**production + staging の 2 環境固定**を推奨。
PR Environment は有効化しない。

### 4-3. コスト（概算・要検証）

| | 現状 | 移行後 |
| --- | --- | --- |
| ホスティング | Vercel Hobby $0 / Pro $20+ | Railway 従量 |
| DB | Supabase Free $0 / Pro $25 | Railway 従量 |
| 合計 | 2 サービス・2 請求 | **1 サービス・1 請求** |

この規模（社内ツール / 常時 1 インスタンス + 小規模 Postgres）なら **月 $10〜20 程度**の見込み。
ただし Railway は**使用量課金でスリープしない**ため、
「アクセスが無くても課金され続ける」点が Vercel / Supabase の無料枠とは異なる。
**実際の請求は初月で必ず確認すること。**

### 4-4. 失うもの

- **Supabase の管理 UI**（Table Editor / SQL Editor / Auth ダッシュボード）
  → Railway にも DB 閲覧機能はあるが機能は劣る。`npm run db:studio`（Prisma Studio）で代替。
- **Supabase の自動バックアップ + PITR**
  → 次章。**移行前に必ず設計すること。**

---

## 5.【要設計】バックアップ

**移行で最も見落とされやすく、最もダメージが大きい箇所。**

現状 Supabase は日次バックアップが自動で付いている（Free: 7 日 / Pro: 30 日 + PITR）。
`.gitignore` に `backups/`（「ローカルDBバックアップ・機微情報を含む・コミット禁止」）がある点から、
手動バックアップの運用も一部存在していると見られる。

Railway 移行時にやること:

1. Railway Postgres のバックアップ設定を**明示的に確認・有効化**（デフォルト任せにしない）
2. **リストア手順を一度実際に試す**（バックアップは復元できて初めてバックアップ）
3. Railway 外への退避を用意する
   - Railway Cron で `pg_dump` → 外部ストレージ（S3 / R2 / Google Drive）
   - **同一ベンダー内だけに置くと「一箇所管理」が単一障害点になる**

> 一箇所に集約する判断のトレードオフがここに出る。運用の集約はメリットだが、
> **バックアップだけは意図的に別ベンダーへ逃がす**ことを強く推奨。

---

## 6. 環境変数 対応表

| 変数 | 現状 (Vercel) | Railway | 備考 |
| --- | --- | --- | --- |
| `DATABASE_URL` | Supabase 6543 `?pgbouncer=true` | `${{Postgres.DATABASE_URL}}` | Railway の変数参照で自動注入 |
| `DIRECT_URL` | Supabase 5432 | **削除** | 不要になる（3-2） |
| `AUTH_SECRET` | 既存値 | **新規生成でよい** | データ移行しないため（2-2） |
| `AUTH_URL` | Vercel が自動 | `https://<本番ドメイン>` | 明示必須 |
| `AUTH_TRUST_HOST` | 不要 | **`true`（新規・必須）** | 2-2 |
| `APP_BASE_URL` | 本番 URL | 本番 URL | メールリンク生成用 |
| `RESEND_API_KEY` | 既存値 | 既存値 | 外部サービス・変更なし |
| `RESEND_FROM` | 既存値 | 既存値 | 変更なし |
| `PORT` | — | Railway が自動注入 | `next start` が自動で読む |

> ⚠️ **`DATABASE_PUBLIC_URL` は自動では作られない（実機で確認）。**
> Railway は Postgres に TCP プロキシを既定で用意しないため、
> `postgres.railway.internal` は**同一プロジェクト内からしか到達できない**。
> 結果として:
>
> - `railway run <コマンド>` は**ローカル実行**なので DB に届かない（`migrate` / `seed` に使えない）
> - DB を触る操作は `railway ssh --service web -- <コマンド>` でコンテナ内から実行する
> - **ローカル開発機から Railway の DB を使いたい場合**は、Railway のダッシュボードで
>   Postgres に TCP プロキシを追加し、払い出された公開ホストを `.env` に設定する。
>   ローカル用に別途 Postgres（Docker 等）を立てる方が、本番データを誤操作する危険が無く安全。

---

## 7. 移行手順

データ移行が無いため、**新規構築 → 向き先変更**の 3 フェーズで完了する。
業務停止は発生しない。

### Phase A. コード準備 ✅ 完了（2026-09-14）

- A1. `lib/prisma.ts` の ssl ハードコードを除去（2-1）
- A2. `app/api/health/route.ts` を追加（2-4）
- A3. `railway.json` を追加（2-3）
- A4. ベースラインマイグレーションを生成（3-1）

検証済み: `tsc --noEmit` = 0 / `next build` = 0 /
`GET /api/health` = 200（認証を通さず到達）/ `GET /dashboard` = 302 → `/login`（認証ガード健在）。

> ⚠️ **移行完了までに Vercel へデプロイする予定があるなら、先に Vercel 側の
> `DATABASE_URL` 末尾へ `&sslmode=no-verify` を追記しておくこと。**
> A1 の変更が入ったコードを Supabase 向けにデプロイすると、これが無い場合に接続できない。
> 環境変数 1 行の追記のみでコード変更を伴わないため、現行本番へのリスクは無い。
> （移行完了まで Vercel に一切デプロイしないなら不要）

### Phase B. Railway 構築（本番影響なし）

- B1. `railway login`（**ブラウザ認証。手動実行が必要**）
- B2. プロジェクト作成 + Postgres 追加（リージョン: Singapore）

  ```bash
  railway init
  railway add --database postgres
  ```

- B3. 環境変数を設定（6 章）。`DATABASE_URL` は Railway の変数参照で Postgres から注入する

  ```bash
  # アプリのサービスに対して設定する（--service でサービス名を指定）
  railway variables --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}'
  railway variables --set "AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
  railway variables --set 'AUTH_TRUST_HOST=true'
  railway variables --set 'AUTH_URL=https://<Railway が払い出すドメイン>'
  railway variables --set 'APP_BASE_URL=https://<同上>'
  # RESEND_API_KEY / RESEND_FROM は必要に応じて
  ```

  `${{Postgres.DATABASE_URL}}` は Railway の変数参照構文。
  シェルに展開されないよう**シングルクォート**で囲むこと。
  `DIRECT_URL` は設定しない（3-2）。

- B4. リージョンを Singapore に寄せる（**データが空のうちに実施するのが最も安全**）

  ```bash
  railway scale --service web      southeast-asia=1 sfo=0
  railway scale --service Postgres southeast-asia=1 sfo=0
  ```

  `us-west=0` ではなく **`sfo=0`** である点に注意（4-1 の落とし穴）。

- B5. デプロイ

  ```bash
  railway up --service web
  ```

  **マイグレーションは起動コマンドに含まれるため自動適用される**（2-3）。
  `railway run npx prisma migrate deploy` は内部ホスト名を解決できないため使えない。

- B6. 初期データ投入 — 内部ネットワーク経由でコンテナ内から実行する

  ```bash
  railway ssh --service web -- npm run db:seed
  ```

  `prisma/seed.ts` は全て `upsert` なので再実行しても安全。
  マイグレーション状態の確認も同じ経路で行う:
  `railway ssh --service web -- npx prisma migrate status`

- B7. 疎通確認

#### Phase B 実施結果 ✅ 完了（2026-09-14）

| 項目 | 値 |
| --- | --- |
| プロジェクト | `festal-sales-manager` (`547e334b-58c5-4d25-b58c-65393add8c0b`) |
| サービス | `web`（アプリ）/ `Postgres`（DB · Postgres 18 · volume 付き） |
| リージョン | 両サービスとも **Southeast Asia · 1 レプリカ** |
| URL | https://web-production-fd10e.up.railway.app |
| ビルダー | Railpack（Railway の新既定。Nixpacks 指定は効かない） |

検証結果（すべて実機・公開 URL 経由）:

```
GET  /api/health                      -> 200  {"ok":true}
GET  /login                           -> 200
GET  /dashboard         （未認証）      -> 302 → /login
POST /api/auth/callback/credentials   -> 302 → /          （Admin アカウント）
GET  /api/auth/session                -> {"user":{"login_id":"admin","role":"Admin"}}
GET  /dashboard         （認証済み）    -> 200              ← Prisma クエリ成功を意味する
POST （誤ったパスワード）                -> 302 → /login?error=CredentialsSignin
                                          session = null   ← 認証は正しく拒否される
prisma migrate status                 -> Database schema is up to date!
```

未実施: **Playwright E2E**。`playwright.config.ts` の `baseURL` が
`http://localhost:3000` 固定で、`webServer` に `npm run dev` が設定されているため、
Railway 環境に向けるには設定の環境変数化が必要（別途対応）。
上記の curl による確認で、認証・DB 読み取り・認可の主要経路は押さえている。

> 🔐 **対応済み（2026-09-15）— seed の資格情報を環境変数化した。**
> 当初 `admin` / `user1` の初期パスワードが `prisma/seed.ts` にハードコードされ、
> 公開リポジトリのドキュメントにも平文で記載されていた（URL を知る誰でも Admin
> としてログインできる状態だった）。対応内容は 9 章を参照。

### Phase C. 切替・後始末

- C1. 独自ドメインを Railway に設定 → `AUTH_URL` / `APP_BASE_URL` を本番ドメインへ
- C2. ログイン → 各画面 → 売上登録まで実地確認
- C3. パスワード再設定メールの疎通確認（リンクのドメインが正しいか）
- C4. **バックアップ運用を稼働（5 章）— 運用開始前に必ず**
- C5. `docs/HANDOFF.md` を更新（`db push` → `migrate`、`DIRECT_URL` 廃止を反映）
- C6. Vercel / Supabase を解約

**ロールバックについて:** データ移行が無いため、Railway 稼働後に Supabase へ戻す意味は無い
（両者のデータは別物になる）。C6 の解約前に B6〜C3 の確認を済ませることが実質的な保険となる。

---

## 8. 未決事項（判断が必要）

1. **リージョン** — Singapore で確定してよいか（レイテンシを実測してから決めるか）
2. **バックアップの外部退避先** — S3 / R2 / Google Drive のどれにするか
3. **staging 環境を作るか** — 作ると DB がもう 1 インスタンス分課金される
4. **独自ドメイン** — 現在の本番ドメインをそのまま移すか、Railway 提供ドメインで一旦運用するか

> 移行タイミングの調整は不要になった（データ移行が無く業務停止が発生しないため）。

---

## 9. 初期資格情報の環境変数化（2026-09-15 対応済み）

### 何が問題だったか

`prisma/seed.ts` に初期パスワードが**ハードコード**されており、
さらに `docs/HANDOFF.md` と `docs/成績管理ツール_Phase1_報告書.md` にも**平文で記載**されていた。
**このリポジトリは公開されている**ため、デプロイ URL を知る第三者が
Admin としてログインできる状態だった。

### 対応内容

| 対象 | 変更 |
| --- | --- |
| `prisma/seed.ts` | パスワードを環境変数化。未設定なら**理由を示して停止**（既定値を持たせない） |
| `e2e/smoke.spec.ts` | 同上。`E2E_ADMIN_PASSWORD` / `E2E_USER_PASSWORD` から取得 |
| `docs/HANDOFF.md` | 平文の資格情報を削除 |
| `docs/成績管理ツール_Phase1_報告書.md` | 同上 |
| Railway | 強度のあるパスワードを生成して投入し、既存 2 アカウントをローテーション |

### seed が読む環境変数

| 変数 | 必須 | 既定 | 説明 |
| --- | --- | --- | --- |
| `SEED_ADMIN_PASSWORD` | ✅ | なし | 未設定なら seed は停止する |
| `SEED_ADMIN_LOGIN_ID` | | `admin` | ログインID（秘密ではない） |
| `SEED_USER_PASSWORD` | | なし | **未設定なら一般ユーザーを作成しない**（本番では不要なため） |
| `SEED_USER_LOGIN_ID` | | `user1` | |
| `SEED_FORCE_PASSWORD_RESET` | | `false` | `true` のときだけ既存ユーザーのパスワードを上書きする |

### 設計判断

**1. 既定パスワードを持たせない**
未設定時に弱い既定値へフォールバックすると、設定漏れが**無言で脆弱な状態**を作る。
そのため `requireEnv()` で停止させ、生成コマンドを添えたエラーを出す。

**2. パスワード上書きはオプトイン**
`upsert` の `update` に無条件で `login_pw` を含めると、
アプリ側で変更したパスワードが seed 再実行のたびに巻き戻る。
`SEED_FORCE_PASSWORD_RESET=true` のときだけ更新する。

**3. 一般ユーザーは作らないのが既定**
`user1` は動作確認用であり本番に不要。`SEED_USER_PASSWORD` 未設定なら作成をスキップする。

> ⚠️ **今回のような移行では、既存の弱いパスワードを持つアカウントのローテーションを忘れないこと。**
> seed のコードを直しただけでは、**既に作成済みのアカウントは古いパスワードのまま**残る。
> 今回は `user1` がこれに該当したため、`SEED_FORCE_PASSWORD_RESET=true` で明示的に更新した。

### パスワードの取り出し方

生成値は会話ログやドキュメントに残さず、Railway にのみ保持している。
必要なときは次で取得する:

```bash
railway variables --service web --kv | grep '^SEED_ADMIN_PASSWORD='
```

### 残課題

- `SEED_FORCE_PASSWORD_RESET` はローテーション後に削除すること（付けっぱなしにしない）
- 運用開始時に、Admin が画面からパスワードを変更するのが望ましい
- `user1` を本番で残す必要が無いなら削除を検討する
