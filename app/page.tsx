import { redirect } from "next/navigation";

export default function Home() {
  // ルートはダッシュボードへ。未ログインなら middleware が /login へ回す。
  redirect("/dashboard");
}
