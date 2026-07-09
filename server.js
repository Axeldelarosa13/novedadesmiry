const http = require("http");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const dataDir = path.join(root, "data");
const dbFile = path.join(dataDir, "cobranza-db.json");
const uploadsDir = path.join(root, "uploads");
const ineUploadsDir = path.join(uploadsDir, "ine");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".bat": "text/plain; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

const imageExtensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

const uid = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const moneyNum = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const seedData = () => ({
  schemaVersion: 1,
  settings: {
    appName: "Novedades y Muebles Miry",
    collectorName: "Cobrador Principal",
    collectorPhone: "55 9000 1100",
    collectorPin: "1234",
    dailyGoal: 2500,
    weeklyGoal: 15000,
    receiptMessage: "Gracias por su abono. Conserve este comprobante."
  },
  clients: [
    {
      id: "cli-demo-1",
      folio: "CR-001",
      nombre: "María López",
      telefono: "55 1111 2233",
      direccion: "Col. Centro, Calle Morelos 18",
      referencia: "Frente a la farmacia",
      tarjeta: { institucion: "Crédito personal", tipo: "Cuenta de cobranza", terminacion: "ML-001", alias: "Crédito semanal" },
      credito: { concepto: "Crédito de cobranza", monto: 8500, abonoSemanal: 500, fechaInicio: daysAgo(28), proximoPago: daysAgo(1) },
      notas: "Paga cada viernes. Prefiere WhatsApp antes de visitar.",
      movimientos: [
        { id: uid("mov"), fecha: daysAgo(28), tipo: "cargo", concepto: "Crédito inicial", monto: 8500 },
        { id: uid("mov"), fecha: daysAgo(21), tipo: "abono", concepto: "Abono semanal", monto: -500, metodo: "Efectivo" },
        { id: uid("mov"), fecha: daysAgo(14), tipo: "abono", concepto: "Abono semanal", monto: -500, metodo: "Transferencia" },
        { id: uid("mov"), fecha: daysAgo(7), tipo: "abono", concepto: "Abono semanal", monto: -500, metodo: "Efectivo" }
      ],
      seguimientos: []
    },
    {
      id: "cli-demo-2",
      folio: "CR-002",
      nombre: "José Hernández",
      telefono: "55 2222 3344",
      direccion: "Av. Hidalgo 204",
      referencia: "Local de reparación",
      tarjeta: { institucion: "Venta a crédito", tipo: "Cuenta de cobranza", terminacion: "JG-002", alias: "Cuenta semanal" },
      credito: { concepto: "Compra financiada", monto: 6200, abonoSemanal: 450, fechaInicio: daysAgo(45), proximoPago: daysAgo(9) },
      notas: "Atrasado. Visitar temprano.",
      movimientos: [
        { id: uid("mov"), fecha: daysAgo(45), tipo: "cargo", concepto: "Crédito inicial", monto: 6200 },
        { id: uid("mov"), fecha: daysAgo(37), tipo: "abono", concepto: "Abono semanal", monto: -450, metodo: "Efectivo" },
        { id: uid("mov"), fecha: daysAgo(23), tipo: "abono", concepto: "Abono parcial", monto: -250, metodo: "Efectivo" }
      ],
      seguimientos: [{ id: uid("seg"), fecha: daysAgo(5), tipo: "Promesa", nota: "Prometió pagar el sábado.", actor: "Cobrador Principal" }]
    },
    {
      id: "cli-demo-3",
      folio: "CR-003",
      nombre: "Ana Torres",
      telefono: "55 3333 4455",
      direccion: "Mercado Norte, local 12",
      referencia: "Junto al puesto de comida",
      tarjeta: { institucion: "Prestamo personal", tipo: "Cuenta de cobranza", terminacion: "AG-003", alias: "Cuenta renovada" },
      credito: { concepto: "Renovación de crédito", monto: 4000, abonoSemanal: 400, fechaInicio: daysAgo(18), proximoPago: daysAgo(2) },
      notas: "Cliente confiable.",
      movimientos: [
        { id: uid("mov"), fecha: daysAgo(18), tipo: "cargo", concepto: "Crédito inicial", monto: 4000 },
        { id: uid("mov"), fecha: daysAgo(11), tipo: "abono", concepto: "Abono semanal", monto: -400, metodo: "Transferencia" },
        { id: uid("mov"), fecha: daysAgo(4), tipo: "abono", concepto: "Abono semanal", monto: -400, metodo: "Efectivo" }
      ],
      seguimientos: []
    }
  ],
  items: [
    { id: "art-demo-1", sku: "ART-001", nombre: "Celular básico", categoria: "Electrónica", stock: 6, minStock: 2, costo: 850, precio: 1450, notas: "Equipo económico" },
    { id: "art-demo-2", sku: "ART-002", nombre: "Bocina bluetooth", categoria: "Audio", stock: 4, minStock: 2, costo: 280, precio: 650, notas: "Modelo portátil" },
    { id: "art-demo-3", sku: "ART-003", nombre: "Colchón individual", categoria: "Hogar", stock: 2, minStock: 1, costo: 1200, precio: 2100, notas: "Entrega local" }
  ],
  routeExpenses: [],
  audit: [{ id: uid("aud"), fecha: new Date().toISOString(), accion: "Sistema iniciado", detalle: "Base de cobranza creada." }]
});

