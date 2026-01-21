/**
 * BOT PDD – Estável (whatsapp-web.js) + Pin WhatsApp Web (fix markedUnread)
 * ALTERAÇÕES:
 * 1) Bloqueio total do número 5521976712896 (não lê / não processa)
 * 2) ID do cliente = número do telefone (somente dígitos)
 */

const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

// ===================== CONFIG =====================
const configPath = path.join(__dirname, "config.json");
if (!fs.existsSync(configPath)) {
  console.error("ERRO: config.json nao encontrado na mesma pasta do index.js");
  process.exit(1);
}

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
} catch (e) {
  console.error("ERRO: config.json invalido:", e?.message || e);
  process.exit(1);
}

if (!cfg.groups || !Array.isArray(cfg.groups.clientGroupNames) || !cfg.groups.controlGroupName) {
  console.error("ERRO: config.json precisa ter groups.clientGroupNames (array) e groups.controlGroupName (string).");
  process.exit(1);
}

function nowBR() {
  return new Date().toLocaleString("pt-BR", { timeZone: cfg.timezone || "America/Sao_Paulo" });
}

function normalizeE164(n) {
  if (!n) return "";
  let s = String(n).trim().replace(/[^\d+]/g, "");
  if (!s.startsWith("+") && s.startsWith("55")) s = "+" + s;
  if (!s.startsWith("+") && /^\d{10,13}$/.test(s)) s = "+55" + s;
  return s;
}

function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

const IGNORE = new Set((cfg.ignoreNumbersE164 || []).map(normalizeE164));
const NOTIFY_PRIVATES = (cfg.notifyPrivatesE164 || []).map(normalizeE164).filter(Boolean);

// ✅ BLOQUEIO TOTAL (hardcoded) do bot que não pode ser lido/processado
const BLOCK_ALL = new Set([
  normalizeE164("+5521976712896")
]);

// ===================== PDD CATALOGO (BASE) =====================
const CRLV_COST_BY_UF = {
  AP: 7.0, BA: 30.0, GO: 14.9, MA: 7.0, MT: 7.0, MS: 24.9, MG: 10.0,
  PR: 10.0, PI: 25.0, RO: 19.9, RR: 20.0, SP: 10.0, SE: 20.0,
  AL: 30.0, CE: 60.0, DF: 50.0, ES: 45.0, PB: 50.0, RJ: 20.0,
  RN: 60.0, SC: 60.0, TO: 7.0
};

const CRLV_REQUIREMENTS = [
  "Sem intencao/comunicacao de venda",
  "Veiculo nao pode estar baixado",
  "UF do veiculo deve ser a mesma da emissao",
  "Licenciamento deve estar no ano atual ou anterior",
  "Sem multas ativas",
  "Sem bloqueios diversos",
  "Emite apenas o CRLV-E do ano vigente disponivel",
  "Apos emissao, nao ha devolucao"
];

const CRLV_TURBO_UFS = new Set(["MG", "TO", "MT", "AP", "MA", "SP", "GO", "RR", "PI", "PR", "SE", "AC"]);

