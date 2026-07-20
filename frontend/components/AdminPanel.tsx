"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Radio,
  AlertOctagon,
  FileText,
  Plus,
  Trash2,
  Pencil,
  Search,
  X,
} from "lucide-react";

type Policy = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  source: string | null;
};

type UsageRow = { provider: string; calls: number };

function normalizeCategory(cat: string): string {
  return cat
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function formatCategory(cat: string): string {
  return cat
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function AdminPanel() {
  // ---- Usage (existing) ----
  const [usage, setUsage] = useState<UsageRow[]>([]);

  // ---- Broadcast (existing) ----
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // ---- Policy Management ----
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "general",
    source: "",
    content: "",
  });
  const [customCategory, setCustomCategory] = useState("");
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // ---- Pagination & Search ----
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalPolicies, setTotalPolicies] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // reset to first page on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ---- Load policies with search & pagination ----
  const loadPolicies = useCallback(async () => {
    setLoadingPolicies(true);
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      const res = await fetch(`/api/admin/policies?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load policies.");
      }
      const data = await res.json();
      setPolicies(data.policies || []);
      setTotalPolicies(data.total || 0);
    } catch (err) {
      console.error("Failed to load policies:", err);
    } finally {
      setLoadingPolicies(false);
    }
  }, [debouncedSearch, currentPage, pageSize]);

  // ---- Load categories (still all, no pagination needed) ----
  async function loadCategories() {
    try {
      const { data, error } = await supabase
        .from("policy_documents")
        .select("category")
        .not("category", "is", null);
      if (error) throw error;
      const unique = Array.from(
        new Set(data.map((row) => row.category).filter(Boolean)),
      ) as string[];
      const defaults = [
        "school_closure",
        "open_burning_law",
        "health_guidance",
        "general",
      ];
      const combined = Array.from(new Set([...defaults, ...unique]));
      setAvailableCategories(combined);
    } catch (err) {
      console.error("Failed to load categories:", err);
      setAvailableCategories([
        "school_closure",
        "open_burning_law",
        "health_guidance",
        "general",
      ]);
    }
  }

  useEffect(() => {
    loadPolicies();
    loadCategories();
  }, [loadPolicies]);

  // ---- Save policy (unchanged) ----
  async function savePolicy() {
    setFormError(null);
    setFormSuccess(null);

    if (!formData.title.trim() || !formData.content.trim()) {
      setFormError("Title and content are required.");
      return;
    }

    const rawCategory =
      formData.category === "custom"
        ? customCategory.trim()
        : formData.category;
    if (!rawCategory) {
      setFormError("Please enter a category.");
      return;
    }
    const finalCategory = normalizeCategory(rawCategory);

    try {
      const payload = {
        ...formData,
        category: finalCategory,
        id: editingPolicy?.id || undefined,
      };

      const res = await fetch("/api/admin/policies", {
        method: editingPolicy ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save policy.");
      }

      setFormSuccess("Policy saved successfully!");
      resetForm();
      await loadPolicies();
      await loadCategories();
    } catch (err: any) {
      setFormError(err.message);
    }
  }

  // ---- Delete ----
  async function deletePolicy(id: string) {
    if (!confirm("Delete this policy?")) return;
    try {
      const res = await fetch(`/api/admin/policies?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      await loadPolicies();
      await loadCategories();
    } catch (err) {
      alert("Failed to delete policy.");
    }
  }

  // ---- Reset form ----
  function resetForm() {
    setFormData({ title: "", category: "general", source: "", content: "" });
    setCustomCategory("");
    setEditingPolicy(null);
    setIsAdding(false);
    setFormError(null);
    setFormSuccess(null);
  }

  // ---- Edit ----
  function startEdit(policy: Policy) {
    const isPredefined = availableCategories.includes(policy.category || "");
    setEditingPolicy(policy);
    setFormData({
      title: policy.title || "",
      category: isPredefined ? policy.category || "general" : "custom",
      source: policy.source || "",
      content: policy.content,
    });
    if (!isPredefined) setCustomCategory(policy.category || "");
    else setCustomCategory("");
    setIsAdding(true);
  }

  // ---- Pagination controls ----
  const totalPages = Math.ceil(totalPolicies / pageSize);
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }

  // ---- Usage (existing) ----
  useEffect(() => {
    async function loadUsage() {
      const { data } = await supabase
        .from("api_usage_logs")
        .select("provider, tokens_or_calls_consumed");
      if (!data) return;
      const rolled: Record<string, number> = {};
      for (const row of data) {
        rolled[row.provider] =
          (rolled[row.provider] ?? 0) + row.tokens_or_calls_consumed;
      }
      setUsage(
        Object.entries(rolled).map(([provider, calls]) => ({
          provider,
          calls,
        })),
      );
    }
    loadUsage();
  }, []);

  // ---- Broadcast (existing) ----
  async function broadcast() {
    if (!broadcastMsg.trim()) return;
    setSending(true);
    setSent(false);
    try {
      await fetch("/api/admin-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: broadcastMsg }),
      });
      setSent(true);
      setBroadcastMsg("");
    } finally {
      setSending(false);
    }
  }

  // ---- Render ----
  return (
    <div className="space-y-8">
      {/* Usage section */}
      <section className="rounded-instrument border border-haze-50 bg-panelRaised p-6">
        <h3 className="flex items-center gap-2 font-display text-lg text-ink">
          <Radio size={18} /> Dependency quota usage
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {usage.map((u) => (
            <div key={u.provider} className="rounded-instrument bg-panel p-3">
              <p className="instrument-label">{u.provider}</p>
              <p className="mt-1 font-mono text-xl text-ink">{u.calls}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Policy Management */}
      <section className="rounded-instrument border border-haze-50 bg-panelRaised p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="flex items-center gap-2 font-display text-lg text-ink">
            <FileText size={18} /> Policy documents (RAG)
          </h3>
          <button
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="flex items-center gap-1 rounded-instrument bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90"
          >
            <Plus size={16} /> Add policy
          </button>
        </div>

        {/* Search & Pagination controls */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-haze-200"
            />
            <input
              type="text"
              placeholder="Search policies…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-instrument border border-haze-50 bg-panelRaised pl-9 pr-9 py-2 text-sm text-ink outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-haze-200 hover:text-ink"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-haze-200">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-instrument border border-haze-50 bg-panelRaised px-2 py-1 text-sm text-ink outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Add/Edit form (unchanged) */}
        {isAdding && (
          <div className="mt-4 rounded-instrument border border-haze-50 bg-panel p-4">
            <h4 className="font-display text-sm text-ink">
              {editingPolicy ? "Edit policy" : "Add new policy"}
            </h4>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Title"
                className="rounded-instrument border border-haze-50 bg-panelRaised px-3 py-2 text-sm text-ink outline-none"
              />
              <input
                value={formData.source}
                onChange={(e) =>
                  setFormData({ ...formData, source: e.target.value })
                }
                placeholder="Source (e.g., MOE Circular)"
                className="rounded-instrument border border-haze-50 bg-panelRaised px-3 py-2 text-sm text-ink outline-none"
              />
              <div>
                <label className="instrument-label text-haze-200">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, category: val });
                    if (val !== "custom") setCustomCategory("");
                  }}
                  className="mt-1 w-full rounded-instrument border border-haze-50 bg-panelRaised px-3 py-2 text-sm text-ink outline-none"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {formatCategory(cat)}
                    </option>
                  ))}
                  <option value="custom">✨ Custom…</option>
                </select>
              </div>
              {formData.category === "custom" && (
                <div>
                  <label className="instrument-label text-haze-200">
                    Custom category name
                  </label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g., Environmental Advocacy"
                    className="mt-1 w-full rounded-instrument border border-haze-50 bg-panelRaised px-3 py-2 text-sm text-ink outline-none"
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Policy content (full text)"
                  rows={4}
                  className="w-full rounded-instrument border border-haze-50 bg-panelRaised px-3 py-2 text-sm text-ink outline-none"
                />
              </div>
            </div>
            {formError && (
              <p className="mt-2 text-sm text-alert">{formError}</p>
            )}
            {formSuccess && (
              <p className="mt-2 text-sm text-clear">{formSuccess}</p>
            )}
            <div className="mt-3 flex gap-3">
              <button
                onClick={savePolicy}
                className="rounded-instrument bg-brand px-4 py-2 text-sm text-white hover:opacity-90"
              >
                {editingPolicy ? "Update" : "Save"}
              </button>
              <button
                onClick={resetForm}
                className="rounded-instrument border border-haze-50 px-4 py-2 text-sm text-haze-200 hover:bg-panel"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Policy list with pagination */}
        {loadingPolicies ? (
          <p className="mt-3 text-sm text-haze-200">Loading policies…</p>
        ) : (
          <>
            <div className="mt-4 space-y-3">
              {policies.length === 0 && (
                <p className="text-sm text-haze-200">No policies found.</p>
              )}
              {policies.map((p) => (
                <div
                  key={p.id}
                  className="flex items-start justify-between gap-4 rounded-instrument border border-haze-50 bg-panel p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm text-ink truncate">
                        {p.title}
                      </span>
                      <span className="instrument-label text-xs text-haze-200">
                        {formatCategory(p.category || "general")}
                      </span>
                      <span className="instrument-label text-xs text-haze-200/60">
                        {p.source}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-haze-200 line-clamp-2">
                      {p.content.substring(0, 120)}…
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => startEdit(p)}
                      className="text-haze-200 hover:text-ink transition-colors p-1"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deletePolicy(p.id)}
                      className="text-haze-200 hover:text-alert transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-4 text-sm text-haze-200">
                <span>
                  {totalPolicies} policy{totalPolicies !== 1 ? "ies" : ""}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={!canPrev}
                    className="rounded-instrument border border-haze-50 px-3 py-1 disabled:opacity-30 hover:bg-panel"
                  >
                    Previous
                  </button>
                  <span className="px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={!canNext}
                    className="rounded-instrument border border-haze-50 px-3 py-1 disabled:opacity-30 hover:bg-panel"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Broadcast section (unchanged) */}
      <section className="rounded-instrument border border-alert/40 bg-panelRaised p-6">
        <h3 className="flex items-center gap-2 font-display text-lg text-alert">
          <AlertOctagon size={18} /> Emergency broadcast
        </h3>
        <p className="mt-1 text-sm text-haze-200">
          Overrides individual filtering — sends to every linked App and
          Telegram endpoint.
        </p>
        <textarea
          value={broadcastMsg}
          onChange={(e) => setBroadcastMsg(e.target.value)}
          rows={3}
          placeholder="e.g. Hazardous levels detected in Klang Valley — avoid outdoor activity until further notice."
          className="mt-3 w-full rounded-instrument border border-haze-50 bg-panel p-3 text-sm text-ink outline-none"
        />
        <button
          onClick={broadcast}
          disabled={sending}
          className="mt-3 w-full rounded-instrument bg-alert py-2.5 font-display text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {sending
            ? "Sending…"
            : sent
              ? "Broadcast sent"
              : "Send emergency broadcast"}
        </button>
      </section>
    </div>
  );
}
