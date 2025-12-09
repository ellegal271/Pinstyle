import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Plus, User as UserIcon, X, Send, Image as ImageIcon, Globe, Share2, Download, Sparkles, Loader2, LogOut, Check, AlertTriangle } from 'lucide-react';
import { Pin, Comment, AppState, User, I18N, Language } from './types';
import { CATEGORIES, TRENDING, makeDemoPins, uid } from './constants';
import { PinCard } from './components/PinCard';
import { Modal } from './components/Modal';
import { generatePinMetadata } from './services/gemini';
import { auth, db, googleProvider, signInWithPopup, firebaseSignOut, onAuthStateChanged, collection, addDoc, onSnapshot, query, orderBy, limit, isConfigured } from './services/firebase';

// --- Components ---

const Logo = ({ className = "", size = "normal", loading = false }: { className?: string, size?: "normal" | "large", loading?: boolean }) => {
  const isLarge = size === 'large';
  
  return (
    <div 
      className={`relative flex items-center justify-center font-black text-white tracking-tighter rounded-2xl overflow-hidden shrink-0 select-none transition-all duration-500 ${isLarge ? 'w-32 h-32 text-5xl shadow-[0_0_50px_rgba(255,77,103,0.3)]' : 'w-10 h-10 text-base shadow-lg'} ${className}`}
      style={{
        background: `radial-gradient(140% 140% at 20% 0%, #ff94a3 10%, #ff4d67 40%, #b21f4d 70%), 
                     radial-gradient(120% 120% at 100% 120%, #6ee7ff 0%, #2a7fff 60%, #3949ab 100%)`
      }}
    >
      {/* Texture Overlay for modern feel */}
      <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
      
      {/* The Text */}
      <span className={`relative z-20 drop-shadow-md ${loading ? 'animate-pulse' : ''}`}>PS</span>

      {/* The Spinner (Internal) - Only visible when loading */}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
           <div className="w-[75%] h-[75%] border-[3px] border-white/20 border-t-white rounded-full animate-spin shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
        </div>
      )}
    </div>
  );
};

