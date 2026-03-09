// api/ptm.js — Proxy seguro para o Google Apps Script
// A URL do Apps Script NUNCA aparece no navegador do usuário
// Configure as variáveis de ambiente na Vercel:
//   APPS_SCRIPT_URL  → URL completa do seu Google Apps Script
//   PIN_SALA         → PIN da Sala Vermelha (ex: 1234)
//   PIN_NAC          → PIN do painel NAC
//   PIN_CC           → PIN do Centro Cirúrgico

export default async function handler(req, res) {
  // CORS — permite chamadas do frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-ptm-pin, x-ptm-module');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
  if (!APPS_SCRIPT_URL) {
    return res.status(500).json({ error: 'APPS_SCRIPT_URL não configurada no servidor.' });
  }

  // ── Validação de PIN ──────────────────────────────────────
  const pin    = req.headers['x-ptm-pin'];
  const module = req.headers['x-ptm-module'];

  const pins = {
    sala: process.env.PIN_SALA,
    nac:  process.env.PIN_NAC,
    cc:   process.env.PIN_CC,
  };

  if (!module || !pins[module]) {
    return res.status(401).json({ error: 'Módulo inválido.' });
  }
  if (pin !== pins[module]) {
    return res.status(401).json({ error: 'PIN incorreto.' });
  }

  // ── Proxy para o Apps Script ──────────────────────────────
  try {
    let fetchUrl = APPS_SCRIPT_URL;
    let fetchOptions = {};

    if (req.method === 'GET') {
      const action = req.query.action;
      fetchUrl = `${APPS_SCRIPT_URL}?action=${action}`;
      fetchOptions = { method: 'GET' };
    } else {
      fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      };
    }

    const response = await fetch(fetchUrl, fetchOptions);
    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Erro ao contactar o Apps Script: ' + err.message });
  }
}
