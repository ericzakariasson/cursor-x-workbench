"use client";

import { useEffect, useMemo, useState } from "react";

const FONT_OPTIONS = [
  { name: "Inter", google: "Inter:wght@400;600;700" },
  { name: "Playfair Display", google: "Playfair+Display:wght@400;600;700" },
  { name: "Space Grotesk", google: "Space+Grotesk:wght@400;600;700" },
  { name: "Lora", google: "Lora:wght@400;600;700" },
  { name: "Roboto Slab", google: "Roboto+Slab:wght@400;500;700" },
  { name: "Fira Sans", google: "Fira+Sans:wght@400;600;700" },
  { name: "Merriweather", google: "Merriweather:wght@400;700" },
];

const COUNTER_SET = new Set([
  "a",
  "b",
  "d",
  "e",
  "g",
  "o",
  "p",
  "q",
  "A",
  "B",
  "D",
  "O",
  "P",
  "Q",
  "R",
  "0",
  "6",
  "8",
  "9",
]);

const ASCENDER_SET = new Set(["b", "d", "f", "h", "k", "l", "t"]);
const X_HEIGHT_SET = new Set(["a", "c", "e", "i", "m", "n", "o", "r", "s", "u", "v", "w", "x", "z"]);

const QUIZ_QUESTIONS = [
  {
    label: "x-height",
    prompt: "Hover a lowercase letter that sits on the x-height, like x or e.",
    check: (char) => X_HEIGHT_SET.has(char),
  },
  {
    label: "ascender",
    prompt: "Hover a lowercase letter with an ascender, like b or l.",
    check: (char) => ASCENDER_SET.has(char),
  },
  {
    label: "counter",
    prompt: "Hover a letter or number with a visible counter, like o or 8.",
    check: (char, raw) => COUNTER_SET.has(char) || COUNTER_SET.has(raw),
  },
  {
    label: "serif",
    prompt: "Hover any letter and inspect where serif markers appear on the baseline.",
    check: (_, raw) => /^[A-Za-z]$/.test(raw),
  },
];

function featureFlags(rawChar) {
  const char = rawChar.toLowerCase();
  return {
    xHeight: X_HEIGHT_SET.has(char),
    ascender: ASCENDER_SET.has(char),
    counter: COUNTER_SET.has(char) || COUNTER_SET.has(rawChar),
    serif: /^[A-Za-z]$/.test(rawChar),
  };
}

function AnatomyOverlay({ char }) {
  const flags = featureFlags(char);

  return (
    <svg className="anatomy-overlay" viewBox="0 0 100 100" aria-hidden="true">
      <line className="guide baseline" x1="5" y1="78" x2="95" y2="78" />
      <line className="guide xheight" x1="5" y1="46" x2="95" y2="46" />
      <line className="guide ascender" x1="5" y1="16" x2="95" y2="16" />
      {flags.counter && <circle className="guide counter" cx="50" cy="56" r="13" />}
      {flags.serif && (
        <>
          <line className="guide serif" x1="20" y1="78" x2="34" y2="78" />
          <line className="guide serif" x1="66" y1="78" x2="80" y2="78" />
        </>
      )}
    </svg>
  );
}

