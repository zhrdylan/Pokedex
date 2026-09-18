# PokéTrainer Hub 🔴⚪

Una experiencia web interactiva integral diseñada con **HTML5 Semántico, CSS3 Modular, Vanilla JavaScript (ES6 Modules)** y animaciones fluidas con **GSAP Core**. El proyecto combina una Pokédex en vivo alimentada por **PokéAPI**, un minijuego de captura interactivo con Poké Ball, un gestor de colección y formación de equipo de hasta 6 miembros, y una **Arena de Batalla por turnos contra la CPU** con 4 niveles de dificultad y un **Jefe Final legendario por fases scriptadas, invencible por reglas explícitas**.

---

## 🚀 Características Principales

### 1. Entrada Cinematográfica (Hero / Landing)
* Hero limpio con Ash como protagonista (sin video de fondo).
* Video cinematográfico `assets/vid/Entrada.mp4` reservado para la **entrada a la Arena** (con botón Omitir).
* Tipografía táctica de entrenador y llamado a la acción *"Comenzar Aventura"*.
* Animaciones y microinteracciones fluidas (respetan `prefers-reduced-motion`).

### 2. Ash Ketchum como Guía de la Experiencia (`AshGuide`)
Uso estratégico e interactivo de los assets oficiales de Ash para feedback y asistencia:
* **`Ash_Ketchum-Saludando.png`**: Bienvenida y saludo inicial.
* **`Ash_Ketchum-Teniendo-Celular.jpeg`**: Inspección y consulta de datos en la Pokédex.
* **`Ahs_Ketchum-Señalando.jpeg`**: Onboarding guiado paso a paso y explicación de módulos.
* **`Ash_Ketchum_Lanzando-Pokemon.jpeg`**: Lanzamiento de Poké Ball e inicio de combates.
* **`Ash_Ketchum-Golpe-Efectivo.jpeg`**: Feedback visual ante ataques super eficaces (x2 / x4).
* **`Ash_Ketchum-Motivando.jpeg`**: Alerta de salud crítica (< 25% HP) y combate contra el Jefe Final.
* **`Ahs_Ketchum-Victoria.jpeg`**: Pantalla de victoria y celebraciones de captura.
* **`Ash_Ketchum.jpeg`**: Perfil del entrenador en la colección.

### 3. Onboarding Interactivo Paso a Paso
* Secuencia guiada de 6 pasos para nuevos usuarios explicando Pokédex, Tipos, Captura, Colección, Equipo y Arena.
* Controles: *Siguiente*, *Anterior* y *Omitir Tutorial* (también tecla Escape).
* Durante el tour la interacción con el fondo queda bloqueada para no romper la secuencia.
* Persistencia en `localStorage` con botón accesible en el header para repetir la guía en cualquier momento.

### 4. Pokédex Interactiva en Vivo
* Conexión directa a **PokéAPI v2** con capa de caché en memoria (`Map`) para optimizar rendimiento.
* Búsqueda en tiempo real por nombre o número de Pokédex.
* Filtro instantáneo por los 18 tipos elementales.
* Ordenamiento por ID (ascendente / descendente) y orden alfabético (A-Z / Z-A).
* Carga progresiva por lotes de 20 Pokémon con botón *"Cargar Más"*.
* Tarjetas con un solo botón (Detalle); la captura se hace desde el detalle o el Safari.
* Badges de estado de captura en tiempo real (🔴 Capturado / ⚪ No capturado).

### 5. Detalle del Pokémon con Animaciones GSAP
* Modal con datos oficiales: altura, peso, experiencia base, habilidades y movimientos destacados.
* Visualizador de estadísticas base (HP, Ataque, Defensa, Atq. Especial, Def. Especial, Velocidad) con barras animadas y `role="progressbar"`.

### 6. Consulta de Tipos y Relaciones de Daño
* Explorador de los 18 tipos elementales en cuadrícula 9/6/3 (desktop/tablet/móvil) a igual altura.
* Matriz de efectividad táctica en tiempo real:
  * **Super Efectivo:** Daño x2.0 / x4.0.
  * **Poco Efectivo:** Daño x0.5.
  * **Sin Efecto:** Daño x0.0.
* Muestra de Pokémon representativos de cada tipo obtenidos dinámicamente desde PokéAPI.

