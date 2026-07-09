const API_DB = "/api/db";
const API_RESET = "/api/db/reset";
const API_UPLOAD_INE = "/api/upload/ine";
const FIREBASE_CONFIG_PATH = "./firebase-config.js";
const STORAGE_KEY = "novedades-muebles-miry-fallback";
const SESSION_KEY = "novedades-muebles-miry-session";

const $ = (selector) => document.querySelector(selector);
const app = $("#app");

const state = {
  db: null,
  view: "panel",
  selectedId: null,
  editItemId: null,
  query: "",
  filter: "all",
  paymentQuery: "",
  paymentPeriod: "all",
  paymentMethod: "all",
  modal: null,
  session: null,
  saving: false,
  lastSync: null,
  cloudMode: "local"
};

const firebaseCloud = {
  ready: false,
  initializing: null,
  provider: "realtime",
  authMode: "password",
  auth: null,
  signInWithEmailAndPassword: null,
  signOut: null,
  loginEmail: "",
  firestoreDocRef: null,
  realtimeRef: null,
  storage: null,
  storageFolder: "ine",
  getFirestoreDoc: null,
  setFirestoreDoc: null,
  rtdbGet: null,
  rtdbSet: null,
  storageRef: null,
  uploadString: null,
  getDownloadURL: null
};

const icons = {
  panel: "fa-chart-line",
  clients: "fa-address-book",
  payments: "fa-hand-holding-dollar",
  cards: "fa-folder-open",
  inventory: "fa-boxes-stacked",
  settings: "fa-sliders",
  plus: "fa-plus",
  print: "fa-print",
  download: "fa-download",
  whatsapp: "fa-brands fa-whatsapp",
  logout: "fa-right-from-bracket",
  search: "fa-magnifying-glass",
  receipt: "fa-receipt",
  trash: "fa-trash",
  edit: "fa-pen",
  save: "fa-floppy-disk",
  rotate: "fa-rotate-right",
  clock: "fa-clock",
  bolt: "fa-bolt",
  phone: "fa-phone",
  wallet: "fa-wallet",
  calendar: "fa-calendar-check",
  note: "fa-clipboard-list",
  check: "fa-check",
  target: "fa-bullseye",
  cash: "fa-money-bill-wave",
  alert: "fa-triangle-exclamation",
  user: "fa-user",
  coin: "fa-coins",
  list: "fa-list-check",
  shield: "fa-shield-halved",
  trophy: "fa-trophy",
  bank: "fa-building-columns",
  close: "fa-xmark",
  calculator: "fa-calculator",
  receiptList: "fa-file-invoice-dollar",
  copy: "fa-copy",
  statement: "fa-file-lines",
  eye: "fa-eye",
  hourglass: "fa-hourglass-half",
  idCard: "fa-id-card",
  camera: "fa-camera",
  spinner: "fa-spinner fa-spin",
  boxes: "fa-box-open",
  barcode: "fa-barcode",
  ranking: "fa-ranking-star",
  thumbsUp: "fa-thumbs-up",
  thumbsDown: "fa-thumbs-down"
};

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const dateFmt = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" });

const uid = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const num = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const toDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const today = () => toDateInput(new Date());
const parseDate = (value) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value || today());
  return Number.isNaN(date.getTime()) ? new Date() : date;
};
const addDays = (value, days) => {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
};
const daysSince = (value) => Math.floor((parseDate(today()) - parseDate(value)) / 86400000);
const esc = (value = "") => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c]));
const iconClass = (name) => {
  const cls = icons[name] || name;
  if (/\bfa-(solid|regular|brands)\b/.test(cls)) return cls;
  return `fa-solid ${cls}`;
};
const icon = (name) => `<i class="${iconClass(name)}" aria-hidden="true"></i>`;
const resetScroll = () => requestAnimationFrame(() => {
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
});
function renderAndRestoreInput(inputId, cursor) {
  render();
  requestAnimationFrame(() => {
    const input = $(`#${inputId}`);
    if (!input) return;
    input.focus();
    if (typeof input.setSelectionRange === "function") input.setSelectionRange(cursor, cursor);
  });
}

function normalize(db) {
  const fallback = {
    schemaVersion: 1,
    settings: {
      appName: "Novedades y Muebles Miry",
      collectorName: "Cobrador Principal",
      collectorPhone: "",
      collectorPin: "1234",
      dailyGoal: 2500,
      weeklyGoal: 15000,
      receiptMessage: "Gracias por su abono."
    },
    clients: [],
    items: [],
    routeExpenses: [],
    audit: []
  };
  const data = db && typeof db === "object" ? db : fallback;
  return {
    ...fallback,
    ...data,
    settings: { ...fallback.settings, ...(data.settings || {}) },
    clients: Array.isArray(data.clients) ? data.clients.map(normalizeClient) : [],
    items: Array.isArray(data.items) ? data.items.map(normalizeItem) : [],
    routeExpenses: Array.isArray(data.routeExpenses) ? data.routeExpenses : [],
    audit: Array.isArray(data.audit) ? data.audit : []
  };
}

function normalizeClient(client) {
  return {
    id: client.id || uid("cli"),
    folio: client.folio || nextFolio(),
    nombre: client.nombre || "Cliente sin nombre",
    telefono: client.telefono || "",
    direccion: client.direccion || "",
    referencia: client.referencia || "",
    paymentRating: client.paymentRating || client.calificacionPago || "normal",
    tarjeta: {
      institucion: client.tarjeta?.institucion || "",
      tipo: client.tarjeta?.tipo || "Cuenta",
      terminacion: client.tarjeta?.terminacion || "",
      alias: client.tarjeta?.alias || ""
    },
    credito: {
      concepto: client.credito?.concepto || "Crédito de cobranza",
      monto: num(client.credito?.monto),
      abonoSemanal: num(client.credito?.abonoSemanal),
      fechaInicio: client.credito?.fechaInicio || today(),
      proximoPago: client.credito?.proximoPago || today()
    },
    ineFoto: client.ineFoto || client.ine?.foto || "",
    notas: client.notas || "",
    movimientos: Array.isArray(client.movimientos) ? client.movimientos.map(normalizeMovement) : [],
    seguimientos: Array.isArray(client.seguimientos) ? client.seguimientos : []
  };
}

function normalizeItem(item) {
  return {
    id: item.id || uid("art"),
    sku: item.sku || "",
    nombre: item.nombre || "Artículo sin nombre",
    categoria: item.categoria || "General",
    cantidad: num(item.cantidad ?? item.stock),
    minCantidad: num(item.minCantidad ?? item.minStock),
    costo: num(item.costo),
    precio: num(item.precio),
    notas: item.notas || ""
  };
}

function normalizeMovement(mov) {
  return {
    id: mov.id || uid("mov"),
    fecha: mov.fecha || today(),
    tipo: mov.tipo || (num(mov.monto) < 0 ? "abono" : "cargo"),
    concepto: mov.concepto || (num(mov.monto) < 0 ? "Abono" : "Cargo"),
    monto: num(mov.monto),
    metodo: mov.metodo || ""
  };
}

const displayMethod = (method = "") => method === "Deposito" ? "Depósito" : method;

function accountSummary(client) {
  const entity = client.tarjeta?.institucion || client.tarjeta?.alias || "Cuenta";
  const reference = client.tarjeta?.terminacion ? `Ref. ${client.tarjeta.terminacion}` : (client.referencia || "Sin referencia");
  return `${entity} - ${reference}`;
}

function accountShort(client) {
  return client.tarjeta?.terminacion || client.folio || "S/R";
}

function paymentRatingInfo(client) {
  const rating = client.paymentRating || "normal";
  if (rating === "good") return { label: "Bueno para pagar", badge: "ok", icon: "thumbsUp" };
  if (rating === "bad") return { label: "Malo para pagar", badge: "late", icon: "thumbsDown" };
  return { label: "Sin calificar", badge: "info", icon: "user" };
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function validFirebaseConfig(config) {
  return !!(
    config &&
    typeof config === "object" &&
    config.apiKey &&
    config.projectId &&
    config.appId &&
    !String(config.apiKey).includes("TU_") &&
    !String(config.projectId).includes("TU_")
  );
}

function waitForFirebaseAuth(authModule, auth) {
  return new Promise((resolve) => {
    let unsubscribe = null;
    unsubscribe = authModule.onAuthStateChanged(auth, (user) => {
      if (unsubscribe) unsubscribe();
      resolve(user);
    });
  });
}

async function initFirebaseCloud() {
  if (firebaseCloud.ready) return firebaseCloud;
  if (firebaseCloud.initializing) return firebaseCloud.initializing;

  firebaseCloud.initializing = (async () => {
    try {
      await loadScript(`${FIREBASE_CONFIG_PATH}?t=${Date.now()}`);
      const config = window.MIRY_FIREBASE_CONFIG;
      if (!validFirebaseConfig(config)) return null;

      const options = window.MIRY_FIREBASE_OPTIONS || {};
      const [
        appModule,
        authModule,
        firestoreModule,
        databaseModule,
        storageModule
      ] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js"),
        import("https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js")
      ]);

      const firebaseApp = appModule.initializeApp(config);
      const auth = authModule.getAuth(firebaseApp);
      firebaseCloud.authMode = options.authMode || "password";
      firebaseCloud.auth = auth;
      firebaseCloud.signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
      firebaseCloud.signOut = authModule.signOut;
      firebaseCloud.loginEmail = options.loginEmail || "";
      if (firebaseCloud.authMode === "anonymous") {
        await authModule.signInAnonymously(auth);
      } else {
        await waitForFirebaseAuth(authModule, auth);
      }
      const db = firestoreModule.getFirestore(firebaseApp);
      const realtimeDb = databaseModule.getDatabase(firebaseApp, options.databaseURL || config.databaseURL);
      const storage = storageModule.getStorage(firebaseApp);
      const collectionName = options.collection || "miryApps";
      const documentId = options.documentId || "carteraPrincipal";
      const realtimePath = options.realtimePath || "apps/carteraPrincipal";

      firebaseCloud.ready = true;
      firebaseCloud.provider = options.databaseProvider === "firestore" ? "firestore" : "realtime";
      firebaseCloud.firestoreDocRef = firestoreModule.doc(db, collectionName, documentId);
      firebaseCloud.realtimeRef = databaseModule.ref(realtimeDb, realtimePath);
      firebaseCloud.storage = storage;
      firebaseCloud.storageFolder = options.storageFolder || "ine";
      firebaseCloud.getFirestoreDoc = firestoreModule.getDoc;
      firebaseCloud.setFirestoreDoc = firestoreModule.setDoc;
      firebaseCloud.rtdbGet = databaseModule.get;
      firebaseCloud.rtdbSet = databaseModule.set;
      firebaseCloud.storageRef = storageModule.ref;
      firebaseCloud.uploadString = storageModule.uploadString;
      firebaseCloud.getDownloadURL = storageModule.getDownloadURL;
      return firebaseCloud;
    } catch (error) {
      console.info("Firebase no configurado. Usando backend/local.", error?.message || error);
      return null;
    }
  })();

  return firebaseCloud.initializing;
}

function firebaseModeLabel() {
  if (!firebaseCloud.ready) return "firebase";
  return firebaseCloud.provider === "realtime" ? "firebase-rtdb" : "firebase-firestore";
}

async function readFirebaseDB() {
  if (firebaseCloud.provider === "realtime") {
    const snapshot = await firebaseCloud.rtdbGet(firebaseCloud.realtimeRef);
    const value = snapshot.exists() ? snapshot.val() : null;
    return {
      exists: snapshot.exists(),
      payload: value?.payload || null
    };
  }

  const snapshot = await firebaseCloud.getFirestoreDoc(firebaseCloud.firestoreDocRef);
  return {
    exists: snapshot.exists(),
    payload: snapshot.exists() ? snapshot.data().payload : null
  };
}

async function writeFirebaseDB(payload) {
  const record = {
    payload,
    updatedAt: new Date().toISOString(),
    appName: payload.settings?.appName || "Novedades y Muebles Miry"
  };

  if (firebaseCloud.provider === "realtime") {
    await firebaseCloud.rtdbSet(firebaseCloud.realtimeRef, record);
    return;
  }

  await firebaseCloud.setFirestoreDoc(firebaseCloud.firestoreDocRef, record);
}