const SERVICES = {
  ATPVE_REEMISSAO: {
    name: "Reemissao 2a via ATPV-E (TPV / TPVR)",
    cost: 30.0,
    requirements: [
      "Somente reemissao (2a via) - nao existe emissao",
      "Consulta via chassi",
      "NAO pode existir comunicacao de venda",
      "Documento digital"
    ],
    keywords: ["atpv", "atpv-e", "atpve", "tpv", "tpve", "tpvr", "reemissao", "2 via", "segunda via", "transferencia", "transferência"]
  },
  COMUNICACAO_VENDA: {
    name: "Comunicacao de Venda",
    cost: 30.0,
    requirements: ["Registro oficial no Detran"],
    keywords: ["comunicacao de venda", "comunicado de venda"]
  },
  CONSULTA_COMUNICADO: {
    name: "Consulta Comunicado de Venda",
    cost: 5.0,
    requirements: ["Consulta via placa"],
    keywords: ["consulta comunicado", "tem comunicado", "existe comunicado", "comunicado de venda consulta"]
  },
  CRV_PDF: {
    name: "Codigo de Seguranca PDF",
    cost: 10.0,
    requirements: ["Consulta via placa", "Retorna CRV Digital completo"],
    keywords: ["crv", "codigo de seguranca", "codigo segurança", "pdf", "crv digital"]
  },
  CRV_PDF_V2: {
    name: "Codigo de Seguranca PDF V2",
    cost: 24.9,
    requirements: ["Consulta via placa", "Versao mais completa do CRV Digital"],
    keywords: ["crv v2", "codigo de seguranca v2", "codigo segurança v2", "versao 2", "versao2", "v2"]
  },
  PROPRIETARIO: {
    name: "Proprietario Atual + Restricoes",
    cost: 3.0,
    requirements: ["Consulta via placa"],
    keywords: ["proprietario", "proprietário", "dono", "titular"]
  },
  CSV_COMPLETO: {
    name: "CSV Completo",
    cost: 7.0,
    requirements: ["Consulta via placa"],
    keywords: ["csv", "renajud", "renainf", "recall", "bin", "completo"]
  },
  LEILAO: {
    name: "Consulta Leilao",
    cost: 9.99,
    requirements: ["Consulta via placa"],
    keywords: ["leilao", "leilão"]
  },
  GRAVAME: {
    name: "Gravame V2",
    cost: 5.0,
    requirements: ["Consulta via placa"],
    keywords: ["gravame", "financiamento"]
  },
  BASE_ESTADUAL: {
    name: "Base Estadual",
    cost: 5.0,
    requirements: ["Consulta via placa"],
    keywords: ["base estadual", "estadual"]
  },
  BASE_NACIONAL: {
    name: "Base Nacional (DENATRAN)",
    cost: 5.0,
    requirements: ["Consulta via placa"],
    keywords: ["base nacional", "denatran", "nacional"]
  },
  FIPE: {
    name: "Consulta Placa + FIPE",
    cost: 0.0,
    requirements: ["Consulta via placa"],
    keywords: ["fipe"]
  },
  DEBITOS: {
    name: "Consulta Debitos",
    cost: 0.0,
    requirements: ["Consulta via placa", "PDF automatico"],
    keywords: ["debito", "débito", "multas", "ipva"]
  },
  VALIDAR_CRV: {
    name: "Verifica Autenticidade CRV",
    cost: 0.0,
    requirements: ["Validacao do CRV"],
    keywords: ["validar crv", "validacrv", "autenticidade crv", "verifica crv"]
  }
};

const UF_BY_NAME = {
  "alagoas": "AL", "amapa": "AP", "bahia": "BA", "ceara": "CE", "distrito federal": "DF",
  "espirito santo": "ES", "goias": "GO", "maranhao": "MA", "mato grosso": "MT",
  "mato grosso do sul": "MS", "minas gerais": "MG", "paraiba": "PB", "parana": "PR",
  "piaui": "PI", "rio de janeiro": "RJ", "rio grande do norte": "RN", "rondonia": "RO",
  "roraima": "RR", "santa catarina": "SC", "sao paulo": "SP", "sergipe": "SE", "tocantins": "TO"
};

function extractUF(text) {
  const t = (text || "").toLowerCase();
  const ufMatch = t.match(/\b(ac|al|ap|am|ba|ce|df|es|go|ma|mt|ms|mg|pa|pb|pr|pe|pi|rj|rn|rs|ro|rr|sc|se|sp|to)\b/i);
  if (ufMatch) return ufMatch[1].toUpperCase();
  for (const [name, uf] of Object.entries(UF_BY_NAME)) {
    if (t.includes(name)) return uf;
  }
  return null;
}

