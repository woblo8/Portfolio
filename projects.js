/* ============================================================
   CONTENIDO DEL PORTFOLIO — edita solo este archivo.
   El dado tiene 6 caras = 6 proyectos (orden 01 → 06).

   IMÁGENES Y VÍDEO — automático, no hace falta tocar código:
   Mete los archivos en la carpeta de cada proyecto (folder):
     projects/01-safelife/images/01.jpg   → imagen principal
                                 02.jpg   → par de imágenes (verticales)
                                 03.jpg
                                 04.jpg … 12.jpg → galería extra
     projects/01-safelife/video/video.mp4 → vídeo arriba del todo
   Formatos: jpg, jpeg, png, webp, gif. Lo que no exista no se muestra.
   (images: [...] solo si quieres rutas manuales en vez de 01, 02…)
   ============================================================ */

window.PORTFOLIO = {
  name: "Carlos Infanzón",
  role: "Product Design / 3D / Visual Systems",
  tagline: "Seis caras. Seis entradas.",
  email: "woblo.original@gmail.com",
  linkedin: "https://www.linkedin.com/",
  cv: "",   // ← mete tu CV en assets/ y pon aquí "assets/cv.pdf"
  aboutTitle: "Objects, systems, worlds.",
  about:
    "Diseño productos, sistemas visuales y piezas 3D donde la forma y la función se resuelven a la vez. Sustituye este texto por tu manifiesto: dos o tres frases, sin relleno.",
  disciplines: ["Product Design", "3D & Rendering", "Visual Systems", "Prototyping", "UI / Digital"],
  tools: ["Blender", "Figma", "Adobe Suite", "Cinema 4D", "Solidworks", "FL Studio"],
};

window.PROJECTS = [
  {
    title: "SAFELIFE",
    folder: "projects/01-safelife",
    category: "Product",
    year: "2025",
    role: "Product designer",
    tags: ["Product", "3D", "Prototyping"],
    motif: "cross",
    short: "Sistema de producto: de la investigación al prototipo funcional.",
    intro: "Un producto pensado desde el uso real, iterado en 3D y validado con prototipos físicos.",
    sections: [
      { heading: "Problem", text: "Describe aquí el problema de partida en dos o tres frases." },
      { heading: "Process", text: "Investigación, bocetos, modelado 3D e iteraciones de prototipo." },
      { heading: "Outcome", text: "Resultado final, decisiones clave y aprendizajes." },
    ],
    images: [],
  },
  {
    title: "TON618",
    folder: "projects/02-ton618",
    category: "Experimental",
    year: "2025",
    role: "Concept & visuals",
    tags: ["Concept", "Visual", "Experimental"],
    motif: "rings",
    short: "Exploración visual sobre la escala, la masa y el vacío.",
    intro: "Una pieza conceptual que convierte una idea imposible de abarcar en un lenguaje visual.",
    sections: [
      { heading: "Concept", text: "La idea central del proyecto y por qué importa." },
      { heading: "Execution", text: "Técnicas, herramientas y decisiones visuales." },
    ],
    images: [],
  },
  {
    title: "SIDE A",
    folder: "projects/03-side-a",
    category: "Digital",
    year: "2024",
    role: "UI / Product thinking",
    tags: ["UI", "Product thinking", "Figma"],
    motif: "grid",
    short: "Producto digital: arquitectura, interfaz y sistema de diseño.",
    intro: "Del flujo de usuario al sistema de componentes, con foco en claridad y ritmo.",
    sections: [
      { heading: "Challenge", text: "Qué había que resolver y para quién." },
      { heading: "System", text: "Arquitectura de información, componentes y tokens." },
      { heading: "Result", text: "Pantallas clave y su impacto." },
    ],
    images: [],
  },
  {
    title: "3D VISUALS",
    folder: "projects/04-3d-visuals",
    category: "Selected Works",
    year: "2023—25",
    role: "3D artist",
    tags: ["Renders", "Motion", "3D"],
    motif: "cube",
    short: "Selección de renders y piezas de motion.",
    intro: "Una selección de imágenes y animaciones: luz, material y composición.",
    sections: [
      { heading: "Selection", text: "Breve nota sobre los criterios de la selección." },
    ],
    images: [],
  },
  {
    title: "PROJECT 05",
    folder: "projects/05-proyecto-05",
    category: "In progress",
    year: "2026",
    role: "—",
    tags: ["Coming soon"],
    motif: "dot",
    short: "Espacio reservado para un nuevo proyecto.",
    intro: "Sustituye esta cara por tu próximo proyecto.",
    sections: [{ heading: "Status", text: "En desarrollo." }],
    images: [],
  },
  {
    title: "PROJECT 06",
    folder: "projects/06-proyecto-06",
    category: "In progress",
    year: "2026",
    role: "—",
    tags: ["Coming soon"],
    motif: "square",
    short: "Espacio reservado para un nuevo proyecto.",
    intro: "Sustituye esta cara por tu próximo proyecto.",
    sections: [{ heading: "Status", text: "En desarrollo." }],
    images: [],
  },
];
