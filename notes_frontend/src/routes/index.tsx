import {
  $,
  component$,
  useComputed$,
  useSignal,
  useStore,
  useTask$,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

/**
 * Types
 */
type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

type User = {
  email: string;
  name?: string;
};

/**
 * Utilities for environment variables
 */
const getAppName = () =>
  (import.meta.env.PUBLIC_APP_NAME as string) || "NoteEase";
const ACCENT = "#ffab00";
const PRIMARY = "#1976d2";
const SECONDARY = "#388e3c";

/**
 * Local storage keys
 */
const LS_NOTES_KEY = "notes_frontend__notes";
const LS_USER_KEY = "notes_frontend__user";
const LS_VIEWMODE_KEY = "notes_frontend__viewmode";

/**
 * Minimal client-side persistence functions
 */
const loadNotes = (): Note[] => {
  try {
    const raw = localStorage.getItem(LS_NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveNotes = (notes: Note[]) => {
  localStorage.setItem(LS_NOTES_KEY, JSON.stringify(notes));
};

const loadUser = (): User | null => {
  try {
    const raw = localStorage.getItem(LS_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

const saveUser = (user: User | null) => {
  if (user) localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(LS_USER_KEY);
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * Page component
 */
export default component$(() => {
  // App state
  const user = useSignal<User | null>(null);
  const notes = useStore<{ list: Note[] }>({ list: [] });

  // UI state
  const query = useSignal("");
  const tagFilter = useSignal("");
  const showCreate = useSignal(false);
  const showEdit = useSignal(false);
  const showDeleteConfirm = useSignal(false);
  const selectedNote = useSignal<Note | null>(null);
  const viewMode = useSignal<"grid" | "list">("grid");
  const mobileSidebarOpen = useSignal(false);

  // Create/Edit form state
  const form = useStore<{ title: string; content: string; tags: string }>({
    title: "",
    content: "",
    tags: "",
  });

  // Load persisted data
  useTask$(() => {
    user.value = loadUser();
    notes.list = loadNotes();
    const vm = localStorage.getItem(LS_VIEWMODE_KEY);
    if (vm === "grid" || vm === "list") viewMode.value = vm;
  });

  const filteredNotes = useComputed$(() => {
    const q = query.value.trim().toLowerCase();
    const tf = tagFilter.value.trim().toLowerCase();
    return notes.list
      .filter((n) => {
        const matchesQuery =
          !q ||
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q));
        const matchesTag = !tf || n.tags.some((t) => t.toLowerCase() === tf);
        return matchesQuery && matchesTag;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  });

  // Auth actions
  const login = $((email: string, name?: string) => {
    const u: User = { email, name };
    user.value = u;
    saveUser(u);
  });
  const logout = $(() => {
    user.value = null;
    saveUser(null);
  });

  // CRUD actions
  const openCreate = $(() => {
    form.title = "";
    form.content = "";
    form.tags = "";
    showCreate.value = true;
  });

  const openEdit = $((n: Note) => {
    selectedNote.value = n;
    form.title = n.title;
    form.content = n.content;
    form.tags = n.tags.join(", ");
    showEdit.value = true;
  });

  const createNote = $(() => {
    const now = Date.now();
    const newNote: Note = {
      id: uid(),
      title: form.title.trim() || "Untitled",
      content: form.content.trim(),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: now,
      updatedAt: now,
    };
    notes.list = [newNote, ...notes.list];
    saveNotes(notes.list);
    showCreate.value = false;
  });

  const updateNote = $(() => {
    if (!selectedNote.value) return;
    const now = Date.now();
    const updated = notes.list.map((n) =>
      n.id === selectedNote.value!.id
        ? {
            ...n,
            title: form.title.trim() || "Untitled",
            content: form.content.trim(),
            tags: form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            updatedAt: now,
          }
        : n,
    );
    notes.list = updated;
    saveNotes(notes.list);
    selectedNote.value = null;
    showEdit.value = false;
  });

  const confirmDelete = $((n: Note) => {
    selectedNote.value = n;
    showDeleteConfirm.value = true;
  });

  const deleteNote = $(() => {
    if (!selectedNote.value) return;
    notes.list = notes.list.filter((n) => n.id !== selectedNote.value!.id);
    saveNotes(notes.list);
    selectedNote.value = null;
    showDeleteConfirm.value = false;
  });

  const toggleView = $(() => {
    viewMode.value = viewMode.value === "grid" ? "list" : "grid";
    localStorage.setItem(LS_VIEWMODE_KEY, viewMode.value);
  });

  const clearFilters = $(() => {
    query.value = "";
    tagFilter.value = "";
  });

  // Quick-auth fields (frontend-only demo)
  const authForm = useStore<{ email: string; name: string }>({
    email: "",
    name: "",
  });

  return (
    <div class="app-shell">
      {/* Top Navigation */}
      <header class="topnav">
        <div class="brand" onClick$={() => (mobileSidebarOpen.value = false)}>
          <div class="logo" />
          <span class="brand-name">{getAppName()}</span>
        </div>

        <div class="top-actions">
          <button
            class="btn ghost mobile-only"
            onClick$={() => (mobileSidebarOpen.value = !mobileSidebarOpen.value)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>

          <button class="btn ghost" onClick$={toggleView}>
            {viewMode.value === "grid" ? "List view" : "Grid view"}
          </button>

          {user.value ? (
            <div class="user-badge">
              <span class="avatar">{user.value.email[0].toUpperCase()}</span>
              <span class="user-email">{user.value.email}</span>
              <button class="btn outline" onClick$={logout}>
                Logout
              </button>
            </div>
          ) : (
            <div class="auth-inline">
              <input
                type="email"
                placeholder="email"
                value={authForm.email}
                onInput$={(e, el) => (authForm.email = el.value)}
                class="input small"
              />
              <input
                type="text"
                placeholder="name (optional)"
                value={authForm.name}
                onInput$={(e, el) => (authForm.name = el.value)}
                class="input small"
              />
              <button
                class="btn primary"
                onClick$={() => login(authForm.email.trim(), authForm.name.trim())}
                disabled={!authForm.email.trim()}
              >
                Login
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <div class="body">
        {/* Sidebar */}
        <aside class={["sidebar", mobileSidebarOpen.value ? "open" : ""].join(" ")}>
          <div class="sidebar-section">
            <h3>Search</h3>
            <input
              type="text"
              placeholder="Search title, content, tags…"
              value={query.value}
              onInput$={(e, el) => (query.value = el.value)}
              class="input"
            />
          </div>

          <div class="sidebar-section">
            <h3>Tag</h3>
            <input
              type="text"
              placeholder="Exact tag filter (e.g. work)"
              value={tagFilter.value}
              onInput$={(e, el) => (tagFilter.value = el.value)}
              class="input"
            />
          </div>

          <div class="sidebar-actions">
            <button class="btn ghost" onClick$={clearFilters}>
              Clear filters
            </button>
            <button class="btn accent" onClick$={openCreate} disabled={!user.value}>
              + New note
            </button>
            {!user.value && (
              <p class="muted small">
                Login to create notes. Searching works without login.
              </p>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main class="content">
          {filteredNotes.value.length === 0 ? (
            <div class="empty">
              <p>No notes found.</p>
              {user.value && (
                <button class="btn accent" onClick$={openCreate}>
                  Create your first note
                </button>
              )}
            </div>
          ) : viewMode.value === "grid" ? (
            <div class="notes-grid">
              {filteredNotes.value.map((n) => (
                <article key={n.id} class="note-card" onDblClick$={() => openEdit(n)}>
                  <div class="note-header">
                    <h4 class="note-title">{n.title}</h4>
                    <div class="note-controls">
                      <button class="icon-btn" onClick$={() => openEdit(n)} title="Edit">
                        ✎
                      </button>
                      <button
                        class="icon-btn danger"
                        onClick$={() => confirmDelete(n)}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  <p class="note-content">{n.content}</p>
                  {n.tags.length > 0 && (
                    <div class="tags">
                      {n.tags.map((t) => (
                        <span
                          key={t}
                          class="tag"
                          onClick$={() => (tagFilter.value = t)}
                          title="Filter by tag"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div class="meta">
                    <span>
                      Updated: {new Date(n.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div class="notes-list">
              {filteredNotes.value.map((n) => (
                <div key={n.id} class="note-row">
                  <div class="row-main" onDblClick$={() => openEdit(n)}>
                    <div class="row-title">{n.title}</div>
                    <div class="row-snippet">{n.content}</div>
                    <div class="row-tags">
                      {n.tags.map((t) => (
                        <span
                          key={t}
                          class="tag"
                          onClick$={() => (tagFilter.value = t)}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div class="row-actions">
                    <button class="btn ghost small" onClick$={() => openEdit(n)}>
                      Edit
                    </button>
                    <button
                      class="btn outline small danger"
                      onClick$={() => confirmDelete(n)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Create Modal */}
      {showCreate.value && (
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-panel">
            <div class="modal-header">
              <h3>New Note</h3>
              <button class="icon-btn" onClick$={() => (showCreate.value = false)}>
                ✕
              </button>
            </div>
            <div class="modal-body">
              <label class="label">
                Title
                <input
                  class="input"
                  placeholder="Note title"
                  value={form.title}
                  onInput$={(e, el) => (form.title = el.value)}
                />
              </label>
              <label class="label">
                Content
                <textarea
                  class="textarea"
                  placeholder="Write your note..."
                  value={form.content}
                  onInput$={(e, el) => (form.content = el.value)}
                />
              </label>
              <label class="label">
                Tags (comma separated)
                <input
                  class="input"
                  placeholder="work, personal"
                  value={form.tags}
                  onInput$={(e, el) => (form.tags = el.value)}
                />
              </label>
            </div>
            <div class="modal-footer">
              <button class="btn ghost" onClick$={() => (showCreate.value = false)}>
                Cancel
              </button>
              <button class="btn primary" onClick$={createNote}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit.value && (
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-panel">
            <div class="modal-header">
              <h3>Edit Note</h3>
              <button class="icon-btn" onClick$={() => (showEdit.value = false)}>
                ✕
              </button>
            </div>
            <div class="modal-body">
              <label class="label">
                Title
                <input
                  class="input"
                  placeholder="Note title"
                  value={form.title}
                  onInput$={(e, el) => (form.title = el.value)}
                />
              </label>
              <label class="label">
                Content
                <textarea
                  class="textarea"
                  placeholder="Write your note..."
                  value={form.content}
                  onInput$={(e, el) => (form.content = el.value)}
                />
              </label>
              <label class="label">
                Tags (comma separated)
                <input
                  class="input"
                  placeholder="work, personal"
                  value={form.tags}
                  onInput$={(e, el) => (form.tags = el.value)}
                />
              </label>
            </div>
            <div class="modal-footer">
              <button class="btn ghost" onClick$={() => (showEdit.value = false)}>
                Cancel
              </button>
              <button class="btn primary" onClick$={updateNote}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm.value && (
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-panel">
            <div class="modal-header">
              <h3>Delete Note</h3>
              <button
                class="icon-btn"
                onClick$={() => (showDeleteConfirm.value = false)}
              >
                ✕
              </button>
            </div>
            <div class="modal-body">
              <p>
                Are you sure you want to delete "
                <strong>{selectedNote.value?.title}</strong>"?
              </p>
            </div>
            <div class="modal-footer">
              <button
                class="btn ghost"
                onClick$={() => (showDeleteConfirm.value = false)}
              >
                Cancel
              </button>
              <button class="btn danger" onClick$={deleteNote}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrim for mobile sidebar */}
      {mobileSidebarOpen.value && (
        <div
          class="scrim"
          onClick$={() => (mobileSidebarOpen.value = false)}
          aria-hidden="true"
        />
      )}
      <style dangerouslySetInnerHTML={stylesCss} />
    </div>
  );
});

export const head: DocumentHead = {
  title: "Notes",
  meta: [
    {
      name: "description",
      content:
        "Minimalistic notes app with local authentication and CRUD implemented on the frontend.",
    },
  ],
};

/**
 * Inline styles for the route, themed with provided palette and minimalistic look.
 * Using CSS variables for easy palette customization.
 */
const stylesCss = `
:root {
  --color-primary: ${PRIMARY};
  --color-secondary: ${SECONDARY};
  --color-accent: ${ACCENT};
  --bg: #ffffff;
  --bg-soft: #f7f9fc;
  --bg-elev: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --border: #e5e7eb;
  --danger: #d32f2f;
  --shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

/* Top Navigation */
.topnav {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  padding: .75rem 1rem;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.brand {
  display: flex;
  align-items: center;
  gap: .5rem;
  user-select: none;
  cursor: pointer;
}
.logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
}
.brand-name {
  font-weight: 600;
  letter-spacing: .2px;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: .5rem;
  flex-wrap: wrap;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-secondary);
  color: #fff;
  display: inline-grid;
  place-items: center;
  font-size: .85rem;
}
.user-email {
  color: var(--muted);
  font-size: .9rem;
}

.auth-inline {
  display: flex;
  gap: .5rem;
  align-items: center;
}

/* Body layout */
.body {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 0;
  min-height: 0;
}

/* Sidebar */
.sidebar {
  position: relative;
  border-right: 1px solid var(--border);
  background: var(--bg-soft);
  padding: 1rem;
  min-height: calc(100vh - 56px);
}
.sidebar-section + .sidebar-section {
  margin-top: 1rem;
}
.sidebar h3 {
  margin: 0 0 .5rem 0;
  font-size: .95rem;
  font-weight: 600;
}
.sidebar-actions {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: .5rem;
}

/* Content */
.content {
  padding: 1rem;
}

.empty {
  padding: 4rem 1rem;
  text-align: center;
  color: var(--muted);
  display: grid;
  gap: .75rem;
  place-items: center;
}

/* Notes grid */
.notes-grid {
  display: grid;
  grid-template-columns: repeat( auto-fill, minmax(240px, 1fr) );
  gap: 1rem;
}
.note-card {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: .875rem;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
}
.note-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}
.note-content {
  margin: 0;
  color: var(--muted);
  font-size: .95rem;
  white-space: pre-wrap;
}
.tags {
  display: flex;
  gap: .5rem;
  flex-wrap: wrap;
}
.tag {
  padding: .125rem .5rem;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 999px;
  font-size: .75rem;
  color: var(--color-primary);
  cursor: pointer;
}
.meta {
  margin-top: auto;
  font-size: .75rem;
  color: var(--muted);
}

/* Notes list */
.notes-list {
  display: flex;
  flex-direction: column;
  gap: .75rem;
}
.note-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: .75rem;
  padding: .75rem;
  border: 1px solid var(--border);
  background: var(--bg-elev);
  border-radius: 10px;
  box-shadow: var(--shadow);
}
.row-main {
  min-width: 0;
}
.row-title {
  font-weight: 600;
}
.row-snippet {
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-top: .125rem;
  margin-bottom: .375rem;
}
.row-tags {
  display: flex;
  gap: .5rem;
  flex-wrap: wrap;
}
.row-actions {
  display: flex;
  gap: .5rem;
}

/* Inputs */
.input, .textarea, .select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: .6rem .7rem;
  font-size: .95rem;
  background: #fff;
  color: var(--text);
}
.input.small {
  padding: .4rem .6rem;
  font-size: .9rem;
  width: 180px;
}
.textarea {
  min-height: 120px;
  resize: vertical;
}
.label {
  display: grid;
  gap: .375rem;
  font-size: .9rem;
  color: var(--muted);
}

/* Buttons */
.btn {
  border: none;
  border-radius: 8px;
  padding: .55rem .9rem;
  font-weight: 600;
  font-size: .95rem;
  cursor: pointer;
  background: #e7edf7;
  color: var(--color-primary);
}
.btn.small {
  padding: .375rem .6rem;
  font-size: .85rem;
}
.btn.primary {
  background: var(--color-primary);
  color: #fff;
}
.btn.accent {
  background: var(--color-accent);
  color: #1f1300;
}
.btn.outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}
.btn.ghost {
  background: transparent;
  color: var(--text);
}
.btn.danger {
  background: var(--danger);
  color: #fff;
}
.icon-btn {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.icon-btn.danger {
  color: var(--danger);
  border-color: #f2b8b5;
}

/* Modal */
.modal {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(2, 6, 23, .4);
  z-index: 50;
  padding: 1rem;
}
.modal-panel {
  width: 100%;
  max-width: 560px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  overflow: hidden;
}
.modal-header, .modal-footer {
  padding: .9rem 1rem;
  display: flex;
  align-items: center;
  gap: .5rem;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
}
.modal-footer {
  border-top: 1px solid var(--border);
  border-bottom: none;
}
.modal-body {
  padding: 1rem;
  display: grid;
  gap: .75rem;
}

/* Scrim */
.scrim {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, .35);
  z-index: 30;
}

/* Responsive */
.mobile-only { display: none; }

@media (max-width: 1024px) {
  .body {
    grid-template-columns: 260px 1fr;
  }
}
@media (max-width: 768px) {
  .mobile-only { display: inline-flex; }
  .body {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: fixed;
    top: 56px;
    left: 0;
    bottom: 0;
    width: 82%;
    max-width: 360px;
    transform: translateX(-100%);
    transition: transform .2s ease;
    z-index: 40;
  }
  .sidebar.open {
    transform: translateX(0);
  }
}
`;