async function loadDB() {
  const cloud = await initFirebaseCloud();
  if (cloud?.ready) {
    if (cloud.authMode === "password" && !cloud.auth?.currentUser) {
      const raw = localStorage.getItem(STORAGE_KEY);
      state.db = normalize(raw ? JSON.parse(raw) : null);
      state.session = null;
      state.cloudMode = "auth";
      localStorage.removeItem(SESSION_KEY);
      return;
    }

    try {
      const cloudData = await readFirebaseDB();
      state.db = normalize(cloudData.exists ? cloudData.payload : null);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));
      state.lastSync = new Date();
      state.cloudMode = firebaseModeLabel();
      if (!cloudData.exists) await writeFirebaseDB(state.db);
      state.session = cloud.authMode === "password"
        ? { role: "collector", email: cloud.auth.currentUser.email || "", at: new Date().toISOString() }
        : JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
      return;
    } catch (error) {
      console.warn("Firebase no respondio. Intentando backend local.", error);
      state.cloudMode = "local";
    }
  }

  try {
    const response = await fetch(API_DB, { cache: "no-store" });
    if (!response.ok) throw new Error(`API ${response.status}`);
    state.db = normalize(await response.json());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));
    state.lastSync = new Date();
    state.cloudMode = "backend";
  } catch (error) {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.db = normalize(raw ? JSON.parse(raw) : null);
    state.cloudMode = "local";
    showToast("Backend no disponible. Usando copia local.", "warning");
  }
  state.session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
}

async function saveDB(message = "Guardado") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));
  state.saving = true;
  render();
  try {
    if (firebaseCloud.ready) {
      await writeFirebaseDB(state.db);
      state.cloudMode = firebaseModeLabel();
    } else {
      const response = await fetch(API_DB, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.db)
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      state.db = normalize(await response.json());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));
      state.cloudMode = "backend";
    }
    state.lastSync = new Date();
    showToast(message, "success");
  } catch (error) {
    showToast("Guardado localmente. La nube no respondio.", "warning");
    state.cloudMode = "local";
  } finally {
    state.saving = false;
    render();
  }
}

function logEvent(accion, detalle, client = null) {
  state.db.audit = [
    {
      id: uid("aud"),
      fecha: new Date().toISOString(),
      accion,
      detalle,
      clienteId: client?.id || "",
      cliente: client?.nombre || ""
    },
    ...(state.db.audit || [])
  ].slice(0, 200);
}

function clients() {
  return state.db?.clients || [];
}

function items() {
  return state.db?.items || [];
}

function activeClient() {
  return clients().find((client) => client.id === state.selectedId) || clients()[0] || null;
}

function cargos(client) {
  return (client.movimientos || []).filter((mov) => num(mov.monto) > 0).reduce((sum, mov) => sum + num(mov.monto), 0);
}

function abonos(client) {
  return Math.abs((client.movimientos || []).filter((mov) => num(mov.monto) < 0).reduce((sum, mov) => sum + num(mov.monto), 0));
}

function saldo(client) {
  return Math.max(0, cargos(client) - abonos(client));
}

function lastPayment(client) {
  const rows = (client.movimientos || []).filter((mov) => num(mov.monto) < 0).sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha));
  return rows[0]?.fecha || client.credito.fechaInicio;
}

function nextPaymentDate(client) {
  const fromLast = addDays(lastPayment(client), 7);
  return client.credito.proximoPago && parseDate(client.credito.proximoPago) > parseDate(fromLast)
    ? client.credito.proximoPago
    : fromLast;
}

function statusOf(client) {
  const balance = saldo(client);
  if (balance <= 0) return { type: "paid", label: "Liquidado", badge: "ok" };
  const late = daysSince(nextPaymentDate(client)) > 0;
  if (late) return { type: "late", label: "Atrasado", badge: "late" };
  return { type: "active", label: "Al corriente", badge: "pending" };
}

function progressOf(client) {
  const total = cargos(client);
  return total > 0 ? Math.min(100, (abonos(client) / total) * 100) : 0;
}

function paymentMovements(client) {
  return (client.movimientos || [])
    .filter((mov) => num(mov.monto) < 0)
    .sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha));
}

function lastPaymentEntry(client) {
  return paymentMovements(client)[0] || null;
}

function nextSuggestedAmount(client) {
  const balance = saldo(client);
  const weekly = num(client.credito.abonoSemanal);
  return Math.min(balance, weekly || balance);
}

function remainingPayments(client) {
  const weekly = num(client.credito.abonoSemanal);
  return weekly > 0 ? Math.ceil(saldo(client) / weekly) : 0;
}

function overdueDays(client) {
  return Math.max(0, daysSince(nextPaymentDate(client)));
}

function clientRiskScore(client) {
  const balance = saldo(client);
  const days = overdueDays(client);
  const last = lastPaymentEntry(client);
  const noPaymentPenalty = last ? 0 : 3000;
  return days * 2200 + balance + noPaymentPenalty - progressOf(client) * 10;
}

function buyerStats(client) {
  const total = cargos(client);
  const paid = abonos(client);
  const balance = saldo(client);
  const payments = paymentMovements(client).length;
  const days = overdueDays(client);
  const progress = progressOf(client);
  const punctual = balance === 0 || days === 0;
  const score = total * 0.45 + paid * 0.9 + payments * 420 + progress * 80 - days * 2600 - (punctual ? 0 : balance * 0.75);
  return { total, paid, balance, payments, days, progress, punctual, score };
}

function clientGoodScore(client) {
  return buyerStats(client).score;
}

function topGoodClients(limit = 10) {
  return clients()
    .filter((client) => {
      const stats = buyerStats(client);
      return stats.total > 0 && stats.punctual && (stats.paid > 0 || stats.balance === 0);
    })
    .sort((a, b) => clientGoodScore(b) - clientGoodScore(a))
    .slice(0, limit);
}

function topBadClients(limit = 10) {
  return clients()
    .filter((client) => saldo(client) > 0 && overdueDays(client) > 0)
    .sort((a, b) => clientRiskScore(b) - clientRiskScore(a))
    .slice(0, limit);
}

function lateClients(limit = 10) {
  return clients()
    .filter((client) => saldo(client) > 0 && statusOf(client).type === "late")
    .sort((a, b) => overdueDays(b) - overdueDays(a) || saldo(b) - saldo(a))
    .slice(0, limit);
}

function inventoryStats() {
  const rows = items();
  return {
    count: rows.length,
    units: rows.reduce((sum, item) => sum + num(item.cantidad), 0),
    value: rows.reduce((sum, item) => sum + num(item.cantidad) * num(item.precio), 0),
    low: rows.filter((item) => num(item.cantidad) <= num(item.minCantidad)).length
  };
}

function visibleClients() {
  const q = state.query.trim().toLowerCase();
  return clients()
    .filter((client) => {
      const haystack = `${client.folio} ${client.nombre} ${client.telefono} ${client.tarjeta?.institucion} ${client.tarjeta?.terminacion}`.toLowerCase();
      if (q && !haystack.includes(q)) return false;
      const status = statusOf(client);
      if (state.filter === "all") return true;
      if (state.filter === "active") return status.type === "active";
      if (state.filter === "late") return status.type === "late";
      if (state.filter === "paid") return status.type === "paid";
      return true;
    })
    .sort((a, b) => {
      if (statusOf(a).type === "late" && statusOf(b).type !== "late") return -1;
      if (statusOf(a).type !== "late" && statusOf(b).type === "late") return 1;
      return saldo(b) - saldo(a);
    });
}

function allPayments() {
  return clients()
    .flatMap((client) => (client.movimientos || [])
      .filter((mov) => num(mov.monto) < 0)
      .map((mov) => ({ ...mov, client })))
    .sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha));
}

function paymentPeriodMatch(mov, period) {
  if (period === "today") return mov.fecha === today();
  const days = Math.floor((parseDate(today()) - parseDate(mov.fecha)) / 86400000);
  if (period === "week") return days >= 0 && days <= 6;
  if (period === "month") {
    const current = parseDate(today());
    const date = parseDate(mov.fecha);
    return date.getMonth() === current.getMonth() && date.getFullYear() === current.getFullYear();
  }
  return true;
}

