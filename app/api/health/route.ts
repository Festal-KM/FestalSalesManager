// Railway のヘルスチェック用。proxy.ts の matcher は /api を除外しているため認証不要。
// DB 到達性はあえて見ない（DB の瞬断でアプリごと再起動ループに入るのを避ける）。
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true });
}
