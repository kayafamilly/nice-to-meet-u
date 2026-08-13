"use client";

import { useMemo, useState } from "react";
import type { PlannerTheme } from "@/lib/content/speaking-guides";

type Props = {
  language: string;
  themes: readonly PlannerTheme[];
};

export function PracticePlanBuilder({ language, themes }: Props) {
  const [themeId, setThemeId] = useState(themes[0]?.id ?? "");
  const [promptIndex, setPromptIndex] = useState(0);
  const theme = useMemo(() => themes.find((entry) => entry.id === themeId) ?? themes[0], [themeId, themes]);

  if (!theme) return null;

  const prompt = theme.prompts[promptIndex % theme.prompts.length] ?? "";
  const promptCount = theme.prompts.length;

  function chooseTheme(nextThemeId: string) {
    setThemeId(nextThemeId);
    setPromptIndex(0);
  }

  function nextPrompt() {
    setPromptIndex((current) => (current + 1) % promptCount);
  }

  return (
    <section className="practice-planner card" aria-labelledby="practice-planner-title">
      <div className="practice-planner-heading">
        <div>
          <p className="eyebrow">Interactive practice tool</p>
          <h2 id="practice-planner-title">Build a 30-minute {language} conversation</h2>
        </div>
        <label className="planner-theme-select">
          <span>Conversation theme</span>
          <select value={theme.id} onChange={(event) => chooseTheme(event.target.value)}>
            {themes.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select>
        </label>
      </div>
      <p>{theme.introduction}</p>
      <div className="practice-plan" aria-live="polite">
        <article>
          <span>0-5 min</span>
          <h3>Warm up</h3>
          <p>Introduce yourself and share one small thing about your day.</p>
        </article>
        <article>
          <span>5-15 min</span>
          <h3>Exchange</h3>
          <p>Use this prompt: <strong>{prompt}</strong></p>
        </article>
        <article>
          <span>15-25 min</span>
          <h3>Go deeper</h3>
          <p>Ask why, request an example, or compare the answer with your own experience.</p>
        </article>
        <article>
          <span>25-30 min</span>
          <h3>Close and remember</h3>
          <p>Share one useful word or phrase you heard and one topic you would revisit next time.</p>
        </article>
      </div>
      <div className="planner-actions">
        <button className="button secondary" type="button" onClick={nextPrompt}>Try another prompt</button>
        <p className="small-copy">Adapt the questions to your level. Clear communication matters more than perfect sentences.</p>
      </div>
    </section>
  );
}
