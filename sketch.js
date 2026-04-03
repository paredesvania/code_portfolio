// =====================================================
// IDEA GENERAL DEL PROGRAMA
// =====================================================

// Este código intenta simular una televisión antigua.
// Tiene tres componentes principales:
//
// 1. Un fondo de ruido blanco (estático de TV).
// 2. Un modo "glitch" que aparece cuando se hace click.
// 3. Efectos visuales encima (curvatura tipo pantalla vieja + bordes oscuros).
//
// Importante: todo se dibuja primero en una "pantalla interna" (pg)
// y después se deforma antes de mostrarse en pantalla real.


// =====================================================
// VARIABLES DE ESTADO (controlan lo que está pasando)
// =====================================================

// Indica si el modo glitch está activo o no.
// false = se muestra ruido normal
// true = se muestra el efecto glitch
let glitching = false;


// Cuenta cuántos frames lleva activo el glitch.
// Se usa para apagar el glitch después de cierto tiempo.
let glitchTimer = 0;


// Define cuánto dura el glitch.
// Un frame es una actualización de pantalla.
// Mientras mayor sea este número, más dura el efecto.
const GLITCH_DURATION = 10;


// Guarda los textos que aparecen durante el glitch.
// Es un arreglo de objetos, donde cada objeto tiene:
// posición, tamaño, color, etc.
let activeMessages = [];


// Cuenta los frames totales del programa.
// Se usa para animaciones (por ejemplo usar sin() para movimiento).
let frameCount = 0;


// "pg" es un gráfico fuera de pantalla (buffer).
// Aquí dibujo TODO antes de mostrarlo.
// Esto es importante porque luego aplico distorsión (fisheye).
let pg;

let prevMouseX = 0;
let prevMouseY = 0;

// =====================================================
// DATOS VISUALES (colores y textos)
// =====================================================

// Colores tipo barras de TV antigua.
// Cada color es un array [R, G, B].
const TV_COLORS = [
  [255, 255, 0],
  [0, 255, 255],
  [0, 255, 0],
  [255, 0, 255],
  [255, 0, 0],
  [0, 0, 255],
  [255, 255, 255],
  [0, 0, 0],
  [255, 128, 0],
  [128, 0, 255],
  [0, 128, 255],
  [255, 0, 128],
];


// Lista de mensajes que pueden aparecer en el glitch.
const glitchMessages = [
  'CAUTION', 'STRONG VISUALS',
  'TASTE IS ADVISED', 'ERROR', 'VIEWER DISCRETION',
  '???? ????', '///////////', 'CH -- --',
];


// =====================================================
// SETUP (se ejecuta una sola vez al inicio)
// =====================================================

function setup() {

  // Crea el canvas del tamaño de la ventana.
  createCanvas(windowWidth, windowHeight);

  // Evita problemas de resolución en pantallas de alta densidad.
  pixelDensity(1);

  // Define la tipografía general.
  textFont('monospace');


  // Crea el buffer gráfico donde se dibuja todo.
  pg = createGraphics(width, height);

  // Aplica las mismas configuraciones dentro del buffer.
  pg.pixelDensity(1);
  pg.textFont('monospace');
}


// =====================================================
// DRAW (se ejecuta constantemente en loop)
// =====================================================

function draw() {

  // Limpia el buffer (lo deja negro).
  pg.background(0);

  // Aumenta el contador de frames.
  frameCount++;


  // -------------------------------------------------
  // DECISIÓN: mostrar glitch o ruido normal
  // -------------------------------------------------

  if (glitching) {

    // Dibuja el efecto glitch.
    drawGlitch(pg);

    // Aumenta el tiempo del glitch.
    glitchTimer++;

    // Si el glitch ya duró suficiente, se apaga.
    if (glitchTimer >= GLITCH_DURATION) {
      glitching = false;
      glitchTimer = 0;

      // Borra los mensajes activos.
      activeMessages = [];
    }

  } else {

    // Si no hay glitch, dibuja ruido de TV.
    drawStatic(pg);
    applyMouseWave(pg);
    drawBinaryName(pg);
  }


  // -------------------------------------------------
  // EFECTOS FINALES (post-procesado)
  // -------------------------------------------------

  // Aplica distorsión de pantalla curva.
  applyFisheye(pg);

  // Oscurece los bordes.
  drawVignette();
  
    prevMouseX = mouseX;
  prevMouseY = mouseY;

}

// =====================================================
// LETRAS ALEA EN BINARIO (verde fluorescente)
// =====================================================

