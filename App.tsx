import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Plus, User as UserIcon, X, Send, Image as ImageIcon, Globe, Share2, Download } from 'lucide-react';
import { Pin, Comment, AppState, User, I18N, Language } from './types';
import { CATEGORIES, TRENDING, makeDemoPins, uid } from './constants';
import { PinCard } from './components/PinCard';
import { Modal } from './components/Modal';

// --- Helper for the specific logo style ---
const Logo = () => (
  <div 
    className="w-8 h-8 rounded-lg shrink-0"
    style={{
      background: `radial-gradient(120% 120% at 20% 0%, #ff94a3 8%, #ff4d67 38%, #b21f4d 68%), 
                   radial-gradient(120% 120% at 100% 120%, #6ee7ff 0%, #2a7fff 60%, #3949ab 100%)`,
      boxShadow: '0 8px 24px rgba(255,77,103,.35), inset 0 0 12px rgba(255,255,255,.2)'
    }}
  />
);

export default function App() {
  // --- State ---
  const [lang, setLang] = useState<Language>('es');
  const [pins, setPins] = useState<Pin[]>([]);
  const [filterText, setFilterText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<'saved' | 'liked' | 'recent' | null>(null);
  
  // Persistent State
  const [likes, setLikes] = useState<Record<string, { count: number }>>(() => 
    JSON.parse(localStorage.getItem('likes') || '{}')
  );
  const [saved, setSaved] = useState<Record<string, boolean>>(() => 
    JSON.parse(localStorage.getItem('saved') || '{}')
  );
  const [comments, setComments] = useState<Record<string, Comment[]>>(() => 
    JSON.parse(localStorage.getItem('comments') || '{}')
  );
  const [user, setUser] = useState<User | null>(() => 
    JSON.parse(localStorage.getItem('user') || 'null')
  );

  // UI State
  const [activeModal, setActiveModal] = useState<'detail' | 'upload' | 'login' | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false });

  // Infinite Scroll Refs
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadedBatches = useRef(0);

  // --- Effects ---
  useEffect(() => {
    // Initial Load
    setPins(makeDemoPins(24));
  }, []);

  useEffect(() => {
    localStorage.setItem('likes', JSON.stringify(likes));
    localStorage.setItem('saved', JSON.stringify(saved));
    localStorage.setItem('comments', JSON.stringify(comments));
    localStorage.setItem('user', JSON.stringify(user));
  }, [likes, saved, comments, user]);

  const showToast = (msg: string) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2400);
  };

  // --- Infinite Scroll Logic ---
  const loadMore = useCallback(() => {
    loadedBatches.current += 1;
    const more = makeDemoPins(12, loadedBatches.current * 100);
    setPins(prev => [...prev, ...more]);
  }, []);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMore();
      }
    }, { rootMargin: '600px' });
    
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  // --- Filtering ---
  const filteredPins = useMemo(() => {
    let list = [...pins];
    
    // Text Filter
    if (filterText) {
      const q = filterText.toLowerCase();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.desc.toLowerCase().includes(q) || 
        p.author.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Category Filter
    if (filterCategory) {
      list = list.filter(p => p.cat === filterCategory);
    }

    // Quick Filters
    if (quickFilter === 'saved') {
      list = list.filter(p => !!saved[p.id]);
    } else if (quickFilter === 'liked') {
      list = list.filter(p => !!likes[p.id]);
    } else if (quickFilter === 'recent') {
      list = list.sort((a, b) => b.createdAt - a.createdAt).slice(0, 24);
    }

    return list;
  }, [pins, filterText, filterCategory, quickFilter, saved, likes]);

  // --- Actions ---
  const toggleLike = (id: string) => {
    setLikes(prev => {
      const newLikes = { ...prev };
      if (newLikes[id]) {
        delete newLikes[id];
      } else {
        newLikes[id] = { count: (prev[id]?.count || 0) + 1 };
      }
      return newLikes;
    });
  };

  const toggleSave = (id: string) => {
    setSaved(prev => {
      const isSaved = !prev[id];
      showToast(isSaved ? I18N[lang].toastSaved : I18N[lang].toastUnsaved);
      return { ...prev, [id]: isSaved };
    });
  };

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const desc = formData.get('desc') as string;
    const cat = formData.get('cat') as string;
    const tagsStr = formData.get('tags') as string;
    const url = formData.get('url') as string;
    const file = (formData.get('file') as File);
    
    let src = url;
    if (file && file.size > 0) {
      src = URL.createObjectURL(file);
    }

    if (!src) {
      showToast(I18N[lang].toastFill);
      return;
    }

    const newPin: Pin = {
      id: uid(),
      src,
      title: title || 'Nuevo Pin',
      desc: desc || '',
      author: user?.email || 'Tú',
      cat: cat || CATEGORIES[0],
      tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
      w: 600, h: 800,
      createdAt: Date.now()
    };

    setPins(prev => [newPin, ...prev]);
    setActiveModal(null);
    showToast(I18N[lang].toastPublished);
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    if (email) {
      setUser({ email });
      setActiveModal(null);
      showToast(I18N[lang].toastLogin);
    }
  };

  const handleComment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPinId) return;
    const form = e.currentTarget;
    const input = form.elements.namedItem('comment') as HTMLInputElement;
    const text = input.value.trim();
    
    if (text) {
      setComments(prev => ({
        ...prev,
        [selectedPinId]: [...(prev[selectedPinId] || []), { text, at: Date.now() }]
      }));
      input.value = '';
    }
  };

  // --- Render Helpers ---
  const selectedPin = pins.find(p => p.id === selectedPinId);

  return (
    <div className="min-h-screen flex flex-col font-sans text-text">
      {/* --- Header --- */}
      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-md border-b border-border px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
          <Logo />
          <span>PinStyle</span>
        </div>

        <div className="flex-1 max-w-2xl bg-surface border border-border rounded-xl flex items-center px-3 py-2 gap-2 focus-within:ring-1 focus-within:ring-border">
          <Search size={18} className="text-muted" />
          <input 
            type="search"
            placeholder={I18N[lang].searchPlaceholder}
            className="bg-transparent border-none outline-none flex-1 text-sm placeholder:text-muted"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          {filterText && (
            <button onClick={() => setFilterText('')} className="p-1 hover:bg-card rounded-full text-muted">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 ml-auto">
          <button 
            onClick={() => setActiveModal('upload')}
            className="hidden sm:flex items-center gap-2 bg-brand hover:bg-opacity-90 text-white px-3.5 py-2.5 rounded-xl text-sm font-medium transition-transform hover:-translate-y-px"
          >
            <Plus size={18} /> {I18N[lang].upload}
          </button>
          
          <button 
            onClick={() => setActiveModal('login')}
            className="flex items-center gap-2 bg-card border border-border hover:border-[#3a4258] px-3.5 py-2.5 rounded-xl text-sm transition-transform hover:-translate-y-px"
          >
            <UserIcon size={18} /> {user ? user.email.split('@')[0] : I18N[lang].login}
          </button>

          <div className="relative">
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value as Language)}
              className="appearance-none bg-transparent border border-border rounded-xl pl-3 pr-8 py-2.5 text-sm cursor-pointer hover:bg-card focus:outline-none"
            >
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>
            <Globe size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>
      </header>

      {/* --- Layout --- */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 p-6 items-start">
        
        {/* Sidebar */}
        <aside className="sticky top-[88px] hidden md:block bg-surface border border-border rounded-2xl p-4 shadow-xl">
          <div className="font-bold text-sm mb-3">{I18N[lang].categories}</div>
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setFilterCategory(cat === filterCategory ? null : cat);
                  setQuickFilter(null);
                }}
                className={`px-3 py-2 rounded-full text-xs border transition-colors ${
                  filterCategory === cat 
                  ? 'bg-[#263047] border-[#3a4258] text-white' 
                  : 'bg-card border-border text-muted hover:text-text'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="font-bold text-sm mb-3">{I18N[lang].trending}</div>
          <div className="flex flex-wrap gap-2 mb-6">
            {TRENDING.map(tag => (
              <button
                key={tag}
                onClick={() => setFilterText(tag.toLowerCase())}
                className="px-3 py-2 rounded-full text-xs bg-card border border-border text-muted hover:text-text hover:bg-[#263047] transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>

          <div className="font-bold text-sm mb-3">{I18N[lang].quick}</div>
          <div className="flex flex-col gap-2">
            {[
              { id: 'saved', label: I18N[lang].saved },
              { id: 'liked', label: I18N[lang].liked },
              { id: 'recent', label: I18N[lang].recent }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setQuickFilter(quickFilter === item.id ? null : item.id as any);
                  setFilterCategory(null);
                }}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors border ${
                  quickFilter === item.id
                  ? 'bg-[#263047] border-[#3a4258] text-white'
                  : 'border-transparent text-muted hover:text-text hover:bg-card'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Main Grid */}
        <main>
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4 pb-12">
            {filteredPins.map(pin => (
              <PinCard 
                key={pin.id} 
                pin={pin}
                isLiked={!!likes[pin.id]}
                isSaved={!!saved[pin.id]}
                likesCount={likes[pin.id]?.count || 0}
                lang={lang}
                onOpen={(id) => { setSelectedPinId(id); setActiveModal('detail'); }}
                onToggleLike={toggleLike}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
          <div ref={sentinelRef} className="h-4 w-full" />
        </main>
      </div>

      {/* --- Footer --- */}
      <footer className="py-8 text-center text-muted text-sm border-t border-border mt-auto">
        © 2025 PinStyle. {I18N[lang].demoNote}
      </footer>

      {/* --- Toast --- */}
      {toast.visible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#1d2535] text-[#eaf1ff] px-4 py-2.5 rounded-full shadow-2xl border border-[#3a4258] animate-in fade-in slide-in-from-bottom-4 duration-300 flex items-center gap-2">
          <span>{toast.msg}</span>
        </div>
      )}

      {/* --- Modals --- */}
      
      {/* Upload Modal */}
      <Modal 
        isOpen={activeModal === 'upload'} 
        onClose={() => setActiveModal(null)} 
        title={I18N[lang].uploadTitle}
        footer={
          <>
            <button 
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 rounded-xl text-sm border border-border hover:bg-card transition-colors"
            >
              {I18N[lang].close}
            </button>
            <button 
              form="upload-form"
              type="submit"
              className="px-4 py-2 rounded-xl text-sm bg-brand text-white hover:bg-opacity-90 transition-colors"
            >
              {I18N[lang].publish}
            </button>
          </>
        }
      >
        <form id="upload-form" onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted">{I18N[lang].imageFile}</label>
            <div className="relative group">
              <input type="file" name="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="border border-border bg-card rounded-xl p-3 flex items-center gap-2 text-muted group-hover:border-brand/50 transition-colors">
                 <ImageIcon size={18} />
                 <span className="text-sm truncate">Select file...</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted">{I18N[lang].imageUrl}</label>
            <input name="url" type="url" placeholder="https://..." className="bg-card border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted">{I18N[lang].title}</label>
            <input name="title" type="text" placeholder="My cool pin" className="bg-card border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand transition-colors" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted">{I18N[lang].category}</label>
            <select name="cat" className="bg-card border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand transition-colors appearance-none">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium text-muted">{I18N[lang].desc}</label>
            <textarea name="desc" rows={3} className="bg-card border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand transition-colors resize-none"></textarea>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium text-muted">{I18N[lang].tagsLabel}</label>
            <input name="tags" type="text" placeholder="art, design, minimal" className="bg-card border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand transition-colors" />
          </div>
        </form>
      </Modal>

      {/* Login Modal */}
      <Modal 
        isOpen={activeModal === 'login'} 
        onClose={() => setActiveModal(null)} 
        title={I18N[lang].loginTitle}
      >
         <form onSubmit={handleLogin} className="flex flex-col gap-4 max-w-sm mx-auto">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted">{I18N[lang].email}</label>
              <input required name="email" type="email" placeholder="you@example.com" className="bg-card border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand transition-colors" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted">{I18N[lang].password}</label>
              <input required name="password" type="password" placeholder="••••••••" className="bg-card border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-brand transition-colors" />
            </div>
            <button type="submit" className="mt-2 bg-brand text-white py-3 rounded-xl text-sm font-medium hover:bg-opacity-90 transition-all">
              {I18N[lang].enter}
            </button>
            <p className="text-xs text-center text-muted mt-2">{I18N[lang].demoNote}</p>
         </form>
      </Modal>

      {/* Detail Modal */}
      {selectedPin && (
        <Modal 
          isOpen={activeModal === 'detail'} 
          onClose={() => setActiveModal(null)} 
          title={selectedPin.title}
          footer={
             <button onClick={() => setActiveModal(null)} className="px-4 py-2 rounded-xl text-sm border border-border hover:bg-card transition-colors">
               {I18N[lang].close}
             </button>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="flex flex-col gap-4">
               <img src={selectedPin.src} alt={selectedPin.title} className="w-full h-auto rounded-xl border border-border bg-black" />
               <div className="flex gap-2 flex-wrap">
                 {selectedPin.tags.map(t => (
                   <span key={t} className="px-2.5 py-1 rounded-full bg-[#222838] border border-[#2f3648] text-[#c3c9da] text-xs">#{t}</span>
                 ))}
               </div>
            </div>

            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between text-sm text-muted mb-2">
                <span>{selectedPin.author}</span>
                <span>{selectedPin.cat}</span>
              </div>
              
              <h1 className="text-2xl font-bold mb-3">{selectedPin.title}</h1>
              <p className="text-muted text-sm leading-relaxed mb-6">{selectedPin.desc}</p>

              <div className="flex gap-2 mb-8">
                <button 
                  onClick={() => toggleSave(selectedPin.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium transition-all ${
                    saved[selectedPin.id] ? 'bg-ok border-transparent text-[#091015]' : 'bg-card border-border hover:border-[#3a4258]'
                  }`}
                >
                  {I18N[lang].save}
                </button>
                <button 
                  onClick={() => toggleLike(selectedPin.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium transition-all ${
                    likes[selectedPin.id] ? 'bg-[#ff7b7b] border-transparent text-[#190a0a]' : 'bg-card border-border hover:border-[#3a4258]'
                  }`}
                >
                  {I18N[lang].like} {likes[selectedPin.id]?.count > 0 && <span>{likes[selectedPin.id].count}</span>}
                </button>
                <button className="p-2.5 rounded-xl bg-card border border-border hover:border-[#3a4258]">
                   <Share2 size={20} />
                </button>
                 <a href={selectedPin.src} download className="p-2.5 rounded-xl bg-card border border-border hover:border-[#3a4258] flex items-center justify-center">
                   <Download size={20} />
                </a>
              </div>

              <div className="border-t border-border pt-4 mt-auto">
                 <h3 className="font-bold text-sm mb-4">{I18N[lang].comments}</h3>
                 <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                   {(comments[selectedPin.id] || []).map((c, i) => (
                     <div key={i} className="bg-card border border-border rounded-xl p-3 text-sm">
                       <div className="text-xs text-muted mb-1">{new Date(c.at).toLocaleString()}</div>
                       <div>{c.text}</div>
                     </div>
                   ))}
                   {!comments[selectedPin.id]?.length && <div className="text-muted text-xs italic">No comments yet.</div>}
                 </div>
                 
                 <form onSubmit={handleComment} className="flex gap-2">
                   <input 
                     name="comment" 
                     type="text" 
                     placeholder="Write a comment..." 
                     autoComplete="off"
                     className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand" 
                   />
                   <button type="submit" className="p-2 bg-brand rounded-xl text-white hover:bg-opacity-90">
                     <Send size={18} />
                   </button>
                 </form>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}