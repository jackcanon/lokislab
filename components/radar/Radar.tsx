"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "./radar.css";
import Projects, { type Project } from "./Projects";
import VisualMark from "./VisualMark";

type Person = {
  id: string;
  name: string;
  category: string;
  topic: string;
  why: string;
  projects: { name: string; url: string }[];
  links: { label: string; url: string }[];
  evidence: { url: string; summary: string; checked_at: string }[];
  caveat: string;
  priority: boolean;
  default_watch: boolean;
  capability_status: string;
};
type Catalog = {
  researched_at: string;
  people: Person[];
  communities: { name: string; url: string; focus: string }[];
};
type Item = {
  id: string;
  person_id?: string;
  name: string;
  title: string;
  url: string;
  source: string;
  event_date: string | null;
  observed_at: string;
  summary: string;
};
type Feed = {
  scanned_at: string | null;
  sources: { name: string; status: string; detail: string }[];
  updates: Item[];
  candidates: Item[];
};
type Personal = {
  watch: Record<string, boolean>;
  notes: Record<string, string>;
  added: Person[];
};
const key = "jacks-ai-radar-v1";
const empty: Personal = { watch: {}, notes: {}, added: [] };
function safeURL(value: string) {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
function SourceLink({
  url,
  children,
}: {
  url: string;
  children: React.ReactNode;
}) {
  const href = safeURL(url);
  return href ? (
    <a href={href} target="_blank" rel="noreferrer">
      {children} ↗
    </a>
  ) : (
    <span>{children}</span>
  );
}
function date(value: string | null) {
  return value
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00-07:00` : value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "America/Phoenix",
      })
    : "Date not supplied";
}

export default function Radar({
  catalog,
  feed,
  projects,
}: {
  catalog: Catalog;
  feed: Feed;
  projects: Project[];
}) {
  const [personal, setPersonal] = useState<Personal>(empty);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [section, setSection] = useState("people");
  const [feedPerson, setFeedPerson] = useState("");
  const [signalQuery, setSignalQuery] = useState("");
  const [selected, setSelected] = useState<Person | null>(null);
  const [adding, setAdding] = useState(false);
  const leadDialog = useRef<HTMLDialogElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (adding && !leadDialog.current?.open) leadDialog.current?.showModal();
    else if (!adding && leadDialog.current?.open) leadDialog.current.close();
  }, [adding]);
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
    else if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const raw = JSON.parse(localStorage.getItem(key) || "null");
        if (raw && raw.watch && raw.notes && Array.isArray(raw.added))
          setPersonal(raw);
      } catch {
        setNotice("Your saved browser data could not be loaded.");
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  function save(next: Personal) {
    setPersonal(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setNotice("Saved in this browser.");
    } catch {
      setNotice(
        "Browser storage is unavailable. Export your notes before leaving.",
      );
    }
  }
  const people = [...catalog.people, ...personal.added].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  const watching = (p: Person) => personal.watch[p.id] ?? p.default_watch;
  const filtered = people.filter(
    (p) =>
      (!category || p.category === category) &&
      (!savedOnly || watching(p)) &&
      [p.name, p.why, p.topic, ...p.projects.map((x) => x.name)]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const signals = (
    section === "updates" ? feed.updates : feed.candidates
  ).filter(
    (item) =>
      (section !== "updates" ||
        !feedPerson ||
        item.person_id === feedPerson) &&
      [item.title, item.name, item.source, item.summary]
        .join(" ")
        .toLowerCase()
        .includes(signalQuery.toLowerCase()),
  );
  function exportData() {
    const data = {
      ...catalog,
      people: people.map((p) => ({
        ...p,
        on_watchlist: watching(p),
        personal_notes: personal.notes[p.id] || "",
      })),
      exported_at: new Date().toISOString(),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-radar-catalog.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importData(file: File) {
    try {
      if (file.size > 2000000) throw Error();
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.people)) throw Error();
      const next: Personal = {
        watch: { ...personal.watch },
        notes: { ...personal.notes },
        added: [...personal.added],
      };
      for (const p of data.people) {
        if (typeof p.id !== "string" || typeof p.name !== "string") continue;
        if (typeof p.on_watchlist === "boolean")
          next.watch[p.id] = p.on_watchlist;
        if (typeof p.personal_notes === "string")
          next.notes[p.id] = p.personal_notes.slice(0, 20000);
        if (
          !people.some((x) => x.id === p.id) &&
          typeof p.why === "string" &&
          Array.isArray(p.links) &&
          p.links.every(
            (x: { url: string }) => typeof x.url === "string" && safeURL(x.url),
          )
        ) {
          next.added.push({
            id: p.id,
            name: p.name.slice(0, 200),
            why: p.why.slice(0, 4000),
            category: [
              "Builders",
              "Creative & media",
              "Research & perspectives",
            ].includes(p.category)
              ? p.category
              : "Builders",
            topic:
              typeof p.topic === "string"
                ? p.topic.slice(0, 200)
                : "New discovery",
            links: p.links
              .filter(
                (x: { label: string; url: string }) =>
                  typeof x.label === "string",
              )
              .map((x: { label: string; url: string }) => ({
                label: x.label.slice(0, 200),
                url: x.url,
              })),
            projects: [],
            evidence: [],
            priority: false,
            default_watch: true,
            capability_status: "Needs review",
            caveat:
              "Imported personal lead. Identity and capabilities need review.",
          });
        }
      }
      save(next);
      setNotice(
        "Imported bookmarks and notes. Personal leads are awaiting review.",
      );
    } catch {
      setNotice(
        "This file could not be imported. Use a Radar catalog export under 2 megabytes.",
      );
    }
  }
  return (
    <main className="radar">
      <section className="radar-hero">
        <p className="radar-eyebrow">The people behind the progress</p>
        <h1>
          AI Radar<span>.</span>
        </h1>
        <p className="radar-intro">
          Artificial intelligence moves fast. Follow the builders, explore their
          work, and keep the evidence close.
        </p>
        <div className="radar-stats">
          <div>
            <strong>{catalog.people.length}</strong>
            <span>People to follow</span>
          </div>
          <div>
            <strong>{projects.length}</strong>
            <span>Projects to follow</span>
          </div>
          <div>
            <strong>{feed.updates.length}</strong>
            <span>Recent signals</span>
          </div>
        </div>
        <div className="radar-scan">
          {feed.scanned_at ? (
            <>
              Last scan: {date(feed.scanned_at)} · Daily scan at 8:00 a.m.
              Arizona time
            </>
          ) : (
            <>First scan pending</>
          )}
          <details>
            <summary>What gets scanned?</summary>
            <p>
              Public GitHub repositories, selected creator feeds and watched
              project websites. GitHub, Hacker News and Reddit supply discovery leads
              when available. Repository activity is a signal to investigate,
              not proof of a notable release or tested capability.
            </p>
            <p>
              Personal bookmarks and notes stay in this browser. Imported leads
              are not automatically monitored. Catalog additions require review.
            </p>
            {feed.sources.map((s) => (
              <p key={s.name}>
                <strong>{s.name}:</strong> {s.status} — {s.detail}
              </p>
            ))}
          </details>
        </div>
      </section>
      <nav className="radar-tabs" aria-label="Radar sections">
        {[
          ["people", "People"],
          ["projects", "Projects"],
          ["updates", "Latest signals"],
          ["discoveries", "Discovery queue"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={section === value}
            onClick={() => setSection(value)}
          >
            {label}
            {value === "discoveries" ? ` (${feed.candidates.length})` : ""}
          </button>
        ))}
      </nav>
      {section === "people" && (
        <>
          <div className="radar-toolbar">
            <label className="radar-search">
              <span>Search people & projects</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="A person, project, or idea…"
              />
            </label>
            <label>
              <span>Focus</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All perspectives</option>
                {[...new Set(people.map((p) => p.category))].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <button
              aria-pressed={savedOnly}
              onClick={() => setSavedOnly(!savedOnly)}
            >
              ★ My bookmarks
            </button>
          </div>
          <div className="radar-results">
            <p>
              {filtered.length} of {people.length} people
            </p>
            <div>
              <button onClick={exportData}>Export notes</button>
              <button onClick={() => setAdding(true)}>Add private lead</button>
              <button className="radar-import" onClick={() => importInput.current?.click()}>
                Import notes
              </button>
                <input
                  ref={importInput}
                  hidden
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void importData(file);
                    e.target.value = "";
                  }}
                />
            </div>
          </div>
          <div className="radar-grid">
            {filtered.map((p) => (
              <article
                key={p.id}
                className="radar-card"
              >
                <div className="radar-card-top">
                  <VisualMark id={p.id} name={p.name} />
                  <button
                    disabled={!ready}
                    aria-label={`${watching(p) ? "Remove" : "Save"} ${p.name} bookmark`}
                    aria-pressed={watching(p)}
                    onClick={() =>
                      save({
                        ...personal,
                        watch: { ...personal.watch, [p.id]: !watching(p) },
                      })
                    }
                  >
                    {watching(p) ? "★" : "☆"}
                  </button>
                </div>
                <h2>{catalog.people.some(x => x.id === p.id) ? <Link href={`/radar/people/${p.id}`}>{p.name}</Link> : p.name}</h2>
                <p className="radar-topic">{p.topic}</p>
                <p>{p.why}</p>
                <div className="radar-card-bottom">
                  <button onClick={() => setSelected(p)}>
                    Explore profile ↗
                  </button>
                  <span>{p.category}</span>
                </div>
              </article>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="radar-empty">
              No people match these filters. Try a different search.
            </p>
          )}
          <aside className="radar-communities">
            <p className="radar-eyebrow">Where we look</p>
            <h2>Good conversations lead to good discoveries.</h2>
            <div>
              {catalog.communities.map((c) => (
                <p key={c.name}>
                  <SourceLink url={c.url}>{c.name}</SourceLink>
                  <span>{c.focus}</span>
                </p>
              ))}
            </div>
          </aside>
        </>
      )}
      {section === "projects" && <Projects projects={projects} people={catalog.people} updates={feed.updates} />}
      {(section === "updates" || section === "discoveries") && (
        <section className="radar-feed">
          <h2>
            {section === "updates"
              ? "Work worth a closer look."
              : "New leads. Human judgment next."}
          </h2>
          <p>
            {section === "updates"
              ? "Dated activity from public sources. First scans establish a baseline; later scans identify changes."
              : "Automatically surfaced projects and their public authors. These are unreviewed leads, not recommendations. Popularity and keyword matches help discovery; they do not establish quality."}
          </p>
          <div className="radar-toolbar radar-feed-filters">
            <label className="radar-search">
              <span>Search signals</span>
              <input
                type="search"
                value={signalQuery}
                onChange={(e) => setSignalQuery(e.target.value)}
                placeholder="A person, project, or source…"
              />
            </label>
            {section === "updates" && (
              <label>
                <span>Updates from</span>
                <select
                  value={feedPerson}
                  onChange={(e) => setFeedPerson(e.target.value)}
                >
                  <option value="">All monitored people</option>
                  {[...catalog.people].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <p>{signals.length} signals match this view</p>
          {signals.map((item) => (
            <article key={item.id}>
              <div>
                <span className="radar-eyebrow">
                  {item.source} ·{" "}
                  {item.event_date
                    ? date(item.event_date)
                    : `First observed ${date(item.observed_at)}`}
                </span>
                <h3>
                  <SourceLink url={item.url}>{item.title}</SourceLink>
                </h3>
                <p>{item.name}</p>
                <p>{item.summary}</p>
              </div>
              {item.person_id && (
                <button
                  onClick={() => {
                    const p = people.find((p) => p.id === item.person_id);
                    if (p) setSelected(p);
                  }}
                >
                  About this person
                </button>
              )}
            </article>
          ))}
          {signals.length === 0 && (
            <p className="radar-empty">
              No signals recorded yet. Scan coverage is shown above.
            </p>
          )}
        </section>
      )}
      <output className="radar-notice">{notice}</output>
      <dialog
        ref={leadDialog}
        className="radar-modal"
        aria-labelledby="radar-lead-title"
        onCancel={() => setAdding(false)}
      >
        <button className="radar-close" onClick={() => setAdding(false)}>
          Close ×
        </button>
        <h2 id="radar-lead-title">A person worth investigating.</h2>
        <p>
          This lead stays in your browser. Identity and capabilities need review
          before it joins the monitored catalog.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const fields = new FormData(form);
            const field = (name: string) => {const value = fields.get(name);return typeof value === "string" ? value : "";};
            const url = safeURL(field("url"));
            const input = form.elements.namedItem("url") as HTMLInputElement;
            if (!url) {
              input.setCustomValidity("Use an https or http profile link.");
              input.reportValidity();
              return;
            }
            const name = field("name").trim();
            const why = field("why").trim();
            if (!name || !why) return;
            const person: Person = {
              id: "custom-" + crypto.randomUUID(),
              name,
              why,
              category: field("category"),
              topic: "New discovery",
              projects: [],
              links: [{ label: "Profile", url }],
              evidence: [],
              priority: false,
              default_watch: true,
              capability_status: "Needs review",
              caveat:
                "Personal lead. Identity and capabilities need source review.",
            };
            save({ ...personal, added: [...personal.added, person] });
            form.reset();
            setAdding(false);
          }}
        >
          <label>
            Name
            <input name="name" required maxLength={200} />
          </label>
          <label>
            Profile link
            <input
              name="url"
              type="url"
              required
              onChange={(event) => event.currentTarget.setCustomValidity("")}
            />
          </label>
          <label>
            Perspective
            <select name="category">
              <option>Builders</option>
              <option>Creative &amp; media</option>
              <option>Research &amp; perspectives</option>
            </select>
          </label>
          <label>
            Why follow them?
            <textarea name="why" required maxLength={4000} />
          </label>
          <button className="radar-lead-save" type="submit">
            Save private lead
          </button>
        </form>
      </dialog>
      <dialog
        ref={dialog}
        className="radar-modal"
        aria-labelledby="radar-profile-name"
        onCancel={() => setSelected(null)}
      >
        {selected && (
          <>
            <button className="radar-close" onClick={() => setSelected(null)}>
              Close ×
            </button>
            <p className="radar-eyebrow">{selected.capability_status}</p>
            <VisualMark id={selected.id} name={selected.name} large />
            <h2 id="radar-profile-name">{selected.name}</h2>
            <p>{selected.why}</p>
            <h3>Explore the work</h3>
            <ul>
              {[
                ...selected.projects,
                ...selected.links.map((l) => ({ name: l.label, url: l.url })),
              ].map((l, i) => (
                <li key={`${l.url}-${i}`}>
                  <SourceLink url={l.url}>{l.name}</SourceLink>
                </li>
              ))}
            </ul>
            <h3>Sources & context</h3>
            {selected.evidence.map((e, i) => (
              <p key={i}>
                {e.summary} <SourceLink url={e.url}>Source</SourceLink> ·
                checked {date(e.checked_at)}
              </p>
            ))}
            <p className="radar-caveat">{selected.caveat}</p>
            {personal.added.some((person) => person.id === selected.id) && (
              <button
                className="radar-close"
                onClick={() => {
                  save({
                    ...personal,
                    added: personal.added.filter(
                      (person) => person.id !== selected.id,
                    ),
                  });
                  setSelected(null);
                }}
              >
                Remove private lead
              </button>
            )}
            <label>
              Your private field notes
              <textarea
                value={personal.notes[selected.id] || ""}
                onChange={(e) =>
                  save({
                    ...personal,
                    notes: { ...personal.notes, [selected.id]: e.target.value },
                  })
                }
                placeholder="What caught your eye? What should we check next?"
              />
            </label>
          </>
        )}
      </dialog>
    </main>
  );
}
