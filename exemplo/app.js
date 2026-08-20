/* ============================================================
   CONFIGURAÇÃO — edite aqui para personalizar o site
   ============================================================ */
const CONFIG = {
  // nome usado no arquivo baixado: foto-perfil-alessandra.png etc.
  slug: "exemplo",

  formatos: {
    perfil: {
      w: 1080,
      h: 1080,
      moldura: "molduras/perfil.png",
      arquivo: "foto-perfil",
      titulo: "Foto de perfil",
      subtitulo: "Coloque seu rosto no círculo e baixe sua foto de apoio pra usar no WhatsApp e no Instagram.",
      dica: "Deixe seu rosto dentro do círculo pontilhado. O que fica fora some quando vira foto de perfil.",
      guiaCircular: true,
    },
    feed: {
      w: 1080,
      h: 1350,
      moldura: "molduras/feed.png",
      arquivo: "post-feed",
      titulo: "Post para o feed",
      subtitulo: "Sua foto na moldura oficial pra postar no feed do Instagram e do Facebook.",
      dica: "Arraste a foto pra posicionar e use o zoom pra ajustar o enquadramento.",
      guiaCircular: false,
    },
    story: {
      w: 1080,
      h: 1920,
      moldura: "molduras/story.png",
      arquivo: "story",
      titulo: "Story",
      subtitulo: "Compartilhe seu apoio nos stories do Instagram e no status do WhatsApp.",
      dica: "Arraste a foto pra cima ou pra baixo pra posicionar — o fundo se completa sozinho, desfocado.",
      guiaCircular: false,
      ajusteLivre: true, // foto se move livre na vertical; sobra vira fundo desfocado
    },
  },
};

/* ============================================================
   Editor
   ============================================================ */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const wrap = document.getElementById("canvasWrap");
const guide = document.getElementById("guide");
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const zoomRow = document.getElementById("zoomRow");
const zoomSlider = document.getElementById("zoom");
const btnTrocar = document.getElementById("btnTrocar");
const btnBaixar = document.getElementById("btnBaixar");
const btnCompartilhar = document.getElementById("btnCompartilhar");
const btnCopiar = document.getElementById("btnCopiar");
const titulo = document.getElementById("titulo");
const subtitulo = document.getElementById("subtitulo");
const dica = document.getElementById("dica");

// a foto entra centralizada e um pouco afastada; o fundo desfocado completa
const ZOOM_INICIAL = 0.85;
const ZOOM_MIN = 0.5;

const state = {
  format: "perfil",
  img: null,
  zoom: ZOOM_INICIAL,
  panX: 0,
  panY: 0,
};

const molduras = {}; // cache de imagens de moldura por formato

function fmt() {
  return CONFIG.formatos[state.format];
}

function loadMoldura(key) {
  if (molduras[key]) return molduras[key];
  const img = new Image();
  img.src = CONFIG.formatos[key].moldura;
  img.onload = () => {
    if (state.format === key) draw();
  };
  molduras[key] = img;
  return img;
}

function baseScale() {
  const f = fmt();
  if (f.ajusteLivre) return f.w / state.img.width; // encaixa na largura; vertical fica livre
  return Math.max(f.w / state.img.width, f.h / state.img.height);
}

// limita o arrasto: a foto não sai do quadro (e não sobra borda nos modos justos)
function clampPan() {
  if (!state.img) return;
  const f = fmt();
  const s = baseScale() * state.zoom;
  const maxX = Math.abs(state.img.width * s - f.w) / 2;
  const maxY = Math.abs(state.img.height * s - f.h) / 2;
  state.panX = Math.min(maxX, Math.max(-maxX, state.panX));
  state.panY = Math.min(maxY, Math.max(-maxY, state.panY));
}

// fundo desfocado (estilo story do Instagram): desenha a foto minúscula
// e amplia — o borrão sai de graça e funciona em qualquer celular
const fundoMini = document.createElement("canvas");

function drawFundoDesfocado(f) {
  const img = state.img;
  fundoMini.width = 54;
  fundoMini.height = Math.round(54 * (f.h / f.w));
  const mini = fundoMini.getContext("2d");
  const s = Math.max(fundoMini.width / img.width, fundoMini.height / img.height);
  mini.drawImage(
    img,
    (fundoMini.width - img.width * s) / 2,
    (fundoMini.height - img.height * s) / 2,
    img.width * s,
    img.height * s
  );
  ctx.drawImage(fundoMini, 0, 0, f.w, f.h);
}

function draw() {
  const f = fmt();
  ctx.clearRect(0, 0, f.w, f.h);
  ctx.fillStyle = "#EDEBE6";
  ctx.fillRect(0, 0, f.w, f.h);

  if (state.img) {
    const s = baseScale() * state.zoom;
    const dw = state.img.width * s;
    const dh = state.img.height * s;
    // se a foto não cobre o quadro todo, completa com ela mesma desfocada
    if (dw < f.w - 0.5 || dh < f.h - 0.5) drawFundoDesfocado(f);
    ctx.drawImage(state.img, (f.w - dw) / 2 + state.panX, (f.h - dh) / 2 + state.panY, dw, dh);
  }

  const m = loadMoldura(state.format);
  if (m.complete && m.naturalWidth > 0) {
    ctx.drawImage(m, 0, 0, f.w, f.h);
  }
}

