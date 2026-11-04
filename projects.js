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
  cv: "assets/cv/Carlos-Infanzon-Civantos-CV.pdf",   // se abre en otra pestaña desde Contact
  portrait: "assets/about/portrait.jpg",              // retrato de About (grabado en líneas)
  aboutTitle: "Objects, systems, worlds.",
  about:
    "Un dado, seis caras, ninguna al azar.\nLa ambición de abrir nuevas posibilidades. La precisión de darles forma.",
  disciplines: ["Product Design", "3D & Rendering", "Visual Systems", "Prototyping", "UI / Digital"],
  tools: ["Blender", "Figma", "Adobe Suite", "Cinema 4D", "Solidworks", "FL Studio"],
};

window.PROJECTS = [
  {
    title: "SIDE A",
    folder: "projects/01-side-a",
    category: "Digital Product",
    year: "2026",
    role: "UI / Product thinking",
    tags: ["UI", "Product thinking", "Figma"],
    motif: "grid",
    short: "Music designed around intention, not endless choice.",
    intro: "Play like you’ve already made it.",
    sections: [],
    images: [],
    // SIDE A tiene su propia página: la lees como si escucharas una sesión.
    // Archivos en projects/01-side-a/screens y projects/01-side-a/covers
    layout: "sidea",
    sidea: {
      statement: "Music designed around intention, not endless choice.",
      story:
        "SIDE A no es otra app de streaming. Es un ritual: sesiones largas de house, seleccionadas y sin voces, para trabajar como si ya lo hubieras conseguido. Una sola decisión: darle al play.",
      chapters: [
        { kicker: "Home", title: "Una decisión por pantalla.", text: "La sesión destacada ocupa el centro. El resto espera debajo, sin competir por tu atención.", screen: "01-desktop-home.jpg", caption: "Home. Una sesión destacada y una fila para lo que venga después." },
        { kicker: "Session", title: "Sin ruido.", text: "Número, título, artista, duración. La tracklist como una contraportada.", screen: "02-desktop-session.jpg", caption: "Session. Doce pistas, 58:42, y la opción de tocar hasta una hora concreta." },
        { kicker: "Saved", title: "Tu colección.", text: "Rejilla para mirar. Lista para decidir.", screens: ["03-desktop-saved-grid.jpg", "04-desktop-saved-list.jpg"], caption: "Saved. Rejilla y lista de las sesiones guardadas." },
      ],
      focus: {
        until: "18:00",
        seconds: 8076, // 02:14:36
        line: "Empires are built in hours like these.",
        sub: "Same time tomorrow.",
        screens: ["05-desktop-focus.jpg", "06-desktop-built.jpg"],
        caption: "Focus. Eliges hasta cuándo; SIDE A llena el tiempo y desaparece.",
      },
      mobile: ["07-mobile-home.jpg", "08-mobile-session.jpg", "09-mobile-saved.jpg"],
      outro: "You have an empire to build.\nLet this play.",
      tracks: [
        ["Soft Focus", "Nora Vale"], ["Open Window", "Eli Monroe"], ["Low Profile", "Nora Vale"],
        ["Half Light", "Noah Reed"], ["Slow Geometry", "Nora Vale"], ["Room Service", "Kael June"],
        ["Still Moving", "The Quiet Form"], ["Silver Line", "Luca Venn"], ["Late Checkout", "The Quiet Form"],
      ],
      covers: [
        { file: "quiet-ambition.jpg", title: "Quiet Ambition", line: "You have an empire to build. Let this play.", genre: "Deep house · No vocals", time: "58:42" },
        { file: "after-hours.jpg", title: "After Hours", line: "Late-night house for the ideas that keep you up.", genre: "Downtempo · Minimal vocals", time: "49:36" },
        { file: "stay-in-motion.jpg", title: "Stay in Motion", line: "This is what being ten steps ahead sounds like.", genre: "Disco house · No vocals", time: "1:05:26" },
        { file: "slow-sunday.jpg", title: "Slow Sunday", line: "Take your time. Make it look effortless.", genre: "Downtempo · No vocals", time: "52:17" },
        { file: "the-choice-is-yours.jpg", title: "The Choice Is Yours", line: "House music for the life you’re building in private.", genre: "Melodic house · No vocals", time: "1:03:18" },
        { file: "tokyo-after-dark.jpg", title: "Tokyo After Dark", line: "Tokyo after midnight. Everything feels possible.", genre: "Deep house · UK garage", time: "1:02:47" },
        { file: "private-departure.jpg", title: "Private Departure", line: "House music for people who were born for more.", genre: "Deep house · Minimal vocals", time: "1:01:38" },
        { file: "open-water.jpg", title: "Open Water", line: "Your only appointment is with the horizon.", genre: "Balearic house · Minimal vocals", time: "54:26" },
        { file: "silver-frame.jpg", title: "Silver Frame", line: "House music for people with a vision.", genre: "Jazz house · Minimal vocals", time: "1:07:12" },
        { file: "reference-sound.jpg", title: "Reference Sound", line: "Old-school house for people with ridiculously high standards.", genre: "Soulful house · Minimal vocals", time: "57:43" },
      ],
    },
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
    // TON 618 tiene su propia página: escala absurda, zoom hacia el negro.
    layout: "ton618",
    ton: {
      hero: "images/01.jpg",
      kicker: "Quasar · Lámpara eclipse",
      fact: "TON 618 es un quásar a miles de millones de años luz. Un faro del pasado.",
      power: "Brilla con una potencia de unos",
      powerSun: "Cien billones de veces la energía del Sol.",
      object: "La lámpara traduce esa escala imposible a un objeto que cabe en una habitación.",
      parts: [
        { label: "Carcasa superior", note: "Perforada: la luz escapa por la retícula", y: 18 },
        { label: "Anillo", note: "El horizonte", y: 31 },
        { label: "Esfera", note: "El núcleo negro", y: 50 },
        { label: "Anillo inferior", note: "Cierra el eclipse", y: 67 },
        { label: "Carcasa inferior", note: "Simétrica a la superior", y: 83 },
      ],
      exploded: "images/04.jpg",
      details: ["images/02.jpg", "images/03.jpg"],
      profile: "images/05.jpg",
      drawings: ["images/06.jpg", "images/07.jpg"],
      video: "video/video.mp4",
      quote: "No es solo una lámpara.\nEs una experiencia.",
    },
  },
  {
    title: "SAFELIFE",
    folder: "projects/03-safelife",
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
