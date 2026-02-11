"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  PughMatrix: () => PughMatrix
});
module.exports = __toCommonJS(index_exports);

// src/PughMatrix.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
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
  const [weights, setWeights] = (0, import_react.useState)(
    () => Object.fromEntries(criteria.map((c) => [c, 10]))
  );
  const [showTotals, setShowTotals] = (0, import_react.useState)(false);
  const weightedTotals = (0, import_react.useMemo)(() => {
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
  const maxTotal = (0, import_react.useMemo)(
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
  const winner = (0, import_react.useMemo)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `pugh-container${isDark ? " pugh-dark" : ""}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "pugh-table", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "pugh-criterion-header", children: "Criterion" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "pugh-weight-header", children: "Weight" }),
        tools.map((tool) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "th",
          {
            className: `pugh-tool-header${isWinner(tool) ? " pugh-winner-header" : isHighlighted(tool) ? " pugh-highlight-header" : ""}`,
            children: isWinner(tool) ? `\u{1F451} ${tool}` : tool
          },
          tool
        ))
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [
        criteria.map((criterion) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "pugh-criterion-cell", children: criterion }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "pugh-weight-cell", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
            return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "td",
              {
                className: `pugh-score-cell${isWinner(tool) ? " pugh-winner-cell" : isHighlighted(tool) ? " pugh-highlight-cell" : ""}`,
                style: {
                  backgroundColor: colors.bg,
                  color: colors.text
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pugh-score-number", children: score }),
                  label && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "pugh-score-label", children: label })
                ]
              },
              tool
            );
          })
        ] }, criterion)),
        showTotals && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { className: "pugh-total-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "pugh-total-label", children: "Weighted Total" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "pugh-weight-cell" }),
          tools.map((tool) => {
            const total = weightedTotals[tool];
            const colors = getScoreColor(
              total / maxTotal * 10,
              isDark
            );
            return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PughMatrix
});
