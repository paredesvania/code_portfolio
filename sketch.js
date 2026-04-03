// =====================================================
// TV ANTIGUA — versión optimizada
// Visual idéntica al original, rendimiento mejorado:
//   · Estático pre-generado (no recalcula ~2M px/frame)
//   · MouseWave solo en zona local del mouse
//   · Fisheye con lookup table pre-calculada (CPU rápido)
// =====================================================

let glitching    = false;
let glitchTimer  = 0;
const GLITCH_DURATION = 10;
let activeMessages = [];
let fc = 0;
let pg;
let prevMouseX = 0;
let prevMouseY = 0;

// Pool de frames de ruido pre-generados
let staticFrames  = [];
const STATIC_POOL = 8;

// Lookup table del fisheye: para cada píxel destino
// guarda el índice fuente en el buffer pg.
// Se calcula UNA sola vez y se reutiliza cada frame.
let fisheyeLUT = null;
let lutW = 0, lutH = 0;

// =====================================================
// DATOS VISUALES
// =====================================================
const TV_COLORS = [
  [255,255,0],[0,255,255],[0,255,0],  [255,0,255],
  [255,0,0],  [0,0,255],  [255,255,255],[0,0,0],
  [255,128,0],[128,0,255],[0,128,255],[255,0,128],
];

const glitchMessages = [
  'CAUTION','STRONG VISUALS','TASTE IS ADVISED',
  'ERROR','VIEWER DISCRETION','???? ????',
  '///////////','CH -- --',
];

// =====================================================
// LETTER GRIDS (sin cambios)
// =====================================================
const LETTER_GRIDS = {
  K:[[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  O:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  R:[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  A:[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
};

// =====================================================
// SETUP
// =====================================================
function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(40);
  textFont('monospace');

  pg = createGraphics(width, height);
  pg.pixelDensity(1);
  pg.textFont('monospace');

  prebuildStaticFrames();
  buildFisheyeLUT();
}

// =====================================================
// PRE-GENERAR ESTÁTICO
// =====================================================
function prebuildStaticFrames() {
  for (let f of staticFrames) f.remove();
  staticFrames = [];
  for (let f = 0; f < STATIC_POOL; f++) {
    let g = createGraphics(width, height);
    g.pixelDensity(1);
    g.background(0);
    g.loadPixels();
    for (let i = 0; i < g.pixels.length; i += 4) {
      let v = floor(random(245));
      g.pixels[i] = g.pixels[i+1] = g.pixels[i+2] = v;
      g.pixels[i+3] = 255;
    }
    g.updatePixels();
    g.stroke(0, 50);
    for (let y = 0; y < g.height; y += 3) g.line(0, y, g.width, y);
    g.noStroke();
    staticFrames.push(g);
  }
}

// =====================================================
// BUILD FISHEYE LUT
// Misma fórmula exacta del original, calculada
// una sola vez al inicio. Cada entrada guarda el
// índice de píxel fuente, o -1 para negro.
// =====================================================
function buildFisheyeLUT() {
  lutW = width;
  lutH = height;
  const W  = lutW, H = lutH;
  const cx = W / 2, cy = H / 2;
  const strength = 0.45;

  fisheyeLUT = new Int32Array(W * H);

  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      let nx    = (x - cx) / cx;
      let ny    = (y - cy) / cy;
      let r     = Math.sqrt(nx*nx + ny*ny);
      let theta = Math.atan2(ny, nx);
      let rD    = r * (1 + strength * r * r);
      let sx    = Math.round(rD * Math.cos(theta) * cx + cx);
      let sy    = Math.round(rD * Math.sin(theta) * cy + cy);
      let di    = x + y * W;
      fisheyeLUT[di] = (sx >= 0 && sx < W && sy >= 0 && sy < H)
                       ? sx + sy * W
                       : -1;
    }
  }
}

// =====================================================
// DRAW
// =====================================================
function draw() {
  fc++;
  pg.background(0);

  if (glitching) {
    drawGlitch(pg);
    glitchTimer++;
    if (glitchTimer >= GLITCH_DURATION) {
      glitching    = false;
      glitchTimer  = 0;
      activeMessages = [];
    }
  } else {
    drawStatic(pg);
    applyMouseWave(pg);
    drawBinaryName(pg);
  }

  applyFisheyeLUT(pg);
  drawVignette();

  prevMouseX = mouseX;
  prevMouseY = mouseY;
}

// =====================================================
// STATIC
// =====================================================
function drawStatic(g) {
  let idx = floor(fc / 2) % STATIC_POOL;
  g.image(staticFrames[idx], 0, 0);
  let flicker = random(220, 255);
  g.fill(flicker, 20);
  g.noStroke();
  g.rect(0, 0, g.width, g.height);
}

// =====================================================
// MOUSE WAVE — solo zona local
// =====================================================
function applyMouseWave(g) {
  let speed = dist(mouseX, mouseY, prevMouseX, prevMouseY);
  if (speed < 0.5) return;

  let radius   = 200;
  let waveAmp  = 26;
  let waveFreq = 0.03;
  let energy   = map(speed, 0, 30, 0.3, 1, true);

  let x0 = max(0,          floor(mouseX - radius));
  let x1 = min(g.width-1,  floor(mouseX + radius));
  let y0 = max(0,          floor(mouseY - radius));
  let y1 = min(g.height-1, floor(mouseY + radius));

  g.loadPixels();
  let temp = new Uint8ClampedArray(g.pixels);

  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      let d = dist(x, y, mouseX, mouseY);
      if (d > radius) continue;
      let fade   = 1 - d / radius;
      let offset = sin(d * waveFreq - fc * 0.3) * waveAmp * energy * fade;
      let nx = int(x + offset);
      let ny = int(y + offset * 0.5);
      if (nx >= 0 && nx < g.width && ny >= 0 && ny < g.height) {
        let i  = (x  + y  * g.width) * 4;
        let ni = (nx + ny * g.width) * 4;
        g.pixels[i]   = temp[ni];
        g.pixels[i+1] = temp[ni+1];
        g.pixels[i+2] = temp[ni+2];
        g.pixels[i+3] = 255;
      }
    }
  }
  g.updatePixels();
}

