/* ============================================================
   CONTENIDO DEL PORTFOLIO — edita solo este archivo.
   El dado tiene 6 caras (orden 01 → 06): cuatro proyectos y dos entradas
   (Sobre mí, Contacto). slug = la URL de cada cara: woblo.io/side-a

   IDIOMAS: cada texto va en español y en inglés con bi("es", "en").
   Si un texto es igual en los dos idiomas, escríbelo normal.

   IMÁGENES Y VÍDEO (proyectos sin página propia) — automático:
     projects/<carpeta>/images/01.jpg   → imagen principal
                              02.jpg   → par de imágenes (verticales)
                              03.jpg
                              04.jpg … 12.jpg → galería extra
     projects/<carpeta>/video/video.mp4 → vídeo arriba del todo
   Formatos: jpg, jpeg, png, webp, gif. Lo que no exista no se muestra.

   AMPLIACIÓN: al pulsar una imagen se abre en grande con
   indicador 01 / 04 y pie de foto (captions, en el mismo orden).
   ============================================================ */

window.PORTFOLIO = {
  name: "Carlos Infanzón Civantos",
  role: bi("Diseño de producto / 3D / Sistemas visuales", "Product Design / 3D / Visual Systems"),
  tagline: bi("Seis caras. Seis entradas.", "Six faces. Six ways in."),
  availability: bi("Disponible para nuevas oportunidades", "Open to new opportunities"),
  calendly: "https://calendly.com/stoicmacy/llamada-30-min", // reservar una llamada de 30 min (Google Meet)
  email: "woblo.original@gmail.com",
  linkedin: "https://www.linkedin.com/in/carlos-infanzon-civantos",
  contactTitle: bi("Construyamos algo\nque merezca recordarse.", "Let’s build something\nworth remembering."),
  cv: "assets/cv/Carlos-Infanzon-Civantos-CV.pdf",   // se abre en otra pestaña desde Contact
  portrait: "assets/about/portrait.jpg",              // foto de About
  aboutTitle: bi("Objetos, sistemas, mundos.", "Objects, systems, worlds."),
  about: bi(
    "Un dado, seis caras, ninguna al azar.\nLa ambición de abrir nuevas posibilidades. La precisión de darles forma.",
    "A die, six faces, none left to chance.\nThe ambition to open new possibilities. The precision to give them form."
  ),
  disciplines: bi(
    ["Diseño de producto", "3D y render", "Sistemas visuales", "Prototipado", "UI / Digital"],
    ["Product Design", "3D & Rendering", "Visual Systems", "Prototyping", "UI / Digital"]
  ),
  tools: ["Blender", "Figma", "Adobe Suite", "Cinema 4D", "Solidworks", "FL Studio"],
};

