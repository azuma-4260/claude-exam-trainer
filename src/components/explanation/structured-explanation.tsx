import { ChevronRight } from "lucide-react";
import { LIFECYCLE_PHASE_LABEL, type StructuredFields } from "@/lib/explanation/structured";

/**
 * 構造化解説フィールドの表示部品(specs/05 §解説の表示、D6-9)。S-3 / S-4(S-7 総ざらい含む)/ S-6 で共有する。
 * - hooks を使わないので server component(S-6)からも使える。折りたたみはネイティブ details
 * - フィールドが無い問題では何も描かない(従来の表示を変えない)
 * - 回答(Mock は提出)後だけ描く責務は呼び出し側にある
 */

/** 解説の先頭に置く拘束条件の枠とフェーズのタグ。lifecycle_phase だけの問題はタグだけ出す */
export function BindingConstraintBox({
  bindingConstraintJa,
  lifecyclePhase,
  className = "mb-3",
}: StructuredFields & { className?: string }) {
  const phase =
    lifecyclePhase !== null ? (
      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        フェーズ: {LIFECYCLE_PHASE_LABEL[lifecyclePhase]}
      </span>
    ) : null;
  if (bindingConstraintJa === null) return phase ? <p className={className}>{phase}</p> : null;
  return (
    <div className={`${className} rounded-lg border-l-4 border-amber-500 bg-amber-500/10 px-3 py-2`}>
      <p className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">拘束条件</span>
        {phase}
      </p>
      <p className="mt-1 font-medium leading-relaxed">{bindingConstraintJa}</p>
    </div>
  );
}

/**
 * 正解でない選択肢の直下に置く「こういう条件なら正解 / ここで BEST でない理由」。
 * defaultOpen は isRationaleOpen(選んだ誤答なら開く)の結果。値の無い選択肢(正解・フィールド無し)は描かない。
 * 呼び出し側は questionId を含む key を付ける(次の問題で開閉状態を持ち越さない)
 */
export function ChoiceRationale({
  plausibleJa,
  notBestJa,
  defaultOpen,
}: {
  plausibleJa: string | null;
  notBestJa: string | null;
  defaultOpen: boolean;
}) {
  if (plausibleJa === null || notBestJa === null) return null;
  return (
    <details open={defaultOpen} className="group pl-9 text-sm">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded py-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden />
        なぜ BEST でないか
      </summary>
      <dl className="mt-1 flex flex-col gap-2 border-l-2 border-border pb-1 pl-3 leading-relaxed">
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">こういう条件なら正解</dt>
          <dd>{plausibleJa}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">ここで BEST でない理由</dt>
          <dd>{notBestJa}</dd>
        </div>
      </dl>
    </details>
  );
}