// Definición pixel-a-pixel de cada letra (grilla 5×7)
const LETTER_GRIDS = {
 K: [
  [1,0,0,0,1],
  [1,0,0,1,0],
  [1,0,1,0,0],
  [1,1,0,0,0],
  [1,0,1,0,0],
  [1,0,0,1,0],
  [1,0,0,0,1],
],
O: [
  [0,1,1,1,0],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [0,1,1,1,0],
],
R: [
  [1,1,1,1,0],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [1,1,1,1,0],
  [1,0,1,0,0],
  [1,0,0,1,0],
  [1,0,0,0,1],
],
  A: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ],
};

function drawBinaryName(g) {

 const word = ['K', 'O', 'R', 'A'];
const CELL = 8;
const GAP = 1;
const LGAP = 7;
const THICK = 2;

  // Calcula ancho total para centrar
const totalW  = word.length * (5 * (CELL * THICK + GAP) - GAP) + (word.length - 1) * LGAP;
const totalH  = 7 * (CELL * THICK + GAP) - GAP;

  let curX = (g.width  - totalW) / 2;
  const y0 = (g.height - totalH) / 2;

  g.textSize(CELL);
  g.textFont('monospace');
  g.textStyle(BOLD);

  for (const char of word) {
    const grid = LETTER_GRIDS[char];

    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        const bit = grid[row][col];
const px  = curX + col * (CELL * THICK + GAP);
const py  = y0   + row * (CELL * THICK + GAP);

        for (let dx = 0; dx < THICK; dx++) {
  for (let dy = 0; dy < THICK; dy++) {

    let ox = px + dx * CELL;
    let oy = py + dy * CELL;

 if (bit === 1) {

  // glow externo grande
  g.fill(57, 255, 20, 25);
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      g.text('1', ox + i, oy + CELL + j);
    }
  }

  // glow medio
  g.fill(57, 255, 20, 90);
  g.text('1', ox - 1, oy + CELL - 1);
  g.text('1', ox + 1, oy + CELL + 1);

  // núcleo MUY brillante
  g.fill(200, 255, 200);
  g.text('1', ox, oy + CELL);

}

          }
        }

      }
    }
   curX += 5 * (CELL * THICK + GAP) - GAP + LGAP;
  }

  g.textStyle(NORMAL);
}





// =====================================================
// EFECTO FISHEYE (pantalla curva)
// =====================================================

function applyFisheye(src) {

  // Carga los píxeles de la imagen original (pg).
  src.loadPixels();

  // Prepara el canvas final donde se dibuja el resultado.
  loadPixels();


  const W = width;
  const H = height;

  // Centro de la pantalla.
  const cx = W / 2;
  const cy = H / 2;

  // Intensidad de la distorsión.
  const strength = 0.45;


  // Recorre cada píxel de la pantalla.
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {

      // Convierte coordenadas a un sistema centrado (-1 a 1).
      let nx = (x - cx) / cx;
      let ny = (y - cy) / cy;

      // Distancia al centro.
      let r = sqrt(nx * nx + ny * ny);

      // Ángulo respecto al centro.
      let theta = atan2(ny, nx);


      // Modifica la distancia para crear la curvatura.
      let rD = r * (1 + strength * r * r);


      // Convierte de vuelta a coordenadas de pantalla.
      let sx = round(rD * cos(theta) * cx + cx);
      let sy = round(rD * sin(theta) * cy + cy);


      // Índice del píxel destino.
      let di = (x + y * W) * 4;


      if (sx >= 0 && sx < W && sy >= 0 && sy < H) {

        // Copia el color desde la imagen original.
        let si = (sx + sy * W) * 4;

        pixels[di]     = src.pixels[si];
        pixels[di + 1] = src.pixels[si + 1];
        pixels[di + 2] = src.pixels[si + 2];
        pixels[di + 3] = 255;

      } else {

        // Si queda fuera, lo pinta negro.
        pixels[di] = pixels[di + 1] = pixels[di + 2] = 0;
        pixels[di + 3] = 255;
      }
    }
  }

  // Actualiza el canvas final.
  updatePixels();
}


// =====================================================
// VIÑETA (oscurecer bordes)
// =====================================================

function drawVignette() {

  noFill();

  // Dibuja múltiples elipses concéntricas.
  // Esto genera un degradado oscuro hacia los bordes.
  for (let i = 0; i < 38; i++) {

    let t = i / 38;

    // La opacidad disminuye progresivamente.
    stroke(0, map(t, 0, 1, 200, 0));

    strokeWeight(1);

    ellipse(
      width / 2,
      height / 2,
      width - width * 0.5 * t * 0.5,
      height - height * 0.5 * t * 0.5
    );
  }

  noStroke();
}


// =====================================================
// ESTÁTICO (ruido de TV)
// =====================================================

