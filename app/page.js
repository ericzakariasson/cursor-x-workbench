"use client";

import { useEffect, useMemo, useState } from "react";

const FONT_OPTIONS = [
  { label: "Inter", family: "Inter", category: "sans" },
  { label: "Merriweather", family: "Merriweather", category: "serif" },
  { label: "Playfair Display", family: "Playfair Display", category: "serif" },
  { label: "Space Grotesk", family: "Space Grotesk", category: "sans" },
  { label: "Manrope", family: "Manrope", category: "sans" },
  { label: "Source Serif 4", family: "Source Serif 4", category: "serif" },
];

const ASCENDERS = new Set("bdfhkltABCDEFGHIJKLMNOPQRSTUVWXYZ");
const X_HEIGHT = new Set("aceimnorsuvwxz");
const COUNTERS = new Set("abdegopqADOPQR0689");

const QUIZ_TARGETS = ["xHeight", "ascender", "counter", "serif"];

function toGoogleFamilyParam(family) {
  return `family=${family.replaceAll(" ", "+")}:wght@400;700`;
}

function getFontMeta(family) {
  return FONT_OPTIONS.find((font) => font.family === family) ?? FONT_OPTIONS[0];
}

function getAnatomy(char, fontCategory) {
  const letter = char.trim();
  const xHeight = X_HEIGHT.has(letter);
  const ascender = ASCENDERS.has(letter);
  const counter = COUNTERS.has(letter);
  const serif = fontCategory === "serif";

  return { xHeight, ascender, counter, serif };
}

