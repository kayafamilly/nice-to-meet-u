"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Language } from "@/types/api";

type Props = {
  label: string;
  languages: Language[];
  name: string;
  value: string;
  onChange: (languageId: string) => void;
  disabled?: boolean;
  excludeLanguageId?: string;
  excludeLanguageIds?: string[];
  required?: boolean;
  showActivity?: boolean;
};

function searchKey(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
}

export function SearchableLanguageSelect({ label, languages, name, value, onChange, disabled, excludeLanguageId, excludeLanguageIds = [], required = true, showActivity = false }: Props) {
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = languages.find((language) => language.id === value);
  const available = useMemo(() => {
    const excluded = new Set([excludeLanguageId, ...excludeLanguageIds].filter(Boolean));
    return languages.filter((language) => language.id === value || !excluded.has(language.id)).sort((left, right) => {
      if (showActivity && Boolean(left.upcomingSessionCount) !== Boolean(right.upcomingSessionCount)) return left.upcomingSessionCount ? -1 : 1;
      return left.name.localeCompare(right.name);
    });
  }, [excludeLanguageId, excludeLanguageIds, languages, showActivity, value]);
  const filtered = useMemo(() => {
    const key = searchKey(query.trim());
    return key ? available.filter((language) => searchKey(`${language.name} ${language.code}`).includes(key)) : available;
  }, [available, query]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(!required || value ? "" : "Select a language from the list.");
  }, [required, value]);

  const currentActiveIndex = Math.min(activeIndex, Math.max(0, filtered.length - 1));
  const activeLanguage = filtered[currentActiveIndex];

  function openCatalogue() {
    setQuery("");
    setActiveIndex(Math.max(0, available.findIndex((language) => language.id === value)));
    setOpen(true);
  }

  function choose(language: Language) {
    onChange(language.id);
    setQuery(language.name);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openCatalogue();
      if (filtered.length) {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((current) => (current + direction + filtered.length) % filtered.length);
      }
      return;
    }

    if (event.key === "Enter" && open && activeLanguage) {
      event.preventDefault();
      choose(activeLanguage);
    }
  }

  return (
    <div className={`field language-select${open ? " open" : ""}`} ref={containerRef}>
      <label htmlFor={inputId}>{label}</label>
      <div className="language-input-wrap">
        <input
          ref={inputRef}
          id={inputId}
          aria-label={label}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && activeLanguage ? `${listId}-${activeLanguage.id}` : undefined}
          autoComplete="off"
          value={open ? query : selected?.name ?? ""}
          disabled={disabled}
          placeholder="Search or browse languages"
          required={required}
          onFocus={openCatalogue}
          onBlur={() => window.setTimeout(() => {
            if (!containerRef.current?.contains(document.activeElement)) setOpen(false);
          }, 0)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            onChange("");
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          className="language-toggle"
          type="button"
          aria-label={`Browse ${label.toLocaleLowerCase()}`}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => { openCatalogue(); inputRef.current?.focus(); }}
        >
          <span aria-hidden="true">⌄</span>
        </button>
        {!required && value ? (
          <button
            className="language-clear"
            type="button"
            aria-label={`Clear ${label.toLocaleLowerCase()}`}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(false);
              inputRef.current?.focus();
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </div>
      <input type="hidden" name={name} value={value} />
      {open && (
        <div className="language-select-panel" id={listId} role="listbox" aria-label={`${label} options`}>
          <p className="language-result-count">{query ? `${filtered.length} matching languages` : `${available.length} languages — type to narrow the list`}</p>
          {filtered.length === 0 ? <p className="language-empty">No language found. Try another spelling or code.</p> : (
            <div className="language-options">
              {filtered.map((language, index) => (
                <button
                  className={`language-option${language.id === value ? " selected" : ""}${index === currentActiveIndex ? " active" : ""}${showActivity && language.upcomingSessionCount > 0 ? " has-sessions" : ""}`}
                  id={`${listId}-${language.id}`}
                  key={language.id}
                  type="button"
                  role="option"
                  aria-selected={language.id === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(language)}
                >
                  <span>{language.name}</span>{showActivity && language.upcomingSessionCount > 0 ? <small>{language.upcomingSessionCount} session{language.upcomingSessionCount === 1 ? "" : "s"}</small> : <code>{language.code}</code>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
