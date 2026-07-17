import type { RenderBlock, RenderRun } from "@/lib/markdown-template";

const INDENT_PER_DEPTH_PX = 24;

function Run({ run }: { run: RenderRun }) {
  if (run.kind === "text") return <>{run.text}</>;
  if (run.kind === "bold") {
    return (
      <strong>
        {run.runs.map((child, index) => (
          <Run key={index} run={child} />
        ))}
      </strong>
    );
  }
  return (
    <span className={run.filled ? undefined : "text-amber-800 dark:text-amber-300"}>
      {run.text}
    </span>
  );
}

function Runs({ runs }: { runs: RenderRun[] }) {
  return (
    <>
      {runs.map((run, index) => (
        <Run key={index} run={run} />
      ))}
    </>
  );
}

/** Renders the parsed+substituted Standard Terms body. Nesting depth is
 * shown via indentation and the literal marker text captured at parse time
 * (e.g. "a.", "iii.") rather than recomputed, matching how the source
 * templates are actually authored (see markdown-template.ts). */
export function DocumentBody({ blocks }: { blocks: RenderBlock[] }) {
  return (
    <div>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h3 key={index} className="mt-6 text-base font-semibold">
              <Runs runs={block.runs} />
            </h3>
          );
        }
        const style = { marginLeft: block.depth * INDENT_PER_DEPTH_PX };
        return (
          <p key={index} style={style} className="mb-3 text-sm">
            {block.kind === "item" && <strong>{block.marker} </strong>}
            <Runs runs={block.runs} />
          </p>
        );
      })}
    </div>
  );
}
