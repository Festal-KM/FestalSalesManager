import "server-only";
import { Resend } from "resend";

/** アプリのベースURL（メールのリンク生成に使用） */
export function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

const FROM =
  process.env.RESEND_FROM ?? "Festal Sales Manager <onboarding@resend.dev>";

/**
 * パスワード再設定メールを送る。
 * RESEND_API_KEY 未設定の環境では送信せず、リンクをサーバーログに出力する（開発用フォールバック）。
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      `[mail] RESEND_API_KEY 未設定のためメール送信をスキップしました。\n` +
        `[mail] 宛先: ${to}\n[mail] 再設定リンク: ${resetUrl}`,
    );
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "【Festal Sales Manager】パスワード再設定のご案内",
    html: `
      <div style="font-family:sans-serif;line-height:1.7;color:#1f2937">
        <p>パスワード再設定のリクエストを受け付けました。</p>
        <p>下のボタンから新しいパスワードを設定してください（リンクの有効期限は1時間です）。</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}"
             style="background:#1e50d2;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
            パスワードを再設定する
          </a>
        </p>
        <p style="font-size:12px;color:#6b7280">
          ボタンが押せない場合は次のURLをブラウザに貼り付けてください:<br>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="font-size:12px;color:#6b7280">
          心当たりがない場合はこのメールを破棄してください。パスワードは変更されません。
        </p>
      </div>
    `,
  });

  if (error) {
    // 送信失敗は呼び出し側に伝える（ユーザーには汎用メッセージを表示）
    throw new Error(`メール送信に失敗しました: ${error.message}`);
  }
}
