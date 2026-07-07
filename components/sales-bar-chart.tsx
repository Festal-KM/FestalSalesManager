import { formatYen } from "@/lib/format";

export type BarDatum = { label: string; value: number };

/** 金額を軸ラベル用に丸め表示（0 / 100万 / 2,000万 など） */
function axisLabel(value: number): string {
  if (value === 0) return "0";
  const man = value / 10_000;
  return `${man.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}万`;
}

/**
 * 依存ライブラリなしの月次売上棒グラフ（サーバーコンポーネント可）。
 * 直近12ヶ月などの推移表示に使用する。
 */
export function SalesBarChart({ data }: { data: BarDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  // きりのよい上限に丸める（4分割の目盛り用）
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const niceMax = Math.ceil(max / pow) * pow;
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((r) => niceMax * r);

  return (
    <div className="flex w-full gap-2">
      {/* Y軸ラベル */}
      <div className="flex h-48 shrink-0 flex-col justify-between py-0 text-right text-[10px] text-muted-fg">
        {ticks.map((t) => (
          <div key={t} className="leading-none">
            {axisLabel(t)}
          </div>
        ))}
      </div>

      {/* プロットエリア */}
      <div className="min-w-0 flex-1">
        <div className="relative h-48">
          {/* 目盛り線 */}
          {ticks.map((t, i) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-gray-100"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
            />
          ))}
          {/* 棒 */}
          <div className="absolute inset-0 flex items-end gap-1">
            {data.map((d) => (
              <div
                key={d.label}
                className="flex h-full flex-1 items-end justify-center"
                title={`${d.label}：${formatYen(d.value)}`}
              >
                <div
                  className="w-full max-w-[24px] rounded-t bg-brand-light/70"
                  style={{ height: `${(d.value / niceMax) * 100}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        {/* X軸ラベル */}
        <div className="mt-1 flex gap-1 border-t border-gray-200 pt-1">
          {data.map((d) => (
            <div
              key={d.label}
              className="flex-1 text-center text-[9px] leading-tight text-muted-fg"
            >
              {d.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
