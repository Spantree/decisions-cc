import React, { useMemo } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useColorMode } from '@docusaurus/theme-common';

import type { Criterion, Option, RatingEntry, ScaleType } from 'decisions-cc';

let cssLoaded = false;

const SCALE: ScaleType = {
  kind: 'numeric', min: 1, max: 10, step: 1,
  labels: {
    1: 'Poor', 2: 'Below Avg', 3: 'Fair', 4: 'Below Avg+', 5: 'Average',
    6: 'Above Avg', 7: 'Good', 8: 'Very Good', 9: 'Excellent', 10: 'Outstanding',
  },
};

const criteria: Criterion[] = [
  { id: 'bundle-size', label: 'Bundle Size', user: 'docs', scale: SCALE,
    description: 'How small is the library? Smaller means less impact on consumer bundle.' },
  { id: 'boilerplate', label: 'Boilerplate', user: 'docs', scale: SCALE,
    description: 'How little code is needed to define stores, actions, and selectors?' },
  { id: 'devtools', label: 'DevTools', user: 'docs', scale: SCALE,
    description: 'Quality of debugging tools — time-travel, state inspection, action logging.' },
  { id: 'scoped-instances', label: 'Scoped Instances', user: 'docs', scale: SCALE,
    description: 'Can multiple independent store instances coexist on the same page?' },
  { id: 'middleware', label: 'Middleware', user: 'docs', scale: SCALE,
    description: 'Ecosystem of composable middleware — persistence, logging, devtools, immer.' },
  { id: 'learning-curve', label: 'Learning Curve', user: 'docs', scale: SCALE,
    description: 'How quickly can a developer become productive with this approach?' },
  { id: 'typescript', label: 'TypeScript', user: 'docs', scale: SCALE,
    description: 'Type inference quality, generics support, and DX without manual annotations.' },
  { id: 'community', label: 'Community', user: 'docs', scale: SCALE,
    description: 'Size of ecosystem, third-party integrations, and community support resources.' },
];