// =====================================================
// FISHEYE CON LUT
// Mismo resultado visual que el original,
// sin recalcular la distorsión cada frame.
// =====================================================
function applyFisheyeLUT(src) {
  src.loadPixels();
  loadPixels();

  const srcPx = src.pixels;
  const dstPx = pixels;
  const lut   = fisheyeLUT;
  const total = lutW * lutH;

  for (let i = 0; i < total; i++) {
    let si = lut[i];
    let di = i * 4;
    if (si === -1) {
      dstPx[di] = dstPx[di+1] = dstPx[di+2] = 0;
    } else {
      let s4 = si * 4;
      dstPx[di]   = srcPx[s4];
      dstPx[di+1] = srcPx[s4+1];
      dstPx[di+2] = srcPx[s4+2];
    }
    dstPx[di+3] = 255;
  }

  updatePixels();
}

// =====================================================
// BINARY NAME (sin cambios)
// =====================================================
function drawBinaryName(g) {
  const word  = ['K','O','R','A'];
  const CELL  = 8;
  const GAP   = 1;
  const LGAP  = 7;
  const THICK = 2;

  const totalW = word.length * (5*(CELL*THICK+GAP)-GAP) + (word.length-1)*LGAP;
  const totalH = 7*(CELL*THICK+GAP)-GAP;
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
        const px  = curX + col*(CELL*THICK+GAP);
        const py  = y0   + row*(CELL*THICK+GAP);
        for (let dx = 0; dx < THICK; dx++) {
          for (let dy = 0; dy < THICK; dy++) {
            let ox = px + dx*CELL;
            let oy = py + dy*CELL;
            if (bit === 1) {
              g.fill(57, 255, 20, 25);
              for (let i = -2; i <= 2; i++)
                for (let j = -2; j <= 2; j++)
                  g.text('1', ox+i, oy+CELL+j);
              g.fill(57, 255, 20, 90);
              g.text('1', ox-1, oy+CELL-1);
              g.text('1', ox+1, oy+CELL+1);
              g.fill(200, 255, 200);
              g.text('1', ox, oy+CELL);
            }
          }
        }
      }
    }
    curX += 5*(CELL*THICK+GAP)-GAP+LGAP;
  }
  g.textStyle(NORMAL);
}

// =====================================================
// VIÑETA (sin cambios)
// =====================================================
function drawVignette() {
  noFill();
  for (let i = 0; i < 38; i++) {
    let t = i / 38;
    stroke(0, map(t, 0, 1, 200, 0));
    strokeWeight(1);
    ellipse(width/2, height/2,
            width  - width*0.5*t*0.5,
            height - height*0.5*t*0.5);
  }
  noStroke();
}

// =====================================================
// GLITCH (sin cambios)
// =====================================================
function drawGlitch(g) {
  let barW = g.width / TV_COLORS.length;
  g.noStroke();
  for (let i = 0; i < TV_COLORS.length; i++) {
    let [r,gr,b] = TV_COLORS[i];
    g.fill(r,gr,b);
    g.rect(i*barW, 0, barW+1, g.height);
  }

  let stripH = g.height * 0.25;
  let stripY = g.height * 0.35 + sin(fc * 0.3) * 20;
  g.loadPixels();
  for (let x = 0; x < g.width; x++) {
    for (let y = stripY; y < stripY+stripH; y++) {
      let v   = floor(random(255));
      let idx = (x + floor(y)*g.width)*4;
      g.pixels[idx] = g.pixels[idx+1] = g.pixels[idx+2] = v;
      g.pixels[idx+3] = 200;
    }
  }
  g.updatePixels();

  let numBars = floor(random(4,12));
  for (let i = 0; i < numBars; i++) {
    let col = random(TV_COLORS);
    g.fill(col[0],col[1],col[2],random(128,255));
    g.rect(0, random(g.height), g.width, random(2,20));
  }

  if (fc % 3 === 0) {
    activeMessages = [];
    for (let i = 0; i < floor(random(2,5)); i++) {
      activeMessages.push({
        txt:  random(glitchMessages),
        x:    random(g.width-280), y: random(30, g.height-30),
        sz:   floor(random(13,36)),
        col:  random(TV_COLORS), shad: random(TV_COLORS),
        offX: floor(random(-3,4)), offY: floor(random(-2,3)),
        alpha:random(180,255),
      });
    }
  }
  for (let m of activeMessages) {
    g.textSize(m.sz);
    g.fill(m.shad[0],m.shad[1],m.shad[2],150);
    g.text(m.txt, m.x+m.offX, m.y+m.offY);
    g.fill(m.col[0],m.col[1],m.col[2],m.alpha);
    g.text(m.txt, m.x, m.y);
  }
}

// =====================================================
// EVENTOS
// =====================================================
function mousePressed() {
  glitching   = true;
  glitchTimer = 0;
  activeMessages = [];
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  pg = createGraphics(width, height);
  pg.pixelDensity(1);
  pg.textFont('monospace');
  prebuildStaticFrames();
  buildFisheyeLUT();
}