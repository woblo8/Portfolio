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

   AMPLIACIÓN: al pulsar una imagen se abre en grande con
   indicador 01 / 04. Pies de foto opcionales, en el mismo orden:
     captions: ["Vista frontal, luz apagada.", "Detalle de la retícula.", …]
   ============================================================ */

window.PORTFOLIO = {
  name: "Carlos Infanzón Civantos",
  role: "Product Design / 3D / Visual Systems",
  tagline: "Seis caras. Seis entradas.",
  email: "woblo.original@gmail.com",
  linkedin: "https://www.linkedin.com/in/carlos-infanzon-civantos",
  contactTitle: "Let’s build something\nworth remembering.",
  cv: "",   // ← mete tu CV en assets/ y pon aquí "assets/cv.pdf"
  aboutTitle: "Objects, systems, worlds.",
  about:
    "Un dado, seis caras, ninguna al azar.\nLa ambición de abrir nuevas posibilidades. La precisión de darles forma.",
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
    title: "TON 618",
    folder: "projects/02-ton618",
    category: "Lighting Product",
    year: "2024",
    role: "Product design · 3D",
    tags: ["Product", "Lighting", "3D"],
    motif: "rings",
    short: "Una lámpara eclipse: la luz rodea la esfera como un horizonte de eventos.",
    intro: "Un faro del pasado, convertido en objeto.",
    sections: [
      { heading: "Concept", text: "TON 618 es un quásar a miles de millones de años luz: brilla con una potencia de unos 10⁴⁰ W, cien billones de veces la energía del Sol. La lámpara traduce esa escala imposible a un objeto doméstico." },
      { heading: "Form", text: "Una esfera negra, un anillo horizontal y una carcasa perforada. Tres piezas, un solo gesto: el eclipse." },
      { heading: "Light", text: "Al encenderse, la luz envuelve la esfera y escapa por la retícula de perforaciones. Suave y ambiental, crea un efecto óptico que parece desafiar la gravedad." },
      { heading: "Construction", text: "Dos mitades simétricas que se ensamblan sobre el anillo central. La vista explosionada y las mallas muestran cómo se construye el objeto." },
    ],
    captions: [
      "Encendida. La luz rodea la esfera como un horizonte de eventos.",
      "Carcasa perforada: la retícula que deja escapar la luz.",
      "Detalle de las perforaciones.",
      "Vista explosionada: mitades, anillos y esfera.",
      "Perfil: la luz corta el objeto en vertical.",
      "Plano en alzado.",
      "Malla de las dos mitades de la carcasa.",
    ],
    images: [],
  },
  {
    title: "SIDE A",
    folder: "projects/03-side-a",
    category: "Digital Product",
    year: "2026",
    role: "UI / Product thinking",
    tags: ["UI", "Product thinking", "Figma"],
    motif: "grid",
    short: "Music designed around intention, not endless choice.",
    intro: "Play like you’ve already made it.",
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