function FontPanel({
  panelId,
  panelTitle,
  selectedFont,
  sampleText,
  hovered,
  onHoverChar,
  onSelectFont,
  anatomySummary,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{panelTitle}</h2>
        <label className="inline-label" htmlFor={`${panelId}-font`}>
          Font
        </label>
        <select id={`${panelId}-font`} value={selectedFont} onChange={(event) => onSelectFont(event.target.value)}>
          {FONT_OPTIONS.map((font) => (
            <option key={font.name} value={font.name}>
              {font.name}
            </option>
          ))}
        </select>
      </div>

      <div className="glyph-strip" role="group" aria-label={`${panelTitle} glyph strip`}>
        {sampleText.split("").map((char, index) => {
          const isSpace = char === " ";
          const isHovered = hovered && hovered.panelId === panelId && hovered.index === index;
          const key = `${panelId}-${index}-${char}`;

          if (isSpace) {
            return <span key={key} className="glyph-space" aria-hidden="true" />;
          }

          return (
            <button
              key={key}
              type="button"
              className={`glyph ${isHovered ? "active" : ""}`}
              style={{ fontFamily: `"${selectedFont}", sans-serif` }}
              onMouseEnter={() => onHoverChar(panelId, index, char)}
              onFocus={() => onHoverChar(panelId, index, char)}
            >
              <span className="glyph-char">{char}</span>
              {isHovered && <AnatomyOverlay char={char} />}
            </button>
          );
        })}
      </div>

      <div className="feature-tags">
        {anatomySummary.map((summary) => (
          <span key={summary} className="tag">
            {summary}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [leftFont, setLeftFont] = useState("Playfair Display");
  const [rightFont, setRightFont] = useState("Inter");
  const [sampleText, setSampleText] = useState("Hamburgefontsiv 0123689");
  const [hovered, setHovered] = useState(null);
  const [quizMode, setQuizMode] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState("Hover a glyph to begin.");

  const quizQuestion = QUIZ_QUESTIONS[quizIndex];
  const currentFlags = hovered ? featureFlags(hovered.char) : null;

  const leftSummary = useMemo(() => {
    if (!hovered || hovered.panelId !== "left") {
      return ["Hover any glyph for anatomy guides"];
    }

    return [
      currentFlags?.xHeight ? "x-height detected" : "x-height not highlighted",
      currentFlags?.ascender ? "ascender present" : "no ascender",
      currentFlags?.counter ? "counter detected" : "counter absent",
      currentFlags?.serif ? "serif markers visible" : "serif markers hidden",
    ];
  }, [hovered, currentFlags]);

  const rightSummary = useMemo(() => {
    if (!hovered || hovered.panelId !== "right") {
      return ["Hover any glyph for anatomy guides"];
    }

    return [
      currentFlags?.xHeight ? "x-height detected" : "x-height not highlighted",
      currentFlags?.ascender ? "ascender present" : "no ascender",
      currentFlags?.counter ? "counter detected" : "counter absent",
      currentFlags?.serif ? "serif markers visible" : "serif markers hidden",
    ];
  }, [hovered, currentFlags]);

  useEffect(() => {
    const requestedFamilies = Array.from(new Set([leftFont, rightFont]));
    const query = requestedFamilies
      .map((familyName) => {
        const font = FONT_OPTIONS.find((option) => option.name === familyName);
        return `family=${font?.google ?? "Inter:wght@400;600;700"}`;
      })
      .join("&");

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${query}&display=swap`;
    link.setAttribute("data-dynamic-font-loader", "true");
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [leftFont, rightFont]);

  function handleHover(panelId, index, char) {
    setHovered({ panelId, index, char });

    if (!quizMode || char === " ") {
      return;
    }

    const normalized = char.toLowerCase();
    const correct = quizQuestion.check(normalized, char);
    if (correct) {
      setQuizFeedback(`Correct. "${char}" matches ${quizQuestion.label}.`);
    } else {
      setQuizFeedback(`Not yet. "${char}" does not match ${quizQuestion.label}.`);
    }
  }

  function toggleQuiz() {
    setQuizMode((previous) => !previous);
    setQuizFeedback("Hover a glyph to begin.");
  }

  function nextQuestion() {
    setQuizIndex((previous) => (previous + 1) % QUIZ_QUESTIONS.length);
    setQuizFeedback("Hover a glyph to begin.");
  }

  return (
    <main className="explorer">
      <header className="topbar">
        <div>
          <h1>Type Anatomy Explorer</h1>
          <p>Hover any letter to inspect x-height, ascenders, counters, and serif hints.</p>
        </div>
        <div className="controls">
          <label className="inline-label" htmlFor="sample-text">
            Sample text
          </label>
          <input
            id="sample-text"
            value={sampleText}
            onChange={(event) => setSampleText(event.target.value)}
            maxLength={32}
          />
          <button type="button" className={`toggle ${quizMode ? "on" : ""}`} onClick={toggleQuiz}>
            Quiz mode {quizMode ? "On" : "Off"}
          </button>
        </div>
      </header>

      <section className="compare-grid">
        <FontPanel
          panelId="left"
          panelTitle="Font A"
          selectedFont={leftFont}
          sampleText={sampleText}
          hovered={hovered}
          onHoverChar={handleHover}
          onSelectFont={setLeftFont}
          anatomySummary={leftSummary}
        />
        <FontPanel
          panelId="right"
          panelTitle="Font B"
          selectedFont={rightFont}
          sampleText={sampleText}
          hovered={hovered}
          onHoverChar={handleHover}
          onSelectFont={setRightFont}
          anatomySummary={rightSummary}
        />
      </section>

      <section className="quiz-card" aria-live="polite">
        <div className="quiz-top">
          <h2>Quiz mode</h2>
          <button type="button" className="next-question" onClick={nextQuestion}>
            Next prompt
          </button>
        </div>
        <p className="prompt">{quizQuestion.prompt}</p>
        <p className="feedback">{quizFeedback}</p>
      </section>
    </main>
  );
}
