
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from './Button';
import { generateSpeech, searchLongStory, fetchFullBookContent, PRESET_BOOKS } from '../services/geminiService';
import { VoiceName, Story, User } from '../types';
import { decodeAudioData, decodeBase64 } from '../utils/audio';
import { TranslationKeys } from '../utils/i18n';

interface TTSSectionProps {
  user: User | null;
  onUpdateUser: (user: User) => void;
  initialStory?: Story | null;
  onClearInitialStory?: () => void;
  t: TranslationKeys;
}

const VOICES_CONFIG = [
  // International Voices
  { id: VoiceName.Kore, label: "Kore", desc: "Équilibré & Naturel", icon: "👤" },
  { id: VoiceName.Zephyr, label: "Zephyr", desc: "Clair & Doux", icon: "🍃" },
  { id: VoiceName.Puck, label: "Puck", desc: "Énergique & Jeune", icon: "✨" },
  { id: VoiceName.Charon, label: "Charon", desc: "Profond & Mature", icon: "🌑" },
  { id: VoiceName.Fenrir, label: "Fenrir", desc: "Rauque & Puissant", icon: "🐺" },
  // Arabic Specific Voices (Mapped internally)
  { id: VoiceName.Layla, label: "Layla", desc: "Arabic - Soft", icon: "🌙" },
  { id: VoiceName.Hamza, label: "Hamza", desc: "Arabic - Deep", icon: "🕌" },
  { id: VoiceName.Noor, label: "Noor", desc: "Arabic - Energetic", icon: "☀️" },
  { id: VoiceName.Zaid, label: "Zaid", desc: "Arabic - Formal", icon: "🦅" },
];

const BookCard: React.FC<{ book: Partial<Story>; onClick: (book: Partial<Story>) => void }> = ({ book, onClick }) => {
  return (
    <div 
      onClick={() => onClick(book)}
      className="group relative flex flex-col h-full bg-zinc-900/40 hover:bg-zinc-800 border border-white/5 rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-2 active:scale-95 shadow-xl hover:shadow-indigo-500/20"
    >
      <div className={`h-40 bg-gradient-to-br ${book.coverGradient || 'from-indigo-600 to-purple-700'} flex items-center justify-center text-5xl transition-transform duration-700 group-hover:scale-110`}>
        <span className="drop-shadow-lg">{book.coverEmoji || '📖'}</span>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-bold text-white text-xs line-clamp-2 mb-1">{book.title}</h3>
        <p className="text-[9px] text-zinc-500 uppercase font-black">{book.author || 'Anonyme'}</p>
      </div>
    </div>
  );
};

