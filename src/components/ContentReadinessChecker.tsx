"use client";

import { ReviewResult } from "@/actions/contentReview";

interface Props {
  result: ReviewResult | null;
  loading?: boolean;
  context?: "skill" | "session" | "meetLink";
}

const STATUS_CONFIG = {
  ready: {
    label: "READY",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    bar: "bg-emerald-500",
    icon: "🟢",
  },

  needs_review: {
    label: "NEEDS REVIEW",
    color: "text-yellow-400",
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/5",
    bar: "bg-yellow-500",
    icon: "🟡",
  },

  invalid: {
    label: "NOT READY",
    color: "text-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/5",
    bar: "bg-red-500",
    icon: "🔴",
  },
} as const;

const CONTEXT_LABELS = {
  skill: "Skill",
  session: "Session",
  meetLink: "Meeting Link",
} as const;

export default function ContentReadinessChecker({
  result,
  loading = false,
  context = "skill",
}: Props) {
  /* ==========================================================
     LOADING
     ========================================================== */

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-white/[0.02] border border-white/10 rounded-xl">
        <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin shrink-0" />

        <span className="text-[11px] font-mono text-zinc-400">
          Reviewing{" "}
          {CONTEXT_LABELS[
            context
          ].toLowerCase()}{" "}
          readiness...
        </span>
      </div>
    );
  }

  /* ==========================================================
     NO RESULT
     ========================================================== */

  if (!result) {
    return null;
  }

  const cfg =
    STATUS_CONFIG[result.status];

  /* ==========================================================
     GROUP ISSUES
     ========================================================== */

  const errors = result.issues.filter(
    (issue) =>
      issue.severity === "error"
  );

  const warnings = result.issues.filter(
    (issue) =>
      issue.severity === "warning"
  );

  const suggestions =
    result.issues.filter(
      (issue) =>
        issue.severity === "suggestion"
    );

  /* ==========================================================
     SCORE
     ========================================================== */

  const score = Math.max(
    0,
    Math.min(100, result.score)
  );

  return (
    <div
      className={`p-4 rounded-xl border ${cfg.bg} ${cfg.border} space-y-3`}
    >
      {/* ======================================================
         HEADER
         ====================================================== */}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm shrink-0">
            {cfg.icon}
          </span>

          <div>
            <p
              className={`text-[11px] font-black font-mono ${cfg.color} uppercase`}
            >
              Content Readiness
            </p>

            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
              {CONTEXT_LABELS[context]} review
            </p>
          </div>
        </div>

        <span
          className={`text-sm font-black font-mono ${cfg.color}`}
        >
          {score}/100
        </span>
      </div>

      {/* ======================================================
         STATUS
         ====================================================== */}

      <div
        className={`text-[10px] font-mono font-bold ${cfg.color}`}
      >
        {cfg.label}
      </div>

      {/* ======================================================
         SCORE BAR
         ====================================================== */}

      <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
          style={{
            width: `${score}%`,
          }}
        />
      </div>

      {/* ======================================================
         ERRORS
         ====================================================== */}

      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map(
            (issue, index) => (
              <div
                key={`error-${index}`}
                className="flex items-start gap-2"
              >
                <span className="text-xs shrink-0 mt-0.5">
                  🔴
                </span>

                <div className="min-w-0">
                  <p className="text-[9px] text-red-400/70 font-mono uppercase">
                    {issue.field}
                  </p>

                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    {issue.message}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* ======================================================
         WARNINGS
         ====================================================== */}

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map(
            (issue, index) => (
              <div
                key={`warning-${index}`}
                className="flex items-start gap-2"
              >
                <span className="text-xs shrink-0 mt-0.5">
                  🟡
                </span>

                <div className="min-w-0">
                  <p className="text-[9px] text-yellow-400/70 font-mono uppercase">
                    {issue.field}
                  </p>

                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    {issue.message}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* ======================================================
         GENERAL SUGGESTIONS
         ====================================================== */}

      {result.suggestions &&
        result.suggestions.length > 0 && (
          <div className="pt-2 border-t border-white/5">
            <p className="text-[10px] font-mono text-zinc-500 mb-1.5">
              💡 Suggested improvements
            </p>

            <div className="flex flex-wrap gap-1.5">
              {result.suggestions.map(
                (suggestion, index) => (
                  <span
                    key={`general-suggestion-${index}`}
                    className="text-[11px] bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 px-2 py-1 rounded font-mono"
                  >
                    {suggestion}
                  </span>
                )
              )}
            </div>
          </div>
        )}

      {/* ======================================================
         SUGGESTION ISSUES
         ====================================================== */}

      {suggestions.length > 0 && (
        <div className="pt-2 border-t border-white/5 space-y-1.5">
          {suggestions.map(
            (issue, index) => (
              <div
                key={`suggestion-${index}`}
                className="flex items-start gap-2"
              >
                <span className="shrink-0">
                  💡
                </span>

                <div className="min-w-0">
                  <p className="text-[9px] text-yellow-400/70 font-mono uppercase">
                    {issue.field}
                  </p>

                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    {issue.message}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* ======================================================
         READY
         ====================================================== */}

      {result.status === "ready" && (
        <div className="pt-2 border-t border-emerald-500/10">
          <p className="text-[11px] font-mono text-emerald-400">
            ✓ All readiness checks passed.
          </p>

          <p className="text-[10px] font-mono text-zinc-500 mt-1">
            {context === "meetLink"
              ? "Meeting link is ready to use."
              : context === "session"
              ? "Session is ready to proceed."
              : "Skill is ready to be activated."}
          </p>
        </div>
      )}

      {/* ======================================================
         BLOCKED
         ====================================================== */}

      {result.status === "invalid" &&
        errors.length > 0 && (
          <div className="pt-2 border-t border-red-500/10">
            <p className="text-[10px] font-mono text-red-400">
              ✕ Resolve the errors above before proceeding.
            </p>
          </div>
        )}

      {/* ======================================================
         WARNINGS
         ====================================================== */}

      {result.status === "needs_review" && (
        <div className="pt-2 border-t border-yellow-500/10">
          <p className="text-[10px] font-mono text-yellow-400">
            ⚠ Review the warnings before proceeding.
          </p>
        </div>
      )}
    </div>
  );
}