function formatBRL(n) {
  return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===================== DETECAO =====================
function detectService(text) {
  const t = (text || "").toLowerCase();

  if (SERVICES.ATPVE_REEMISSAO.keywords.some(k => t.includes(k))) return { key: "ATPVE_REEMISSAO" };

  if (t.includes("crlv")) {
    const uf = extractUF(t);
    const wantsTurbo = t.includes("turbo");
    const wantsAgendado = t.includes("agend");
    return { key: "CRLV", uf, wantsTurbo, wantsAgendado };
  }

  if (t.includes("crv") && (t.includes(" v2") || t.includes("v2") || t.includes("versao 2") || t.includes("versao2"))) {
    return { key: "CRV_PDF_V2" };
  }

  for (const [key, svc] of Object.entries(SERVICES)) {
    if (key === "ATPVE_REEMISSAO") continue;
    if (svc.keywords.some(k => t.includes(k))) return { key };
  }

  return null;
}

function resolveCRLV(d) {
  const uf = d.uf;

  if (!uf) {
    return {
      available: true,
      serviceName: "CRLV-E (CRLV Digital)",
      cost: null,
      requirements: [...CRLV_REQUIREMENTS, "UF nao identificada (informe RJ/SP/etc)"]
    };
  }

  if (d.wantsTurbo) {
    if (CRLV_TURBO_UFS.has(uf)) {
      return {
        available: true,
        serviceName: `CRLV-E TURBO (${uf})`,
        cost: null,
        requirements: [...CRLV_REQUIREMENTS, "Custo turbo: consultar tabela do PDD"]
      };
    }
    return { available: false, reason: `CRLV TURBO nao disponivel no PDD para ${uf}.` };
  }

  if (d.wantsAgendado) {
    return {
      available: true,
      serviceName: `CRLV AGENDADO (${uf})`,
      cost: null,
      requirements: [...CRLV_REQUIREMENTS, "Custo agendado: conforme tabela do PDD"]
    };
  }

  const cost = CRLV_COST_BY_UF[uf];
  if (typeof cost === "number") {
    return { available: true, serviceName: `CRLV-E (CRLV Digital) (${uf})`, cost, requirements: CRLV_REQUIREMENTS };
  }

  return {
    available: true,
    serviceName: `CRLV-E (CRLV Digital) (${uf})`,
    cost: null,
    requirements: [...CRLV_REQUIREMENTS, "Custo por UF nao cadastrado"]
  };
}

// ===================== CLIENT (COM PIN) =====================
const client = new Client({
  authStrategy: new LocalAuth({ clientId: cfg.botName || "PDD-BOT" }),

  // ✅ pin para evitar bug markedUnread
  webVersion: cfg.webVersion || "2.3000.1031980585-alpha",
  webVersionCache: {
    type: "remote",
    remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html",
    strict: true
  },

  puppeteer: {
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

// Cache de grupos (não buscar toda msg)
let cachedClientGroupIds = new Set();
let cachedControlGroup = null;

async function refreshChatCache() {
  const chats = await client.getChats();
  const clientGroups = chats.filter(c => c.isGroup && cfg.groups.clientGroupNames.includes(c.name));
  cachedClientGroupIds = new Set(clientGroups.map(g => g.id?._serialized).filter(Boolean));
  cachedControlGroup = chats.find(c => c.isGroup && c.name === cfg.groups.controlGroupName) || null;

  console.log("🔄 Cache atualizado:", nowBR());
  console.log("📊 Monitorando:", clientGroups.map(g => g.name).join(", ") || "(nenhum)");
  console.log("📋 Controle:", cachedControlGroup ? cachedControlGroup.name : "(NAO encontrado)");
}

// Envio seguro p/ número (evita markedUnread)
async function sendSafeNumber(e164OrDigits, text) {
  const digits = onlyDigits(e164OrDigits);
  const numberId = await client.getNumberId(digits);
  if (!numberId) throw new Error("Numero nao encontrado no WhatsApp: " + digits);
  return client.sendMessage(numberId._serialized, text);
}

async function sendToPrivates(text) {
  for (const e164 of NOTIFY_PRIVATES) {
    try { await sendSafeNumber(e164, text); }
    catch (err) { console.error("Falha ao enviar privado para", e164, err?.message || err); }
  }
}

async function sendToControlGroup(text, mentionsContacts) {
  if (!cachedControlGroup) {
    console.log(`⚠️ Grupo controle "${cfg.groups.controlGroupName}" nao encontrado.`);
    return;
  }
  try { await cachedControlGroup.sendMessage(text, { mentions: mentionsContacts || [] }); }
  catch (err) { console.error("Falha ao enviar no controle:", err?.message || err); }
}

async function getContactByE164(e164) {
  const n = normalizeE164(e164);
  if (!n) return null;
  const id = n.replace("+", "") + "@c.us";
  try { return await client.getContactById(id); } catch { return null; }
}

// ===================== QR (SEU BLOCO) =====================
client.on("qr", (qr) => {
  console.log("\n" + "=".repeat(50));
  console.log("📱 ESCANEIE O QR CODE:");
  console.log("=".repeat(50));
  console.log("\n1. WhatsApp → Menu → Aparelhos conectados");
  console.log("2. Conectar um aparelho");
  console.log("3. Aponte a câmera abaixo ↓");
  console.log("\n" + "=".repeat(50));
  qrcode.generate(qr, { small: true });
  console.log("\n" + "=".repeat(50));
  console.log("⚠️  QR válido por 60 segundos");
  console.log("=".repeat(50));
});

client.on("ready", async () => {
  console.log("✅ Bot conectado:", nowBR());
  await refreshChatCache();

  // Atualiza a cada 2 min
  setInterval(() => refreshChatCache().catch(() => {}), 2 * 60 * 1000);
});

client.on("message", async (msg) => {
  try {
    // ====== BLOQUEIO ABSOLUTO (ANTES DE TUDO) ======
    const sender = msg.author || msg.from;
    const senderDigits = onlyDigits(sender);   // ✅ ID do cliente = telefone (somente dígitos)
    const senderE164 = "+" + senderDigits;     // só para exibir em mensagens
    const ID_CLIENTE = senderDigits;           // ✅ IDENTIFICADOR DO CLIENTE

    if (BLOCK_ALL.has(normalizeE164(senderE164))) return;

    const text = (msg.body || "").trim();
    if (!text) return;

    const chat = await msg.getChat();
    if (!chat.isGroup) return;

    const chatId = chat.id?._serialized;
    if (!chatId || !cachedClientGroupIds.has(chatId)) return;

    // Mantém o ignore do config também
    if (IGNORE.has(normalizeE164(senderE164))) return;

    const detected = detectService(text);
    if (!detected) return;

    let available = true;
    let notAvailableReason = "";
    let serviceName = "";
    let cost = null;
    let requirements = [];

    if (detected.key === "CRLV") {
      const r = resolveCRLV(detected);
      if (!r.available) {
        available = false;
        notAvailableReason = r.reason || "Nao disponivel no PDD.";
      } else {
        serviceName = r.serviceName;
        cost = r.cost;
        requirements = r.requirements || [];
      }
    } else {
      const svc = SERVICES[detected.key];
      if (!svc) return;
      serviceName = svc.name;
      cost = svc.cost;
      requirements = svc.requirements || [];
    }

    // Mentions (até 3 primeiros do notifyPrivatesE164)
    const mentionContacts = [];
    for (const n of NOTIFY_PRIVATES.slice(0, 3)) {
      const c = await getContactByE164(n);
      if (c) mentionContacts.push(c);
    }
    const mentionTags = mentionContacts.length
      ? mentionContacts.map(c => `@${c.id.user}`).join(" ")
      : "@ADM01 @Adao @Arthur";

    if (!available) {
      const ctrlMsg =
`📌 NAO DISPONIVEL NO PDD

${mentionTags}

Cliente ID: ${ID_CLIENTE}
Pedido: "${text}"
Motivo: ${notAvailableReason}

⏱️ ${nowBR()}`;
      await sendToControlGroup(ctrlMsg, mentionContacts);
      return;
    }

    const costText = (cost === null || typeof cost === "undefined")
      ? "conforme tabela do PDD"
      : `R$ ${formatBRL(cost)}`;

    const reqBlock = requirements.length
      ? requirements.map(r => `– ${r}`).join("\n")
      : "– (sem requisitos cadastrados)";

    const privMsg =
`✅ NOVO SERVICO DISPONIVEL (PDD)

Cliente ID: ${ID_CLIENTE}
Pedido: "${text}"

Servico: ${serviceName}
Disponivel no PDD
Custo no PDD: ${costText}

Requisitos:
${reqBlock}

Origem: ${chat.name}
⏱️ ${nowBR()}`;

    const ctrlMsg =
`📌 SERVICO DISPONIVEL (PDD)

${mentionTags}

Cliente ID: ${ID_CLIENTE}
Pedido: "${text}"
Servico: ${serviceName}
Custo PDD: ${costText}

Requisitos:
${reqBlock}

⏱️ ${nowBR()}`;

    await sendToPrivates(privMsg);
    await sendToControlGroup(ctrlMsg, mentionContacts);

  } catch (err) {
    console.error("Erro no message:", err?.message || err);
  }
});

client.initialize();