export const TTSSection: React.FC<TTSSectionProps> = ({ user, onUpdateUser, initialStory, onClearInitialStory, t }) => {
  const [activeStory, setActiveStory] = useState<Partial<Story> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLang, setSearchLang] = useState<'fr' | 'en' | 'ar'>(user?.preferredLanguage || 'fr');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(user?.preferredVoice || VoiceName.Kore);
  const [isSoothing, setIsSoothing] = useState(user?.zenModeDefault ?? true);
  const [view, setView] = useState<'shelf' | 'reader'>('shelf');
  const [activeCategory, setActiveCategory] = useState("Tous");
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const lastChunkStartRef = useRef<number>(0);
  
  // Cache pour stocker les buffers audio pré-chargés
  // Clé: index du chunk, Valeur: AudioBuffer
  const audioBufferCache = useRef<Map<number, AudioBuffer>>(new Map());

  useEffect(() => {
    if (initialStory) {
      handleSelectBook(initialStory);
      onClearInitialStory?.();
    }
  }, [initialStory]);

  const chunks = useMemo(() => {
    if (!activeStory?.content) return [];
    return activeStory.content.split(/\n\n+/).filter(c => c.trim().length > 5);
  }, [activeStory?.content]);

  const filteredBooks = useMemo(() => {
    let books = [...PRESET_BOOKS, ...(user?.library || [])];
    if (activeCategory === "Arabe") return books.filter(b => b.language === 'ar');
    if (activeCategory === "Créations") return user?.library || [];
    if (activeCategory !== "Tous") return books.filter(b => b.category === activeCategory);
    return books;
  }, [activeCategory, user?.library]);

  // Fonction pour pré-charger un chunk spécifique
  const preloadChunk = async (index: number) => {
    if (!chunks[index] || audioBufferCache.current.has(index)) return;

    try {
      // On ne set pas loadingAudio ici car c'est en background
      const audioBase64 = await generateSpeech(chunks[index], selectedVoice, isSoothing);
      if (!audioContextRef.current) {
         audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const decoded = decodeBase64(audioBase64);
      const audioBuffer = await decodeAudioData(decoded, audioContextRef.current, 24000, 1);
      audioBufferCache.current.set(index, audioBuffer);
      console.log(`Preloaded chunk ${index}`);
    } catch (e) {
      console.warn(`Failed to preload chunk ${index}`, e);
    }
  };

  const handleSelectBook = async (book: Partial<Story>) => {
    setActiveStory(book);
    setView('reader');
    setLoadingContent(true);
    setCurrentChunkIndex(0);
    setIsPlaying(false);
    audioBufferCache.current.clear(); // Vider le cache pour le nouveau livre
    
    // Auto-select best voice
    if (book.language === 'ar') setSelectedVoice(VoiceName.Layla);
    else if (book.language === 'en') setSelectedVoice(VoiceName.Zephyr);
    else setSelectedVoice(VoiceName.Kore);

    if (book.content) {
       setLoadingContent(false);
       // Pré-charger le premier paragraphe immédiatement
       setTimeout(() => preloadChunk(0), 100);
    } else {
      try {
        const fullContent = await fetchFullBookContent(book, book.language);
        setActiveStory(prev => ({ ...prev, content: fullContent }));
        // Le pré-chargement se fera via le useEffect qui écoute chunks si nécessaire, 
        // ou manuellement ici une fois le content set.
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingContent(false);
      }
    }
  };

  // Effect pour pré-charger le premier chunk quand le contenu arrive
  useEffect(() => {
    if (chunks.length > 0 && !audioBufferCache.current.has(0)) {
       preloadChunk(0);
    }
  }, [chunks, selectedVoice]);

  const handleGenerateCustomStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const newStory = await searchLongStory(searchQuery, searchLang) as Story;
      
      if (user) {
        onUpdateUser({
          ...user,
          stats: {
            ...user.stats,
            storiesGenerated: user.stats.storiesGenerated + 1,
            lastActive: Date.now()
          },
          library: [newStory, ...user.library]
        });
      }

      handleSelectBook(newStory);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
      setSearchQuery('');
    }
  };

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch(e) {}
    }
    
    if (isPlaying && user) {
       const sessionTime = (Date.now() - lastChunkStartRef.current) / 1000;
       onUpdateUser({
         ...user,
         stats: {
           ...user.stats,
           totalListeningTime: user.stats.totalListeningTime + sessionTime
         }
       });
    }

    setIsPlaying(false);
  };

  const handleRead = async (index: number = 0) => {
    if (!chunks[index]) {
      setIsPlaying(false);
      return;
    }

    stopAudio();
    setIsPlaying(true);
    setCurrentChunkIndex(index);
    lastChunkStartRef.current = Date.now();

    // 1. Déclencher le pré-chargement des DEUX prochains paragraphes en arrière-plan
    preloadChunk(index + 1);
    preloadChunk(index + 2);

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      let audioBuffer: AudioBuffer;

      // 2. Vérifier si le paragraphe actuel est déjà en cache
      if (audioBufferCache.current.has(index)) {
        audioBuffer = audioBufferCache.current.get(index)!;
      } else {
        // Sinon, le charger maintenant (ce sera plus lent pour celui-ci, mais les suivants seront prêts)
        setLoadingAudio(true);
        const audioBase64 = await generateSpeech(chunks[index], selectedVoice, isSoothing);
        const decoded = decodeBase64(audioBase64);
        audioBuffer = await decodeAudioData(decoded, audioContextRef.current, 24000, 1);
        audioBufferCache.current.set(index, audioBuffer);
        setLoadingAudio(false);
      }
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        if (isPlaying) {
          handleRead(index + 1);
        }
      };

      audioSourceRef.current = source;
      source.start();
    } catch (err) {
      console.error(err);
      setIsPlaying(false);
      setLoadingAudio(false);
      alert("Erreur de synthèse vocale. Veuillez réessayer.");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {view === 'shelf' ? (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <div>
              <h2 className="text-5xl font-black mb-2 text-white tracking-tighter">
                {t.hello}, <span className="text-indigo-500">{user?.name}</span>
              </h2>
              <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest italic">{t.exploreWhat}</p>
            </div>
            
            <div className="w-full md:w-[600px] flex flex-col gap-3">
              <form onSubmit={handleGenerateCustomStory} className="flex gap-2">
                <div className="relative flex-1 group">
                  <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all group-hover:border-white/20"
                  />
                  {searchQuery && (
                    <button type="submit" className={`absolute ${user?.preferredLanguage === 'ar' ? 'left-2' : 'right-2'} top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-2`}>
                      {isGenerating ? (
                        <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      )}
                      {t.generate}
                    </button>
                  )}
                </div>
              </form>
              
              <div className="flex justify-end gap-2 items-center">
                <span className="text-[9px] font-black text-zinc-600 uppercase">{t.language} :</span>
                {[
                  { id: 'fr', flag: '🇫🇷' },
                  { id: 'en', flag: '🇬🇧' },
                  { id: 'ar', flag: '🇲🇦' }
                ].map(lang => (
                  <button
                    key={lang.id}
                    onClick={() => setSearchLang(lang.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all ${
                      searchLang === lang.id 
                      ? 'bg-white border-white text-black shadow-lg shadow-white/10' 
                      : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-white'
                    }`}
                  >
                    {lang.flag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-8">
            {Object.keys(t.categories).map(catKey => (
              <button
                key={catKey}
                onClick={() => setActiveCategory(catKey)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all border whitespace-nowrap ${
                  activeCategory === catKey ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-white'
                }`}
              >
                {(t.categories as any)[catKey]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredBooks.length > 0 ? (
              filteredBooks.map(book => (
                <BookCard key={book.id} book={book} onClick={handleSelectBook} />
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <p className="text-zinc-600 font-bold uppercase text-xs">{t.emptyLibrary}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in zoom-in-95 duration-500">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => { stopAudio(); setView('shelf'); }} className="text-zinc-500 hover:text-white font-bold text-xs flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-xl border border-white/5">
              <svg className={`w-4 h-4 ${user?.preferredLanguage === 'ar' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg> {t.backToLibrary}
            </button>
            <div className="flex gap-4 items-center">
               <button 
                onClick={() => setIsSoothing(!isSoothing)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 ${isSoothing ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'bg-zinc-800 text-zinc-500'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSoothing ? 'bg-white animate-pulse' : 'bg-zinc-600'}`}></span>
                {t.zenMode}: {isSoothing ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">{t.narrator}</h4>
              <div className="grid grid-cols-1 gap-2">
                {VOICES_CONFIG.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { 
                      stopAudio(); 
                      setSelectedVoice(v.id); 
                      audioBufferCache.current.clear(); // Clear cache on voice change
                    }}
                    className={`p-3 rounded-2xl border transition-all flex items-center gap-3 text-left group ${
                      selectedVoice === v.id 
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-xl' 
                      : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:border-white/10'
                    }`}
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{v.icon}</span>
                    <div className={user?.preferredLanguage === 'ar' ? 'text-right' : ''}>
                      <div className="text-xs font-black">{v.label}</div>
                      <div className="text-[9px] opacity-60 font-medium">{v.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-zinc-950 border border-white/5 rounded-[32px] overflow-hidden flex flex-col shadow-2xl min-h-[500px]">
                <div className={`h-24 bg-gradient-to-r ${activeStory?.coverGradient} flex items-center px-8 gap-4`}>
                   <span className="text-4xl">{activeStory?.coverEmoji}</span>
                   <div className={user?.preferredLanguage === 'ar' ? 'text-right' : ''}>
                     <h1 className="text-lg font-black text-white leading-tight">{activeStory?.title}</h1>
                     <p className="text-[10px] font-bold text-white/60 uppercase">
                       {activeStory?.author}
                     </p>
                   </div>
                </div>

                <div className="flex-1 p-8 md:p-10 flex flex-col bg-[#0d0f12]">
                  {loadingContent ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                      <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                      <p className="text-zinc-500 text-xs font-black uppercase tracking-tighter">{t.preparing}</p>
                    </div>
                  ) : (
                    <>
                      <div className={`flex-1 overflow-y-auto pr-4 mb-8 custom-scrollbar ${activeStory?.language === 'ar' ? 'rtl text-right' : 'text-left'}`}>
                        {chunks.map((chunk, i) => (
                          <div 
                            key={i} 
                            className={`mb-4 transition-all duration-500 p-4 rounded-2xl border ${
                              currentChunkIndex === i 
                              ? 'bg-indigo-500/5 border-indigo-500/20 text-white' 
                              : 'text-zinc-500 opacity-40 border-transparent'
                            }`}
                          >
                            <p className={`text-xl leading-relaxed ${activeStory?.language === 'ar' ? 'font-arabic text-3xl' : 'font-serif'}`}>
                              {chunk}
                            </p>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-4">
                        {!isPlaying ? (
                          <Button 
                            onClick={() => handleRead(currentChunkIndex)} 
                            className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black text-lg shadow-lg shadow-indigo-900/40"
                          >
                            <svg className={`w-6 h-6 ${user?.preferredLanguage === 'ar' ? 'ml-2' : 'mr-2'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
                            {t.listen}
                          </Button>
                        ) : (
                          <Button onClick={stopAudio} variant="secondary" className="flex-1 py-5 rounded-2xl font-black text-lg border-white/5 bg-zinc-900">
                            {loadingAudio ? (
                              <div className="flex items-center gap-3">
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                {t.synthesizing}
                              </div>
                            ) : t.stop}
                          </Button>
                        )}
                      </div>
                      
                      {isPlaying && (
                        <div className="mt-6 flex items-center gap-4">
                          <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" 
                              style={{ width: `${((currentChunkIndex + 1) / chunks.length) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-black text-zinc-600 uppercase">
                            {currentChunkIndex + 1} / {chunks.length}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