const options: Option[] = [
  { id: 'zustand', label: 'Zustand', user: 'docs',
    description: '~1 KB store with middleware (devtools, persist, immer). Context provider pattern for scoped instances.' },
  { id: 'redux-toolkit', label: 'Redux Toolkit', user: 'docs',
    description: 'Official Redux tooling with createSlice, RTK Query, and extensive middleware ecosystem.' },
  { id: 'jotai', label: 'Jotai', user: 'docs',
    description: 'Primitive and flexible atomic state. Bottom-up approach inspired by Recoil.' },
  { id: 'context-reducer', label: 'Context + useReducer', user: 'docs',
    description: 'Built-in React primitives — no library needed, but no middleware or devtools.' },
  { id: 'controlled-props', label: 'Controlled Props', user: 'docs',
    description: 'Parent owns all state via props and callbacks. Tried first but reverted due to prop explosion.' },
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
function rate(
  optionId: string, criterionId: string, value: number,
  comment: string, label?: string,
): RatingEntry {
  return { id: rid(), optionId, criterionId, value, comment, label, timestamp: 1707600000000, user: 'docs' };
}

const ratings: RatingEntry[] = [
  // ── Zustand ──
  rate('zustand', 'bundle-size', 9,
    '~1 KB gzipped — negligible impact on consumer bundles.', 'Excellent'),
  rate('zustand', 'boilerplate', 9,
    'A single createPughStore() call replaces hundreds of lines of reducers/actions.', 'Excellent'),
  rate('zustand', 'devtools', 8,
    'Built-in devtools middleware with named actions for time-travel debugging.', 'Very Good'),
  rate('zustand', 'scoped-instances', 10,
    'createPughStore factory + PughStoreProvider gives true per-instance isolation.', 'Outstanding'),
  rate('zustand', 'middleware', 8,
    'persist, devtools, immer, subscribeWithSelector — covers our needs.', 'Very Good'),
  rate('zustand', 'learning-curve', 9,
    'Just create/set/get — feels like plain JavaScript, minimal concepts to learn.', 'Excellent'),
  rate('zustand', 'typescript', 9,
    'Excellent inference from create(); selectors are fully typed.', 'Excellent'),
  rate('zustand', 'community', 7,
    '45K+ GitHub stars, growing fast but ecosystem smaller than Redux.', 'Good'),

  // ── Redux Toolkit ──
  rate('redux-toolkit', 'bundle-size', 4,
    '~11 KB gzipped for core + toolkit — significant for a component library.', 'Below Avg+'),
  rate('redux-toolkit', 'boilerplate', 5,
    'createSlice reduces boilerplate vs classic Redux, but still needs slices, reducers, selectors.', 'Average'),
  rate('redux-toolkit', 'devtools', 10,
    'Gold standard — Redux DevTools is the best state debugging tool available.', 'Outstanding'),
  rate('redux-toolkit', 'scoped-instances', 5,
    'Designed for app-level singletons; scoped stores require awkward workarounds.', 'Average'),
  rate('redux-toolkit', 'middleware', 9,
    'Massive middleware ecosystem — thunks, sagas, RTK Query, listeners.', 'Excellent'),
  rate('redux-toolkit', 'learning-curve', 5,
    'Actions, reducers, selectors, thunks, normalization — steep conceptual overhead.', 'Average'),
  rate('redux-toolkit', 'typescript', 8,
    'Good TS support but configuring typed hooks and middleware requires boilerplate.', 'Very Good'),
  rate('redux-toolkit', 'community', 10,
    'Largest React state management community by far; every problem has a Stack Overflow answer.', 'Outstanding'),

  // ── Jotai ──
  rate('jotai', 'bundle-size', 8,
    '~2 KB gzipped — lightweight atomic approach.', 'Very Good'),
  rate('jotai', 'boilerplate', 8,
    'Atoms are concise but derived state requires chaining atom() calls.', 'Very Good'),
  rate('jotai', 'devtools', 6,
    'Basic devtools exist but less mature than Redux or Zustand.', 'Above Avg'),
  rate('jotai', 'scoped-instances', 7,
    'Provider-based scoping works but atoms are global by default.', 'Good'),
  rate('jotai', 'middleware', 5,
    'Some utilities (atomWithStorage) but no composable middleware pipeline.', 'Average'),
  rate('jotai', 'learning-curve', 7,
    'Simple for basic atoms, but derived/async atoms add complexity.', 'Good'),
  rate('jotai', 'typescript', 8,
    'Good inference for atoms; derived atoms need explicit typing.', 'Very Good'),
  rate('jotai', 'community', 6,
    'Growing community (~18K stars) but much smaller ecosystem than Redux/Zustand.', 'Above Avg'),

  // ── Context + useReducer ──
  rate('context-reducer', 'bundle-size', 10,
    'Zero additional bytes — built into React.', 'Outstanding'),
  rate('context-reducer', 'boilerplate', 4,
    'Requires Provider, context, reducer, action types, dispatch wiring for each domain slice.', 'Below Avg+'),
  rate('context-reducer', 'devtools', 3,
    'No built-in devtools; useDebugValue is minimal. Manual logging only.', 'Fair'),
  rate('context-reducer', 'scoped-instances', 7,
    'Each Provider creates a scope, but no factory pattern — manual duplication.', 'Good'),
  rate('context-reducer', 'middleware', 2,
    'No middleware system; every cross-cutting concern is hand-rolled.', 'Below Avg'),
  rate('context-reducer', 'learning-curve', 8,
    'Standard React patterns — any React dev knows useReducer.', 'Very Good'),
  rate('context-reducer', 'typescript', 7,
    'Typed actions require discriminated unions and manual type guards.', 'Good'),
  rate('context-reducer', 'community', 10,
    'Core React — universal documentation and examples everywhere.', 'Outstanding'),

  // ── Controlled Props ──
  rate('controlled-props', 'bundle-size', 10,
    'No library — state lives in the parent component.', 'Outstanding'),
  rate('controlled-props', 'boilerplate', 3,
    'Tried and reverted — prop surface grew to 20+ props with callbacks for every action.', 'Fair'),
  rate('controlled-props', 'devtools', 2,
    'No state management layer to inspect; debugging requires React DevTools only.', 'Below Avg'),
  rate('controlled-props', 'scoped-instances', 8,
    'Each instance is naturally scoped via its own parent state.', 'Very Good'),
  rate('controlled-props', 'middleware', 1,
    'No middleware concept at all — every feature is a prop.', 'Poor'),
  rate('controlled-props', 'learning-curve', 6,
    'Simple concept but unwieldy in practice when prop count grows.', 'Above Avg'),
  rate('controlled-props', 'typescript', 9,
    'Props are fully typed by default — strongest type safety.', 'Excellent'),
  rate('controlled-props', 'community', 5,
    'Standard pattern but no ecosystem or tooling around it.', 'Average'),
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
    <div style={{ overflowX: 'auto' }}>
      <PughStoreProvider store={store}>
        <PughMatrix
          showWinner
          isDark={colorMode === 'dark'}
          readOnly
        />
      </PughStoreProvider>
    </div>
  );
}

export default function ZustandComparisonMatrix(): React.ReactElement {
  return (
    <BrowserOnly fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading comparison matrix…</div>}>
      {() => <MatrixClient />}
    </BrowserOnly>
  );
}