const normalize = (payload) => {
  const base = seedData();
  const data = payload && typeof payload === "object" ? payload : {};
  return {
    schemaVersion: 1,
    settings: { ...base.settings, ...(data.settings || {}) },
    clients: Array.isArray(data.clients) ? data.clients : base.clients,
    items: Array.isArray(data.items) ? data.items : base.items,
    routeExpenses: Array.isArray(data.routeExpenses) ? data.routeExpenses : [],
    audit: Array.isArray(data.audit) ? data.audit : []
  };
};

const ensureDB = () => {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(ineUploadsDir)) fs.mkdirSync(ineUploadsDir, { recursive: true });
  if (!fs.existsSync(dbFile)) writeDB(seedData());
};

const readDB = () => {
  ensureDB();
  try {
    return normalize(JSON.parse(fs.readFileSync(dbFile, "utf8")));
  } catch {
    const fallback = seedData();
    writeDB(fallback);
    return fallback;
  }
};

const writeDB = (data) => {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbFile, JSON.stringify(normalize(data), null, 2));
};

const sendJSON = (res, status, payload, headers = {}) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(JSON.stringify(payload));
};

const readBody = (req) => new Promise((resolve, reject) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 20 * 1024 * 1024) {
      const error = new Error("Payload demasiado grande");
      error.status = 413;
      reject(error);
      req.destroy();
    }
  });
  req.on("end", () => {
    if (!body) return resolve({});
    try {
      resolve(JSON.parse(body));
    } catch {
      reject(new Error("JSON inválido"));
    }
  });
  req.on("error", reject);
});

const saveIneUpload = (payload) => {
  const dataUrl = String(payload.dataUrl || "");
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    const error = new Error("Formato de imagen no válido");
    error.status = 400;
    throw error;
  }

  const mimeType = match[1];
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
    const error = new Error("La imagen debe pesar menos de 5 MB después de optimizarse");
    error.status = 413;
    throw error;
  }

  if (!fs.existsSync(ineUploadsDir)) fs.mkdirSync(ineUploadsDir, { recursive: true });
  const ext = imageExtensions[mimeType] || ".jpg";
  const fileName = `ine-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(ineUploadsDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return {
    mimeType,
    size: buffer.length,
    url: `/uploads/ine/${fileName}`
  };
};

const handleApi = async (req, res, route) => {
  try {
    if (route === "/api/health" && req.method === "GET") {
      const db = readDB();
      return sendJSON(res, 200, {
        ok: true,
        app: "cobranza-cartera",
        dbFile,
        clients: db.clients.length,
        updatedAt: new Date().toISOString()
      });
    }

    if (route === "/api/db" && req.method === "GET") return sendJSON(res, 200, readDB());

    if (route === "/api/upload/ine" && req.method === "POST") {
      const payload = await readBody(req);
      return sendJSON(res, 201, saveIneUpload(payload));
    }

    if (route === "/api/db" && req.method === "PUT") {
      const payload = await readBody(req);
      writeDB(payload);
      return sendJSON(res, 200, readDB());
    }

    if (route === "/api/db/reset" && req.method === "POST") {
      writeDB(seedData());
      return sendJSON(res, 200, readDB());
    }

    if (route === "/api/db/export" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="respaldo-cobranza-${new Date().toISOString().slice(0, 10)}.json"`
      });
      res.end(JSON.stringify(readDB(), null, 2));
      return;
    }

    return sendJSON(res, 404, { error: "Endpoint no encontrado" });
  } catch (error) {
    return sendJSON(res, error.status || 500, { error: error.message || "Error del backend" });
  }
};

const serveStatic = (req, res, cleanUrl) => {
  const route = cleanUrl === "/" ? "/index.html" : cleanUrl;
  const filePath = path.normalize(path.join(root, route));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
};

const server = http.createServer((req, res) => {
  const cleanUrl = decodeURIComponent((req.url || "/").split("?")[0]);
  if (cleanUrl.startsWith("/api/")) return handleApi(req, res, cleanUrl);
  return serveStatic(req, res, cleanUrl);
});

ensureDB();
server.listen(port, "127.0.0.1", () => {
  console.log(`Novedades y Muebles Miry listo en http://127.0.0.1:${port}`);
  console.log(`API: http://127.0.0.1:${port}/api/health`);
});
