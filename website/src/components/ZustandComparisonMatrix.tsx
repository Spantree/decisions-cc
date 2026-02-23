import React, { useMemo } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useColorMode } from '@docusaurus/theme-common';

import type { Criterion, Option, RatingEntry } from 'decisions-cc';

let cssLoaded = false;

const criteria: Criterion[] = [
  { id: 'bundle-size', label: 'Bundle Size', user: 'docs', scale: { kind: 'numeric', min: 1, max: 10, step: 1 } },
  { id: 'boilerplate', label: 'Boilerplate', user: 'docs', scale: { kind: 'numeric', min: 1, max: 10, step: 1 } },
  { id: 'devtools', label: 'DevTools', user: 'docs', scale: { kind: 'numeric', min: 1, max: 10, step: 1 } },
  { id: 'scoped-instances', label: 'Scoped Instances', user: 'docs', scale: { kind: 'numeric', min: 1, max: 10, step: 1 } },
  { id: 'middleware', label: 'Middleware', user: 'docs', scale: { kind: 'numeric', min: 1, max: 10, step: 1 } },
  { id: 'learning-curve', label: 'Learning Curve', user: 'docs', scale: { kind: 'numeric', min: 1, max: 10, step: 1 } },
  { id: 'typescript', label: 'TypeScript', user: 'docs', scale: { kind: 'numeric', min: 1, max: 10, step: 1 } },
  { id: 'community', label: 'Community', user: 'docs', scale: { kind: 'numeric', min: 1, max: 10, step: 1 } },
];

const options: Option[] = [
  { id: 'zustand', label: 'Zustand', user: 'docs' },
  { id: 'redux-toolkit', label: 'Redux Toolkit', user: 'docs' },
  { id: 'jotai', label: 'Jotai', user: 'docs' },
  { id: 'context-reducer', label: 'Context+useReducer', user: 'docs' },
  { id: 'controlled-props', label: 'Controlled Props', user: 'docs' },
];

const weights: Record<string, number> = {
  'bundle-size': 2,
  'boilerplate': 2,
  'devtools': 1,
  'scoped-instances': 2,
  'middleware': 1,
  'learning-curve': 1,
  'typescript': 1,
  'community': 1,
};

let counter = 0;
function rid() { return `r-${++counter}`; }
function rate(optionId: string, criterionId: string, value: number): RatingEntry {
  return { id: rid(), optionId, criterionId, value, timestamp: 1707600000000, user: 'docs' };
}

const ratings: RatingEntry[] = [
  // Zustand
  rate('zustand', 'bundle-size', 9),
  rate('zustand', 'boilerplate', 9),
  rate('zustand', 'devtools', 8),
  rate('zustand', 'scoped-instances', 10),
  rate('zustand', 'middleware', 8),
  rate('zustand', 'learning-curve', 9),
  rate('zustand', 'typescript', 9),
  rate('zustand', 'community', 7),

  // Redux Toolkit
  rate('redux-toolkit', 'bundle-size', 4),
  rate('redux-toolkit', 'boilerplate', 5),
  rate('redux-toolkit', 'devtools', 10),
  rate('redux-toolkit', 'scoped-instances', 5),
  rate('redux-toolkit', 'middleware', 9),
  rate('redux-toolkit', 'learning-curve', 5),
  rate('redux-toolkit', 'typescript', 8),
  rate('redux-toolkit', 'community', 10),

  // Jotai
  rate('jotai', 'bundle-size', 8),
  rate('jotai', 'boilerplate', 8),
  rate('jotai', 'devtools', 6),
  rate('jotai', 'scoped-instances', 7),
  rate('jotai', 'middleware', 5),
  rate('jotai', 'learning-curve', 7),
  rate('jotai', 'typescript', 8),
  rate('jotai', 'community', 6),

  // Context + useReducer
  rate('context-reducer', 'bundle-size', 10),
  rate('context-reducer', 'boilerplate', 4),
  rate('context-reducer', 'devtools', 3),
  rate('context-reducer', 'scoped-instances', 7),
  rate('context-reducer', 'middleware', 2),
  rate('context-reducer', 'learning-curve', 8),
  rate('context-reducer', 'typescript', 7),
  rate('context-reducer', 'community', 10),

  // Controlled Props
  rate('controlled-props', 'bundle-size', 10),
  rate('controlled-props', 'boilerplate', 3),
  rate('controlled-props', 'devtools', 2),
  rate('controlled-props', 'scoped-instances', 8),
  rate('controlled-props', 'middleware', 1),
  rate('controlled-props', 'learning-curve', 6),
  rate('controlled-props', 'typescript', 9),
  rate('controlled-props', 'community', 5),
];

function MatrixClient() {
  const { colorMode } = useColorMode();
  const {
    PughMatrix,
    createPughStore,
    PughStoreProvider,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  } = require('decisions-cc');

  if (!cssLoaded) {
    require('@radix-ui/themes/styles.css');
    require('decisions-cc/styles.css');
    cssLoaded = true;
  }

  const store = useMemo(
    () => createPughStore({ criteria, options, ratings, weights }),
    [],
  );

  return (
    <PughStoreProvider store={store}>
      <PughMatrix
        showWinner
        isDark={colorMode === 'dark'}
        readOnly
      />
    </PughStoreProvider>
  );
}

export default function ZustandComparisonMatrix(): React.ReactElement {
  return (
    <BrowserOnly fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading comparison matrix…</div>}>
      {() => <MatrixClient />}
    </BrowserOnly>
  );
}
