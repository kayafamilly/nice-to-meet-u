"use client";

import { useMemo, useState } from "react";
import type { PenPalPromptGroup } from "@/lib/content/pen-pal-resources";

type Props = {
  groups: readonly PenPalPromptGroup[];
};

export function PenPalPromptPicker({ groups }: Props) {
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [promptIndex, setPromptIndex] = useState(0);
  const group = useMemo(() => groups.find((entry) => entry.id === groupId) ?? groups[0], [groupId, groups]);

  if (!group) return null;

  const promptCount = group.prompts.length;
  const prompt = group.prompts[promptIndex % group.prompts.length] ?? "";

  function chooseGroup(nextGroupId: string) {
    setGroupId(nextGroupId);
    setPromptIndex(0);
  }

  function chooseAnotherPrompt() {
    setPromptIndex((current) => (current + 1) % promptCount);
  }

  return (
    <section className="practice-planner card" aria-labelledby="pen-pal-prompt-picker-title">
      <div className="practice-planner-heading">
        <div>
          <p className="eyebrow">Interactive prompt picker</p>
          <h2 id="pen-pal-prompt-picker-title">Choose a question worth answering</h2>
        </div>
        <label className="planner-theme-select">
          <span>Conversation theme</span>
          <select value={group.id} onChange={(event) => chooseGroup(event.target.value)}>
            {groups.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select>
        </label>
      </div>
      <p>{group.introduction}</p>
      <div className="pen-pal-prompt" aria-live="polite">
        <span>Try this question</span>
        <p>{prompt}</p>
      </div>
      <div className="planner-actions">
        <button className="button secondary" type="button" onClick={chooseAnotherPrompt}>Try another question</button>
        <p className="small-copy">Use the answer as a starting point, then ask a natural follow-up question of your own.</p>
      </div>
    </section>
  );
}
