'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Scale, ExternalLink, X, ChevronRight, Search, ShieldCheck, Info, Loader2 } from 'lucide-react';

export default function CaseExplorerModal({ isOpen, onClose }) {
  const [taxonomy, setTaxonomy] = useState([]);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedAct, setSelectedAct] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [cases, setCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [selectedStudyCase, setSelectedStudyCase] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchTaxonomy();
      fetchCases(null, null, null, '');
    }
  }, [isOpen]);

  const fetchTaxonomy = async () => {
    setLoadingTaxonomy(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('http://localhost:5000/api/assistant/case-explorer/taxonomy', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok && data.success && data.data && data.data.categories) {
        setTaxonomy(data.data.categories);
      }
    } catch (err) {
      console.error('Failed to fetch Case Explorer taxonomy:', err);
    } finally {
      setLoadingTaxonomy(false);
    }
  };

  const fetchCases = async (categoryObj, actObj, sectionNum, searchStr) => {
    setLoadingCases(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const params = new URLSearchParams();
      if (categoryObj) params.append('category', categoryObj.id);
      if (actObj) params.append('actCode', actObj.actCode);
      if (sectionNum) params.append('section', sectionNum);
      if (searchStr && searchStr.trim()) params.append('search', searchStr.trim());

      const res = await fetch(`http://localhost:5000/api/assistant/case-explorer/cases?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setCases(data.data.judgments || []);
      }
    } catch (err) {
      console.error('Failed to fetch Explorer cases:', err);
    } finally {
      setLoadingCases(false);
    }
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setSelectedAct(null);
    setSelectedSection(null);
    fetchCases(cat, null, null, searchQuery);
  };

  const handleSelectAct = (act) => {
    setSelectedAct(act);
    setSelectedSection(null);
    fetchCases(selectedCategory, act, null, searchQuery);
  };

  const handleSelectSection = (sec) => {
    setSelectedSection(sec);
    fetchCases(selectedCategory, selectedAct, sec, searchQuery);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchCases(selectedCategory, selectedAct, selectedSection, val);
  };

  const handleResetFilters = () => {
    setSelectedCategory(null);
    setSelectedAct(null);
    setSelectedSection(null);
    setSearchQuery('');
    fetchCases(null, null, null, '');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-5 font-sans">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#032257] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider flex items-center gap-2">
                <span>Case Explorer & Study Portal</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                  AP High Court (2025–2026)
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 font-medium">
                Grounded Legal Corpus • Category → Act → Section → Precedents
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Breadcrumb Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search judgments by keyword, section, title, or CNR number..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>

            {(selectedCategory || selectedAct || selectedSection || searchQuery) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium overflow-x-auto pb-1">
            <button
              type="button"
              onClick={handleResetFilters}
              className={`hover:underline ${!selectedCategory ? 'font-bold text-blue-700' : ''}`}
            >
              All Categories
            </button>
            {selectedCategory && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className={`truncate max-w-[150px] ${!selectedAct ? 'font-bold text-blue-700' : ''}`}>
                  {selectedCategory.name}
                </span>
              </>
            )}
            {selectedAct && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className={`font-bold ${!selectedSection ? 'text-blue-700' : ''}`}>
                  {selectedAct.actCode}
                </span>
              </>
            )}
            {selectedSection && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-bold text-blue-700">
                  Section {selectedSection}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Main Content Split: Categories/Acts Navigator vs Case Cards */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#F8FAFC]">
          {/* Left Column: Category -> Act -> Section Selection Tree */}
          <div className="md:col-span-4 space-y-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-extrabold text-[#032257] uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-[#0270F7]" />
                Legal Categories
              </h4>

              {loadingTaxonomy ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-4 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading legal corpus taxonomy…</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {taxonomy.map((cat) => {
                    const isCatSelected = selectedCategory && selectedCategory.id === cat.id;
                    return (
                      <div key={cat.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => handleSelectCategory(cat)}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                            isCatSelected
                              ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                          }`}
                        >
                          <div>
                            <p className="leading-snug">{cat.name}</p>
                            <p className="text-[10px] text-slate-500 font-normal">{cat.description}</p>
                          </div>
                          <span className="bg-white text-slate-600 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200 shrink-0 ml-1">
                            {cat.caseCount}
                          </span>
                        </button>

                        {/* Expand Acts if Category Selected */}
                        {isCatSelected && cat.acts && (
                          <div className="pl-3 space-y-1 pt-1 border-l-2 border-blue-200 ml-2">
                            {cat.acts.map((act) => {
                              const isActSelected = selectedAct && selectedAct.actCode === act.actCode;
                              return (
                                <div key={act.actCode} className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectAct(act)}
                                    className={`w-full text-left p-2 rounded-lg border text-[11px] transition-all flex items-center justify-between ${
                                      isActSelected
                                        ? 'bg-blue-100 border-blue-400 text-blue-950 font-bold'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                                    }`}
                                  >
                                    <span className="truncate">{act.name}</span>
                                    <span className="text-[9px] bg-blue-200 text-blue-900 font-mono px-1 rounded">
                                      {act.actCode}
                                    </span>
                                  </button>

                                  {/* Expand Sections if Act Selected */}
                                  {isActSelected && act.sections && act.sections.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pl-2 pt-1">
                                      {act.sections.map((sec) => (
                                        <button
                                          key={sec}
                                          type="button"
                                          onClick={() => handleSelectSection(sec)}
                                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                                            selectedSection === sec
                                              ? 'bg-blue-600 text-white border-blue-700'
                                              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-blue-50'
                                          }`}
                                        >
                                          Sec {sec}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Case Cards List */}
          <div className="md:col-span-8 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-[#032257] uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-600" />
                Verified Precedents ({cases.length})
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">
                Court Code 28~2 • Grounded Dataset
              </span>
            </div>

            {loadingCases ? (
              <div className="flex items-center gap-2 text-xs text-blue-700 bg-white p-6 rounded-2xl border border-slate-200 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Retrieving verified AP High Court precedents…</span>
              </div>
            ) : cases.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                <Info className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No matching judgments found</p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Try clearing your search query or selecting a different Category / Act / Section from the left sidebar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cases.map((c) => (
                  <div
                    key={c.id || c.cnr}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-xs font-extrabold text-blue-950">{c.title}</h5>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {c.court} • Year: {c.decisionYear} ({c.decisionDate}) • CNR: {c.cnr}
                        </p>
                      </div>

                      <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-mono font-bold shrink-0">
                        {c.sourceUrl ? '[OFFICIAL / COURT SOURCE]' : '[DATASET SOURCE]'}
                      </span>
                    </div>

                    {/* Act & Sections badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">
                        {c.act || 'Indian Legislation'}
                      </span>
                      {(c.sections || []).map((sec, sIdx) => (
                        <span key={sIdx} className="bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                          Section {sec}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-slate-700 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{c.summary}"
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                      {c.sourceUrl ? (
                        <button
                          type="button"
                          onClick={() => window.open(c.sourceUrl, '_blank', 'noopener,noreferrer')}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[10px] font-bold border border-blue-200 flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>VIEW OFFICIAL JUDGMENT</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          Original judgment link not available in configured source.
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedStudyCase(c)}
                        className="px-3 py-1 bg-[#0270F7] hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>STUDY CASE</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>AI-generated summaries. Refer to original judgment for complete authoritative text.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold"
          >
            Close Explorer
          </button>
        </div>
      </div>

      {/* STUDY CASE Inner Modal */}
      {selectedStudyCase && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[10000] flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#032257]">
                <BookOpen className="w-5 h-5 text-[#0270F7]" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Study Case — AP High Court Judgment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudyCase(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-[11px] font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>AI-generated summary. Refer to the original judgment for the complete authoritative text.</span>
              </div>

              <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl space-y-1.5">
                <h4 className="text-sm font-extrabold text-blue-950">{selectedStudyCase.title}</h4>
                <p className="text-[11px] text-blue-800 font-mono">
                  {selectedStudyCase.court} • Decision Year: {selectedStudyCase.decisionYear} ({selectedStudyCase.decisionDate || 'Not available in configured source.'})
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  CNR: {selectedStudyCase.cnr || 'Not available in configured source.'} • Identifier: {selectedStudyCase.caseIdentifier || 'Not available in configured source.'} • Bench: {selectedStudyCase.judge || 'Bench / Hon’ble High Court'}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                    Act: {selectedStudyCase.act || 'Not available in configured source.'}
                  </span>
                  {(selectedStudyCase.sections || []).map((sec, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                      Section {sec}
                    </span>
                  ))}
                </div>
              </div>

              {selectedStudyCase.relevanceReason && (
                <div className="space-y-1">
                  <h5 className="font-extrabold text-[#032257] uppercase tracking-wider text-[11px]">
                    Why This Case Is Relevant
                  </h5>
                  <p className="text-blue-950 bg-blue-50/80 p-3 rounded-xl border border-blue-200 font-medium">
                    {selectedStudyCase.relevanceReason}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <h5 className="font-extrabold text-[#032257] uppercase tracking-wider text-[11px]">
                  Case Summary & Ratio Decidendi
                </h5>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {selectedStudyCase.summary || 'Not available in configured source.'}
                </p>
              </div>

              {selectedStudyCase.keyLegalPoints && (
                <div className="space-y-1">
                  <h5 className="font-extrabold text-[#032257] uppercase tracking-wider text-[11px]">
                    Key Judicial Principles & Statutory Interpretation
                  </h5>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 italic">
                    "{selectedStudyCase.keyLegalPoints}"
                  </p>
                </div>
              )}

              <div className="bg-slate-100 p-3 rounded-xl space-y-1 font-mono text-[10px] text-slate-600">
                <p>Provenance: {selectedStudyCase.sourceUrl ? '[OFFICIAL / COURT SOURCE]' : '[DATASET SOURCE]'}</p>
                <p>Configured Court Code: 28~2 (High Court of Andhra Pradesh)</p>
                <p>Repository Source: {selectedStudyCase.sourceRepository || 'vanga/indian-high-court-judgments'}</p>
                <p>Repository URL: {selectedStudyCase.repositoryUrl || 'https://github.com/vanga/indian-high-court-judgments'}</p>
                <p>Official Judgment Link: {selectedStudyCase.sourceUrl || 'Not available in configured source.'}</p>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {selectedStudyCase.sourceUrl ? (
                <button
                  type="button"
                  onClick={() => window.open(selectedStudyCase.sourceUrl, '_blank', 'noopener,noreferrer')}
                  className="px-4 py-2 bg-[#0270F7] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>VIEW OFFICIAL / COURT SOURCE</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-500 italic">
                  Original judgment link is not available in the configured legal source.
                </span>
              )}

              <button
                type="button"
                onClick={() => setSelectedStudyCase(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold"
              >
                Close Study Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
