import * as react_jsx_runtime from 'react/jsx-runtime';

interface ScoreEntry {
    id: string;
    tool: string;
    criterion: string;
    score: number;
    label: string;
    comment?: string;
    timestamp: number;
}

interface PughMatrixProps {
    criteria: string[];
    tools: string[];
    scores: ScoreEntry[];
    highlight?: string;
    showWinner?: boolean;
    isDark?: boolean;
    onScoreAdd?: (entry: {
        tool: string;
        criterion: string;
        score: number;
        label: string;
        comment?: string;
    }) => void;
}
declare function PughMatrix({ criteria, tools, scores, highlight, showWinner, isDark, onScoreAdd, }: PughMatrixProps): react_jsx_runtime.JSX.Element;

export { PughMatrix, type PughMatrixProps, type ScoreEntry };
