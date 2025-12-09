export interface Comment {
  text: string;
  at: number;
}

export interface Pin {
  id: string;
  src: string;
  w: number;
  h: number;
  title: string;
  desc: string;
  author: string;
  cat: string;
  tags: string[];
  createdAt: number;
}

export interface User {
  uid?: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface AppState {
  pins: Pin[];
  filterText: string;
  filterCategory: string | null;
  quickFilter: 'saved' | 'liked' | 'recent' | null;
  likes: Record<string, { count: number }>;
  saved: Record<string, boolean>;
  comments: Record<string, Comment[]>;
  user: User | null;
}

export type Language = 'es' | 'en';

export const I18N = {
  es: {
    categories: "Categorías",
    trending: "Tendencias",
    quick: "Accesos rápidos",
    saved: "Guardados",
    liked: "Con like",
    recent: "Recientes",
    save: "Guardar",
    like: "Like",
    share: "Compartir",
    download: "Descargar",
    comments: "Comentarios",
    uploadTitle: "Crear nuevo pin",
    loginTitle: "Iniciar sesión",
    searchPlaceholder: "Buscar ideas, temas, autores...",
    upload: "Subir",
    login: "Entrar",
    logout: "Salir",
    close: "Cerrar",
    publish: "Publicar",
    clean: "Limpiar",
    imageFile: "Imagen (archivo)",
    imageUrl: "Imagen (URL)",
    title: "Título",
    desc: "Descripción",
    category: "Categoría",
    tagsLabel: "Etiquetas (separadas por coma)",
    email: "Email",
    password: "Contraseña",
    enter: "Continuar con Google",
    demoNote: "Configura Firebase en services/firebase.ts para persistencia real.",
    toastSaved: "Guardado",
    toastUnsaved: "Quitado de guardados",
    toastLinkCopied: "Enlace copiado",
    toastPublished: "Pin publicado",
    toastLogin: "Bienvenido",
    toastLoginRequired: "Debes iniciar sesión para subir pines",
    toastFill: "Completa todos los campos",
    aiGenerate: "Autocompletar con IA",
    aiAnalyzing: "Analizando imagen...",
    configMissing: "Modo Demo: Configura Firebase para guardar datos reales."
  },
  en: {
    categories: "Categories",
    trending: "Trending",
    quick: "Shortcuts",
    saved: "Saved",
    liked: "Liked",
    recent: "Recent",
    save: "Save",
    like: "Like",
    share: "Share",
    download: "Download",
    comments: "Comments",
    uploadTitle: "Create new pin",
    loginTitle: "Login",
    searchPlaceholder: "Search ideas, topics, authors...",
    upload: "Upload",
    login: "Login",
    logout: "Logout",
    close: "Close",
    publish: "Publish",
    clean: "Reset",
    imageFile: "Image (File)",
    imageUrl: "Image (URL)",
    title: "Title",
    desc: "Description",
    category: "Category",
    tagsLabel: "Tags (comma separated)",
    email: "Email",
    password: "Password",
    enter: "Continue with Google",
    demoNote: "Configure Firebase in services/firebase.ts for real persistence.",
    toastSaved: "Saved",
    toastUnsaved: "Removed from saved",
    toastLinkCopied: "Link copied",
    toastPublished: "Pin published",
    toastLogin: "Welcome",
    toastLoginRequired: "You must login to upload pins",
    toastFill: "Fill all fields",
    aiGenerate: "Magic Autofill",
    aiAnalyzing: "Analyzing image...",
    configMissing: "Demo Mode: Configure Firebase to save real data."
  }
};