### 7. Sistema de Captura Jugable (motor unificado `capture-engine.js`)
* Un solo motor de probabilidad y suspense para Pokédex y Safari (cero duplicación).
* Safari interactivo: zona verde **a la deriva** (quieta en común, máxima en legendario), sistema de **alerta** (+12% velocidad por intento, tope +60%), **baya** 1× por encuentro (ensancha la verde ×1.5), **racha de perfectos**, vuelo de la ball y **hasta 3 intentos por encuentro** (al tercero el Pokémon huye).
* Botón Reintentar funcional (reanuda el encuentro) y atajo `Espacio` visible con `<kbd>`.
* Minijuego de puntería en el modal con zonas verde/amarilla/roja según rareza y botón temático de lanzamiento.
* Selector de Poké Ball (x1.0 / x1.35 / x1.70) con `aria-pressed`.
* Animación de oscilación (*wobble*) y conteo de suspense (1... 2... 3...).
* Probabilidad ponderada con resolución de éxito o escape, sin `alert()`/`confirm()`.
* Registro inmediato en `localStorage` y asignación automática al equipo si hay vacante (< 6).

### 8. Mi Colección (galería canónica fusionada) y Equipo (máximo 6)
* **Galerías fusionadas**: un solo motor `js/ui/gallery.js`. Mi Colección muestra todo (con buscador); Mi Perfil muestra vista previa (6) + carnet.
* Progreso nacional sobre **1025** en ambas vistas.
* Panel de entrenador con 6 ranuras tácticas (`<ol>`).
* Asignación de Pokémon líder activo (👑), **reordenar (subir/bajar)** y quitar.
* Validación de límite de 6 y avisos claros con Ash + toast.

### 9. Arena de Combate por Turnos y Dificultades
* Fondo de estadio panorámico (`assets/img/Estadio/Estadio_Pokemon.jpeg`) y campo de batalla (`assets/img/Estadio/Campo_Batalla.jpeg`).
* Fórmula de daño matemática equilibrada con variación, cálculo de golpe crítico, bonificación de mismo tipo (STAB) y **categoría real del movimiento** (físico/especial/estado) desde PokémonDB.
* Barras de vida dinámicas con cambio de color gradual (Verde > Amarillo > Rojo) y `role="progressbar"`.
* Efectos de impacto, sacudida de pantalla (*screen shake*, desactivada con `prefers-reduced-motion`) y aparición de Ash ante golpes muy eficaces.
* Botón Abandonar conectado por JS (sin `onclick` inline); controles bloqueados durante animaciones.
* **Relevo por equipo**: la arena juega con la escuadra completa (abre el líder). Al caer, panel de relevo forzoso con los conscientes; derrota solo si caen los 6. Cambio voluntario disponible que regala el turno a la CPU. HUD con dots de escuadra y conteo `n/6 en pie`. El HP de la escuadra se descarta al salir (sin cambios en LocalStorage).
* **4 Niveles de Dificultad:**
  1. **Principiante:** Decisiones aleatorias, ideal para aprender.
  2. **Intermedio:** Entiende afinidades elementales y ataca debilidades. (Requiere 1 victoria).
  3. **Avanzado:** IA competitiva que **prioriza remates (KO)** y maximiza potencia × efectividad. (Requiere 3 victorias).
  4. **Jefe Final (Mewtwo Legendario por fases):** invencible por **reglas explícitas y visibles**: 3 fases con daño creciente (Contención → Furia Psíquica → Forma Divina), **2 resurrecciones scriptadas** ante KO, **barrera divina de 1 HP** y **Juicio Final** (KO garantizado al jugador tras 10 turnos). La victoria en boss está vetada por código (`noVictory`): todo cierre es derrota honrosa sin registros.
* Persistencia de victorias y dificultades desbloqueadas.

---

## 📁 Estructura del Proyecto

