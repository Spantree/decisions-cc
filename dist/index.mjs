// src/PughMatrix.tsx
import { useState, useMemo } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var scoreColorCache = /* @__PURE__ */ new Map();
function getScoreColor(score, isDark) {
  const key = `${score}-${isDark}`;
  const cached = scoreColorCache.get(key);
  if (cached) return cached;
  const ratio = Math.max(0, Math.min(1, (score - 1) / 9));
  const hue = ratio * 120;
  const result = isDark ? { bg: `hsl(${hue}, 45%, 22%)`, text: `hsl(${hue}, 60%, 78%)` } : { bg: `hsl(${hue}, 75%, 90%)`, text: `hsl(${hue}, 80%, 25%)` };
  scoreColorCache.set(key, result);
  return result;
}
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
function PughMatrix({
  criteria,
  tools,
  scores,
  highlight,
  showWinner = false,
  isDark = false,
  onScoreAdd
}) {
  const [weights, setWeights] = useState(
    () => Object.fromEntries(criteria.map((c) => [c, 10]))
  );
  const [showTotals, setShowTotals] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editScore, setEditScore] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editComment, setEditComment] = useState("");
  const { latestByCell, historyByCell, weightedTotals, maxTotal, winner } = useMemo(() => {
    const toolSet = new Set(tools);
    const criterionSet = new Set(criteria);
    const history = /* @__PURE__ */ new Map();
    const latest = /* @__PURE__ */ new Map();
    for (const entry of scores) {
      if (!toolSet.has(entry.tool) || !criterionSet.has(entry.criterion)) {
        throw new Error(
          `PughMatrix: score entry "${entry.id}" references invalid tool "${entry.tool}" or criterion "${entry.criterion}". Allowed tools: [${tools.join(", ")}]. Allowed criteria: [${criteria.join(", ")}].`
        );
      }
      const key = `${entry.tool}\0${entry.criterion}`;
      const arr = history.get(key) ?? [];
      arr.push(entry);
      history.set(key, arr);
      const prev = latest.get(key);
      if (!prev || entry.timestamp > prev.timestamp) {
        latest.set(key, entry);
      }
    }
    for (const [key, arr] of history.entries()) {
      history.set(key, arr.toSorted((a, b) => b.timestamp - a.timestamp));
    }
    const totals = {};
    let max = -Infinity;
    let best = "";
    for (const tool of tools) {
      let total = 0;
      for (const criterion of criteria) {
        const key = `${tool}\0${criterion}`;
        const entry = latest.get(key);
        const score = entry?.score ?? 0;
        const weight = weights[criterion] ?? 10;
        total += score * weight;
      }
      const rounded = Math.round(total * 10) / 10;
      totals[tool] = rounded;
      if (rounded > max) {
        max = rounded;
        best = tool;
      }
    }
    return {
      latestByCell: latest,
      historyByCell: history,
      weightedTotals: totals,
      maxTotal: max,
      winner: showWinner ? best : null
    };
  }, [scores, tools, criteria, weights, showWinner]);
  const handleWeightChange = (criterion, value) => {
    if (value === "") {
      setWeights((prev) => ({ ...prev, [criterion]: 0 }));
      return;
    }
    const num = Math.round(Number(value));
    if (!isNaN(num) && num >= 0 && num <= 10) {
      setWeights((prev) => ({ ...prev, [criterion]: num }));
    }
  };
  const handleCellClick = (tool, criterion) => {
    if (!onScoreAdd) return;
    setEditingCell({ tool, criterion });
    setEditScore("");
    setEditLabel("");
    setEditComment("");
  };
  const handleEditScoreChange = (value) => {
    if (value === "") {
      setEditScore("");
      return;
    }
    const num = Math.round(Number(value));
    if (!isNaN(num) && num >= 1 && num <= 10) {
      setEditScore(String(num));
    }
  };
  const handleEditSave = () => {
    if (!editingCell || !onScoreAdd) return;
    const scoreNum = Number(editScore);
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 10) return;
    if (!editLabel.trim()) return;
    onScoreAdd({
      tool: editingCell.tool,
      criterion: editingCell.criterion,
      score: scoreNum,
      label: editLabel.trim(),
      comment: editComment.trim() || void 0
    });
    setEditingCell(null);
  };
  const handleEditCancel = () => {
    setEditingCell(null);
  };
  const handleEditKeyDown = (e) => {
    if (e.key === "Escape") {
      handleEditCancel();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    }
  };
  const isHighlighted = (tool) => highlight && tool === highlight;
  const isWinner = (tool) => winner && tool === winner;
  const isEditing = (tool, criterion) => editingCell?.tool === tool && editingCell?.criterion === criterion;
  return /* @__PURE__ */ jsxs("div", { className: `pugh-container${isDark ? " pugh-dark" : ""}`, children: [
    /* @__PURE__ */ jsxs("table", { className: "pugh-table", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "pugh-criterion-header", children: "Criterion" }),
        /* @__PURE__ */ jsx("th", { className: "pugh-weight-header", children: "Weight" }),
        tools.map((tool) => /* @__PURE__ */ jsx(
          "th",
          {
            className: `pugh-tool-header${isWinner(tool) ? " pugh-winner-header" : isHighlighted(tool) ? " pugh-highlight-header" : ""}`,
            children: isWinner(tool) ? `\u{1F451} ${tool}` : tool
          },
          tool
        ))
      ] }) }),
      /* @__PURE__ */ jsxs("tbody", { children: [
        criteria.map((criterion) => /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { className: "pugh-criterion-cell", children: criterion }),
          /* @__PURE__ */ jsx("td", { className: "pugh-weight-cell", children: /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              inputMode: "numeric",
              pattern: "[0-9]*",
              value: weights[criterion],
              onChange: (e) => handleWeightChange(criterion, e.target.value),
              className: "pugh-weight-input"
            }
          ) }),
          tools.map((tool) => {
            const cellKey = `${tool}\0${criterion}`;
            const entry = latestByCell.get(cellKey);
            const score = entry?.score ?? 0;
            const label = entry?.label ?? "";
            const colors = getScoreColor(score, isDark);
            const history = historyByCell.get(cellKey);
            const editing = isEditing(tool, criterion);
            return /* @__PURE__ */ jsx(
              "td",
              {
                className: `pugh-score-cell${onScoreAdd ? " pugh-score-cell-editable" : ""}${isWinner(tool) ? " pugh-winner-cell" : isHighlighted(tool) ? " pugh-highlight-cell" : ""}`,
                style: {
                  backgroundColor: colors.bg,
                  color: colors.text
                },
                onClick: () => handleCellClick(tool, criterion),
                children: editing ? /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: "pugh-edit-form",
                    onClick: (e) => e.stopPropagation(),
                    children: [
                      /* @__PURE__ */ jsx(
                        "input",
                        {
                          type: "text",
                          inputMode: "numeric",
                          pattern: "[0-9]*",
                          placeholder: "Score (1-10)",
                          value: editScore,
                          onChange: (e) => handleEditScoreChange(e.target.value),
                          onKeyDown: handleEditKeyDown,
                          className: "pugh-edit-input",
                          autoFocus: true
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "input",
                        {
                          type: "text",
                          placeholder: "Label",
                          value: editLabel,
                          onChange: (e) => setEditLabel(e.target.value),
                          onKeyDown: handleEditKeyDown,
                          className: "pugh-edit-input",
                          maxLength: 30
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "textarea",
                        {
                          placeholder: "Comment (optional)",
                          value: editComment,
                          onChange: (e) => setEditComment(e.target.value),
                          onKeyDown: handleEditKeyDown,
                          className: "pugh-edit-comment",
                          rows: 2
                        }
                      ),
                      /* @__PURE__ */ jsxs("div", { className: "pugh-edit-actions", children: [
                        /* @__PURE__ */ jsx("button", { type: "button", onClick: handleEditSave, children: "Save" }),
                        /* @__PURE__ */ jsx("button", { type: "button", onClick: handleEditCancel, children: "Cancel" })
                      ] })
                    ]
                  }
                ) : /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx("span", { className: "pugh-score-number", children: score }),
                  label ? /* @__PURE__ */ jsx("span", { className: "pugh-score-label", children: label }) : null,
                  history && history.length > 0 ? /* @__PURE__ */ jsx("div", { className: "pugh-history-tooltip", children: history.map((h) => /* @__PURE__ */ jsxs("div", { className: "pugh-history-entry", children: [
                    /* @__PURE__ */ jsxs("div", { className: "pugh-history-score", children: [
                      h.score,
                      " \u2014 ",
                      h.label
                    ] }),
                    h.comment ? /* @__PURE__ */ jsxs("div", { className: "pugh-history-comment", children: [
                      "\u201C",
                      h.comment,
                      "\u201D"
                    ] }) : null,
                    /* @__PURE__ */ jsx("div", { className: "pugh-history-date", children: formatDate(h.timestamp) })
                  ] }, h.id)) }) : null
                ] })
              },
              tool
            );
          })
        ] }, criterion)),
        showTotals && /* @__PURE__ */ jsxs("tr", { className: "pugh-total-row", children: [
          /* @__PURE__ */ jsx("td", { className: "pugh-total-label", children: "Weighted Total" }),
          /* @__PURE__ */ jsx("td", { className: "pugh-weight-cell" }),
          tools.map((tool) => {
            const total = weightedTotals[tool];
            const colors = getScoreColor(
              total / maxTotal * 10,
              isDark
            );
            return /* @__PURE__ */ jsx(
              "td",
              {
                className: `pugh-total-cell${isWinner(tool) ? " pugh-winner-cell" : isHighlighted(tool) ? " pugh-highlight-cell" : ""}`,
                style: {
                  backgroundColor: colors.bg,
                  color: colors.text
                },
                children: total
              },
              tool
            );
          })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(
      "button",
      {
        className: "pugh-toggle-button",
        onClick: () => setShowTotals((prev) => !prev),
        type: "button",
        children: showTotals ? "Hide Totals" : "Show Totals"
      }
    )
  ] });
}
export {
  PughMatrix
};
