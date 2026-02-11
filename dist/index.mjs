// src/PughMatrix.tsx
import { useState, useMemo } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
function getScoreColor(score, isDark) {
  const ratio = Math.max(0, Math.min(1, (score - 1) / 9));
  const hue = ratio * 120;
  if (isDark) {
    return {
      bg: `hsl(${hue}, 45%, 22%)`,
      text: `hsl(${hue}, 60%, 78%)`
    };
  }
  return {
    bg: `hsl(${hue}, 75%, 90%)`,
    text: `hsl(${hue}, 80%, 25%)`
  };
}
function PughMatrix({
  criteria,
  tools,
  scores,
  highlight,
  showWinner = false,
  isDark = false
}) {
  const [weights, setWeights] = useState(
    () => Object.fromEntries(criteria.map((c) => [c, 10]))
  );
  const [showTotals, setShowTotals] = useState(false);
  const weightedTotals = useMemo(() => {
    const totals = {};
    for (const tool of tools) {
      let total = 0;
      for (const criterion of criteria) {
        const entry = scores[tool]?.[criterion];
        const score = entry?.score ?? 0;
        const weight = weights[criterion] ?? 10;
        total += score * weight;
      }
      totals[tool] = Math.round(total * 10) / 10;
    }
    return totals;
  }, [criteria, tools, scores, weights]);
  const maxTotal = useMemo(
    () => Math.max(...Object.values(weightedTotals)),
    [weightedTotals]
  );
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
  const isHighlighted = (tool) => highlight && tool === highlight;
  const winner = useMemo(() => {
    if (!showWinner) return null;
    let best = "";
    for (const tool of tools) {
      if (weightedTotals[tool] === maxTotal) {
        best = tool;
        break;
      }
    }
    return best;
  }, [showWinner, tools, weightedTotals, maxTotal]);
  const isWinner = (tool) => winner && tool === winner;
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
            const entry = scores[tool]?.[criterion];
            const score = entry?.score ?? 0;
            const label = entry?.label ?? "";
            const colors = getScoreColor(score, isDark);
            return /* @__PURE__ */ jsxs(
              "td",
              {
                className: `pugh-score-cell${isWinner(tool) ? " pugh-winner-cell" : isHighlighted(tool) ? " pugh-highlight-cell" : ""}`,
                style: {
                  backgroundColor: colors.bg,
                  color: colors.text
                },
                children: [
                  /* @__PURE__ */ jsx("span", { className: "pugh-score-number", children: score }),
                  label && /* @__PURE__ */ jsx("span", { className: "pugh-score-label", children: label })
                ]
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