window.PROJECTS = [
  {
    title: "SIDE A",
    slug: "side-a",
    // en 10 segundos: qué es, para quién y qué hice yo
    summary: {
      what: bi("Una app de música que cambia el scroll infinito por sesiones largas y seleccionadas para trabajar concentrado.", "A music app that swaps endless scrolling for long, curated sessions to work in deep focus."),
      who: bi("Para quien trabaja en profundidad: creativos, fundadores, estudiantes.", "For people who do deep work: creatives, founders, students."),
      me: bi("Concepto, flujos, interfaz de escritorio y móvil, y la identidad de las portadas.", "Concept, flows, desktop and mobile UI, and the cover art direction."),
    },
    folder: "projects/01-side-a",
    category: bi("Producto digital", "Digital Product"),
    year: "2026",
    role: bi("UI / Pensamiento de producto", "UI / Product thinking"),
    tags: bi(["UI", "Pensamiento de producto", "Figma"], ["UI", "Product thinking", "Figma"]),
    motif: "grid",
    short: "Music designed around intention, not endless choice.",
    intro: "Play like you’ve already made it.",
    sections: [],
    images: [],
    // SIDE A tiene su propia página: la lees como si escucharas una sesión.
    layout: "sidea",
    sidea: {
      statement: "Music designed around intention, not endless choice.",
      story: bi(
        "SIDE A no es otra app de streaming. Es un ritual: sesiones largas de house, seleccionadas y sin voces, para trabajar como si ya lo hubieras conseguido. Una sola decisión: darle al play.",
        "SIDE A isn’t another streaming app. It’s a ritual: long, curated house sessions without vocals, for working as if you’d already made it. One decision only: press play."
      ),
      chapters: [
        { kicker: "Home", title: bi("Una decisión por pantalla.", "One decision per screen."), text: bi("La sesión destacada ocupa el centro. El resto espera debajo, sin competir por tu atención.", "The featured session takes the centre. Everything else waits below, without competing for your attention."), screen: "01-desktop-home.jpg", caption: bi("Home. Una sesión destacada y una fila para lo que venga después.", "Home. One featured session and a row for whatever comes next.") },
        { kicker: "Session", title: bi("Sin ruido.", "No noise."), text: bi("Número, título, artista, duración. La tracklist como una contraportada.", "Number, title, artist, length. The tracklist as a back cover."), screen: "02-desktop-session.jpg", caption: bi("Session. Doce pistas, 58:42, y la opción de tocar hasta una hora concreta.", "Session. Twelve tracks, 58:42, and the option to play until a set time.") },
        { kicker: "Saved", title: bi("Tu colección.", "Your collection."), text: bi("Rejilla para mirar. Lista para decidir.", "A grid to browse. A list to decide."), screens: ["03-desktop-saved-grid.jpg", "04-desktop-saved-list.jpg"], caption: bi("Saved. Rejilla y lista de las sesiones guardadas.", "Saved. Grid and list of saved sessions.") },
      ],
      focus: {
        until: "18:00",
        seconds: 8076, // 02:14:36
        line: "Empires are built in hours like these.",
        sub: "Same time tomorrow.",
        screens: ["05-desktop-focus.jpg", "06-desktop-built.jpg"],
        caption: bi("Focus. Eliges hasta cuándo; SIDE A llena el tiempo y desaparece.", "Focus. You choose until when; SIDE A fills the time and disappears."),
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
    slug: "ton-618",
    // en 10 segundos: qué es, para quién y qué hice yo
    summary: {
      what: bi("Una lámpara de sobremesa inspirada en un quásar: la luz rodea una esfera negra como un eclipse.", "A table lamp inspired by a quasar: light circles a black sphere like an eclipse."),
      who: bi("Para interiores contemporáneos que buscan una pieza escultórica.", "For contemporary interiors that want a sculptural piece."),
      me: bi("Concepto, diseño de producto, modelado 3D, render y planos.", "Concept, product design, 3D modelling, rendering and drawings."),
    },
    folder: "projects/02-ton618",
    category: bi("Producto de iluminación", "Lighting Product"),
    year: "2024",
    role: bi("Diseño de producto · 3D", "Product design · 3D"),
    tags: bi(["Producto", "Iluminación", "3D"], ["Product", "Lighting", "3D"]),
    motif: "rings",
    short: bi("Una lámpara eclipse: la luz rodea la esfera como un horizonte de eventos.", "An eclipse lamp: light circles the sphere like an event horizon."),
    intro: bi("Un faro del pasado, convertido en objeto.", "A lighthouse from the past, turned into an object."),
    sections: [
      { heading: bi("Concepto", "Concept"), text: bi("TON 618 es un quásar a miles de millones de años luz: brilla con una potencia de unos 10⁴⁰ W, cien billones de veces la energía del Sol. La lámpara traduce esa escala imposible a un objeto doméstico.", "TON 618 is a quasar billions of light-years away: it shines with a power of about 10⁴⁰ W, a hundred trillion times the energy of the Sun. The lamp translates that impossible scale into a domestic object.") },
      { heading: bi("Forma", "Form"), text: bi("Una esfera negra, un anillo horizontal y una carcasa perforada. Tres piezas, un solo gesto: el eclipse.", "A black sphere, a horizontal ring and a perforated shell. Three parts, one gesture: the eclipse.") },
      { heading: bi("Luz", "Light"), text: bi("Al encenderse, la luz envuelve la esfera y escapa por la retícula de perforaciones. Suave y ambiental, crea un efecto óptico que parece desafiar la gravedad.", "When switched on, light wraps the sphere and escapes through the perforated grid. Soft and ambient, it creates an optical effect that seems to defy gravity.") },
      { heading: bi("Construcción", "Construction"), text: bi("Dos mitades simétricas que se ensamblan sobre el anillo central. La vista explosionada y las mallas muestran cómo se construye el objeto.", "Two symmetrical halves assembled on the central ring. The exploded view and meshes show how the object is built.") },
    ],
    captions: [
      bi("Encendida. La luz rodea la esfera como un horizonte de eventos.", "Switched on. Light circles the sphere like an event horizon."),
      bi("Carcasa perforada: la retícula que deja escapar la luz.", "Perforated shell: the grid that lets the light escape."),
      bi("Detalle de las perforaciones.", "Detail of the perforations."),
      bi("Vista explosionada: mitades, anillos y esfera.", "Exploded view: halves, rings and sphere."),
      bi("Perfil: la luz corta el objeto en vertical.", "Profile: light cuts the object vertically."),
      bi("Plano en alzado.", "Elevation drawing."),
      bi("Malla de las dos mitades de la carcasa.", "Mesh of the two halves of the shell."),
    ],
    images: [],
    // TON 618 tiene su propia página: escala absurda, zoom hacia el negro.
    layout: "ton618",
    ton: {
      hero: "images/01.jpg",
      kicker: bi("Quásar · Lámpara eclipse", "Quasar · Eclipse lamp"),
      fact: bi("TON 618 es un quásar a miles de millones de años luz. Un faro del pasado.", "TON 618 is a quasar billions of light-years away. A lighthouse from the past."),
      power: bi("Brilla con una potencia de unos", "It shines with a power of about"),
      powerSun: bi("Cien billones de veces la energía del Sol.", "A hundred trillion times the energy of the Sun."),
      object: bi("La lámpara traduce esa escala imposible a un objeto que cabe en una habitación.", "The lamp translates that impossible scale into an object that fits in a room."),
      parts: [
        { label: bi("Carcasa superior", "Upper shell"), note: bi("Perforada: la luz escapa por la retícula", "Perforated: light escapes through the grid"), y: 18 },
        { label: bi("Anillo", "Ring"), note: bi("El horizonte", "The horizon"), y: 31 },
        { label: bi("Esfera", "Sphere"), note: bi("El núcleo negro", "The black core"), y: 50 },
        { label: bi("Anillo inferior", "Lower ring"), note: bi("Cierra el eclipse", "Closes the eclipse"), y: 67 },
        { label: bi("Carcasa inferior", "Lower shell"), note: bi("Simétrica a la superior", "Mirrors the upper one"), y: 83 },
      ],
      exploded: "images/04.jpg",
      details: ["images/02.jpg", "images/03.jpg"],
      profile: "images/05.jpg",
      drawings: ["images/06.jpg", "images/07.jpg"],
      video: "video/video.mp4",
      quote: bi("No es solo una lámpara.\nEs una experiencia.", "It’s not just a lamp.\nIt’s an experience."),
    },
  },
  {
    title: "SAFELIFE",
    slug: "safelife",
    // en 10 segundos: qué es, para quién y qué hice yo
    summary: {
      what: bi("Una farola con brazo giratorio que reorienta la luz según cómo se usa la calle.", "A streetlight with a rotating arm that redirects light as the street is used differently."),
      who: bi("Para ciudades y espacios públicos que cambian a lo largo del día.", "For cities and public spaces that change through the day."),
      me: bi("Investigación, concepto, modelado 3D y un prototipo impreso en 3D.", "Research, concept, 3D modelling and a 3D-printed prototype."),
    },
    folder: "projects/03-safelife",
    category: bi("Producto urbano", "Urban Product"),
    year: "2022",
    role: bi("Diseño de producto · 3D · Prototipado", "Product design · 3D · Prototyping"),
    tags: bi(["Concepto", "Modelado 3D", "Prototipado"], ["Concept", "3D modelling", "Prototyping"]),
    motif: "cross",
    short: bi("Una farola que gira para llevar la luz donde la ciudad la necesita.", "A streetlight that turns to bring light where the city needs it."),
    intro: bi("Luz donde la ciudad la necesita.", "Light where the city needs it."),
    sections: [],
    images: [],
    // SAFELIFE tiene su propia página: técnica, y la luz se dirige con el scroll.
    layout: "safelife",
    safe: {
      problem: bi("La ciudad cambia a lo largo del día; la iluminación urbana se queda fija.", "The city changes throughout the day; street lighting stays fixed."),
      idea: bi("SAFELIFE explora una estructura de luz capaz de reorientarse cuando cambian los recorridos, la actividad y lo que el espacio necesita.", "SAFELIFE explores a lighting structure able to reorient itself as routes, activity and the needs of the space change."),
      verbs: [
        { w: bi("Adapta", "Adapt"), t: bi("Una estructura ajustable cambia la dirección de la luz.", "An adjustable structure changes the direction of the light.") },
        { w: bi("Enfoca", "Focus"), t: bi("La luz se dirige al área que necesita atención.", "Light is directed to the area that needs attention.") },
        { w: bi("Integra", "Integrate"), t: bi("Luz y movimiento se convierten en un único objeto urbano.", "Light and movement become a single urban object.") },
      ],
      concept: [
        { img: "process/study-model.jpg", label: bi("Forma continua", "Continuous form"), text: bi("Un solo cuerpo curvo: silueta compacta, pero menos control sobre la dirección de la luz.", "A single curved body: a compact silhouette, but less control over the direction of the light.") },
        { img: "process/sketch-model.jpg", label: bi("Distribución radial", "Radial distribution"), text: bi("Varios brazos: más cobertura, pero más componentes y más complejidad visual.", "Several arms: wider coverage, but more parts and more visual complexity.") },
        { img: "frames/hero.webp", label: bi("Elegido — Brazo giratorio", "Selected — Rotating arm"), text: bi("Una estructura horizontal que separa soporte, movimiento y luz, con una silueta clara.", "A horizontal structure that separates support, movement and light, with a clear silhouette.") },
      ],
      prototype: [
        { img: "process/printing.jpg", label: bi("01 / Fabricación", "01 / Manufacturing"), text: bi("Impresión FDM por piezas: la secuencia de montaje queda a la vista.", "FDM printing in separate parts: the assembly sequence stays visible.") },
        { img: "process/assembly.jpg", label: bi("02 / Montaje", "02 / Assembly"), text: bi("El prototipo aclara cómo se unen soporte, brazo y cuerpo de luz.", "The prototype clarifies how support, arm and light body connect.") },
        { img: "process/gear.jpg", label: bi("03 / Proporción", "03 / Proportion"), text: bi("El modelo físico permite juzgar grosores, equilibrio y jerarquía.", "The physical model helps judge thickness, balance and hierarchy.") },
      ],
      parts: [
        { n: "01", label: bi("Soporte fijo", "Fixed support"), text: bi("Estructura vertical anclada al suelo.", "Vertical structure anchored to the ground.") },
        { n: "02", label: bi("Collarín de giro", "Rotation collar"), text: bi("La unión central que permite cambiar la orientación.", "The central joint that lets the orientation change.") },
        { n: "03", label: bi("Brazo de luz", "Lighting arm"), text: bi("Elemento horizontal entre el soporte y la luminaria.", "Horizontal element between the support and the luminaire.") },
        { n: "04", label: bi("Anillo LED", "LED ring"), text: bi("Fuente de luz circular para una iluminación dirigida.", "Circular light source for directed illumination.") },
      ],
      outro: bi("Luz y movimiento\nen un único objeto urbano.", "Lighting and movement\nbecome a single urban object."),
    },
  },
  {
    title: "JACKPOT STACK",
    slug: "jackpot-stack",
    summary: {
      what: bi("Un juego de mesa de estrategia donde construyes un casino y subes de Don Nadie a Magnate Supremo.", "A strategy board game where you build a casino and climb from Nobody to Supreme Magnate."),
      who: bi("Para 2–4 jugadores que quieren rivalidad, faroles y mesa, lejos de las pantallas.", "For 2–4 players who want rivalry, bluffing and a table, away from screens."),
      me: bi("Trabajo de Fin de Grado: mecánicas, reglas, cartas, identidad, prototipos y packaging.", "Final degree project: mechanics, rules, cards, identity, prototypes and packaging."),
    },
    folder: "projects/04-jackpot-stack",
    category: bi("Juego de mesa · TFG", "Board game · Thesis"),
    year: "2025",
    role: bi("Diseño de juego · Gráfico · Packaging", "Game design · Graphics · Packaging"),
    tags: bi(["Diseño de juego", "Identidad", "Prototipado"], ["Game design", "Identity", "Prototyping"]),
    motif: "hex",
    short: bi("Un juego de mesa de casinos, trampas con código y ambición: de Don Nadie a Magnate Supremo.", "A board game of casinos, coded traps and ambition: from Nobody to Supreme Magnate."),
    intro: bi("De Don Nadie a Magnate Supremo.", "From Nobody to Supreme Magnate."),
    sections: [],
    images: [],
    // JACKPOT STACK tiene su propia página: sube de estatus con el scroll y descifra una trampa con el dado.
    layout: "jackpot",
    jackpot: {
      facts: [
        { v: "2–4", k: bi("Jugadores", "Players") },
        { v: "60–90′", k: bi("Por partida", "Per game") },
        { v: "+12", k: bi("Años", "Years") },
        { v: "10", k: bi("Rondas", "Rounds") },
      ],
      idea: bi("Cada jugador levanta su casino hexágono a hexágono alrededor de una banca central. Gana quien acabe sin deudas con el casino abierto o, tras diez rondas, quien tenga más Stacks. Por el camino: apuestas, sobornos, VIPs y trampas con códigos secretos.", "Each player builds a casino hexagon by hexagon around a central bank. The winner is whoever ends with no debt and the casino still open or, after ten rounds, holds the most Stacks. Along the way: bets, bribes, VIPs and traps with secret codes."),
      moves: [
        { w: bi("Construye", "Build"), t: bi("Máquinas y pisos nuevos: más ingresos, más estatus.", "Machines and new floors: more income, more status.") },
        { w: bi("Atrae VIPs", "Attract VIPs"), t: bi("Subastas secretas por los apostadores que lo cambian todo.", "Secret auctions for the high rollers who change everything.") },
        { w: bi("Pon trampas", "Set traps"), t: bi("Cada máquina guarda un código que los rivales tienen que descifrar.", "Every machine holds a code your rivals have to crack.") },
        { w: bi("Sube de estatus", "Climb"), t: bi("Cinco rangos, cada uno con sus ventajas y sus riesgos.", "Five ranks, each with its perks and its risks.") },
      ],
      phases: [
        { w: bi("Ingresos", "Income"), t: bi("Tus máquinas te pagan Stacks desde la banca.", "Your machines pay you Stacks from the bank.") },
        { w: bi("Construcción", "Building"), t: bi("Máquinas, pisos, mejoras… y trampas.", "Machines, floors, upgrades… and traps.") },
        { w: bi("Apuestas", "Betting"), t: bi("En tu casino o en el de otro, con el dado de cada máquina.", "In your casino or someone else’s, with each machine’s die.") },
        { w: bi("Inspección", "Inspection"), t: bi("El Dado de Riesgo intenta descifrar las trampas rivales.", "The Risk Die tries to crack your rivals’ traps.") },
        { w: bi("Eventos", "Events"), t: bi("Crisis, auditorías y fiestas que afectan a todos.", "Crises, audits and parties that hit everyone.") },
      ],
      trap: bi("Una trampa activa el código de la máquina (aquí, 6-3-3). Para desactivarla hay que acertar cada dígito con el Dado de Riesgo: si fallas uno, se acaba tu turno. O te la juegas a una sola tirada: 1–2 pierdes, 5–6 la desactivas.", "A trap activates the machine’s code (here, 6-3-3). To disarm it you must hit every digit with the Risk Die: miss one and your turn is over. Or gamble on a single roll: 1–2 you lose, 5–6 you disarm it."),
      outro: bi("De Don Nadie\na Magnate Supremo.", "From Nobody\nto Supreme Magnate."),
    },
  },
  // ---- caras 05–06: no son proyectos, son entradas ----
  {
    kind: "about",
    slug: "sobre-mi",
    title: bi("SOBRE MÍ", "ABOUT"),
    category: bi("Entrada", "Entry"),
    year: "C·I·C",
    meta: bi("Quién hay detrás del dado", "Who is behind the die"),
    tags: bi(["Producto", "3D", "Sistemas"], ["Product", "3D", "Systems"]),
    motif: "dot",
    short: bi("Diseñador de producto entre lo físico y lo digital: objetos, interfaces y los sistemas que los unen.", "A product designer between the physical and the digital: objects, interfaces and the systems that join them."),
    intro: "",
    sections: [],
    images: [],
  },
  {
    kind: "contact",
    slug: "contacto",
    title: bi("CONTACTO", "CONTACT"),
    category: bi("Entrada", "Entry"),
    year: "2026",
    meta: bi("Disponible para nuevas oportunidades", "Open to new opportunities"),
    tags: bi(["Correo", "LinkedIn", "CV"], ["Email", "LinkedIn", "CV"]),
    motif: "square",
    short: bi("Un correo o una llamada: escríbeme o reserva una llamada de 30 minutos.", "An email or a call: write to me or book a 30-minute call."),
    intro: "",
    sections: [],
    images: [],
  },
];

// pick the visitor's language for everything above
window.PORTFOLIO = L10N(window.PORTFOLIO);
window.PROJECTS = L10N(window.PROJECTS);