/* ---- troca de formato ---- */
function setFormat(key) {
  state.format = key;
  const f = fmt();
  canvas.width = f.w;
  canvas.height = f.h;
  wrap.style.aspectRatio = `${f.w} / ${f.h}`;
  wrap.style.setProperty("--proporcao", (f.w / f.h).toFixed(4));
  wrap.classList.toggle("tall", f.h > f.w);
  guide.classList.toggle("hidden", !f.guiaCircular);
  titulo.textContent = f.titulo;
  subtitulo.textContent = f.subtitulo;
  dica.textContent = f.dica;

  document.querySelectorAll(".tab").forEach((t) => {
    const active = t.dataset.format === key;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", active);
  });

  // recentraliza a foto no novo formato
  state.zoom = ZOOM_INICIAL;
  state.panX = 0;
  state.panY = 0;
  zoomSlider.value = ZOOM_INICIAL;
  draw();
}

/* ---- carregar foto ---- */
function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    state.img = img;
    state.zoom = ZOOM_INICIAL;
    state.panX = 0;
    state.panY = 0;
    zoomSlider.value = ZOOM_INICIAL;
    dropzone.classList.add("hidden");
    zoomRow.classList.remove("off");
    btnTrocar.disabled = false;
    btnBaixar.disabled = false;
    btnCompartilhar.disabled = false;
    btnCopiar.disabled = false;
    draw();
  };
  img.src = url;
}

/* ---- escolha entre câmera e galeria ---- */
const escolhaFoto = document.getElementById("escolhaFoto");
const cameraInput = document.getElementById("cameraInput");

function abrirEscolha() {
  escolhaFoto.showModal();
}

dropzone.addEventListener("click", abrirEscolha);
btnTrocar.addEventListener("click", abrirEscolha);

document.getElementById("btnGaleria").addEventListener("click", () => {
  escolhaFoto.close();
  fileInput.click();
});
document.getElementById("btnCamera").addEventListener("click", () => {
  escolhaFoto.close();
  cameraInput.click();
});
document.getElementById("btnCancelarEscolha").addEventListener("click", () => escolhaFoto.close());

// toque fora da janelinha fecha
escolhaFoto.addEventListener("click", (e) => {
  if (e.target === escolhaFoto) escolhaFoto.close();
});

[fileInput, cameraInput].forEach((input) =>
  input.addEventListener("change", () => {
    loadFile(input.files[0]);
    input.value = "";
  })
);

["dragenter", "dragover"].forEach((ev) =>
  wrap.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.add("drag");
  })
);
["dragleave", "drop"].forEach((ev) =>
  wrap.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.remove("drag");
  })
);
wrap.addEventListener("drop", (e) => {
  loadFile(e.dataTransfer.files[0]);
});

/* ---- arrastar e pinça (touch) ---- */
const pointers = new Map();

function canvasScale() {
  // converte pixels da tela em pixels do canvas interno
  return canvas.width / canvas.getBoundingClientRect().width;
}

canvas.addEventListener("pointerdown", (e) => {
  if (!state.img) return;
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
});

canvas.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;
  const prev = pointers.get(e.pointerId);
  const cur = { x: e.clientX, y: e.clientY };

  if (pointers.size === 1) {
    const k = canvasScale();
    state.panX += (cur.x - prev.x) * k;
    state.panY += (cur.y - prev.y) * k;
  } else if (pointers.size === 2) {
    const pts = [...pointers.entries()];
    const other = pts.find(([id]) => id !== e.pointerId)[1];
    const distPrev = Math.hypot(prev.x - other.x, prev.y - other.y);
    const distCur = Math.hypot(cur.x - other.x, cur.y - other.y);
    if (distPrev > 0) {
      state.zoom = Math.min(4, Math.max(ZOOM_MIN, state.zoom * (distCur / distPrev)));
      zoomSlider.value = state.zoom;
    }
  }

  pointers.set(e.pointerId, cur);
  clampPan();
  draw();
});

["pointerup", "pointercancel"].forEach((ev) =>
  canvas.addEventListener(ev, (e) => pointers.delete(e.pointerId))
);

zoomSlider.addEventListener("input", () => {
  state.zoom = parseFloat(zoomSlider.value);
  clampPan();
  draw();
});

/* ---- baixar / compartilhar ---- */
function toast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2600);
}

function exportBlob() {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// versão instantânea: compartilhar e copiar precisam acontecer no mesmo
// instante do toque, senão o celular bloqueia por segurança
function exportBlobSync() {
  const dados = canvas.toDataURL("image/png").split(",")[1];
  const bin = atob(dados);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "image/png" });
}

function fileName() {
  return `${fmt().arquivo}-${CONFIG.slug}.png`;
}

async function baixar() {
  const blob = await exportBlob();
  if (!blob) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast("Imagem salva!");
}

btnBaixar.addEventListener("click", baixar);

// botão principal: abre a janela de compartilhar do celular
// (WhatsApp, Instagram, etc). Se der qualquer problema, baixa a imagem.
btnCompartilhar.addEventListener("click", async () => {
  const blob = exportBlobSync();
  const file = new File([blob], fileName(), { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch (e) {
      if (e.name !== "AbortError") baixar(); // erro de verdade: entrega o arquivo
    }
  } else {
    baixar();
  }
});

// copia a imagem: a pessoa só cola na conversa, sem procurar arquivo
btnCopiar.addEventListener("click", async () => {
  try {
    const blob = exportBlobSync();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    toast("Foto copiada! Agora é só colar na conversa.");
  } catch (e) {
    toast("Este navegador não deixa copiar — use Compartilhar.");
  }
});

/* ---- abas ---- */
document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => setFormat(t.dataset.format))
);

/* ---- início ---- */
Object.keys(CONFIG.formatos).forEach(loadMoldura); // pré-carrega as molduras
setFormat("perfil");
