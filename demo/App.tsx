import { useState } from 'react';
import { PughMatrix } from 'decisionapp';
import 'decisionapp/styles.css';
import './App.css';
import { criteria, tools, scores } from './data';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<string>('');
  const [showWinner, setShowWinner] = useState(false);

  return (
    <div className={`demo-page ${isDark ? 'demo-dark' : ''}`}>
      <header className="demo-header">
        <h1>PughMatrix Component Demo</h1>
        <p>Interactive examples of the PughMatrix component with various configurations.</p>
        <label className="demo-toggle">
          <input
            type="checkbox"
            checked={isDark}
            onChange={(e) => setIsDark(e.target.checked)}
          />
          Dark Mode
        </label>
      </header>

      {/* Section 1: Basic usage, no highlight */}
      <section className="demo-section">
        <h2>1. Basic Usage (No Highlight)</h2>
        <p>Default rendering with no column highlighted. All columns are styled equally.</p>
        <PughMatrix
          criteria={criteria}
          tools={tools}
          scores={scores}
          isDark={isDark}
        />
      </section>

      {/* Section 2: Static highlight on a specific column */}
      <section className="demo-section">
        <h2>2. Static Highlight: &ldquo;Vue&rdquo;</h2>
        <p>
          The <code>highlight=&quot;Vue&quot;</code> prop draws attention to the Vue column
          with a green header and bordered cells.
        </p>
        <PughMatrix
          criteria={criteria}
          tools={tools}
          scores={scores}
          highlight="Vue"
          isDark={isDark}
        />
      </section>

      {/* Section 3: Static highlight on a different column */}
      <section className="demo-section">
        <h2>3. Static Highlight: &ldquo;Svelte&rdquo;</h2>
        <p>
          Same data, but now <code>highlight=&quot;Svelte&quot;</code> calls out the
          highest-performing option.
        </p>
        <PughMatrix
          criteria={criteria}
          tools={tools}
          scores={scores}
          highlight="Svelte"
          isDark={isDark}
        />
      </section>

      {/* Section 4: Interactive highlight picker */}
      <section className="demo-section">
        <h2>4. Interactive Highlight Toggle</h2>
        <p>
          Click a button to dynamically change which column is highlighted,
          or select &ldquo;None&rdquo; to remove the highlight entirely.
        </p>
        <div className="demo-button-group">
          <button
            className={`demo-btn ${selectedHighlight === '' ? 'demo-btn-active' : ''}`}
            onClick={() => setSelectedHighlight('')}
          >
            None
          </button>
          {tools.map((tool) => (
            <button
              key={tool}
              className={`demo-btn ${selectedHighlight === tool ? 'demo-btn-active' : ''}`}
              onClick={() => setSelectedHighlight(tool)}
            >
              {tool}
            </button>
          ))}
        </div>
        <PughMatrix
          criteria={criteria}
          tools={tools}
          scores={scores}
          highlight={selectedHighlight || undefined}
          isDark={isDark}
        />
      </section>

      {/* Section 5: Winner highlight toggle */}
      <section className="demo-section">
        <h2>5. Show Winner</h2>
        <p>
          The <code>showWinner</code> prop highlights the column with the highest
          weighted total in gold with a 👑 crown. Toggle it on and adjust weights
          to see the winner change dynamically.
        </p>
        <label className="demo-toggle" style={{ marginBottom: '0.75rem' }}>
          <input
            type="checkbox"
            checked={showWinner}
            onChange={(e) => setShowWinner(e.target.checked)}
          />
          showWinner
        </label>
        <PughMatrix
          criteria={criteria}
          tools={tools}
          scores={scores}
          showWinner={showWinner}
          isDark={isDark}
        />
      </section>

    </div>
  );
}
