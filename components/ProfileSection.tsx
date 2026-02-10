
import React from 'react';
import { User, Story, AppTheme } from '../types';
import { TranslationKeys } from '../utils/i18n';

interface ProfileSectionProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
  onSelectStory: (story: Story) => void;
  t: TranslationKeys;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({ user, onUpdateUser, onLogout, onSelectStory, t }) => {
  const stats = [
    { label: t.stats.library, value: user.library.length, icon: "📚", color: "from-blue-500 to-indigo-600" },
    { label: t.stats.time, value: `${Math.round(user.stats.totalListeningTime / 60)} min`, icon: "⏱️", color: "from-emerald-500 to-teal-600" },
    { label: t.stats.memberSince, value: new Date(user.createdAt).toLocaleDateString(user.preferredLanguage === 'ar' ? 'ar-MA' : 'fr-FR', { month: 'short', year: 'numeric' }), icon: "🌟", color: "from-amber-500 to-orange-600" }
  ];

  const themes: { id: AppTheme; color: string; label: string }[] = [
    { id: 'midnight', color: 'bg-[#0f1115]', label: t.themes.midnight },
    { id: 'dawn', color: 'bg-[#f8fafc]', label: t.themes.dawn },
    { id: 'abyss', color: 'bg-[#04101d]', label: t.themes.abyss },
    { id: 'forest', color: 'bg-[#06110a]', label: t.themes.forest },
    { id: 'crimson', color: 'bg-[#110611]', label: t.themes.crimson },
  ];

  const handleRemoveFromLibrary = (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t.confirmDelete)) {
      onUpdateUser({
        ...user,
        library: user.library.filter(s => s.id !== storyId)
      });
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-5xl mx-auto pb-10">
      <div className="relative mb-12">
        <div className="h-48 bg-gradient-to-r from-indigo-900 via-purple-900 to-fuchsia-900 rounded-[40px] shadow-2xl opacity-40"></div>
        <div className={`absolute -bottom-10 ${user.preferredLanguage === 'ar' ? 'right-10' : 'left-10'} flex items-end gap-6`}>
          <div className="w-32 h-32 bg-zinc-900 border-8 border-[#0f1115] rounded-[40px] flex items-center justify-center text-6xl shadow-2xl">
            {user.avatar}
          </div>
          <div className="mb-4">
            <h2 className="text-4xl font-black tracking-tighter">{user.name}</h2>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Vox Premium User</p>
          </div>
        </div>
        <div className={`absolute top-6 ${user.preferredLanguage === 'ar' ? 'left-6' : 'right-6'}`}>
           <button onClick={onLogout} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border border-red-500/20">
             {t.logout}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {stats.map((s, i) => (
          <div key={i} className="bg-zinc-900/30 border border-white/5 p-6 rounded-[32px] group hover:border-indigo-500/30 transition-all">
            <div className={`w-12 h-12 bg-gradient-to-br ${s.color} rounded-2xl flex items-center justify-center text-xl mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
              {s.icon}
            </div>
            <div className="text-2xl font-black mb-1">{s.value}</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h3 className="text-xl font-black mb-6 flex items-center gap-3">
            <span className="text-indigo-500">📂</span> {t.myLibrary}
          </h3>
          
          {user.library.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {user.library.map((story) => (
                <div 
                  key={story.id}
                  onClick={() => onSelectStory(story)}
                  className="group relative bg-zinc-900/30 border border-white/5 rounded-3xl p-5 hover:bg-zinc-800 transition-all cursor-pointer overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${story.coverGradient} opacity-10 blur-2xl -mr-10 -mt-10 group-hover:opacity-20 transition-opacity`}></div>
                  <div className="flex items-center gap-4 relative">
                    <div className="text-4xl">{story.coverEmoji}</div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className={`font-bold text-sm truncate ${user.preferredLanguage === 'ar' ? 'text-right' : ''}`}>{story.title}</h4>
                      <p className={`text-[10px] text-zinc-500 font-black uppercase tracking-tighter ${user.preferredLanguage === 'ar' ? 'text-right' : ''}`}>
                        {story.language === 'fr' ? '🇫🇷' : story.language === 'ar' ? '🇲🇦' : '🇬🇧'} • {new Date(story.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => handleRemoveFromLibrary(story.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-500 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-zinc-900/30 border border-dashed border-white/10 rounded-[32px] p-12 text-center">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{t.emptyLibrary}</p>
              <p className="text-zinc-600 text-[10px] mt-2">{t.emptyLibrarySub}</p>
            </div>
          )}
        </div>

        <div className="glass p-8 rounded-[40px] border border-white/5 h-fit">
          <h3 className="text-xl font-black mb-6 flex items-center gap-3">
            <span className="text-indigo-500">⚙️</span> {t.settings}
          </h3>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <label className={`text-[10px] font-black text-zinc-500 uppercase tracking-widest ${user.preferredLanguage === 'ar' ? 'text-right block' : ''}`}>{t.theme}</label>
              <div className="grid grid-cols-2 gap-2">
                {themes.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => onUpdateUser({...user, theme: theme.id})}
                    className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${user.theme === theme.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 hover:border-white/10'}`}
                  >
                    <div className={`w-6 h-6 rounded-lg ${theme.color} border border-white/20 shadow-inner`}></div>
                    <span className="text-[10px] font-black uppercase">{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className={user.preferredLanguage === 'ar' ? 'text-right' : ''}>
                <div className="text-sm font-bold">{t.zenReading}</div>
                <div className="text-[9px] text-zinc-500 italic">Voix apaisante par défaut</div>
              </div>
              <button 
                onClick={() => onUpdateUser({...user, zenModeDefault: !user.zenModeDefault})}
                className={`w-12 h-7 rounded-full transition-all relative ${user.zenModeDefault ? 'bg-indigo-600' : 'bg-zinc-800'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${user.zenModeDefault ? (user.preferredLanguage === 'ar' ? 'right-6' : 'left-6') : (user.preferredLanguage === 'ar' ? 'right-1' : 'left-1')}`}></div>
              </button>
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black text-zinc-500 uppercase tracking-widest ${user.preferredLanguage === 'ar' ? 'text-right block' : ''}`}>{t.preferredLang}</label>
              <div className="grid grid-cols-3 gap-2">
                {['fr', 'en', 'ar'].map(l => (
                  <button
                    key={l}
                    onClick={() => onUpdateUser({...user, preferredLanguage: l as any})}
                    className={`py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${user.preferredLanguage === l ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