const SplashScreen = () => (
  <div className="fixed inset-0 z-[100] bg-[#0f1115] flex flex-col items-center justify-center animate-in fade-in duration-300">
    <div className="scale-100 animate-in zoom-in duration-500">
      <Logo size="large" loading />
    </div>
    <div className="mt-8 flex flex-col items-center gap-2">
      <p className="text-text font-bold text-lg tracking-wide">PinStyle</p>
      <p className="text-muted text-xs font-medium uppercase tracking-widest opacity-70">Cargando...</p>
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  // --- State ---
  const [isLoading, setIsLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(isConfigured);
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
  
  // User state now managed via Auth or fallback
  const [user, setUser] = useState<User | null>(null);

  // UI State
  const [activeModal, setActiveModal] = useState<'detail' | 'upload' | 'login' | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false });

  // Upload Form State
  const [uploadForm, setUploadForm] = useState({ title: '', desc: '', cat: CATEGORIES[0], tags: '', url: '' });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Infinite Scroll Refs
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadedBatches = useRef(0);

  // --- Effects ---
  
  // App Loading Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  // Auth Listener
  useEffect(() => {
    if (isConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (u: any) => {
        if (u) {
          setUser({
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL
          });
        } else {
          setUser(null);
        }
      });
      return () => unsubscribe();
    } else {
      // Fallback for demo mode
      const localUser = localStorage.getItem('user');
      if (localUser) setUser(JSON.parse(localUser));
    }
  }, []);

  // Data Loading (Firebase vs Demo)
  useEffect(() => {
    if (isConfigured && db) {
      // Realtime Listener
      const q = query(collection(db, 'pins'), orderBy('createdAt', 'desc'), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot: any) => {
        const remotePins = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        })) as Pin[];
        
        // If DB is empty, maybe we should seed it? For now, just show what we have.
        // If DB has data, use it. If not, mix with demo pins so the UI isn't empty for new users.
        if (remotePins.length > 0) {
          setPins(remotePins);
        } else {
          setPins(makeDemoPins(24));
        }
      }, (error: any) => {
        console.error("Error fetching pins:", error);
        setPins(makeDemoPins(24));
      });
      return () => unsubscribe();
    } else {
      // Demo Mode
      setPins(makeDemoPins(24));
      if (!isLoading) {
        // Show toast once loaded if not configured
        // setTimeout(() => showToast(I18N[lang].configMissing), 1000);
      }
    }
  }, [isLoading]);

  useEffect(() => {
    localStorage.setItem('likes', JSON.stringify(likes));
    localStorage.setItem('saved', JSON.stringify(saved));
    localStorage.setItem('comments', JSON.stringify(comments));
    if (!isConfigured) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [likes, saved, comments, user]);

  useEffect(() => {
    if (activeModal !== 'upload') {
      setUploadForm({ title: '', desc: '', cat: CATEGORIES[0], tags: '', url: '' });
      setUploadFile(null);
      setIsAnalyzing(false);
    }
  }, [activeModal]);

  const showToast = (msg: string) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2400);
  };

  // --- Logic ---
  const filteredPins = useMemo(() => {
    let result = pins;

    if (filterText) {
      const lower = filterText.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(lower) || p.tags.some(t => t.toLowerCase().includes(lower)));
    }
    if (filterCategory) {
      result = result.filter(p => p.cat === filterCategory);
    }
    if (quickFilter === 'saved') {
      result = result.filter(p => saved[p.id]);
    } else if (quickFilter === 'liked') {
      result = result.filter(p => likes[p.id]?.count > 0);
    }

    return result;
  }, [pins, filterText, filterCategory, quickFilter, saved, likes]);

  const toggleLike = (id: string) => {
    setLikes(prev => {
      const current = prev[id]?.count || 0;
      const newCount = current > 0 ? 0 : 1; 
      return { ...prev, [id]: { count: newCount } };
    });
  };

  const toggleSave = (id: string) => {
    setSaved(prev => {
      const isSaved = !!prev[id];
      showToast(isSaved ? I18N[lang].toastUnsaved : I18N[lang].toastSaved);
      return { ...prev, [id]: !isSaved };
    });
  };

  const handleUploadClick = () => {
    if (!user) {
      showToast(I18N[lang].toastLoginRequired);
      setActiveModal('login');
      return;
    }
    setActiveModal('upload');
  };

  const handlePublish = async () => {
    if (!uploadForm.title) {
      showToast(I18N[lang].toastFill);
      return;
    }

    const finalSrc = uploadForm.url || (uploadFile ? URL.createObjectURL(uploadFile) : "https://picsum.photos/400/600");

    const newPin: Pin = {
      id: uid(),
      src: finalSrc,
      w: 400,
      h: 600,
      title: uploadForm.title,
      desc: uploadForm.desc,
      author: user?.displayName || user?.email?.split('@')[0] || "Me",
      cat: uploadForm.cat,
      tags: uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: Date.now()
    };

    if (isConfigured && db) {
      setIsUploading(true);
      try {
        // Remove 'id' because Firestore generates it, or use setDoc with id. 
        // We'll let Firestore generate ID and just save data.
        const { id, ...pinData } = newPin;
        await addDoc(collection(db, 'pins'), pinData);
        showToast(I18N[lang].toastPublished);
        setActiveModal(null);
      } catch (e) {
        console.error("Error adding doc: ", e);
        showToast("Error uploading to database");
      } finally {
        setIsUploading(false);
      }
    } else {
      // Demo fallback
      setPins(prev => [newPin, ...prev]);
      setActiveModal(null);
      showToast(I18N[lang].toastPublished);
    }
  };

  const handleAiGenerate = async () => {
    if (!uploadFile) return;
    setIsAnalyzing(true);
    showToast(I18N[lang].aiAnalyzing);
    try {
      const metadata = await generatePinMetadata(uploadFile);
      setUploadForm(prev => ({
        ...prev,
        title: metadata.title || prev.title,
        desc: metadata.description || prev.desc,
        cat: metadata.category || prev.cat,
        tags: metadata.tags?.join(', ') || prev.tags
      }));
    } catch (e) {
      console.error(e);
      showToast("Error generating metadata");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfigured && auth && googleProvider) {
      try {
        await signInWithPopup(auth, googleProvider);
        setActiveModal(null);
        showToast(I18N[lang].toastLogin);
      } catch (error) {
        console.error("Login failed", error);
        showToast("Login failed");
      }
    } else {
      // Demo Login
      setUser({ email: 'demo@user.com', displayName: 'Demo User', photoURL: null });
      setActiveModal(null);
      showToast(I18N[lang].toastLogin);
    }
  };

  const handleLogout = async () => {
    if (isConfigured && auth) {
      await firebaseSignOut(auth);
    } else {
      setUser(null);
    }
  };

  const activePin = selectedPinId ? pins.find(p => p.id === selectedPinId) : null;

  if (isLoading) {
    return <SplashScreen />;
  }

  // --- Render ---
  return (
    <div className="min-h-screen font-sans text-text animate-in fade-in duration-700">
      
      {/* Header */}
      <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => { setFilterCategory(null); setQuickFilter(null); window.scrollTo(0,0); }}>
            <Logo className="group-hover:scale-105 transition-transform" />
            <span className="font-bold text-xl tracking-tight hidden sm:block">PinStyle</span>
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text" 
              placeholder={I18N[lang].searchPlaceholder}
              className="w-full bg-card border-none rounded-full pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/50 outline-none text-text placeholder-muted/70 transition-shadow"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={handleUploadClick}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-text text-background rounded-full font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus size={20} />
              <span>{I18N[lang].upload}</span>
            </button>

            <button onClick={() => setLang(l => l === 'es' ? 'en' : 'es')} className="p-2 text-muted hover:text-text" title="Switch Language">
              <Globe size={20} />
            </button>

            {user ? (
               <div className="flex items-center gap-3">
                 {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 rounded-full border border-border" />
                 ) : (
                   <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand to-brand2 flex items-center justify-center text-xs font-bold text-white">
                     {(user.email || "U")[0].toUpperCase()}
                   </div>
                 )}
                 <button onClick={handleLogout} className="text-muted hover:text-warn transition-colors" title={I18N[lang].logout}>
                   <LogOut size={20} />
                 </button>
               </div>
            ) : (
              <button 
                onClick={() => setActiveModal('login')} 
                className="px-4 py-2 bg-brand text-white rounded-full font-semibold text-sm hover:bg-brand/90 transition-colors"
              >
                {I18N[lang].login}
              </button>
            )}
          </div>
        </div>

        {/* Categories Bar */}
        <div className="max-w-7xl mx-auto mt-3 overflow-x-auto pb-1 no-scrollbar flex gap-2">
          <button 
            onClick={() => { setFilterCategory(null); setQuickFilter(null); }}
            className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${!filterCategory && !quickFilter ? 'bg-text text-background' : 'bg-transparent text-muted hover:text-text'}`}
          >
            All
          </button>
          {quickFilter && (
             <button 
               className="whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-medium bg-brand text-white flex items-center gap-2"
               onClick={() => setQuickFilter(null)}
             >
               {I18N[lang][quickFilter]} <X size={14}/>
             </button>
          )}
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setFilterCategory(cat); setQuickFilter(null); }}
              className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCategory === cat ? 'bg-text text-background' : 'bg-transparent text-muted hover:text-text'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {!isConfigured && (
           <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg flex items-start gap-3">
             <AlertTriangle className="text-warn shrink-0" size={20} />
             <div>
                <p className="text-sm text-warn font-semibold">Firebase no está configurado</p>
                <p className="text-xs text-muted mt-1">La app está funcionando en <strong>Modo Demo</strong> (sin base de datos real). Para activar el Login de Google y guardar datos en la nube, edita el archivo <code>services/firebase.ts</code> con tus claves.</p>
             </div>
           </div>
        )}
      
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
          {filteredPins.map(pin => (
            <PinCard 
              key={pin.id} 
              pin={pin}
              lang={lang}
              isLiked={!!likes[pin.id]?.count}
              isSaved={!!saved[pin.id]}
              likesCount={Math.floor(pin.w / 10) + (likes[pin.id]?.count || 0)} // Fake random count
              onOpen={setSelectedPinId}
              onToggleLike={toggleLike}
              onToggleSave={toggleSave}
            />
          ))}
        </div>
        
        {/* Only show loader if we expect more batches or initial load, simplistic for now */}
        {(!isConfigured) && (
          <div ref={sentinelRef} className="h-20 flex items-center justify-center text-muted/50">
            <Loader2 className="animate-spin" />
          </div>
        )}
      </main>

      {/* Floating Action Button for Mobile Upload */}
      <button 
        onClick={handleUploadClick}
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand text-white rounded-full shadow-2xl flex items-center justify-center sm:hidden z-30 hover:scale-105 transition-transform"
      >
        <Plus size={28} />
      </button>

      {/* --- Modals --- */}

      {/* Login Modal */}
      <Modal 
        isOpen={activeModal === 'login'} 
        onClose={() => setActiveModal(null)} 
        title={I18N[lang].loginTitle}
      >
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center shadow-inner">
             <Logo size="normal" />
          </div>
          <div className="text-center px-6">
            <h3 className="text-xl font-bold mb-2">{I18N[lang].loginTitle}</h3>
            <p className="text-muted text-sm">
              {isConfigured 
                ? "Guarda tus pines favoritos y accede desde cualquier dispositivo."
                : "Modo Demo activo. El login es simulado."}
            </p>
          </div>

          <button 
            onClick={handleLogin} 
            className="w-full max-w-sm py-3 px-6 bg-white text-black rounded-full font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-3 shadow-lg"
          >
            {/* Google G Logo SVG */}
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {I18N[lang].enter}
          </button>
          
          <p className="text-xs text-muted/50 max-w-xs text-center">
            {isConfigured ? "Powered by Firebase Auth & Firestore" : I18N[lang].demoNote}
          </p>
        </div>
      </Modal>

      {/* Upload Modal */}
      <Modal
        isOpen={activeModal === 'upload'}
        onClose={() => setActiveModal(null)}
        title={I18N[lang].uploadTitle}
        footer={
          <>
            <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-muted hover:text-text">{I18N[lang].close}</button>
            <button 
              onClick={handlePublish} 
              disabled={isUploading}
              className="px-6 py-2 bg-brand text-white rounded-lg font-semibold hover:bg-brand/90 disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading && <Loader2 className="animate-spin" size={16} />}
              {I18N[lang].publish}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className={`aspect-[2/3] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center bg-card/50 relative overflow-hidden group ${!uploadFile && !uploadForm.url ? 'cursor-pointer hover:border-muted' : ''}`}>
              {uploadFile ? (
                <img src={URL.createObjectURL(uploadFile)} className="w-full h-full object-cover" alt="Preview" />
              ) : uploadForm.url ? (
                <img src={uploadForm.url} className="w-full h-full object-cover" alt="Preview" onError={(e) => e.currentTarget.style.display='none'} />
              ) : (
                <div className="text-center p-4">
                  <ImageIcon className="mx-auto mb-2 text-muted" size={48} />
                  <p className="text-sm text-muted">{I18N[lang].imageFile}</p>
                </div>
              )}
              
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={e => {
                  if (e.target.files?.[0]) {
                    setUploadFile(e.target.files[0]);
                    setUploadForm(p => ({ ...p, url: '' }));
                  }
                }}
              />
              
              {(uploadFile || uploadForm.url) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadForm(p => ({ ...p, url: '' })); }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-brand transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
               <input 
                type="text" 
                placeholder={I18N[lang].imageUrl} 
                className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none"
                value={uploadForm.url}
                onChange={e => { setUploadForm(p => ({...p, url: e.target.value })); setUploadFile(null); }}
               />
            </div>
            
            {isConfigured && uploadFile && (
               <p className="text-xs text-warn bg-warn/10 p-2 rounded">
                 Nota: En esta versión gratuita, los archivos locales no se suben a la nube (requiere Firebase Storage). Se recomienda usar URLs de imagen.
               </p>
            )}

            {uploadFile && (
               <button 
                onClick={handleAiGenerate}
                disabled={isAnalyzing}
                className="w-full py-2.5 bg-gradient-to-r from-brand2 to-brand text-black font-bold rounded-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
               >
                 {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                 {I18N[lang].aiGenerate}
               </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider mb-1 block">{I18N[lang].title}</label>
              <input 
                value={uploadForm.title}
                onChange={e => setUploadForm({...uploadForm, title: e.target.value})}
                className="w-full bg-card border border-border rounded-lg px-4 py-2 text-text outline-none focus:border-brand"
                placeholder="Ex: Neon City Vibes"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider mb-1 block">{I18N[lang].desc}</label>
              <textarea 
                value={uploadForm.desc}
                onChange={e => setUploadForm({...uploadForm, desc: e.target.value})}
                className="w-full bg-card border border-border rounded-lg px-4 py-2 text-text outline-none focus:border-brand h-24 resize-none"
                placeholder="..."
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider mb-1 block">{I18N[lang].category}</label>
              <select 
                value={uploadForm.cat}
                onChange={e => setUploadForm({...uploadForm, cat: e.target.value})}
                className="w-full bg-card border border-border rounded-lg px-4 py-2 text-text outline-none focus:border-brand appearance-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider mb-1 block">{I18N[lang].tagsLabel}</label>
              <input 
                value={uploadForm.tags}
                onChange={e => setUploadForm({...uploadForm, tags: e.target.value})}
                className="w-full bg-card border border-border rounded-lg px-4 py-2 text-text outline-none focus:border-brand"
                placeholder="art, digital, 3d..."
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Pin Detail Modal */}
      {activePin && (
        <Modal
          isOpen={!!activePin}
          onClose={() => setSelectedPinId(null)}
          title=""
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8">
            <div className="bg-black/20 rounded-xl overflow-hidden">
               <img src={activePin.src} alt={activePin.title} className="w-full h-auto object-contain max-h-[70vh]" />
            </div>
            
            <div className="flex flex-col h-full mt-4 md:mt-0">
               <div className="flex items-start justify-between mb-4">
                 <div>
                   <h1 className="text-2xl font-bold text-text mb-1">{activePin.title}</h1>
                   <p className="text-muted">{activePin.desc}</p>
                 </div>
                 <div className="flex gap-2">
                   <button className="p-2 rounded-full bg-card hover:bg-border transition-colors"><Share2 size={20}/></button>
                   <button className="p-2 rounded-full bg-card hover:bg-border transition-colors"><Download size={20}/></button>
                 </div>
               </div>

               <div className="flex items-center gap-3 mb-6 p-3 bg-card rounded-xl">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand2 to-brand" />
                 <div>
                   <p className="font-bold text-sm">{activePin.author}</p>
                   <p className="text-xs text-muted">Posted on {new Date(activePin.createdAt).toLocaleDateString()}</p>
                 </div>
                 <button className="ml-auto px-4 py-1.5 bg-border rounded-full text-xs font-bold hover:bg-text hover:text-background transition-colors">Follow</button>
               </div>

               <div className="flex-1 overflow-y-auto min-h-[100px] mb-4">
                 <h3 className="font-bold text-sm mb-3">{I18N[lang].comments}</h3>
                 {(comments[activePin.id] || []).length === 0 ? (
                   <p className="text-muted text-sm italic">No comments yet. Be the first!</p>
                 ) : (
                   <div className="space-y-3">
                     {comments[activePin.id].map((c, i) => (
                       <div key={i} className="flex gap-2">
                         <div className="w-6 h-6 rounded-full bg-muted/20 shrink-0" />
                         <div className="bg-card px-3 py-2 rounded-lg rounded-tl-none">
                           <p className="text-sm">{c.text}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>

               <div className="mt-auto relative">
                  <input 
                    type="text" 
                    placeholder="Add a comment..."
                    className="w-full bg-card border border-border rounded-full pl-4 pr-12 py-3 outline-none focus:ring-1 focus:ring-brand"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value.trim();
                        if (!val) return;
                        setComments(prev => ({
                          ...prev,
                          [activePin.id]: [...(prev[activePin.id] || []), { text: val, at: Date.now() }]
                        }));
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand hover:bg-brand/10 rounded-full">
                    <Send size={18} />
                  </button>
               </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface border border-border px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 transition-all duration-300 z-[60] ${toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
        <span className="font-medium text-sm">{toast.msg}</span>
      </div>

    </div>
  );
}