function drawStatic(g) {

  g.loadPixels();

  // Recorre todos los píxeles.
  for (let x = 0; x < g.width; x++) {
    for (let y = 0; y < g.height; y++) {

      // Genera un valor gris aleatorio.
      let rand = random(245);

      let index = (x + y * g.width) * 4;

      // Asigna ese valor a RGB.
      g.pixels[index]     = rand;
      g.pixels[index + 1] = rand;
      g.pixels[index + 2] = rand;
      g.pixels[index + 3] = 255;
    }
  }

  g.updatePixels();


  // Líneas horizontales (scanlines).
  g.stroke(0, 50);
  for (let i = 0; i < g.height; i += 3) {
    g.line(0, i, g.width, i);
  }


  // Capa de brillo leve.
  let flicker = random(220, 255);

  g.fill(flicker, 20);
  g.noStroke();
  g.rect(0, 0, g.width, g.height);
}


// =====================================================
// GLITCH
// =====================================================

function drawGlitch(g) {

  // Dibuja barras de color tipo TV.
  let barW = g.width / TV_COLORS.length;

  g.noStroke();

  for (let i = 0; i < TV_COLORS.length; i++) {
    let [r, gr, b] = TV_COLORS[i];
    g.fill(r, gr, b);
    g.rect(i * barW, 0, barW + 1, g.height);
  }


  // Franja de ruido animada.
  let stripH = g.height * 0.25;
  let stripY = g.height * 0.35 + sin(frameCount * 0.3) * 20;

  g.loadPixels();

  for (let x = 0; x < g.width; x++) {
    for (let y = stripY; y < stripY + stripH; y++) {

      let v = floor(random(255));
      let index = (x + floor(y) * g.width) * 4;

      g.pixels[index]     = v;
      g.pixels[index + 1] = v;
      g.pixels[index + 2] = v;
      g.pixels[index + 3] = 200;
    }
  }

  g.updatePixels();


  // Barras glitch horizontales aleatorias.
  let numBars = floor(random(4, 12));

  for (let i = 0; i < numBars; i++) {
    let barY = random(g.height);
    let barH = random(2, 20);
    let col = random(TV_COLORS);

    g.fill(col[0], col[1], col[2], random(128, 255));
    g.rect(0, barY, g.width, barH);
  }


  // Textos glitch.
  if (frameCount % 3 === 0) {

    activeMessages = [];

    let count = floor(random(2, 5));

    for (let i = 0; i < count; i++) {

      activeMessages.push({
        txt:  random(glitchMessages),
        x:    random(g.width - 280),
        y:    random(30, g.height - 30),
        sz:   floor(random(13, 36)),
        col:  random(TV_COLORS),
        shad: random(TV_COLORS),
        offX: floor(random(-3, 4)),
        offY: floor(random(-2, 3)),
        alpha: random(180, 255),
      });
    }
  }


  // Dibujo de textos.
  for (let m of activeMessages) {

    g.textSize(m.sz);

    g.fill(m.shad[0], m.shad[1], m.shad[2], 150);
    g.text(m.txt, m.x + m.offX, m.y + m.offY);

    g.fill(m.col[0], m.col[1], m.col[2], m.alpha);
    g.text(m.txt, m.x, m.y);
  }
}


// =====================================================
// INTERACCIÓN
// =====================================================

// Al hacer click se activa el glitch.
function mousePressed() {
  glitching = true;
  glitchTimer = 0;
  activeMessages = [];
}


// Ajusta el canvas si cambia el tamaño de ventana.
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  pg = createGraphics(width, height);
  pg.pixelDensity(1);
  pg.textFont('monospace');
}

function applyMouseWave(g) {

  g.loadPixels();
  let temp = g.pixels.slice();

  let waveAmp = 40;     // 🔥 fuerte de verdad
  let waveFreq = 0.03;

  let speed = dist(mouseX, mouseY, prevMouseX, prevMouseY);

  let energy = map(speed, 0, 20, 10, 50, true);

  for (let x = 0; x < g.width; x++) {
    for (let y = 0; y < g.height; y++) {

      let d = dist(x, y, mouseX, mouseY);

      let offset = sin(d * waveFreq - frameCount * 0.3) * waveAmp * (energy * 0.02);

      let nx = int(x + offset);   // deformación (horizontal)
      let ny = int(y + offset * 0.5);

      if (nx >= 0 && nx < g.width && ny >= 0 && ny < g.height) {

        let i = (x + y * g.width) * 4;
        let ni = (nx + ny * g.width) * 4;

        g.pixels[i]     = temp[ni];
        g.pixels[i + 1] = temp[ni + 1];
        g.pixels[i + 2] = temp[ni + 2];
        g.pixels[i + 3] = 255;
      }
    }
  }

  g.updatePixels();
}