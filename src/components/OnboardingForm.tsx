"use client";

import { useState } from "react";
import { onboardUser } from "@/actions/onboard";

export default function OnboardingForm({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State Fields
  const [school, setSchool] = useState("");
  const [classYear, setClassYear] = useState("");
  const [age, setAge] = useState("");
  
  // POINT 2: Updated default state to match the first new learning option
  const [teachingMethod, setTeachingMethod] = useState("Visual & examples");

  // Dynamic Skill States
  const [teachSkill, setTeachSkill] = useState("");
  const [teachLevel, setTeachLevel] = useState("Basic");
  const [skillsToTeach, setSkillsToTeach] = useState<{ skill: string; level: string }[]>([]);

  const [learnSkill, setLearnSkill] = useState("");
  const [learnLevel, setLearnLevel] = useState("Basic");
  const [skillsToLearn, setSkillsToLearn] = useState<{ skill: string; level: string }[]>([]);

  // Days Selection State
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const daysList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // POINT 2: New Learning Options Array
  const learningStylesList = [
    "Visual & examples",
    "Discussion-based",
    "Debate-oriented",
    "Project-based"
  ];

  const toggleDay = (day: string) => {
    setPreferredDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAddTeachSkill = () => {
    if (teachSkill.trim()) {
      setSkillsToTeach([...skillsToTeach, { skill: teachSkill.trim(), level: teachLevel }]);
      setTeachSkill("");
    }
  };

  const handleAddLearnSkill = () => {
    if (learnSkill.trim()) {
      setSkillsToLearn([...skillsToLearn, { skill: learnSkill.trim(), level: learnLevel }]);
      setLearnSkill("");
    }
  };

  const handleSubmit = async () => {
    if (!school || !classYear || !age) {
      alert("Please fill out your personal details in Step 1!");
      setStep(1);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        school,
        classYear,
        age,
        skillsToTeach,
        skillsToLearn,
        preferredDays,
        teachingMethod, // This will pass the selected learning style to your action
      };
      
      const res = await onboardUser(payload);
      if (res.success) {
        onComplete();
      }
    } catch (err) {
      console.error("Onboarding Error:", err);
      alert("Something went wrong while saving details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-[#121214] border border-zinc-800 rounded-2xl p-8 shadow-2xl text-white space-y-6">
      
      {/* Header (PDF Theme Style) */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-purple-400">Complete Profile</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Let's set up your SkillSwap profile</p>
        </div>
        <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-md font-mono">
          Step {step} of 3
        </span>
      </div>

      {/* STEP 1: Academic & Personal Info */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Academic Info</h3>
          <div>
            <label className="text-xs text-zinc-400 block mb-1 font-medium">School Name</label>
            <input 
              type="text" 
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5 text-sm focus:border-purple-500 outline-none transition-all" 
              placeholder="e.g. Gurukul The School" 
              value={school} 
              onChange={e => setSchool(e.target.value)} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1 font-medium">Class / Grade</label>
              <input 
                type="text" 
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5 text-sm focus:border-purple-500 outline-none transition-all" 
                placeholder="e.g. XII-S1" 
                value={classYear} 
                onChange={e => setClassYear(e.target.value)} 
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1 font-medium">Age</label>
              <input 
                type="number" 
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5 text-sm focus:border-purple-500 outline-none transition-all" 
                placeholder="e.g. 17" 
                value={age} 
                onChange={e => setAge(e.target.value)} 
              />
            </div>
          </div>
          <button 
            onClick={() => setStep(2)} 
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 font-medium rounded-xl transition-all text-sm mt-4 shadow-lg shadow-purple-600/10"
          >
            Continue to Skills
          </button>
        </div>
      )}

      {/* STEP 2: Skills Setup */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Skills to Teach */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-2">What can you teach? 🌟</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-sm outline-none focus:border-purple-500" 
                placeholder="e.g. Python" 
                value={teachSkill} 
                onChange={e => setTeachSkill(e.target.value)} 
              />
              <select 
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-sm outline-none text-zinc-300" 
                value={teachLevel} 
                onChange={e => setTeachLevel(e.target.value)}
              >
                <option value="Basic">Basic</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advance">Advance</option>
              </select>
              <button 
                onClick={handleAddTeachSkill} 
                className="px-4 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-bold transition-all"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {skillsToTeach.map((s, i) => (
                <span key={i} className="text-xs bg-purple-500/10 border border-purple-500/30 text-purple-300 px-2.5 py-1 rounded-lg">
                  {s.skill} • <span className="text-zinc-500 text-[10px] uppercase font-bold">{s.level}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Skills to Learn */}
          <div className="border-t border-zinc-800/60 pt-4">
            <h3 className="text-sm font-semibold text-zinc-400 mb-2">What do you want to learn? 🧠</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-sm outline-none focus:border-purple-500" 
                placeholder="e.g. Photoshop" 
                value={learnSkill} 
                onChange={e => setLearnSkill(e.target.value)} 
              />
              <select 
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-sm outline-none text-zinc-300" 
                value={learnLevel} 
                onChange={e => setLearnLevel(e.target.value)}
              >
                <option value="Basic">Basic</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advance">Advance</option>
              </select>
              <button 
                onClick={handleAddLearnSkill} 
                className="px-4 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-bold transition-all"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {skillsToLearn.map((s, i) => (
                <span key={i} className="text-xs bg-purple-500/10 border border-purple-500/30 text-purple-200 px-2.5 py-1 rounded-lg">
                  {s.skill} • <span className="text-zinc-500 text-[10px] uppercase font-bold">{s.level}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(1)} className="w-1/3 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-all">Back</button>
            <button onClick={() => setStep(3)} className="w-2/3 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-medium transition-all">Preferences</button>
          </div>
        </div>
      )}

      {/* STEP 3: Mode and Days Preferences */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            {/* POINT 2: Replaced old options completely with new psychometric styles */}
            <h3 className="text-sm font-semibold text-zinc-400 mb-2">Preferred Learning Mode</h3>
            <select 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-sm outline-none text-white focus:border-purple-500" 
              value={teachingMethod} 
              onChange={e => setTeachingMethod(e.target.value)}
            >
              {learningStylesList.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-2">Preferred Days Available</h3>
            <div className="grid grid-cols-3 gap-2">
              {daysList.map((day) => {
                const isSelected = preferredDays.includes(day);
                return (
                  <button 
                    key={day} 
                    type="button"
                    onClick={() => toggleDay(day)} 
                    className={`p-2 text-xs font-medium rounded-xl border transition-all duration-150 ${
                      isSelected 
                        ? "bg-purple-600/20 border-purple-500 text-purple-300 font-bold" 
                        : "bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {day.substring(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button onClick={() => setStep(2)} className="w-1/3 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-all">Back</button>
            <button 
              onClick={handleSubmit} 
              disabled={loading} 
              className="w-2/3 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 font-medium rounded-xl text-sm shadow-lg shadow-purple-600/20 flex items-center justify-center transition-all"
            >
              {loading ? "Saving Profile..." : "Finish & Save Profile 🎉"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}