```text
Pokedex/
├── index.html                   # Documento principal y contenedor SPA
├── README.md                    # Documentación técnica
├── assets/
│   ├── img/
│   │   ├── Ash_Ketchum/         # 8 assets oficiales de Ash
│   │   └── Estadio/             # Fondos del estadio y campo de batalla
│   └── vid/
│       └── Entrada.mp4          # Video cinematográfico de entrada a la Arena
├── css/
│   ├── variables.css            # Tokens de diseño y colores oficiales de tipos
│   ├── reset.css                # Limpieza de estilos nativos
│   ├── base.css                 # Tipografía, scrollbar y fondo
│   ├── layout.css               # Header, navbar, footer y hero (+ .brand-accent/.menu-bar/.title-accent)
  │   ├── components.css           # Botones, badges, barras de stats y modales
│   ├── ash-guide.css            # Componente de diálogo y onboarding de Ash
│   ├── pokedex.css              # Grid, filtros, tarjetas y modal de detalle
│   ├── types.css                # Explorador de 18 tipos y relaciones de daño
│   ├── collection.css           # Galería canónica fusionada y barras de progreso
│   ├── team.css                 # Panel de 6 slots del equipo
│   ├── capture.css              # Minijuego de lanzamiento de Poké Ball
│   ├── battle.css               # HUD de combate, barras de HP y animaciones
│   └── responsive.css           # Adaptabilidad móvil y prefers-reduced-motion
└── js/
    ├── main.js                  # Inicializador y orquestador general (confirm modal, sin confirm())
    ├── api/
    │   └── pokeapi.js           # Cliente Fetch con caché acotada (300) para PokéAPI
    ├── data/
    │   ├── types-data.js        # Matriz elemental de efectividad y tipos
    │   └── game-state.js        # Estado reactivo, persistencia y reorden del equipo
    ├── storage/
    │   └── local-storage.js     # Envoltorio seguro para LocalStorage
    ├── ui/
    │   ├── pokemon-card.js      # Constructor compartido de tarjetas (Pokédex/Colección/Perfil/Equipo)
    │   ├── gallery.js           # Galería canónica fusionada (NATIONAL_TOTAL = 1025)
    │   ├── feedback.js          # Estados loading / empty / error reutilizables
    │   └── confirm.js           # Diálogo de confirmación (sustituye a confirm())
    ├── components/
  │   ├── navigation.js        # Enrutador SPA, menú móvil, grupo «Más» y aria-current
  │   ├── modal.js             # Modales accesibles (foco, trampa de Tab, Escape, retorno)
  │   ├── notifications.js     # Toasts con aria-live
  │   └── ash-guide.js         # Guía visual y onboarding con bloqueo durante el tour
    ├── pokedex/
    │   ├── pokedex.js           # Renderizado, búsqueda, paginación y estados error/retry
    │   ├── pokemon-detail.js    # Vista modal detallada con stats GSAP
    │   └── capture.js           # Adaptador de captura (modal Pokédex → capture-engine)
    ├── types/
    │   └── types-view.js        # Consulta de tipos y fortalezas
    ├── collection/
    │   └── collection.js        # Galería completa (usa gallery.js)
    ├── team/
    │   └── team.js              # Gestión de 6 miembros (líder + reorden)
    ├── capture/
  │   ├── capture-engine.js    # Motor único (rareza, timing, deriva, alerta, baya, probabilidad, suspense)
  │   ├── wild-area.js         # Biomas y encuentros del Safari (clases de esquiva por rareza)
  │   └── timing-minigame.js   # Adaptador Safari (deriva, intentos, baya, racha, vuelo, reintento)
  ├── battle/
  │   ├── battle-engine.js     # Combate por turnos + escuadra y relevos + fases del Jefe + noVictory
    │   ├── damage-calculator.js # Daño con categoría real + calcMaxHp centralizado
    │   ├── type-effectiveness.js# Evaluador de multiplicadores
    │   └── cpu-ai.js            # IA por niveles, KO-prioridad y BOSS_SCRIPT
    └── animations/
        └── gsap-animations.js   # GSAP Core + respeto a prefers-reduced-motion
```

---

## 🛠️ Tecnologías Empleadas

* **HTML5:** Estructura semántica (`header`, `nav`, `main`, `section`, `article`, `figure`, `footer`).
* **CSS3:** Custom Properties (Variables CSS), Grid, Flexbox, Keyframe animations, Backdrop-filter.
* **Vanilla JavaScript:** ES6 Modules, Fetch API, Async/Await, CustomEvents.
* **GSAP 3.12.5 Core:** Animaciones de entrada, barras de estadísticas dinámicas y efectos de temblor en batalla (sin ScrollTrigger).
* **PokéAPI v2:** Fuente de datos oficial para especies, estadísticas, habilidades y movimientos.
* **LocalStorage:** Persistencia integral del progreso del entrenador.
---

