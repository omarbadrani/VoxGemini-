
import React, { useState, useEffect } from 'react';
import { TTSSection } from './components/TTSSection';
import { ChatbotSection } from './components/ChatbotSection';
import { TranscriptionSection } from './components/TranscriptionSection';
import { ProfileSection } from './components/ProfileSection';
import { AppFeature, User, VoiceName, Story, AppTheme } from './types';
import { translations } from './utils/i18n';

const AVATARS = ["👨‍🚀", "👩‍🎨", "🤖", "🐱", "🦊", "🦁", "🐉", "🧙‍♂️"];
const LANGUAGES = [
  { id: 'fr', label: 'Français', flag: '🇫🇷' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'ar', label: 'العربية', flag: '🇲🇦' }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppFeature>('tts');
  const [user, setUser] = useState<User | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedLang, setSelectedLang] = useState<'fr' | 'en' | 'ar'>('fr');
  const [directToStory, setDirectToStory] = useState<Story | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('voxgemini_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setSelectedLang(parsedUser.preferredLanguage);
      applyTheme(parsedUser.theme || 'midnight');
    } else {
      setShowOnboarding(true);
      applyTheme('midnight');
    }
  }, []);

  const applyTheme = (theme: AppTheme) => {
    document.body.className = `theme-${theme} min-h-screen transition-all duration-500`;
  };

  const t = translations[selectedLang];

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const newUser: User = {
      id: Date.now().toString(),
      name: nameInput,
      avatar: selectedAvatar,
      preferredLanguage: selectedLang,
      preferredVoice: VoiceName.Kore,
      zenModeDefault: true,
      theme: 'midnight',
      stats: {
        storiesGenerated: 0,
        totalListeningTime: 0,
        lastActive: Date.now()
      },
      library: [],
      createdAt: Date.now()
    };

    localStorage.setItem('voxgemini_user', JSON.stringify(newUser));
    setUser(newUser);
    setShowOnboarding(false);
    applyTheme('midnight');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    setSelectedLang(updatedUser.preferredLanguage);
    applyTheme(updatedUser.theme);
    localStorage.setItem('voxgemini_user', JSON.stringify(updatedUser));
  };

  const handleOpenLibraryStory = (story: Story) => {
    setDirectToStory(story);
    setActiveTab('tts');
  };

  const handleLogout = () => {
    if (confirm(t.confirmLogout)) {
      setUser(null);
      localStorage.removeItem('voxgemini_user');
      setShowOnboarding(true);
    }
  };

  if (showOnboarding) {
    return (
      <div className="fixed inset-0 bg-[#0a0b0e] flex items-center justify-center p-6 z-[100]" dir={selectedLang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="max-w-md w-full glass p-10 rounded-[40px] border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-500 overflow-y-auto max-h-[90vh] custom-scrollbar">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-white mb-2">{t.welcome} <span className="text-indigo-500">Vox</span></h1>
            <p className="text-zinc-500 text-sm">{t.configure}</p>
          </div>

          <form onSubmit={handleCreateAccount} className="space-y-8">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 text-center">{t.chooseAvatar}</label>
              <div className="grid grid-cols-4 gap-3">
                {AVATARS.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setSelectedAvatar(a)}
                    className={`text-3xl p-3 rounded-2xl transition-all ${selectedAvatar === a ? 'bg-indigo-600 scale-110 shadow-lg shadow-indigo-500/40' : 'bg-zinc-900/50 hover:bg-zinc-800'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">{t.expLanguage}</label>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setSelectedLang(lang.id as any)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all ${selectedLang === lang.id ? 'bg-white text-black border-white' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-white'}`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className="text-[9px] font-black uppercase">{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label className={`text-[10px] font-black text-zinc-500 uppercase tracking-widest ${selectedLang === 'ar' ? 'text-right block' : ''}`}>{t.yourName}</label>
              <input 
                required
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder={selectedLang === 'ar' ? "مثال: رحالة النجوم" : "Ex: Explorateur Stellaire"}
                className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-white focus:ring-4 focus:ring-indigo-500/20 outline-none"
              />
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-500 transition-all shadow-xl active:scale-95">
              {t.startBtn}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${user?.preferredLanguage === 'ar' ? 'font-arabic' : ''}`} dir={user?.preferredLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <header className="sticky top-0 z-50 glass border-b border-white/5 px-6 py-4 mb-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('tts')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/20">
              <span className="text-white font-black text-xl">V</span>
            </div>
            <h1 className="text-2xl font-black tracking-tighter hidden sm:block">Vox<span className="text-indigo-500">Gemini</span></h1>
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-1 bg-zinc-900/50 p-1 rounded-2xl border border-white/5">
              {[
                { id: 'tts', label: t.reader, icon: '📖' },
                { id: 'chat', label: t.chat, icon: '💬' },
                { id: 'stt', label: t.dictation, icon: '🎙️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AppFeature)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
                    activeTab === tab.id ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span> {tab.label}
                </button>
              ))}
            </nav>

            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 p-1.5 px-4 rounded-2xl border transition-all ${
                activeTab === 'profile' ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-zinc-900 border-white/5 hover:border-white/20'
              }`}
            >
              <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-lg shadow-inner">
                {user?.avatar}
              </div>
              <span className="text-xs font-black hidden sm:block">{user?.name}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 animate-in fade-in duration-700">
        {activeTab === 'tts' && (
          <TTSSection 
            user={user} 
            onUpdateUser={handleUpdateUser} 
            initialStory={directToStory} 
            onClearInitialStory={() => setDirectToStory(null)} 
            t={t}
          />
        )}
        {activeTab === 'chat' && <ChatbotSection t={t} />}
        {activeTab === 'stt' && <TranscriptionSection t={t} />}
        {activeTab === 'profile' && (
          <ProfileSection 
            user={user!} 
            onUpdateUser={handleUpdateUser} 
            onLogout={handleLogout} 
            onSelectStory={handleOpenLibraryStory}
            t={t}
          />
        )}
      </main>

      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-2 glass p-2 rounded-3xl border border-white/10 shadow-2xl z-50">
        {[
          { id: 'tts', icon: '📖' },
          { id: 'chat', icon: '💬' },
          { id: 'stt', icon: '🎙️' },
          { id: 'profile', icon: user?.avatar || '👤' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AppFeature)}
            className={`w-12 h-12 rounded-2xl text-xl flex items-center justify-center transition-all ${
              activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'bg-zinc-900/40 text-zinc-500'
            }`}
          >
            {tab.icon}
          </button>
        ))}
      </nav>
      <style>{`
        .font-arabic { font-family: 'Amiri', serif !important; }
      `}</style>
    </div>
  );
};

export default App;