function filteredPayments() {
  const query = state.paymentQuery.trim().toLowerCase();
  return allPayments().filter((mov) => {
    if (!paymentPeriodMatch(mov, state.paymentPeriod)) return false;
    if (state.paymentMethod !== "all" && displayMethod(mov.metodo || "Efectivo") !== state.paymentMethod) return false;
    if (!query) return true;
    const haystack = [
      mov.client.nombre,
      mov.client.folio,
      mov.client.telefono,
      accountSummary(mov.client),
      displayMethod(mov.metodo),
      mov.concepto,
      mov.fecha,
      Math.abs(num(mov.monto)).toString()
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

function findPayment(paymentId) {
  for (const client of clients()) {
    const movement = (client.movimientos || []).find((mov) => mov.id === paymentId && num(mov.monto) < 0);
    if (movement) return { client, movement };
  }
  return null;
}

function paymentBalanceContext(client, movement) {
  let running = 0;
  let before = saldo(client);
  let after = saldo(client);
  for (const row of client.movimientos || []) {
    if (row.id === movement.id) before = running;
    running += num(row.monto);
    if (row.id === movement.id) {
      after = running;
      break;
    }
  }
  return { before: Math.max(0, before), after: Math.max(0, after) };
}

function refreshNextPayment(client) {
  const last = lastPaymentEntry(client);
  if (last) client.credito.proximoPago = addDays(last.fecha, 7);
}

function stats() {
  const rows = clients();
  const active = rows.filter((client) => saldo(client) > 0);
  const paymentsToday = allPayments().filter((mov) => mov.fecha === today());
  return {
    clients: rows.length,
    active: active.length,
    balance: active.reduce((sum, client) => sum + saldo(client), 0),
    paidToday: paymentsToday.reduce((sum, mov) => sum + Math.abs(num(mov.monto)), 0),
    late: active.filter((client) => statusOf(client).type === "late").length,
    cards: rows.filter((client) => client.tarjeta?.terminacion).length
  };
}

function paymentsByMethodToday() {
  const base = {
    Efectivo: { total: 0, count: 0, icon: "cash" },
    Transferencia: { total: 0, count: 0, icon: "bank" },
    "Depósito": { total: 0, count: 0, icon: "wallet" },
    Otro: { total: 0, count: 0, icon: "coin" }
  };
  for (const mov of allPayments().filter((row) => row.fecha === today())) {
    const method = displayMethod(mov.metodo || "Efectivo");
    const key = base[method] ? method : "Otro";
    base[key].total += Math.abs(num(mov.monto));
    base[key].count += 1;
  }
  return base;
}

function expensesToday() {
  return (state.db.routeExpenses || []).filter((expense) => expense.fecha === today());
}

function totalExpensesToday() {
  return expensesToday().reduce((sum, expense) => sum + num(expense.monto), 0);
}

function nextFolio() {
  const nums = clients().map((client) => Number(String(client.folio || "").match(/\d+/)?.[0] || 0));
  return `CR-${String(Math.max(0, ...nums) + 1).padStart(3, "0")}`;
}

function normalizePhone(phone = "") {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  return digits;
}

function callClient(client) {
  const digits = normalizePhone(client.telefono);
  if (!digits) return showToast("El cliente no tiene teléfono.", "warning");
  window.open(`tel:+${digits}`, "_self");
}

function ticketText(client) {
  const status = statusOf(client);
  return [
    state.db.settings.appName.toUpperCase(),
    "COMPROBANTE DE ABONO",
    "",
    `Folio: ${client.folio}`,
    `Cliente: ${client.nombre}`,
    `Cuenta: ${accountSummary(client)}`,
    `Fecha: ${dateFmt.format(new Date())}`,
    "",
    `Crédito total: ${money.format(cargos(client))}`,
    `Total abonado: ${money.format(abonos(client))}`,
    `Saldo actual: ${money.format(saldo(client))}`,
    `Estatus: ${status.label}`,
    "",
    state.db.settings.receiptMessage
  ].join("\n");
}

function paymentTicketText(client, movement) {
  const balances = paymentBalanceContext(client, movement);
  return [
    state.db.settings.appName.toUpperCase(),
    "TICKET DE ABONO",
    "",
    `Ticket: ${movement.id}`,
    `Cliente: ${client.nombre}`,
    `Folio cliente: ${client.folio}`,
    `Cuenta: ${accountSummary(client)}`,
    `Fecha abono: ${dateFmt.format(parseDate(movement.fecha))}`,
    `Método: ${displayMethod(movement.metodo || "Efectivo")}`,
    `Concepto: ${movement.concepto}`,
    "",
    `Saldo anterior: ${money.format(balances.before)}`,
    `Abono recibido: ${money.format(Math.abs(num(movement.monto)))}`,
    `Saldo después: ${money.format(balances.after)}`,
    `Saldo actual: ${money.format(saldo(client))}`,
    "",
    state.db.settings.receiptMessage
  ].join("\n");
}

function statementText(client) {
  const status = statusOf(client);
  const last = lastPaymentEntry(client);
  return [
    `Estado de cuenta - ${state.db.settings.appName}`,
    "",
    `Cliente: ${client.nombre}`,
    `Folio: ${client.folio}`,
    `Cuenta: ${accountSummary(client)}`,
    `Crédito total: ${money.format(cargos(client))}`,
    `Total abonado: ${money.format(abonos(client))}`,
    `Saldo pendiente: ${money.format(saldo(client))}`,
    `Abono sugerido: ${money.format(nextSuggestedAmount(client))}`,
    `Siguiente pago: ${dateFmt.format(parseDate(nextPaymentDate(client)))}`,
    `Pagos restantes aprox.: ${remainingPayments(client) || "Sin plan semanal"}`,
    `Último abono: ${last ? `${dateFmt.format(parseDate(last.fecha))} por ${money.format(Math.abs(num(last.monto)))}` : "Sin abonos"}`,
    `Estatus: ${status.label}`,
    "",
    state.db.settings.receiptMessage
  ].join("\n");
}

function printTicket(client) {
  $("#printArea").innerHTML = `<div class="ticket"><h1>${esc(state.db.settings.appName)}</h1>${esc(ticketText(client))}</div>`;
  window.print();
}

function printPaymentTicket(client, movement) {
  $("#printArea").innerHTML = `<div class="ticket"><h1>${esc(state.db.settings.appName)}</h1>${esc(paymentTicketText(client, movement))}</div>`;
  window.print();
}

async function copyPaymentTicket(client, movement) {
  const text = paymentTicketText(client, movement);
  try {
    await navigator.clipboard.writeText(text);
    showToast("Ticket de abono copiado.", "success");
  } catch {
    window.prompt("Copia el ticket:", text);
  }
}

function sendPaymentTicketWhatsApp(client, movement) {
  const phone = normalizePhone(client.telefono);
  if (!phone) return showToast("El cliente no tiene teléfono.", "warning");
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(paymentTicketText(client, movement))}`, "_blank", "noopener");
}

function sendClientWhatsApp(client, mode = "reminder") {
  const phone = normalizePhone(client.telefono);
  if (!phone) return showToast("El cliente no tiene teléfono.", "warning");
  const message = mode === "ticket"
    ? ticketText(client)
    : mode === "statement"
      ? statementText(client)
      : `Hola ${client.nombre}. Le recordamos que su saldo pendiente es ${money.format(saldo(client))}. Su abono semanal acordado es ${money.format(num(client.credito.abonoSemanal))}. Gracias.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
}

async function copyStatementText(client) {
  const text = statementText(client);
  try {
    await navigator.clipboard.writeText(text);
    showToast("Estado de cuenta copiado.", "success");
  } catch {
    window.prompt("Copia el estado de cuenta:", text);
  }
}

function exportCSV() {
  const headers = ["Folio", "Cliente", "Teléfono", "Cuenta/Entidad", "Referencia", "Crédito", "Abono semanal", "Abonado", "Saldo", "Estatus", "Dirección", "Notas"];
  const lines = [headers.join(",")];
  for (const client of clients()) {
    const row = [
      client.folio,
      client.nombre,
      client.telefono,
      client.tarjeta.institucion,
      client.tarjeta.terminacion,
      cargos(client),
      client.credito.abonoSemanal,
      abonos(client),
      saldo(client),
      statusOf(client).label,
      client.direccion,
      client.notas
    ].map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`);
    lines.push(row.join(","));
  }
  downloadFile(`cartera-cobranza-${today()}.csv`, `\ufeff${lines.join("\n")}`, "text/csv;charset=utf-8");
}

function downloadBackup() {
  downloadFile(`respaldo-cobranza-${today()}.json`, JSON.stringify(state.db, null, 2), "application/json;charset=utf-8");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function render() {
  if (!state.db) {
    app.innerHTML = `<div class="login"><div class="login-card"><div class="brand"><div class="brand-mark">MM</div><div><h1>Cargando</h1><p>Preparando cobranza</p></div></div></div></div>`;
    return;
  }
  if (!state.session) return renderLogin();
  renderApp();
}

function renderLogin() {
  const firebasePasswordLogin = firebaseCloud.ready && firebaseCloud.authMode === "password";
  app.innerHTML = `
    <main class="login">
      <form class="login-card" id="loginForm">
        <div class="brand">
          <div class="brand-mark">MM</div>
          <div>
            <h1>${esc(state.db.settings.appName)}</h1>
            <p>Acceso del cobrador</p>
          </div>
        </div>
        ${firebasePasswordLogin ? `
          <label>Correo
            <input id="emailInput" type="email" inputmode="email" value="${esc(firebaseCloud.loginEmail)}" placeholder="correo@ejemplo.com" autocomplete="username" required autofocus />
          </label>
          <label style="margin-top:12px;">Contraseña
            <input id="passwordInput" type="password" placeholder="Contraseña de Firebase" autocomplete="current-password" required />
          </label>
        ` : `
          <label>PIN del cobrador
            <input id="pinInput" type="password" inputmode="numeric" placeholder="1234" autocomplete="current-password" required autofocus />
          </label>
        `}
        <button class="btn primary" type="submit" style="width:100%;margin-top:14px;">${icon("save")} Entrar a cobranza</button>
        <div class="hint">
          ${firebasePasswordLogin
            ? `<strong>Firebase Auth:</strong> entra con el usuario creado en Authentication. La contraseña no se guarda en la app.`
            : `<strong>Demo:</strong> PIN 1234. Esta versión está pensada para un cobrador que maneja cartera, créditos, promesas y abonos.`}
        </div>
      </form>
    </main>
  `;
}

function renderApp() {
  const s = stats();
  const syncLabel = state.cloudMode === "firebase-rtdb"
    ? "RTDB"
    : state.cloudMode === "firebase-firestore"
      ? "Firestore"
      : state.cloudMode === "backend"
        ? "Backend"
        : "Local";
  const syncText = state.saving
    ? "Guardando..."
    : state.lastSync
      ? `${syncLabel} ${state.lastSync.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`
      : "Modo local";
  const titleMap = {
    panel: ["Panel de cobranza", "Resumen diario de cartera, atrasos y abonos"],
    clients: ["Clientes y créditos", "Cartera, saldo y registro de abonos"],
    payments: ["Abonos", "Historial de pagos y comprobantes"],
    cards: ["Productos y cuentas", "Control de productos, referencias y saldos"],
    inventory: ["Artículos y cantidad", "Inventario, precios y existencias"],
    settings: ["Ajustes", "Perfil del cobrador, respaldo y seguridad"]
  };
  const [title, subtitle] = titleMap[state.view] || titleMap.panel;
  const showFab = ["payments", "cards"].includes(state.view);
  app.innerHTML = `
    <div class="app-shell view-${state.view} ${state.saving ? "is-saving" : ""}">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">MM</div>
          <div>
            <h1>${esc(state.db.settings.appName)}</h1>
            <p>Productos, créditos y abonos</p>
          </div>
        </div>
        <nav class="nav">
          ${navButton("panel", "Panel", "panel")}
          ${navButton("clients", "Clientes", "clients")}
          ${navButton("payments", "Abonos", "payments")}
          ${navButton("cards", "Productos", "cards")}
          ${navButton("inventory", "Artículos", "inventory")}
          ${navButton("settings", "Ajustes", "settings")}
        </nav>
        <div class="collector-box">
          <strong>${esc(state.db.settings.collectorName)}</strong>
          <span>${esc(state.db.settings.collectorPhone || "Sin teléfono")}</span>
          <button class="btn danger" data-action="logout" style="width:100%;margin-top:12px;">${icon("logout")} Salir</button>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div>
            <h2>${esc(title)}</h2>
            <p>${esc(subtitle)} <span class="sync-pill">${esc(syncText)}</span></p>
          </div>
          <div class="toolbar">
            <button class="btn primary" data-action="new-client">${icon("plus")} Nuevo crédito</button>
            <button class="btn soft" data-action="export-csv">${icon("download")} CSV</button>
            <button class="btn" data-action="backup">${icon("download")} Respaldo</button>
          </div>
        </header>
        ${state.view === "panel" ? renderPanel(s) : ""}
        ${state.view === "clients" ? renderClientsView() : ""}
        ${state.view === "payments" ? renderPaymentsView() : ""}
        ${state.view === "cards" ? renderCardsView() : ""}
        ${state.view === "inventory" ? renderInventoryView() : ""}
        ${state.view === "settings" ? renderSettingsView() : ""}
      </main>
    </div>
    ${renderMobileNav()}
    ${showFab ? `<button class="fab" data-action="quick-pay" aria-label="Cobrar rápido">${icon("bolt")} Cobrar</button>` : ""}
    ${renderModal()}
    <div class="toast-wrap" id="toastWrap"></div>
  `;
}

function navButton(view, label, iconName) {
  return `<button class="${state.view === view ? "active" : ""}" data-view="${view}">${icon(iconName)} ${label}</button>`;
}

function renderMobileNav() {
  const items = [
    ["panel", "Panel", "panel"],
    ["clients", "Clientes", "clients"],
    ["payments", "Abonos", "payments"],
    ["inventory", "Artículos", "inventory"],
    ["settings", "Ajustes", "settings"]
  ];
  return `
    <nav class="mobile-nav" aria-label="Navegación móvil">
      ${items.map(([target, label, iconName]) => `
        <button class="${state.view === target ? "active" : ""}" data-view="${target}">
          ${icon(iconName)}
          <span>${label}</span>
        </button>
      `).join("")}
    </nav>
  `;
}

function priorityClients(limit = 4) {
  return clients()
    .filter((client) => saldo(client) > 0)
    .sort((a, b) => {
      const lateDiff = daysSince(nextPaymentDate(b)) - daysSince(nextPaymentDate(a));
      if (lateDiff !== 0) return lateDiff;
      return saldo(b) - saldo(a);
    })
    .slice(0, limit);
}

function renderClientRankRow(client, index, tone = "ok") {
  const last = lastPaymentEntry(client);
  return `
    <button class="rank-row ${tone}" data-select="${client.id}">
      <span class="rank-index">${index + 1}</span>
      <div>
        <strong>${esc(client.nombre)}</strong>
        <small>${esc(client.folio)} - ${overdueDays(client)} días atraso - Último: ${last ? dateFmt.format(parseDate(last.fecha)) : "Sin abonos"}</small>
      </div>
      <b>${money.format(saldo(client))}</b>
    </button>
  `;
}

function renderTopBuyerRow(client, index) {
  const stats = buyerStats(client);
  return `
    <button class="rank-row good buyer-row" data-select="${client.id}">
      <span class="rank-index">${index + 1}</span>
      <div>
        <strong>${esc(client.nombre)}</strong>
        <small>${esc(client.folio)} - ${stats.payments} abonos - ${stats.progress.toFixed(1)}% pagado - al corriente</small>
      </div>
      <div class="rank-value">
        <strong>${money.format(stats.total)}</strong>
        <small>consumo</small>
      </div>
    </button>
  `;
}

function renderTopLateRow(client, index) {
  const stats = buyerStats(client);
  const last = lastPaymentEntry(client);
  return `
    <button class="rank-row bad buyer-row" data-select="${client.id}">
      <span class="rank-index">${index + 1}</span>
      <div>
        <strong>${esc(client.nombre)}</strong>
        <small>${esc(client.folio)} - ${stats.days} días tarde - último abono: ${last ? dateFmt.format(parseDate(last.fecha)) : "sin abonos"}</small>
      </div>
      <div class="rank-value danger">
        <strong>${money.format(stats.balance)}</strong>
        <small>adeudo</small>
      </div>
    </button>
  `;
}

function renderTopTenPanel() {
  const good = topGoodClients(10);
  const bad = topBadClients(10);
  const goodTotal = good.reduce((sum, client) => sum + cargos(client), 0);
  const badTotal = bad.reduce((sum, client) => sum + saldo(client), 0);
  return `
    <section class="card top-ten-card">
      <div class="card-head">
        <h3>${icon("ranking")} Top 10 cartera</h3>
        <span class="badge info">Compradores y morosos</span>
      </div>
      <div class="card-body">
        <div class="top-ten-summary">
          <div class="insight ok"><span>${icon("thumbsUp")}</span><div><strong>${money.format(goodTotal)}</strong><small>Consumo de buenos compradores al corriente</small></div></div>
          <div class="insight danger"><span>${icon("thumbsDown")}</span><div><strong>${money.format(badTotal)}</strong><small>Adeudo vencido en clientes morosos</small></div></div>
        </div>
        <div class="top-ten-grid">
          <section class="rank-panel">
            <div class="rank-title">
              <strong>${icon("thumbsUp")} Top 10 buenos compradores</strong>
              <small>Consumen, abonan y se mantienen a tiempo y forma.</small>
            </div>
            <div class="rank-list">
              ${good.length ? good.map(renderTopBuyerRow).join("") : `<p class="muted">Aún no hay clientes con consumo y pagos puntuales suficientes.</p>`}
            </div>
          </section>
          <section class="rank-panel">
            <div class="rank-title">
              <strong>${icon("thumbsDown")} Top 10 morosos</strong>
              <small>Tienen adeudo activo y ya pasaron su fecha de pago.</small>
            </div>
            <div class="rank-list">
              ${bad.length ? bad.map(renderTopLateRow).join("") : `<p class="muted">No hay clientes morosos con adeudo vencido.</p>`}
            </div>
          </section>
        </div>
      </div>
    </section>
  `;
}

function renderMorososPanel(limit = 10) {
  const rows = lateClients(limit);
  const total = rows.reduce((sum, client) => sum + saldo(client), 0);
  return `
    <div class="card">
      <div class="card-head">
        <h3>${icon("alert")} Clientes morosos</h3>
        <span class="badge ${rows.length ? "late" : "ok"}">${rows.length} casos</span>
      </div>
      <div class="card-body rank-list">
        <div class="insight warning"><span>${icon("wallet")}</span><div><strong>${money.format(total)}</strong><small>Saldo moroso visible</small></div></div>
        ${rows.length ? rows.map((client, index) => renderClientRankRow(client, index, "bad")).join("") : `<p class="muted">No hay clientes morosos por ahora.</p>`}
      </div>
    </div>
  `;
}

function renderInventorySnapshot(inv = inventoryStats()) {
  return `
    <div class="card inventory-snapshot">
      <div class="card-head">
        <h3>${icon("boxes")} Inventario</h3>
        <button class="btn soft" data-view="inventory">${icon("inventory")} Abrir</button>
      </div>
      <div class="card-body">
        <div class="compact-kpis">
          <div><span>Artículos</span><strong>${inv.count}</strong></div>
          <div><span>Unidades</span><strong>${inv.units}</strong></div>
          <div><span>Valor venta</span><strong>${money.format(inv.value)}</strong></div>
        </div>
        <div class="insight ${inv.low ? "danger" : "ok"}">
          <span>${icon(inv.low ? "alert" : "check")}</span>
          <div><strong>${inv.low ? `${inv.low} con cantidad baja` : "Cantidad estable"}</strong><small>${inv.low ? "Revisa existencias antes de vender." : "No hay alertas de mínimo."}</small></div>
        </div>
      </div>
    </div>
  `;
}

function renderSecondaryPanel() {
  const methods = paymentsByMethodToday();
  const paid = Object.values(methods).reduce((sum, row) => sum + row.total, 0);
  const cash = methods.Efectivo?.total || 0;
  const expenses = totalExpensesToday();
  const netCash = Math.max(0, cash - expenses);
  const good = topGoodClients(3);
  const bad = topBadClients(3);
  return `
    <details class="card disclosure-panel">
      <summary>
        <span>${icon("sliders")} Más herramientas del turno</span>
        <b>Corte, métodos y rankings</b>
      </summary>
      <div class="card-body compact-tools">
        <section class="compact-section">
          <h4>${icon("calculator")} Corte rapido</h4>
          <div class="compact-kpis">
            <div><span>Cobrado</span><strong>${money.format(paid)}</strong></div>
            <div><span>Gastos</span><strong>${money.format(expenses)}</strong></div>
            <div><span>Efectivo</span><strong>${money.format(netCash)}</strong></div>
          </div>
          <form id="expenseForm" class="expense-form compact-expense">
            <input name="concept" placeholder="Gasto: gasolina, comida..." required>
            <input name="amount" type="number" min="0.01" step="0.01" placeholder="Monto" required>
            <button class="btn soft" type="submit">${icon("plus")} Gasto</button>
          </form>
        </section>
        <section class="compact-section">
          <h4>${icon("wallet")} Métodos de cobro</h4>
          <div class="method-list compact-methods">
            ${Object.entries(methods).map(([name, row]) => `
              <div class="method-row">
                <span>${icon(row.icon)}</span>
                <div><strong>${esc(name)}</strong><small>${row.count} movimiento(s)</small></div>
                <b>${money.format(row.total)}</b>
              </div>
            `).join("")}
          </div>
        </section>
        <section class="compact-section">
          <h4>${icon("ranking")} Rankings rápidos</h4>
          <div class="mini-ranks">
            <div>
              <strong>${icon("thumbsUp")} Buenos compradores</strong>
              ${good.length ? good.map(renderTopBuyerRow).join("") : `<p class="muted">Sin historial suficiente.</p>`}
            </div>
            <div>
              <strong>${icon("thumbsDown")} Morosos</strong>
              ${bad.length ? bad.map(renderTopLateRow).join("") : `<p class="muted">Sin morosos vencidos.</p>`}
            </div>
          </div>
        </section>
      </div>
    </details>
  `;
}

function renderCollectorHero(s, goalPct) {
  const target = priorityClients(1)[0];
  return `
    <section class="collector-hero">
      <div class="hero-main">
        <span class="hero-eyebrow">${icon("shield")} Cobranza del día</span>
        <h3>${target ? `Siguiente cuenta: ${esc(target.nombre)}` : "Jornada lista para trabajar"}</h3>
        <p>${target ? `${esc(target.folio)} - ${money.format(saldo(target))} pendientes - ${dateFmt.format(parseDate(nextPaymentDate(target)))}` : "No hay atrasos urgentes. Mantente atento a nuevas promesas y abonos."}</p>
        <div class="hero-actions">
          <button class="btn primary" data-action="quick-pay">${icon("bolt")} Cobrar ahora</button>
          <button class="btn" data-view="clients">${icon("clients")} Ver cartera</button>
        </div>
      </div>
      <div class="hero-meter">
        <div class="ring" style="--pct:${goalPct}%"><span>${goalPct.toFixed(0)}%</span></div>
        <strong>${money.format(s.paidToday)}</strong>
        <small>cobrado hoy</small>
      </div>
    </section>
  `;
}

function renderPanel(s) {
  const due = clients().filter((client) => saldo(client) > 0).sort((a, b) => parseDate(nextPaymentDate(a)) - parseDate(nextPaymentDate(b))).slice(0, 5);
  const recent = allPayments().slice(0, 4);
  const goal = num(state.db.settings.dailyGoal);
  const goalPct = goal > 0 ? Math.min(100, (s.paidToday / goal) * 100) : 0;
  return `
    ${renderCollectorHero(s, goalPct)}
    <section class="grid metrics">
      ${metric("Clientes", s.clients, `${s.active} activos`, "user", "info")}
      ${metric("Cartera pendiente", money.format(s.balance), `${s.cards} referencias`, "wallet", "warning")}
      ${metric("Cobrado hoy", money.format(s.paidToday), `${goalPct.toFixed(1)}% de meta`, "cash", "ok")}
      ${metric("Atrasados", s.late, "Requieren visita", "alert", "danger")}
    </section>
    <section class="grid dashboard-grid panel-core">
      <div class="card">
        <div class="card-head"><h3>${icon("calendar")} Próximos cobros</h3><button class="btn soft" data-view="clients">${icon("clients")} Abrir cartera</button></div>
        <div class="card-body">
          ${due.length ? due.map((client) => renderDueRow(client)).join("") : `<p>No hay cobros pendientes.</p>`}
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>${icon("target")} Meta del día</h3><span class="badge info">${money.format(goal)}</span></div>
        <div class="card-body">
          <div class="progress"><div style="width:${goalPct}%"></div></div>
          <p><strong>${money.format(s.paidToday)}</strong> cobrados hoy.</p>
          <hr>
          <h4>${icon("receipt")} Últimos abonos</h4>
          ${recent.length ? recent.map(renderPaymentMini).join("") : `<p>Aún no hay abonos registrados.</p>`}
        </div>
      </div>
    </section>
    ${renderTopTenPanel()}
    <section class="grid inventory-strip">
      ${renderInventorySnapshot()}
    </section>
    ${renderSecondaryPanel()}
  `;
}

function metric(label, value, detail, iconName = "check", tone = "info") {
  return `<article class="metric ${tone}"><div class="metric-icon">${icon(iconName)}</div><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small></article>`;
}

function renderDueRow(client) {
  const st = statusOf(client);
  return `
    <button class="client-row" data-select="${client.id}">
      <strong>${icon("user")} ${esc(client.nombre)}</strong>
      <span>${esc(client.folio)} - Próximo: ${dateFmt.format(parseDate(nextPaymentDate(client)))}</span>
      <div class="money"><span class="badge ${st.badge}">${st.label}</span><strong>${money.format(saldo(client))}</strong></div>
    </button>
  `;
}

function renderPaymentMini(mov) {
  return `
    <div class="movement">
      <span>${dateFmt.format(parseDate(mov.fecha))}</span>
      <div><strong>${esc(mov.client.nombre)}</strong><span>${esc(displayMethod(mov.metodo || "Pago"))} - ${esc(mov.concepto)}</span></div>
      <div class="amount pay">${money.format(Math.abs(num(mov.monto)))}</div>
    </div>
  `;
}

function renderClientsView() {
  const rows = visibleClients();
  const current = activeClient();
  return `
    <section class="split client-workspace">
      <div class="card client-list-card">
        <div class="card-head"><h3>Cartera</h3><span class="badge info">${rows.length}</span></div>
        <div class="card-body">
          <label>Buscar
            <input id="searchInput" value="${esc(state.query)}" placeholder="Nombre, folio, teléfono o referencia" />
          </label>
          <div class="toolbar" style="margin:10px 0;">
            ${filterButton("all", "Todo")}
            ${filterButton("active", "Al corriente")}
            ${filterButton("late", "Atrasados")}
            ${filterButton("paid", "Liquidados")}
          </div>
          <div class="client-list">
            ${rows.length ? rows.map(renderClientButton).join("") : `<p>No hay clientes con ese filtro.</p>`}
          </div>
        </div>
      </div>
      <div class="card client-detail-card">
        ${current ? renderClientDetail(current) : `<div class="detail-empty"><div><h3>Sin cliente seleccionado</h3><p>Agrega o selecciona un crédito para trabajar.</p></div></div>`}
      </div>
    </section>
  `;
}

function filterButton(filter, label) {
  return `<button class="btn ${state.filter === filter ? "soft" : ""}" data-filter="${filter}">${label}</button>`;
}

function renderClientButton(client) {
  const st = statusOf(client);
  const rating = paymentRatingInfo(client);
  return `
    <button class="client-row ${client.id === state.selectedId ? "active" : ""}" data-select="${client.id}">
      <strong>${icon("user")} ${esc(client.nombre)}</strong>
      <span>${icon("cards")} ${esc(client.folio)} - ${esc(accountSummary(client))}</span>
      <div class="money"><span><span class="badge ${st.badge}">${st.label}</span> <span class="badge ${rating.badge}">${rating.label}</span></span><strong>${money.format(saldo(client))}</strong></div>
    </button>
  `;
}

function infoBox(label, value, iconName, tone = "") {
  return `<div class="info-box ${tone}"><span class="info-icon">${icon(iconName)}</span><span>${esc(label)}</span><strong>${value}</strong></div>`;
}

function renderIneCard(client) {
  return `
    <div class="card ine-card">
      <div class="card-head"><h3>${icon("idCard")} Foto de INE</h3><span class="badge ${client.ineFoto ? "ok" : "pending"}">${client.ineFoto ? "Capturada" : "Pendiente"}</span></div>
      <div class="card-body">
        ${client.ineFoto
          ? `<img class="ine-photo" src="${esc(client.ineFoto)}" alt="INE de ${esc(client.nombre)}">`
          : `<div class="ine-empty">${icon("camera")}<span>Agrega la foto desde Editar cliente.</span></div>`}
      </div>
    </div>
  `;
}

function renderClientQuickPanel(client) {
  const phoneReady = !!normalizePhone(client.telefono);
  const last = lastPaymentEntry(client);
  const rating = paymentRatingInfo(client);
  return `
    <div class="card quick-panel">
      <div class="card-head"><h3>Expediente rapido</h3><span class="badge ${rating.badge}">${icon(rating.icon)} ${rating.label}</span></div>
      <div class="card-body">
        <div class="statement-summary">
          <span>${icon("user")}</span>
          <div>
            <strong>${esc(client.nombre)}</strong>
            <small>${esc(accountSummary(client))}</small>
            <b>${money.format(saldo(client))}</b>
          </div>
        </div>
        <div class="quick-stats">
          <div><span>Abono sugerido</span><strong>${money.format(nextSuggestedAmount(client))}</strong></div>
          <div><span>Próximo pago</span><strong>${dateFmt.format(parseDate(nextPaymentDate(client)))}</strong></div>
          <div><span>Último abono</span><strong>${last ? money.format(Math.abs(num(last.monto))) : "Pendiente"}</strong></div>
        </div>
        <div class="quick-actions">
          <button class="btn ${phoneReady ? "" : "disabled"}" data-action="call-client" data-id="${client.id}">${icon("phone")} Llamar</button>
          <button class="btn whatsapp" data-action="reminder" data-id="${client.id}">${icon("whatsapp")} WhatsApp</button>
          <button class="btn whatsapp" data-action="statement" data-id="${client.id}">${icon("statement")} Estado</button>
          <button class="btn" data-action="copy-statement" data-id="${client.id}">${icon("copy")} Copiar estado</button>
          <button class="btn" data-action="ticket" data-id="${client.id}">${icon("receipt")} Ticket</button>
          <button class="btn soft" data-action="edit-client" data-id="${client.id}">${icon("edit")} Editar</button>
          <button class="btn danger" data-action="delete-client" data-id="${client.id}">${icon("trash")} Eliminar cliente</button>
        </div>
      </div>
    </div>
  `;
}

function renderFollowUps(client) {
  const rows = [...(client.seguimientos || [])].sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha)).slice(0, 4);
  return `
    <div class="card">
      <div class="card-head"><h3>Bitácora de visita</h3><span class="badge info">${rows.length}</span></div>
      <div class="card-body">
        <form id="followForm" data-client="${client.id}" class="form-grid">
          <label>Resultado
            <select name="result">
              <option>Promesa de pago</option>
              <option>Visitado sin pago</option>
              <option>No localizado</option>
              <option>Requiere llamada</option>
            </select>
          </label>
          <label>Promesa para<input name="promiseDate" type="date" value="${addDays(today(), 1)}" /></label>
          <label class="full">Nota<input name="note" placeholder="Ej. pagara el viernes, cambio domicilio..." /></label>
          <button class="btn soft full" type="submit">${icon("note")} Guardar seguimiento</button>
        </form>
        <div class="follow-list">
          ${rows.length ? rows.map((row) => `
            <div class="follow-item">
              <strong>${esc(row.resultado)}</strong>
              <span>${dateFmt.format(parseDate(row.fecha))}${row.promesaFecha ? ` - Promesa ${dateFmt.format(parseDate(row.promesaFecha))}` : ""}</span>
              ${row.nota ? `<small>${esc(row.nota)}</small>` : ""}
            </div>
          `).join("") : `<p class="muted">Sin seguimientos guardados.</p>`}
        </div>
      </div>
    </div>
  `;
}

function renderClientDetail(client) {
  const st = statusOf(client);
  const rating = paymentRatingInfo(client);
  const total = cargos(client);
  const paid = abonos(client);
  const balance = saldo(client);
  return `
    <div class="detail-title">
      <div>
        <h3>${esc(client.nombre)}</h3>
        <p>${esc(client.folio)} - ${esc(client.telefono || "Sin teléfono")} - ${esc(client.direccion || "Sin dirección")}</p>
      </div>
      <div class="detail-title-actions">
        <div class="detail-badges"><span class="badge ${st.badge}">${st.label}</span><span class="badge ${rating.badge}">${rating.label}</span></div>
        <button class="btn soft" data-action="edit-client" data-id="${client.id}">${icon("edit")} Editar datos</button>
      </div>
    </div>
    <div class="detail-content">
      <div class="grid">
        <div class="info-grid">
          ${infoBox("Saldo", money.format(balance), "wallet", "warning")}
          ${infoBox("Abonado", money.format(paid), "cash", "ok")}
          ${infoBox("Abono semanal", money.format(num(client.credito.abonoSemanal)), "calendar", "info")}
          ${infoBox("Cuenta", esc(accountSummary(client)), "cards")}
          ${infoBox("Crédito", money.format(total), "coin")}
          ${infoBox("Próximo pago", dateFmt.format(parseDate(nextPaymentDate(client))), "clock", statusOf(client).type === "late" ? "danger" : "")}
        </div>
        <div class="card">
          <div class="card-head"><h3>Avance</h3><span>${progressOf(client).toFixed(1)}%</span></div>
          <div class="card-body"><div class="progress"><div style="width:${progressOf(client)}%"></div></div></div>
        </div>
        ${renderIneCard(client)}
        <div class="card">
          <div class="card-head"><h3>Movimientos</h3></div>
          <div class="card-body">${client.movimientos.length ? [...client.movimientos].sort((a,b)=>parseDate(b.fecha)-parseDate(a.fecha)).map(renderMovement).join("") : "<p>Sin movimientos.</p>"}</div>
        </div>
      </div>
      <aside class="forms">
        ${renderClientQuickPanel(client)}
        <form class="card" id="paymentForm" data-client="${client.id}">
          <div class="card-head"><h3>Registrar abono</h3></div>
          <div class="card-body form-grid">
            <label>Monto<input name="amount" type="number" min="0" step="0.01" value="${num(client.credito.abonoSemanal) || balance}" required /></label>
            <label>Fecha<input name="date" type="date" value="${today()}" required /></label>
            <label>Método<select name="method"><option>Efectivo</option><option>Transferencia</option><option>Depósito</option><option>Otro</option></select></label>
            <label>Concepto<input name="concept" value="Abono semanal" required /></label>
            <div class="amount-chips full">
              <button type="button" data-action="fill-amount" data-amount="${Math.min(balance, num(client.credito.abonoSemanal) || balance)}">Abono ${money.format(Math.min(balance, num(client.credito.abonoSemanal) || balance))}</button>
              <button type="button" data-action="fill-amount" data-amount="${balance}">Liquidar ${money.format(balance)}</button>
            </div>
            <button class="btn primary full" type="submit">${icon("save")} Aplicar abono</button>
          </div>
        </form>
        <form class="card" id="chargeForm" data-client="${client.id}">
          <div class="card-head"><h3>Nuevo cargo / compra</h3></div>
          <div class="card-body form-grid">
            <label>Artículo vendido<select name="itemId"><option value="">Sin artículo</option>${items().map((item) => `<option value="${item.id}">${esc(item.nombre)} (${num(item.cantidad)} disp.)</option>`).join("")}</select></label>
            <label>Cantidad<input name="quantity" type="number" min="1" step="1" value="1" /></label>
            <label>Monto<input name="amount" type="number" min="0" step="0.01" required /></label>
            <label>Fecha<input name="date" type="date" value="${today()}" required /></label>
            <label class="full">Concepto<input name="concept" placeholder="Renovación, compra, cargo extra" required /></label>
            <button class="btn soft full" type="submit">${icon("plus")} Agregar cargo</button>
          </div>
        </form>
        <div class="card">
          <div class="card-head"><h3>Comprobantes</h3></div>
          <div class="card-body grid">
            <button class="btn" data-action="ticket" data-id="${client.id}">${icon("receipt")} Ticket WhatsApp</button>
            <button class="btn" data-action="print" data-id="${client.id}">${icon("print")} Imprimir ticket</button>
            <button class="btn soft" data-action="edit-client" data-id="${client.id}">${icon("edit")} Editar cliente</button>
            <button class="btn danger" data-action="delete-client" data-id="${client.id}">${icon("trash")} Eliminar cliente</button>
          </div>
        </div>
        ${renderFollowUps(client)}
      </aside>
    </div>
  `;
}

function renderMovement(mov) {
  const isPay = num(mov.monto) < 0;
  return `
    <div class="movement">
      <span>${dateFmt.format(parseDate(mov.fecha))}</span>
      <div><strong>${esc(mov.concepto)}</strong><span>${esc(displayMethod(mov.metodo || mov.tipo || ""))}</span></div>
      <div class="movement-side">
        <div class="amount ${isPay ? "pay" : "charge"}">${isPay ? "-" : "+"}${money.format(Math.abs(num(mov.monto)))}</div>
        ${isPay ? `<button class="mini-action" data-action="edit-payment" data-id="${mov.id}">${icon("edit")} Editar</button>` : ""}
      </div>
    </div>
  `;
}

function renderPaymentsView() {
  const allRows = allPayments();
  const rows = filteredPayments();
  const total = rows.reduce((sum, mov) => sum + Math.abs(num(mov.monto)), 0);
  const average = rows.length ? total / rows.length : 0;
  const methods = [...new Set(allRows.map((mov) => displayMethod(mov.metodo || "Efectivo")))].sort((a, b) => a.localeCompare(b));
  return `
    <section class="grid payments-page">
      <div class="card payment-filter-card">
        <div class="card-head">
          <h3>${icon("search")} Buscar abonos</h3>
          <button class="btn soft" data-action="clear-payment-filters">${icon("rotate")} Limpiar</button>
        </div>
        <div class="card-body payment-filter-body">
          <label class="full">Buscar por cliente, folio, cuenta, concepto o monto
            <input id="paymentSearchInput" value="${esc(state.paymentQuery)}" placeholder="Ej. Maria, CR-001, efectivo, 500..." />
          </label>
          <label>Periodo
            <select id="paymentPeriod">
              <option value="all" ${state.paymentPeriod === "all" ? "selected" : ""}>Todos</option>
              <option value="today" ${state.paymentPeriod === "today" ? "selected" : ""}>Hoy</option>
              <option value="week" ${state.paymentPeriod === "week" ? "selected" : ""}>Últimos 7 días</option>
              <option value="month" ${state.paymentPeriod === "month" ? "selected" : ""}>Este mes</option>
            </select>
          </label>
          <label>Método
            <select id="paymentMethod">
              <option value="all" ${state.paymentMethod === "all" ? "selected" : ""}>Todos</option>
              ${methods.map((method) => `<option value="${esc(method)}" ${state.paymentMethod === method ? "selected" : ""}>${esc(method)}</option>`).join("")}
            </select>
          </label>
          <div class="payment-filter-summary">
            <div><span>Abonos filtrados</span><strong>${rows.length}</strong><small>de ${allRows.length} registros</small></div>
            <div><span>Total filtrado</span><strong>${money.format(total)}</strong><small>ingresos localizados</small></div>
            <div><span>Promedio</span><strong>${money.format(average)}</strong><small>por abono</small></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Historial de abonos</h3><span class="badge info">${rows.length}/${allRows.length}</span></div>
        <div class="payment-cards">
          ${rows.length ? rows.map(renderPaymentCard).join("") : `<p class="muted">No hay abonos con esos filtros.</p>`}
        </div>
        <div class="table-wrap payments-table">
          <table>
            <thead><tr><th>Fecha</th><th>Cliente</th><th>Cuenta</th><th>Método</th><th>Concepto</th><th class="right">Monto</th><th class="right">Acciones</th></tr></thead>
            <tbody>
              ${rows.length ? rows.map((mov) => `
                <tr>
                  <td>${dateFmt.format(parseDate(mov.fecha))}</td>
                  <td>${esc(mov.client.nombre)}<br><small>${esc(mov.client.folio)}</small></td>
                  <td>${esc(accountSummary(mov.client))}</td>
                  <td>${esc(displayMethod(mov.metodo || "-"))}</td>
                  <td>${esc(mov.concepto)}</td>
                  <td class="right"><strong>${money.format(Math.abs(num(mov.monto)))}</strong></td>
                  <td class="right">
                    <div class="row-actions">
                      <button class="btn icon soft" data-action="view-payment" data-id="${mov.id}" title="Ver detalle">${icon("eye")}</button>
                      <button class="btn icon soft" data-action="edit-payment" data-id="${mov.id}" title="Editar abono">${icon("edit")}</button>
                      <button class="btn icon" data-action="payment-ticket" data-id="${mov.id}" title="Ver ticket">${icon("receipt")}</button>
                    </div>
                  </td>
                </tr>
              `).join("") : `<tr><td colspan="7">No hay abonos con esos filtros.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderPaymentCard(mov) {
  return `
    <article class="payment-card">
      <div class="payment-card-main">
        <strong>${esc(mov.client.nombre)}</strong>
        <span>${esc(mov.client.folio)} - ${esc(accountSummary(mov.client))}</span>
        <small>${dateFmt.format(parseDate(mov.fecha))} - ${esc(displayMethod(mov.metodo || "Efectivo"))} - ${esc(mov.concepto)}</small>
      </div>
      <b>${money.format(Math.abs(num(mov.monto)))}</b>
      <div class="payment-card-actions">
        <button class="btn soft" data-action="view-payment" data-id="${mov.id}">${icon("eye")} Ver</button>
        <button class="btn soft" data-action="edit-payment" data-id="${mov.id}">${icon("edit")} Editar</button>
        <button class="btn" data-action="payment-ticket" data-id="${mov.id}">${icon("receipt")} Ticket</button>
      </div>
    </article>
  `;
}

function renderCardsView() {
  const rows = clients();
  return `
    <div class="card">
      <div class="card-head"><h3>${icon("cards")} Cuentas y créditos</h3><span class="badge info">${rows.length}</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Cliente</th><th>Cuenta/Entidad</th><th>Referencia</th><th>Crédito</th><th>Abonado</th><th>Saldo</th><th>Avance</th></tr></thead>
          <tbody>
            ${rows.map((client) => `
              <tr>
                <td>${esc(client.nombre)}<br><small>${esc(client.folio)}</small></td>
                <td>${esc(client.tarjeta.institucion || client.tarjeta.alias || "-")}</td>
                <td>${esc(accountShort(client))}</td>
                <td>${money.format(cargos(client))}</td>
                <td>${money.format(abonos(client))}</td>
                <td><strong>${money.format(saldo(client))}</strong></td>
                <td><div class="progress"><div style="width:${progressOf(client)}%"></div></div></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderInventoryView() {
  const rows = items().sort((a, b) => a.nombre.localeCompare(b.nombre));
  const inv = inventoryStats();
  const editing = items().find((item) => item.id === state.editItemId) || null;
  const draft = editing || { sku: "", nombre: "", categoria: "General", cantidad: 1, minCantidad: 1, costo: 0, precio: 0, notas: "" };
  return `
    <section class="grid inventory-page">
      <div class="grid metrics">
        ${metric("Artículos", inv.count, "productos registrados", "boxes", "info")}
        ${metric("Unidades", inv.units, "existencias totales", "inventory", "ok")}
        ${metric("Valor venta", money.format(inv.value), "cantidad valuada", "wallet", "warning")}
        ${metric("Cantidad baja", inv.low, "requieren compra", "alert", inv.low ? "danger" : "ok")}
      </div>
      <form class="card ${editing ? "editing-card" : ""}" id="itemForm" data-id="${editing ? editing.id : ""}">
        <div class="card-head">
          <h3>${icon(editing ? "edit" : "plus")} ${editing ? "Editar artículo" : "Agregar artículo"}</h3>
          <span class="badge ${editing ? "pending" : "info"}">${editing ? esc(editing.sku || "Edición") : "Cantidad"}</span>
        </div>
        <div class="card-body form-grid">
          <label>SKU / Código<input name="sku" value="${esc(draft.sku)}" placeholder="ART-001" /></label>
          <label>Artículo<input name="nombre" value="${esc(draft.nombre)}" placeholder="Ej. Celular, bocina, colchón..." required /></label>
          <label>Categoría<input name="categoria" value="${esc(draft.categoria || "General")}" placeholder="General" /></label>
          <label>Cantidad<input name="cantidad" type="number" step="1" min="0" value="${num(draft.cantidad)}" required /></label>
          <label>Minimo<input name="minCantidad" type="number" step="1" min="0" value="${num(draft.minCantidad)}" /></label>
          <label>Precio venta<input name="precio" type="number" step="0.01" min="0" value="${num(draft.precio)}" required /></label>
          <label>Costo<input name="costo" type="number" step="0.01" min="0" value="${num(draft.costo)}" /></label>
          <label class="full">Notas<input name="notas" value="${esc(draft.notas)}" placeholder="Color, modelo, proveedor..." /></label>
          <div class="toolbar full item-form-actions">
            ${editing ? `<button class="btn" type="button" data-action="cancel-item-edit">${icon("close")} Cancelar</button>` : ""}
            <button class="btn primary" type="submit">${icon("save")} ${editing ? "Actualizar artículo" : "Guardar artículo"}</button>
          </div>
        </div>
      </form>
      <div class="card">
        <div class="card-head"><h3>${icon("inventory")} Artículos disponibles</h3><span class="badge ${inv.low ? "late" : "ok"}">${inv.low} bajos</span></div>
        <div class="inventory-cards">
          ${rows.length ? rows.map(renderItemCard).join("") : `<p class="muted">Aún no hay artículos registrados.</p>`}
        </div>
        <div class="table-wrap inventory-table">
          <table>
            <thead><tr><th>Artículo</th><th>Categoría</th><th>SKU</th><th>Cantidad</th><th>Precio</th><th>Valor</th><th>Acciones</th></tr></thead>
            <tbody>
              ${rows.length ? rows.map(renderItemRow).join("") : `<tr><td colspan="7">Aún no hay artículos registrados.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderItemCard(item) {
  const low = num(item.cantidad) <= num(item.minCantidad);
  const cantidadTone = low ? "late" : "ok";
  return `
    <article class="item-card ${low ? "cantidad-low-card" : ""}">
      <div class="item-list-top">
        <div class="item-list-main">
          <strong>${esc(item.nombre)}</strong>
          <span>${esc(item.sku || "Sin SKU")} - ${esc(item.categoria || "General")}</span>
          ${item.notas ? `<p>${esc(item.notas)}</p>` : ""}
        </div>
        <div class="item-list-side">
          <span class="badge ${cantidadTone}">${num(item.cantidad)} pzas</span>
          <b>${money.format(num(item.precio))}</b>
          <small>${money.format(num(item.cantidad) * num(item.precio))}</small>
        </div>
      </div>
      <div class="cantidad-actions item-list-actions">
        <button class="btn icon" data-action="adjust-cantidad" data-id="${item.id}" data-delta="-1" title="Restar cantidad">-</button>
        <button class="btn icon" data-action="adjust-cantidad" data-id="${item.id}" data-delta="1" title="Sumar cantidad">+</button>
        <button class="btn soft" data-action="edit-item" data-id="${item.id}">${icon("edit")} Editar</button>
        <button class="btn danger" data-action="delete-item" data-id="${item.id}">${icon("trash")} Eliminar</button>
      </div>
    </article>
  `;
}

function renderItemRow(item) {
  const low = num(item.cantidad) <= num(item.minCantidad);
  return `
    <tr class="${low ? "cantidad-low" : ""}">
      <td><strong>${esc(item.nombre)}</strong><br><small>${esc(item.notas || "Sin notas")}</small></td>
      <td>${esc(item.categoria || "General")}</td>
      <td>${esc(item.sku || "-")}</td>
      <td><span class="badge ${low ? "late" : "ok"}">${num(item.cantidad)}</span> <small>min ${num(item.minCantidad)}</small></td>
      <td>${money.format(num(item.precio))}</td>
      <td><strong>${money.format(num(item.cantidad) * num(item.precio))}</strong></td>
      <td>
        <div class="cantidad-actions">
          <button class="btn icon" data-action="adjust-cantidad" data-id="${item.id}" data-delta="-1" title="Restar cantidad">-</button>
          <button class="btn icon" data-action="adjust-cantidad" data-id="${item.id}" data-delta="1" title="Sumar cantidad">+</button>
          <button class="btn icon soft" data-action="edit-item" data-id="${item.id}" title="Editar">${icon("edit")}</button>
          <button class="btn icon danger" data-action="delete-item" data-id="${item.id}" title="Eliminar">${icon("trash")}</button>
        </div>
      </td>
    </tr>
  `;
}

function renderSettingsView() {
  return `
    <section class="grid settings-grid">
      <form class="card" id="settingsForm">
        <div class="card-head"><h3>Perfil del cobrador</h3></div>
        <div class="card-body form-grid">
          <label>Nombre del sistema<input name="appName" value="${esc(state.db.settings.appName)}" required /></label>
          <label>Nombre del cobrador<input name="collectorName" value="${esc(state.db.settings.collectorName)}" required /></label>
          <label>Teléfono del cobrador<input name="collectorPhone" value="${esc(state.db.settings.collectorPhone)}" /></label>
          <label>PIN<input name="collectorPin" value="${esc(state.db.settings.collectorPin)}" inputmode="numeric" required /></label>
          <label>Meta diaria<input name="dailyGoal" type="number" step="0.01" value="${num(state.db.settings.dailyGoal)}" /></label>
          <label>Meta semanal<input name="weeklyGoal" type="number" step="0.01" value="${num(state.db.settings.weeklyGoal)}" /></label>
          <label class="full">Mensaje del ticket<textarea name="receiptMessage" rows="3">${esc(state.db.settings.receiptMessage)}</textarea></label>
          <button class="btn primary full" type="submit">${icon("save")} Guardar ajustes</button>
        </div>
      </form>
      <div class="card">
        <div class="card-head"><h3>Datos</h3></div>
        <div class="card-body grid">
          <button class="btn soft" data-action="backup">${icon("download")} Descargar respaldo</button>
          <label>Importar respaldo<input id="importInput" type="file" accept="application/json" /></label>
          <button class="btn danger" data-action="reset-demo">${icon("rotate")} Restaurar demo</button>
          <p style="color:var(--muted);font-weight:700;">Los datos se guardan en el backend local y también queda una copia de emergencia en el navegador.</p>
        </div>
      </div>
    </section>
  `;
}

function renderModal() {
  if (!state.modal) return "";
  if (state.modal.type === "client") return renderClientModal(state.modal.id ? clients().find((c) => c.id === state.modal.id) : null);
  if (state.modal.type === "payment") return renderPaymentModal(state.modal.id, state.modal.mode || "view");
  return "";
}

function renderPaymentModal(paymentId, mode = "view") {
  const found = findPayment(paymentId);
  if (!found) return "";
  const { client, movement } = found;
  const amount = Math.abs(num(movement.monto));
  const balances = paymentBalanceContext(client, movement);
  const isEdit = mode === "edit";
  const methods = ["Efectivo", "Transferencia", "Depósito", "Otro"];
  const selectedMethod = displayMethod(movement.metodo || "Efectivo");
  return `
    <div class="modal-backdrop open">
      <div class="modal payment-modal">
        <header>
          <h3>${isEdit ? "Editar abono" : "Detalle del abono"}</h3>
          <button class="btn icon" data-action="close-modal" title="Cerrar" aria-label="Cerrar">${icon("close")}</button>
        </header>
        <div class="modal-body payment-modal-body">
          <section class="payment-ticket-panel">
            <div class="statement-summary">
              <span>${icon("receipt")}</span>
              <div>
                <strong>${esc(client.nombre)}</strong>
                <small>${esc(client.folio)} - ${esc(accountSummary(client))}</small>
                <b>${money.format(amount)}</b>
              </div>
            </div>
            <div class="quick-stats">
              <div><span>Saldo antes del abono</span><strong>${money.format(balances.before)}</strong></div>
              <div><span>Saldo después del abono</span><strong>${money.format(balances.after)}</strong></div>
              <div><span>Saldo actual de cuenta</span><strong>${money.format(saldo(client))}</strong></div>
            </div>
            <pre class="ticket-preview">${esc(paymentTicketText(client, movement))}</pre>
            <div class="payment-actions">
              <button class="btn" data-action="print-payment-ticket" data-id="${movement.id}">${icon("print")} Imprimir</button>
              <button class="btn whatsapp" data-action="whatsapp-payment-ticket" data-id="${movement.id}">${icon("whatsapp")} WhatsApp</button>
              <button class="btn soft" data-action="copy-payment-ticket" data-id="${movement.id}">${icon("copy")} Copiar</button>
              <button class="btn soft" data-action="open-payment-client" data-id="${movement.id}">${icon("user")} Cliente</button>
            </div>
          </section>
          <section class="payment-edit-panel">
            ${isEdit ? `
              <form id="paymentEditForm" data-payment="${movement.id}">
                <div class="form-grid">
                  <label>Monto<input name="amount" type="number" min="0.01" step="0.01" value="${amount}" required /></label>
                  <label>Fecha<input name="date" type="date" value="${esc(movement.fecha || today())}" required /></label>
                  <label>Método<select name="method">${methods.map((method) => `<option ${selectedMethod === method ? "selected" : ""}>${method}</option>`).join("")}</select></label>
                  <label>Concepto<input name="concept" value="${esc(movement.concepto || "Abono")}" required /></label>
                </div>
                <div class="toolbar payment-edit-actions">
                  <button class="btn" type="button" data-action="view-payment" data-id="${movement.id}">${icon("close")} Cancelar</button>
                  <button class="btn primary" type="submit">${icon("save")} Guardar cambios</button>
                </div>
              </form>
            ` : `
              <div class="payment-readonly">
                <div><span>Fecha</span><strong>${dateFmt.format(parseDate(movement.fecha))}</strong></div>
                <div><span>Método</span><strong>${esc(selectedMethod)}</strong></div>
                <div><span>Concepto</span><strong>${esc(movement.concepto)}</strong></div>
                <div><span>ID movimiento</span><strong>${esc(movement.id)}</strong></div>
              </div>
              <button class="btn primary full" data-action="edit-payment" data-id="${movement.id}">${icon("edit")} Editar este abono</button>
            `}
          </section>
        </div>
      </div>
    </div>
  `;
}

function renderClientModal(client) {
  const editing = !!client;
  const c = client || {
    folio: nextFolio(),
    nombre: "",
    telefono: "",
    direccion: "",
    referencia: "",
    paymentRating: "normal",
    tarjeta: {},
    credito: { concepto: "Crédito de cobranza", monto: 0, abonoSemanal: 0, fechaInicio: today(), proximoPago: today() },
    ineFoto: "",
    notas: ""
  };
  return `
    <div class="modal-backdrop open">
      <div class="modal">
        <header><h3>${editing ? "Editar cliente" : "Nuevo cliente / crédito"}</h3><button class="btn icon" data-action="close-modal" title="Cerrar" aria-label="Cerrar">${icon("close")}</button></header>
        <form id="clientForm" data-id="${editing ? c.id : ""}">
          <div class="form-grid">
            <label>Folio<input name="folio" value="${esc(c.folio)}" required /></label>
            <label>Nombre<input name="nombre" value="${esc(c.nombre)}" required /></label>
            <label>Teléfono WhatsApp<input name="telefono" value="${esc(c.telefono)}" /></label>
            <label>Dirección<input name="direccion" value="${esc(c.direccion)}" /></label>
            <label>Producto / Cuenta<input name="institucion" value="${esc(c.tarjeta.institucion || "")}" placeholder="Ej. Celular, mueblería, crédito personal..." /></label>
            <label>Alias de cuenta<input name="alias" value="${esc(c.tarjeta.alias || "")}" /></label>
            <label>Cliente para pagar
              <select name="paymentRating">
                <option value="normal" ${(c.paymentRating || "normal") === "normal" ? "selected" : ""}>Sin calificar</option>
                <option value="good" ${c.paymentRating === "good" ? "selected" : ""}>Bueno para pagar</option>
                <option value="bad" ${c.paymentRating === "bad" ? "selected" : ""}>Malo para pagar</option>
              </select>
            </label>
            <label>Concepto crédito<input name="concepto" value="${esc(c.credito.concepto || "Crédito de cobranza")}" /></label>
            <label>Monto crédito<input name="monto" type="number" step="0.01" min="0" value="${num(c.credito.monto)}" required /></label>
            <label>Abono semanal<input name="abonoSemanal" type="number" step="0.01" min="0" value="${num(c.credito.abonoSemanal)}" required /></label>
            <label>Fecha inicio<input name="fechaInicio" type="date" value="${esc(c.credito.fechaInicio || today())}" /></label>
            <label>Próximo pago<input name="proximoPago" type="date" value="${esc(c.credito.proximoPago || today())}" /></label>
            <label class="full">INE<input name="ineFile" type="file" accept="image/*" capture="environment" /></label>
            <input type="hidden" name="ineFoto" value="${esc(c.ineFoto || "")}" />
            <div class="full ine-upload-preview" data-ine-preview>
              ${inePreviewMarkup(c.ineFoto || "")}
            </div>
            <label class="full">Notas<textarea name="notas" rows="3">${esc(c.notas || "")}</textarea></label>
          </div>
          <div class="toolbar" style="margin-top:16px;">
            <button class="btn" type="button" data-action="close-modal">Cancelar</button>
            <button class="btn primary" type="submit">${icon("save")} Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function showToast(message, type = "success") {
  const wrap = $("#toastWrap");
  if (!wrap) return;
  const div = document.createElement("div");
  div.className = `toast ${type}`;
  div.textContent = message;
  wrap.appendChild(div);
  setTimeout(() => div.remove(), 3600);
}

function inePreviewMarkup(src = "") {
  return src
    ? `<div class="ine-preview-photo"><img src="${esc(src)}" alt="Foto de INE"><button class="btn danger ine-remove-btn" type="button" data-action="remove-ine-photo">${icon("trash")} Borrar foto</button></div>`
    : `<span>${icon("camera")} Sin foto de INE capturada</span>`;
}

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.id === "loginForm") {
    if (firebaseCloud.ready && firebaseCloud.authMode === "password") {
      const email = $("#emailInput").value.trim();
      const password = $("#passwordInput").value;
      if (!email || !password) return showToast("Captura correo y contraseña.", "warning");
      try {
        await firebaseCloud.signInWithEmailAndPassword(firebaseCloud.auth, email, password);
        state.session = { role: "collector", email, at: new Date().toISOString() };
        localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
        await loadDB();
        state.view = "panel";
        render();
      } catch (error) {
        console.error(error);
        showToast("Correo o contraseña incorrectos.", "error");
      }
      return;
    }

    const pin = $("#pinInput").value.trim();
    if (pin !== state.db.settings.collectorPin) return showToast("PIN incorrecto.", "error");
    state.session = { role: "collector", at: new Date().toISOString() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
    state.view = "panel";
    render();
    return;
  }
  if (form.id === "paymentForm") return submitPayment(form);
  if (form.id === "chargeForm") return submitCharge(form);
  if (form.id === "clientForm") return submitClient(form);
  if (form.id === "settingsForm") return submitSettings(form);
  if (form.id === "followForm") return submitFollowUp(form);
  if (form.id === "expenseForm") return submitExpense(form);
  if (form.id === "itemForm") return submitItem(form);
  if (form.id === "paymentEditForm") return submitPaymentEdit(form);
});

document.addEventListener("click", async (event) => {
  const view = event.target.closest("[data-view]")?.dataset.view;
  if (view) {
    state.view = view;
    render();
    resetScroll();
    return;
  }
  const select = event.target.closest("[data-select]")?.dataset.select;
  if (select) {
    state.selectedId = select;
    state.view = "clients";
    render();
    resetScroll();
    return;
  }
  const filter = event.target.closest("[data-filter]")?.dataset.filter;
  if (filter) {
    state.filter = filter;
    render();
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  const id = event.target.closest("[data-id]")?.dataset.id;
  if (!action) return;
  const client = id ? clients().find((c) => c.id === id) : activeClient();
  if (action === "logout") {
    if (firebaseCloud.ready && firebaseCloud.authMode === "password") {
      try {
        await firebaseCloud.signOut(firebaseCloud.auth);
      } catch (error) {
        console.warn("No se pudo cerrar Firebase Auth", error);
      }
    }
    state.session = null;
    localStorage.removeItem(SESSION_KEY);
    render();
    return;
  }
  if (action === "new-client") {
    state.modal = { type: "client" };
    render();
  }
  if (action === "edit-client" && client) {
    state.modal = { type: "client", id: client.id };
    render();
  }
  if (action === "delete-client" && client) return deleteClient(client.id);
  if (action === "remove-ine-photo") return removeInePhoto(event.target.closest("form"));
  if (action === "close-modal") {
    state.modal = null;
    render();
  }
  if (action === "clear-payment-filters") {
    state.paymentQuery = "";
    state.paymentPeriod = "all";
    state.paymentMethod = "all";
    render();
    return;
  }
  if (action === "view-payment" || action === "payment-ticket") {
    if (!findPayment(id)) return showToast("Abono no encontrado.", "error");
    state.modal = { type: "payment", id, mode: "view" };
    render();
    return;
  }
  if (action === "edit-payment") {
    if (!findPayment(id)) return showToast("Abono no encontrado.", "error");
    state.modal = { type: "payment", id, mode: "edit" };
    render();
    return;
  }
  if (action === "print-payment-ticket") {
    const found = findPayment(id);
    if (!found) return showToast("Abono no encontrado.", "error");
    printPaymentTicket(found.client, found.movement);
    return;
  }
  if (action === "copy-payment-ticket") {
    const found = findPayment(id);
    if (!found) return showToast("Abono no encontrado.", "error");
    return copyPaymentTicket(found.client, found.movement);
  }
  if (action === "whatsapp-payment-ticket") {
    const found = findPayment(id);
    if (!found) return showToast("Abono no encontrado.", "error");
    sendPaymentTicketWhatsApp(found.client, found.movement);
    return;
  }
  if (action === "open-payment-client") {
    const found = findPayment(id);
    if (!found) return showToast("Abono no encontrado.", "error");
    state.selectedId = found.client.id;
    state.view = "clients";
    state.modal = null;
    render();
    resetScroll();
    return;
  }
  if (action === "quick-pay") {
    if (!clients().length) {
      state.modal = { type: "client" };
      render();
      return showToast("Primero captura un cliente.", "warning");
    }
    const target = priorityClients(1)[0] || clients().find((row) => saldo(row) > 0) || clients()[0];
    state.selectedId = target.id;
    state.view = "clients";
    render();
    resetScroll();
    setTimeout(() => $("#paymentForm input[name='amount']")?.focus(), 120);
    showToast(`${target.nombre}: listo para cobrar ${money.format(saldo(target))}`, "success");
    return;
  }
  if (action === "fill-amount") {
    const amount = event.target.closest("[data-amount]")?.dataset.amount;
    const input = $("#paymentForm input[name='amount']");
    if (input && amount) {
      input.value = amount;
      input.focus();
    }
    return;
  }
  if (action === "call-client" && client) return callClient(client);
  if (action === "copy-statement" && client) return copyStatementText(client);
  if (action === "reminder" && client) return sendClientWhatsApp(client, "reminder");
  if (action === "ticket" && client) return sendClientWhatsApp(client, "ticket");
  if (action === "statement" && client) return sendClientWhatsApp(client, "statement");
  if (action === "print" && client) printTicket(client);
  if (action === "edit-item") {
    state.editItemId = id;
    state.view = "inventory";
    render();
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 0);
    return;
  }
  if (action === "cancel-item-edit") {
    state.editItemId = null;
    render();
    return;
  }
  if (action === "adjust-cantidad") return adjustCantidad(id, Number(event.target.closest("[data-delta]")?.dataset.delta || 0));
  if (action === "delete-item") return deleteItem(id);
  if (action === "export-csv") exportCSV();
  if (action === "backup") downloadBackup();
  if (action === "reset-demo") await resetDemo();
});

document.addEventListener("input", (event) => {
  if (event.target.id === "searchInput") {
    state.query = event.target.value;
    renderAndRestoreInput("searchInput", event.target.selectionStart || event.target.value.length);
  }
  if (event.target.id === "paymentSearchInput") {
    state.paymentQuery = event.target.value;
    renderAndRestoreInput("paymentSearchInput", event.target.selectionStart || event.target.value.length);
  }
});

document.addEventListener("change", async (event) => {
  if (event.target.id === "paymentPeriod") {
    state.paymentPeriod = event.target.value;
    render();
  }
  if (event.target.id === "paymentMethod") {
    state.paymentMethod = event.target.value;
    render();
  }
  if (event.target.id === "importInput" && event.target.files?.[0]) {
    await importBackup(event.target.files[0]);
  }
  if (event.target.name === "ineFile" && event.target.files?.[0]) {
    await loadInePhoto(event.target);
  }
});

async function submitFollowUp(form) {
  const client = clients().find((c) => c.id === form.dataset.client);
  if (!client) return;
  const data = new FormData(form);
  client.seguimientos = [
    {
      id: uid("seg"),
      fecha: today(),
      resultado: String(data.get("result") || "Seguimiento").trim(),
      promesaFecha: data.get("promiseDate") || "",
      nota: String(data.get("note") || "").trim()
    },
    ...(client.seguimientos || [])
  ].slice(0, 40);
  logEvent("Seguimiento guardado", `${client.nombre}: ${data.get("result")}`, client);
  await saveDB("Seguimiento guardado.");
}

async function submitExpense(form) {
  const data = new FormData(form);
  const amount = num(data.get("amount"));
  const concept = String(data.get("concept") || "").trim();
  if (!concept || amount <= 0) return showToast("Captura concepto y monto del gasto.", "warning");
  state.db.routeExpenses = [
    {
      id: uid("gasto"),
      fecha: today(),
      concepto: concept,
      monto: amount,
      creadoEn: new Date().toISOString()
    },
    ...(state.db.routeExpenses || [])
  ].slice(0, 300);
  logEvent("Gasto del turno", `${concept}: ${money.format(amount)}`);
  await saveDB("Gasto del turno guardado.");
}

async function submitItem(form) {
  const data = new FormData(form);
  const id = form.dataset.id;
  const payload = normalizeItem({
    id: id || uid("art"),
    sku: String(data.get("sku") || "").trim(),
    nombre: String(data.get("nombre") || "").trim(),
    categoria: String(data.get("categoria") || "General").trim(),
    cantidad: num(data.get("cantidad")),
    minCantidad: num(data.get("minCantidad")),
    costo: num(data.get("costo")),
    precio: num(data.get("precio")),
    notas: String(data.get("notas") || "").trim()
  });
  if (!payload.nombre) return showToast("Captura el nombre del artículo.", "warning");
  if (payload.precio <= 0) return showToast("Captura el precio de venta.", "warning");
  if (id) {
    const index = items().findIndex((item) => item.id === id);
    if (index === -1) return showToast("Artículo no encontrado.", "error");
    state.db.items[index] = payload;
    state.editItemId = null;
    logEvent("Artículo actualizado", `${payload.nombre}: cantidad ${payload.cantidad}`);
    await saveDB("Artículo actualizado.");
    return;
  }
  state.db.items = [payload, ...items()];
  state.editItemId = null;
  logEvent("Artículo agregado", `${payload.nombre}: cantidad ${payload.cantidad}`);
  form.reset();
  await saveDB("Artículo guardado.");
}

async function adjustCantidad(itemId, delta) {
  const item = items().find((row) => row.id === itemId);
  if (!item || !Number.isFinite(delta) || delta === 0) return;
  item.cantidad = Math.max(0, num(item.cantidad) + delta);
  logEvent("Cantidad ajustada", `${item.nombre}: ${delta > 0 ? "+" : ""}${delta}`);
  await saveDB("Cantidad actualizada.");
}

async function deleteItem(itemId) {
  const item = items().find((row) => row.id === itemId);
  if (!item) return;
  if (!confirm(`Eliminar artículo "${item.nombre}"?`)) return;
  state.db.items = items().filter((row) => row.id !== itemId);
  if (state.editItemId === itemId) state.editItemId = null;
  logEvent("Artículo eliminado", item.nombre);
  await saveDB("Artículo eliminado.");
}

async function deleteClient(clientId) {
  const client = clients().find((row) => row.id === clientId);
  if (!client) return showToast("Cliente no encontrado.", "error");
  const balance = saldo(client);
  const message = balance > 0
    ? `Este cliente todavÃ­a tiene saldo de ${money.format(balance)}. Â¿Eliminarlo de todos modos?`
    : `Eliminar cliente "${client.nombre}" de la cartera?`;
  if (!confirm(message)) return;
  state.db.clients = clients().filter((row) => row.id !== clientId);
  if (state.selectedId === clientId) state.selectedId = state.db.clients[0]?.id || null;
  state.modal = null;
  logEvent("Cliente eliminado", `${client.nombre}: ${balance > 0 ? money.format(balance) : "liquidado"}`, client);
  await saveDB("Cliente eliminado.");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function optimizeIneImage(file) {
  const originalDataUrl = await readFileAsDataUrl(file);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(originalDataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(originalDataUrl);
    img.src = originalDataUrl;
  });
}

async function uploadInePhoto(dataUrl, fileName = "ine.jpg") {
  let timeout = null;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(API_UPLOAD_INE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl, fileName }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No se pudo guardar la foto de INE localmente.");
    return { ...payload, provider: "local-backend" };
  } catch (localError) {
    console.warn("INE local upload fallback:", localError);
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  throw new Error("No se pudo guardar la foto de INE localmente.");
}

async function loadInePhoto(input) {
  const file = input.files?.[0];
  if (!file) return;
  const looksLikeImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name || "");
  if (!looksLikeImage) return showToast("Selecciona una imagen valida.", "warning");
  if (file.size > 12 * 1024 * 1024) return showToast("La foto original debe pesar menos de 12 MB.", "warning");
  const form = input.closest("form");
  const hidden = form?.querySelector('input[name="ineFoto"]');
  const preview = form?.querySelector("[data-ine-preview]");
  if (preview) preview.innerHTML = `<span>${icon("spinner")} Optimizando y guardando INE...</span>`;

  try {
    const optimizedDataUrl = await optimizeIneImage(file);
    let finalSrc = optimizedDataUrl;
    let uploaded = false;
    let uploadProvider = "fallback";
    try {
      const result = await uploadInePhoto(optimizedDataUrl, file.name || "ine.jpg");
      if (result.url) {
        finalSrc = result.url;
        uploaded = true;
        uploadProvider = result.provider || "local-backend";
      }
    } catch (error) {
      console.warn("INE upload fallback:", error);
    }

    if (hidden) hidden.value = finalSrc;
    if (preview) preview.innerHTML = inePreviewMarkup(finalSrc);

    const clientId = form?.dataset.id;
    const client = clientId ? clients().find((row) => row.id === clientId) : null;
    if (client) {
      client.ineFoto = finalSrc;
      logEvent("INE guardada", `${client.nombre}: foto actualizada`, client);
      await saveDB(uploaded && uploadProvider === "local-backend" ? "Foto de INE guardada localmente." : uploaded ? "Foto de INE guardada en la nube." : "Foto de INE guardada como respaldo local.");
      return;
    }

    showToast(
      uploaded && uploadProvider === "local-backend" ? "Foto de INE guardada localmente. Guarda el cliente para vincularla." : uploaded ? "Foto de INE subida. Guarda el cliente para vincularla." : "Foto lista como respaldo local.",
      uploaded ? "success" : "warning"
    );
  } catch (error) {
    console.error(error);
    if (preview) preview.innerHTML = inePreviewMarkup(hidden?.value || "");
    showToast("No se pudo procesar la foto de INE.", "error");
  }
}

async function removeInePhoto(form) {
  if (!form) return;
  const hidden = form.querySelector('input[name="ineFoto"]');
  const fileInput = form.querySelector('input[name="ineFile"]');
  const preview = form.querySelector("[data-ine-preview]");
  if (hidden) hidden.value = "";
  if (fileInput) fileInput.value = "";
  if (preview) preview.innerHTML = inePreviewMarkup("");

  const clientId = form.dataset.id;
  const client = clientId ? clients().find((row) => row.id === clientId) : null;
  if (client && client.ineFoto) {
    client.ineFoto = "";
    logEvent("INE borrada", `${client.nombre}: foto eliminada`, client);
    await saveDB("Foto de INE borrada.");
    return;
  }

  showToast("Foto de INE quitada. Guarda el cliente para confirmar.", "success");
}

async function submitPayment(form) {
  const client = clients().find((c) => c.id === form.dataset.client);
  if (!client) return;
  const data = new FormData(form);
  const amount = num(data.get("amount"));
  if (amount <= 0) return showToast("El abono debe ser mayor a cero.", "warning");
  const balance = saldo(client);
  if (balance <= 0) return showToast("La cuenta ya esta liquidada.", "warning");
  client.movimientos.push({
    id: uid("mov"),
    fecha: data.get("date") || today(),
    tipo: "abono",
    concepto: data.get("concept") || "Abono",
    monto: -Math.min(amount, balance),
    metodo: data.get("method") || "Efectivo"
  });
  refreshNextPayment(client);
  logEvent("Abono registrado", `${client.nombre}: ${money.format(Math.min(amount, balance))}`, client);
  await saveDB("Abono aplicado.");
}

async function submitPaymentEdit(form) {
  const found = findPayment(form.dataset.payment);
  if (!found) return showToast("Abono no encontrado.", "error");
  const { client, movement } = found;
  const data = new FormData(form);
  const amount = num(data.get("amount"));
  const date = data.get("date") || today();
  const concept = String(data.get("concept") || "").trim();
  const method = String(data.get("method") || "Efectivo").trim();
  const editableMax = saldo(client) + Math.abs(num(movement.monto));
  if (amount <= 0) return showToast("El monto debe ser mayor a cero.", "warning");
  if (amount > editableMax) return showToast(`El abono no puede exceder ${money.format(editableMax)}.`, "warning");
  if (!concept) return showToast("Captura el concepto del abono.", "warning");
  movement.fecha = date;
  movement.concepto = concept;
  movement.metodo = method;
  movement.tipo = "abono";
  movement.monto = -amount;
  refreshNextPayment(client);
  logEvent("Abono editado", `${client.nombre}: ${money.format(amount)} (${method})`, client);
  state.modal = { type: "payment", id: movement.id, mode: "view" };
  await saveDB("Abono actualizado.");
}

async function submitCharge(form) {
  const client = clients().find((c) => c.id === form.dataset.client);
  if (!client) return;
  const data = new FormData(form);
  const amount = num(data.get("amount"));
  if (amount <= 0) return showToast("El cargo debe ser mayor a cero.", "warning");
  const itemId = String(data.get("itemId") || "");
  const quantity = Math.max(0, Math.floor(num(data.get("quantity"))));
  let concept = String(data.get("concept") || "").trim();
  if (itemId) {
    const item = items().find((row) => row.id === itemId);
    if (!item) return showToast("Artículo no encontrado.", "error");
    if (quantity <= 0) return showToast("Captura la cantidad del artículo.", "warning");
    if (num(item.cantidad) < quantity) return showToast(`Cantidad insuficiente: ${item.nombre} tiene ${num(item.cantidad)}.`, "warning");
    item.cantidad = num(item.cantidad) - quantity;
    concept = concept || `${item.nombre} x${quantity}`;
  }
  client.movimientos.push({
    id: uid("mov"),
    fecha: data.get("date") || today(),
    tipo: "cargo",
    concepto: concept || "Cargo",
    monto: amount
  });
  client.credito.monto = cargos(client);
  logEvent("Cargo agregado", `${client.nombre}: ${money.format(amount)}`, client);
  await saveDB(itemId ? "Cargo agregado y cantidad actualizada." : "Cargo agregado.");
}

async function submitClient(form) {
  const data = new FormData(form);
  const id = form.dataset.id;
  const payload = {
    id: id || uid("cli"),
    folio: String(data.get("folio") || nextFolio()).trim(),
    nombre: String(data.get("nombre") || "").trim(),
    telefono: String(data.get("telefono") || "").trim(),
    direccion: String(data.get("direccion") || "").trim(),
    referencia: String(data.get("referencia") || "").trim(),
    paymentRating: String(data.get("paymentRating") || "normal").trim(),
    tarjeta: {
      institucion: String(data.get("institucion") || "").trim(),
      tipo: String(data.get("tipoTarjeta") || "Cuenta de cobranza").trim(),
      terminacion: String(data.get("terminacion") || "").trim(),
      alias: String(data.get("alias") || "").trim()
    },
    credito: {
      concepto: String(data.get("concepto") || "Crédito de cobranza").trim(),
      monto: num(data.get("monto")),
      abonoSemanal: num(data.get("abonoSemanal")),
      fechaInicio: data.get("fechaInicio") || today(),
      proximoPago: data.get("proximoPago") || today()
    },
    ineFoto: String(data.get("ineFoto") || "").trim(),
    notas: String(data.get("notas") || "").trim(),
    movimientos: [],
    seguimientos: []
  };
  if (!payload.nombre) return showToast("Captura el nombre del cliente.", "warning");
  if (payload.credito.monto <= 0) return showToast("Captura un monto de crédito válido.", "warning");
  if (id) {
    const index = clients().findIndex((client) => client.id === id);
    if (index === -1) return;
    payload.movimientos = clients()[index].movimientos || [];
    payload.seguimientos = clients()[index].seguimientos || [];
    payload.tarjeta.tipo = payload.tarjeta.tipo || clients()[index].tarjeta?.tipo || "Cuenta de cobranza";
    payload.tarjeta.terminacion = payload.tarjeta.terminacion || clients()[index].tarjeta?.terminacion || "";
    payload.referencia = payload.referencia || clients()[index].referencia || "";
    state.db.clients[index] = payload;
    logEvent("Cliente actualizado", payload.nombre, payload);
  } else {
    payload.movimientos = [{ id: uid("mov"), fecha: payload.credito.fechaInicio, tipo: "cargo", concepto: payload.credito.concepto, monto: payload.credito.monto }];
    state.db.clients.unshift(payload);
    state.selectedId = payload.id;
    logEvent("Crédito creado", payload.nombre, payload);
  }
  state.modal = null;
  state.view = "clients";
  await saveDB(id ? "Cliente actualizado." : "Crédito creado.");
}

async function submitSettings(form) {
  const data = new FormData(form);
  state.db.settings = {
    ...state.db.settings,
    appName: String(data.get("appName") || "Cobranza").trim(),
    collectorName: String(data.get("collectorName") || "").trim(),
    collectorPhone: String(data.get("collectorPhone") || "").trim(),
    collectorPin: String(data.get("collectorPin") || "1234").trim(),
    dailyGoal: num(data.get("dailyGoal")),
    weeklyGoal: num(data.get("weeklyGoal")),
    receiptMessage: String(data.get("receiptMessage") || "").trim()
  };
  logEvent("Ajustes actualizados", "Perfil del cobrador");
  await saveDB("Ajustes guardados.");
}

async function importBackup(file) {
  try {
    const payload = normalize(JSON.parse(await file.text()));
    state.db = payload;
    state.selectedId = null;
    logEvent("Respaldo importado", file.name);
    await saveDB("Respaldo importado.");
  } catch {
    showToast("No se pudo importar el respaldo.", "error");
  }
}

async function resetDemo() {
  if (!confirm("Esto reemplazara la cartera actual por datos demo. Continuar?")) return;
  try {
    if (firebaseCloud.ready) {
      state.db = normalize(null);
      await writeFirebaseDB(state.db);
      state.cloudMode = firebaseModeLabel();
    } else {
      const response = await fetch(API_RESET, { method: "POST" });
      if (!response.ok) throw new Error("No se pudo restaurar");
      state.db = normalize(await response.json());
      state.cloudMode = "backend";
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));
    state.selectedId = null;
    state.lastSync = new Date();
    showToast("Datos demo restaurados.", "success");
    render();
  } catch {
    showToast("No se pudo restaurar el demo.", "error");
  }
}

loadDB().then(render);
