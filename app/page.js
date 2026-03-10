"use client";

import { useEffect, useState } from "react";

const PROMPT = "guest@cutie:~$";

const STEPS = [
  { type: "command", text: "start --cute-demo" },
  { type: "output", text: "booting tiny terminal..." },
  { type: "output", text: "loading cozy palette...done" },
  { type: "command", text: "show-friend --ascii" },
  { type: "output", text: " /\\_/\\ " },
  { type: "output", text: "( o.o )  hi, i am Mochi" },
  { type: "output", text: " > ^ <   i brought snacks and logs" },
  { type: "command", text: "list-good-things" },
  { type: "output", text: "1. warm tea" },
  { type: "output", text: "2. tiny wins" },
  { type: "output", text: "3. pair programming with friends" },
  { type: "command", text: "echo '<3'" },
  { type: "output", text: "<3 <3 <3" },
  { type: "output", text: "demo complete. have a lovely day." },
];

function renderLine(step, textOverride) {
  const text = textOverride ?? step.text;
  if (step.type === "command") {
    return `${PROMPT} ${text}`;
  }

  return text;
}

export default function Home() {
  const [history, setHistory] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (isFinished) {
      return;
    }

    const step = STEPS[stepIndex];
    if (!step) {
      setIsFinished(true);
      return;
    }

    const typingSpeed = step.type === "command" ? 45 : 20;
    const settleDelay = step.type === "command" ? 220 : 360;
    let timer;

    if (charIndex < step.text.length) {
      timer = setTimeout(() => {
        setCharIndex((value) => value + 1);
      }, typingSpeed);
    } else {
      timer = setTimeout(() => {
        setHistory((lines) => [...lines, renderLine(step)]);

        if (stepIndex >= STEPS.length - 1) {
          setIsFinished(true);
          return;
        }

        setStepIndex((value) => value + 1);
        setCharIndex(0);
      }, settleDelay);
    }

    return () => clearTimeout(timer);
  }, [stepIndex, charIndex, isFinished]);

  const activeStep = !isFinished ? STEPS[stepIndex] : null;
  const activeLine = activeStep
    ? renderLine(activeStep, activeStep.text.slice(0, charIndex))
    : "";

  const restartDemo = () => {
    setHistory([]);
    setStepIndex(0);
    setCharIndex(0);
    setIsFinished(false);
  };

  return (
    <main className="page">
      <section className="terminal">
        <header className="terminal__header">
          <div className="terminal__lights" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="terminal__title">cute_terminal_demo.sh</p>
        </header>

        <div className="terminal__body" aria-live="polite">
          {history.map((line, index) => (
            <p
              key={`${line}-${index}`}
              className={`line ${line.startsWith(PROMPT) ? "line--command" : "line--output"}`}
            >
              {line}
            </p>
          ))}

          {activeStep && (
            <p className={`line ${activeStep.type === "command" ? "line--command" : "line--output"}`}>
              {activeLine}
              <span className="cursor" aria-hidden="true">
                _
              </span>
            </p>
          )}

          {isFinished && (
            <p className="line line--command">
              {PROMPT} <span className="cursor cursor--steady">_</span>
            </p>
          )}
        </div>
      </section>

      <button type="button" className="replayButton" onClick={restartDemo}>
        {isFinished ? "Run again" : "Restart demo"}
      </button>

      <p className="caption">A tiny fake terminal with big cozy vibes.</p>
    </main>
  );
}