function AnatomyLegend({ hoverData }) {
  const features = hoverData?.features ?? {
    xHeight: false,
    ascender: false,
    counter: false,
    serif: false,
  };

  return (
    <div className="legend">
      {[
        { key: "xHeight", label: "x-height" },
        { key: "ascender", label: "ascender" },
        { key: "counter", label: "counter" },
        { key: "serif", label: "serif" },
      ].map((item) => (
        <span
          key={item.key}
          className={`pill ${features[item.key] ? "active" : ""}`}
          title={features[item.key] ? "Detected on hover" : "Not detected"}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}

function Overlay({ hoverData }) {
  return (
    <svg className="overlay" viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true">
      <line className={`guide ${hoverData?.features?.ascender ? "on" : ""}`} x1="20" y1="52" x2="980" y2="52" />
      <line className={`guide ${hoverData?.features?.xHeight ? "on" : ""}`} x1="20" y1="102" x2="980" y2="102" />
      <line className="guide baseline on" x1="20" y1="184" x2="980" y2="184" />

      {hoverData && (
        <>
          <line
            className="guide marker on"
            x1={`${hoverData.xPercent}%`}
            y1="20"
            x2={`${hoverData.xPercent}%`}
            y2="228"
          />
          {hoverData.features.counter && (
            <circle className="counter-pulse on" cx={`${hoverData.xPercent}%`} cy="130" r="32" />
          )}
          {hoverData.features.serif && (
            <>
              <rect className="serif-mark on" x={`${hoverData.xPercent - 2}%`} y="175" width="20" height="8" />
              <rect className="serif-mark on" x={`${hoverData.xPercent - 2}%`} y="46" width="20" height="8" />
            </>
          )}
        </>
      )}
    </svg>
  );
}

function FontPanel({ title, family, text, onFamilyChange, onHover }) {
  const fontMeta = getFontMeta(family);
  const letters = useMemo(() => text.split(""), [text]);

  return (
    <section className="font-panel">
      <header className="panel-header">
        <h2>{title}</h2>
        <label>
          <span>Font</span>
          <select value={family} onChange={(event) => onFamilyChange(event.target.value)}>
            {FONT_OPTIONS.map((option) => (
              <option key={option.family} value={option.family}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="glyph-stage" style={{ fontFamily: `"${family}", ${fontMeta.category === "serif" ? "serif" : "sans-serif"}` }}>
        <Overlay hoverData={onHover.current} />
        <div className="glyph-row" onMouseLeave={() => onHover.set(null)}>
          {letters.map((char, index) => (
            <span
              key={`${char}-${index}`}
              className="glyph"
              onMouseEnter={(event) => {
                const rowRect = event.currentTarget.parentElement?.getBoundingClientRect();
                const targetRect = event.currentTarget.getBoundingClientRect();
                const xPercent = rowRect
                  ? ((targetRect.left + targetRect.width / 2 - rowRect.left) / rowRect.width) * 100
                  : 50;

                onHover.set({
                  index,
                  char,
                  xPercent: Number.isFinite(xPercent) ? Math.max(0, Math.min(100, xPercent)) : 50,
                  features: getAnatomy(char, fontMeta.category),
                  fontCategory: fontMeta.category,
                });
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [leftFont, setLeftFont] = useState("Inter");
  const [rightFont, setRightFont] = useState("Merriweather");
  const [previewText, setPreviewText] = useState("Hamburgefons");
  const [leftHover, setLeftHover] = useState(null);
  const [rightHover, setRightHover] = useState(null);
  const [quizEnabled, setQuizEnabled] = useState(false);
  const [quizTarget, setQuizTarget] = useState("ascender");
  const [quizScore, setQuizScore] = useState(0);
  const [quizPromptId, setQuizPromptId] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState("Hover a letter to answer.");
  const [lastAnswerKey, setLastAnswerKey] = useState("");

  useEffect(() => {
    const uniqueFamilies = [...new Set([leftFont, rightFont])];
    const linkId = "typography-font-loader";
    const href = `https://fonts.googleapis.com/css2?${uniqueFamilies
      .map((family) => toGoogleFamilyParam(family))
      .join("&")}&display=swap`;

    let link = document.getElementById(linkId);
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }

    link.href = href;
  }, [leftFont, rightFont]);

  function availableTargets() {
    const letters = previewText.split("");
    const includesSerif = [leftFont, rightFont].some((family) => getFontMeta(family).category === "serif");

    return QUIZ_TARGETS.filter((target) => {
      if (target === "serif") {
        return includesSerif;
      }
      return letters.some((char) => getAnatomy(char, "sans")[target]);
    });
  }

  function nextQuizPrompt() {
    const targets = availableTargets();
    if (targets.length === 0) {
      setQuizEnabled(false);
      setQuizFeedback("No valid letters for quiz mode. Try another sample word.");
      return;
    }

    const nextTarget = targets[Math.floor(Math.random() * targets.length)];
    setQuizTarget(nextTarget);
    setQuizPromptId((value) => value + 1);
    setLastAnswerKey("");
  }

  useEffect(() => {
    if (!quizEnabled) {
      return;
    }
    nextQuizPrompt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizEnabled, previewText, leftFont, rightFont]);

  function evaluateHover(panelName, hoverData) {
    if (!quizEnabled || !hoverData) {
      return;
    }

    const answerKey = `${quizPromptId}:${panelName}:${hoverData.index}`;
    if (answerKey === lastAnswerKey) {
      return;
    }
    setLastAnswerKey(answerKey);

    const isCorrect = hoverData.features[quizTarget];

    if (isCorrect) {
      setQuizScore((score) => score + 1);
      setQuizFeedback(`Correct. "${hoverData.char}" matches ${quizTarget}.`);
      window.setTimeout(() => nextQuizPrompt(), 500);
      return;
    }

    setQuizFeedback(`Not quite. "${hoverData.char}" does not match ${quizTarget}.`);
  }

  const leftHandle = {
    current: leftHover,
    set: (data) => {
      setLeftHover(data);
      evaluateHover("left", data);
    },
  };

  const rightHandle = {
    current: rightHover,
    set: (data) => {
      setRightHover(data);
      evaluateHover("right", data);
    },
  };

  return (
    <main className="explorer">
      <div className="shell">
        <header className="topbar">
          <div>
            <p className="kicker">Typography Explorer</p>
            <h1>Inspect letter anatomy in motion</h1>
          </div>
          <button
            className={`quiz-toggle ${quizEnabled ? "active" : ""}`}
            onClick={() => {
              if (!quizEnabled) {
                setQuizScore(0);
                setQuizFeedback("Hover a letter to answer.");
              }
              setQuizEnabled((value) => !value);
            }}
          >
            {quizEnabled ? "Exit quiz" : "Quiz mode"}
          </button>
        </header>

        <section className="controls">
          <label>
            <span>Sample text</span>
            <input
              value={previewText}
              maxLength={24}
              onChange={(event) => setPreviewText(event.target.value || "Hamburgefons")}
            />
          </label>
          <p>Hover any letter to reveal x-height, ascenders, counters, and serif clues.</p>
        </section>

        {quizEnabled && (
          <section className="quiz">
            <p className="quiz-prompt">Find a letter with: {quizTarget}</p>
            <p className="quiz-meta">Score {quizScore}</p>
            <p className="quiz-feedback">{quizFeedback}</p>
          </section>
        )}

        <section className="compare-grid">
          <FontPanel
            title="A"
            family={leftFont}
            text={previewText}
            onFamilyChange={setLeftFont}
            onHover={leftHandle}
          />
          <FontPanel
            title="B"
            family={rightFont}
            text={previewText}
            onFamilyChange={setRightFont}
            onHover={rightHandle}
          />
        </section>

        <section className="bottom-meta">
          <div>
            <p>Panel A anatomy</p>
            <AnatomyLegend hoverData={leftHover} />
          </div>
          <div>
            <p>Panel B anatomy</p>
            <AnatomyLegend hoverData={rightHover} />
          </div>
        </section>
      </div>
    </main>
  );
}
