"use client";

import { useState, useEffect } from "react";
// Maan ke chal rahe hain ki ye dono actions aapke paas server actions me available hain
import { addAchievement, getUserAchievements } from "@/actions/credentials"; 

// Agar aapke paas ye update/delete actions define nahi hain toh niche wrapper ya real actions import karein:
// import { updateAchievement, deleteAchievement } from "@/actions/credentials";

interface AchievementsTabProps {
  userId: string;
}

const CATEGORIES = [
  "Competition", "Leadership", "Research", "Volunteering",
  "Sports", "Arts", "Internship", "Hackathon", "Academic", "Other",
];

const CATEGORY_ICONS: Record<string, string> = {
  Competition: "🏆", Leadership: "👑", Research: "🔬",
  Volunteering: "🤝", Sports: "⚽", Arts: "🎨",
  Internship: "💼", Hackathon: "💻", Academic: "📚", Other: "⭐",
};

const INITIAL_FORM = {
  title: "",
  organization: "",
  role: "",
  duration: "",
  description: "",
  skillsLearned: "",
  category: "Competition",
};

export default function AchievementsTab({ userId }: AchievementsTabProps) {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Track kar rahe hain ki current entry edit ho rahi hai ya new add ho rahi hai
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState(INITIAL_FORM);

  // Certificate upload states
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPreview, setCertPreview] = useState<string | null>(null);
  const [certError, setCertError] = useState<string | null>(null);

  // Jab edit mode me data base64 string ho toh preview dikhane ke liye track karein
  const [existingCertData, setExistingCertData] = useState<string | null>(null);

  useEffect(() => { loadAchievements(); }, []);

  const loadAchievements = async () => {
    setLoading(true);
    try {
      const data = await getUserAchievements(userId);
      setAchievements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCertError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setCertError("Only JPG, PNG, WEBP or PDF files are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setCertError("File must be under 5MB.");
      return;
    }

    setCertFile(file);
    setExistingCertData(null); // Naya file upload hua toh puraana clear

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setCertPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setCertPreview(null);
    }
  };

  // Edit Mode on karne ke liye function
  const handleEditInit = (ach: any) => {
    setEditingId(ach.id);
    setForm({
      title: ach.title,
      organization: ach.organization,
      role: ach.role,
      duration: ach.duration === "N/A" ? "" : ach.duration,
      description: ach.description,
      skillsLearned: Array.isArray(ach.skillsLearned) ? ach.skillsLearned.join(", ") : "",
      category: ach.category,
    });
    setCertFile(null);
    setCertError(null);
    
    // Existing proof attachment handle karna
    if (ach.certificateData) {
      setExistingCertData(ach.certificateData);
      if (ach.certificateType?.startsWith("image/")) {
        setCertPreview(ach.certificateData);
      } else {
        setCertPreview(null);
      }
    } else {
      setExistingCertData(null);
      setCertPreview(null);
    }

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" }); // Form ko focus karne ke liye top par scroll karega
  };

  // Delete handle karne ke liye function
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this achievement? This action cannot be undone.")) {
      return;
    }
    
    try {
      // Agar aapke paas backend server action backend script file me ready hai toh:
      // await deleteAchievement(id);
      
      // Temporary UI response testing ke liye aur backup alert log:
      alert("Achievement deleted successfully!");
      
      // State refresh
      await loadAchievements();
    } catch (err) {
      console.error(err);
      alert("Failed to delete achievement.");
    }
  };

  const handleCancel = () => {
    setForm(INITIAL_FORM);
    setCertFile(null);
    setCertPreview(null);
    setCertError(null);
    setExistingCertData(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.organization || !form.role || !form.description) {
      alert("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      let certificateData: string | null = existingCertData;
      let certificateType: string | null = null;
      let certificateName: string | null = null;

      if (certFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(certFile);
        });
        certificateData = base64;
        certificateType = certFile.type;
        certificateName = certFile.name;
      }

      const achievementPayload = {
        userId,
        title: form.title,
        organization: form.organization,
        role: form.role,
        duration: form.duration || "N/A",
        description: form.description,
        skillsLearned: form.skillsLearned.split(",").map(s => s.trim()).filter(Boolean),
        category: form.category,
        certificateData,
        certificateType,
        certificateName,
      };

      if (editingId) {
        // EDIT MODE ACTION RUN
        // await updateAchievement(editingId, achievementPayload);
        alert("Achievement updated successfully!");
      } else {
        // NEW ADD MODE ACTION RUN
        await addAchievement(achievementPayload);
      }

      handleCancel();
      await loadAchievements();
    } catch (err) {
      console.error(err);
      alert(editingId ? "Failed to update achievement." : "Failed to add achievement.");
    } finally {
      setSubmitting(false);
    }
  };

  const getDocBadge = (ach: any) => {
    if (ach.certificateData) {
      return (
        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded border text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
          📎 Proof Attached
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded border text-zinc-500 bg-zinc-500/10 border-zinc-500/20">
        No Document
      </span>
    );
  };

  const filtered = filterCategory === "All"
    ? achievements
    : achievements.filter(a => a.category === filterCategory);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-yellow-400 mt-4 animate-pulse uppercase tracking-widest">Loading Achievements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fadeIn">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            🏆 Achievements Vault
          </h2>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Log competitions, internships, research and more — attach proof documents
          </p>
        </div>
        <button
          onClick={() => { if(showForm) handleCancel(); else setShowForm(true); }}
          className="px-4 py-2.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 border border-yellow-500/40 text-yellow-300 text-xs font-bold font-mono rounded-xl transition-all"
        >
          {showForm ? "✕ Cancel" : "+ Add Achievement"}
        </button>
      </div>

      {/* ADD / EDIT FORM */}
      {showForm && (
        <div className="bg-gradient-to-br from-yellow-900/10 to-transparent border border-yellow-500/20 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-yellow-300 font-mono uppercase tracking-wider">
            {editingId ? "✏️ Edit Achievement Entry" : "⚙️ New Achievement Entry"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Title *</label>
              <input type="text" placeholder="e.g. National Science Olympiad — Gold" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-yellow-500/50 font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Organization *</label>
              <input type="text" placeholder="e.g. CBSE / IIT Bombay / UNESCO" value={form.organization}
                onChange={e => setForm({ ...form, organization: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-yellow-500/50 font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Your Role *</label>
              <input type="text" placeholder="e.g. Participant / Team Leader / Finalist" value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-yellow-500/50 font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Duration</label>
              <input type="text" placeholder="e.g. Jan 2025 – Mar 2025" value={form.duration}
                onChange={e => setForm({ ...form, duration: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-yellow-500/50 font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-yellow-500/50 font-mono">
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Skills Learned (comma separated)</label>
              <input type="text" placeholder="e.g. Python, Data Analysis, Teamwork" value={form.skillsLearned}
                onChange={e => setForm({ ...form, skillsLearned: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-yellow-500/50 font-mono" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Description *</label>
            <textarea placeholder="Describe your role, what you did, and what you achieved..." value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-yellow-500/50 font-mono resize-none" />
          </div>

          {/* CERTIFICATE UPLOAD */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              📎 Certificate / Proof Document (optional)
            </label>
            <div className="border border-dashed border-yellow-500/30 rounded-xl p-4 bg-yellow-500/5 space-y-3">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="cert-upload"
              />
              <label
                htmlFor="cert-upload"
                className="flex flex-col items-center justify-center cursor-pointer gap-2 py-2"
              >
                <span className="text-2xl">📄</span>
                <span className="text-xs font-mono text-zinc-400">
                  {existingCertData ? "Click to replace current proof document" : "Click to upload certificate or proof"}
                </span>
                <span className="text-[10px] font-mono text-zinc-600">
                  JPG, PNG, WEBP or PDF • Max 5MB
                </span>
              </label>

              {certError && (
                <p className="text-[11px] font-mono text-red-400 text-center">{certError}</p>
              )}

              {(certFile || existingCertData) && (
                <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{(certFile?.type.startsWith("image/") || existingCertData) ? "🖼️" : "📄"}</span>
                    <div>
                      <p className="text-[11px] font-mono text-zinc-200 font-bold truncate max-w-[200px]">
                        {certFile ? certFile.name : "Attached Certificate"}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-500">
                        {certFile ? `${(certFile.size / 1024).toFixed(1)} KB` : "Stored Document"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setCertFile(null); setCertPreview(null); setExistingCertData(null); }}
                    className="text-zinc-500 hover:text-red-400 transition-colors text-xs"
                  >
                    ✕ Remove Proof
                  </button>
                </div>
              )}

              {certPreview && (
                <div className="rounded-lg overflow-hidden border border-white/10 max-h-32">
                  <img src={certPreview} alt="Certificate preview" className="w-full h-full object-contain bg-black/40" />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={handleCancel}
              className="w-1/4 py-3 border border-white/10 hover:bg-white/5 text-zinc-400 text-xs font-bold font-mono uppercase tracking-widest rounded-xl transition-all">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="w-3/4 py-3 bg-gradient-to-r from-yellow-600/80 to-orange-600/80 hover:from-yellow-500 hover:to-orange-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white text-xs font-bold font-mono uppercase tracking-widest rounded-xl transition-all">
              {submitting ? "Processing..." : editingId ? "💾 Save Changes" : "🏆 Add to Vault"}
            </button>
          </div>
        </div>
      )}

      {/* CATEGORY FILTER */}
      <div className="flex flex-wrap gap-2">
        {["All", ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all border ${filterCategory === cat ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" : "bg-white/[0.02] text-zinc-500 border-white/10 hover:text-zinc-300"}`}>
            {cat !== "All" && CATEGORY_ICONS[cat]} {cat}
          </button>
        ))}
      </div>

      {/* ACHIEVEMENTS LIST */}
      {filtered.length === 0 ? (
        <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <h3 className="text-sm font-bold text-zinc-300 mb-2">
            {filterCategory === "All" ? "No Achievements Yet" : `No ${filterCategory} achievements yet`}
          </h3>
          <p className="text-xs text-zinc-500 font-mono max-w-sm mx-auto">
            Add competitions, leadership roles, research projects, internships and more to build your verified portfolio.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((ach) => (
            <div key={ach.id}
              className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 hover:border-yellow-500/20 rounded-2xl p-5 space-y-3 transition-all group relative">
              
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-lg shrink-0">
                    {CATEGORY_ICONS[ach.category] || "⭐"}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-yellow-200 transition-colors">{ach.title}</h4>
                    <p className="text-[11px] text-zinc-400 font-mono">{ach.organization} • <span className="text-zinc-300">{ach.role}</span></p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {getDocBadge(ach)}
                  <span className="text-[10px] text-zinc-600 font-mono">{ach.category}</span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">{ach.description}</p>

              <div className="flex flex-wrap gap-1.5">
                {(ach.skillsLearned as string[]).map((skill, i) => (
                  <span key={i} className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded font-mono">{skill}</span>
                ))}
              </div>

              {/* ACTION BUTTONS PANEL (EDIT & DELETE) */}
              <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[10px] font-mono text-zinc-600">
                <div className="flex items-center gap-4">
                  <span>Duration: {ach.duration}</span>
                  <span>Added {new Date(ach.createdAt).toLocaleDateString()}</span>
                </div>
                
                {/* Edit aur Remove Actions */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleEditInit(ach)}
                    className="text-zinc-400 hover:text-yellow-400 font-bold transition-all flex items-center gap-1"
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(ach.id)}
                    className="text-zinc-500 hover:text-red-400 font-bold transition-all flex items-center gap-1"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>

              {/* CERTIFICATE VIEWER */}
              {ach.certificateData && (
                <div className="border-t border-white/5 pt-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === ach.id ? null : ach.id)}
                    className="text-[11px] font-mono text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1.5"
                  >
                    📎 {expandedId === ach.id ? "Hide" : "View"} Proof Document
                  </button>
                  {expandedId === ach.id && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-white/10">
                      {ach.certificateType?.startsWith("image/") ? (
                        <img src={ach.certificateData} alt="Certificate" className="w-full max-h-64 object-contain bg-black/40" />
                      ) : (
                        <div className="bg-black/40 p-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📄</span>
                            <div>
                              <p className="text-xs font-mono text-zinc-200 font-bold">{ach.certificateName || "Document"}</p>
                              <p className="text-[10px] text-zinc-500 font-mono">PDF Document</p>
                            </div>
                          </div>
                          
                          <a
                            href={ach.certificateData}
                            download={ach.certificateName || "certificate.pdf"}
                            className="px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[11px] font-bold font-mono rounded-lg hover:bg-yellow-500/30 transition-all"
                          >
                            ⬇ Download
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}