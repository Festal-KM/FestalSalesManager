// 給与体系（全社共通の説明）。内容はこのファイルを編集して差し替えてください。
// メンバー個別の金額ではなく、全員に同じ説明を表示します。

export function SalaryInfo() {
  return (
    <div className="space-y-4 text-sm text-gray-800">
      <p className="text-muted-fg">
        ※ 以下は給与体系の説明テンプレートです。実際の規定に合わせて内容を編集してください。
      </p>

      <div className="rounded-md border border-gray-200 p-4">
        <div className="mb-2 font-semibold text-brand-dark">基本構成</div>
        <ul className="list-disc space-y-1 pl-5">
          <li>月給 ＝ 基本給 ＋ 歩合給 ＋ 各種手当</li>
          <li>歩合給 ＝ 売上実績 × 歩合率（区分・等級により変動）</li>
          <li>賞与 ＝ 半期（上期・下期）の実績に応じて支給</li>
        </ul>
      </div>

      <div className="rounded-md border border-gray-200 p-4">
        <div className="mb-2 font-semibold text-brand-dark">歩合率の目安（例）</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">区分</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">対象</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">歩合率</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2">プロパー</td>
                <td className="px-3 py-2">自社売上</td>
                <td className="px-3 py-2 text-right">◯◯%</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2">外注</td>
                <td className="px-3 py-2">売上 − 仕入</td>
                <td className="px-3 py-2 text-right">◯◯%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-md border border-gray-200 p-4">
        <div className="mb-2 font-semibold text-brand-dark">手当・控除</div>
        <ul className="list-disc space-y-1 pl-5">
          <li>交通費・立替経費は別途精算（売上には計上しません）</li>
          <li>各種手当（役職手当・資格手当 等）は規定に準じて支給</li>
        </ul>
      </div>
    </div>
  );
}
