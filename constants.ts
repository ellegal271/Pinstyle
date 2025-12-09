import { Pin } from './types';

export const CATEGORIES = [
  "Arte", "Diseño", "UI/UX", "Arquitectura", "Fotografía", "Ilustración", 
  "Moda", "Tecnología", "Cocina", "Viajes", "Naturaleza", "Minimalismo"
];

export const TRENDING = [
  "Neon", "Cinemático", "Manga", "Tipografía", "Isométrico", "Brutalismo", "Retro", "Futurismo", "Lowpoly"
];

export const uid = () => Math.random().toString(36).slice(2, 9);

export const makeDemoPins = (count = 24, offset = 0): Pin[] => {
  const list: Pin[] = [];
  for (let i = 0; i < count; i++) {
    const id = uid();
    const w = 400 + Math.floor(Math.random() * 400);
    const h = 500 + Math.floor(Math.random() * 600);
    const seed = offset + i + Math.floor(Math.random() * 9999);
    const src = `https://picsum.photos/seed/${seed}/${w}/${h}`;
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const tags = [TRENDING[Math.floor(Math.random() * TRENDING.length)], cat.toLowerCase()];
    list.push({
      id,
      src,
      w,
      h,
      title: `Idea #${offset + i + 1}`,
      desc: "Inspiración visual generada para la demo. Usa subir para añadir tus propias imágenes.",
      author: "Anónimo",
      cat,
      tags,
      createdAt: Date.now() - Math.floor(Math.random() * 86400000)
    });
  }
  return list;
};