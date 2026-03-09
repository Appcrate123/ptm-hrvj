// api/ptm.js — Proxy seguro (CommonJS para máxima compatibilidade Vercel)
// Variáveis de ambiente necessárias na Vercel:
//   APPS_SCRIPT_URL, PIN_SALA, PIN_NAC, PIN_CC

module.exports = async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-ptm-pin, x-ptm-module');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Verificar variável de ambiente ────────────────────
  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
  if (!APPS_SCRIPT_URL) {
    return res.status(500).json({ error: 'APPS_SCRIPT_URL não configurada na Vercel.' });
  }

  // ── Validar PIN ───────────────────────────────────────
  const pin    = req.headers['x-ptm-pin'];
  const module = req.headers['x-ptm-module'];
  const PINS   = { sala: process.env.PIN_SALA, nac: process.env.PIN_NAC, cc: process.env.PIN_CC };

  if (!module || !PINS[module]) return res.status(401).json({ error: 'Módulo inválido.' });
  if (!PINS[module])            return res.status(500).json({ error: `PIN_${module.toUpperCase()} não configurado na Vercel.` });
  if (pin !== PINS[module])     return res.status(401).json({ error: 'PIN incorreto.' });

  // ── Chamar Apps Script ────────────────────────────────
  try {
    let targetUrl, options;

    if (req.method === 'GET') {
      const action = req.query && req.query.action;
      if (!action) return res.status(400).json({ error: 'Parâmetro action obrigatório.' });
      targetUrl = `${APPS_SCRIPT_URL}?action=${encodeURIComponent(action)}`;
      options   = { method: 'GET', redirect: 'follow' };

    } else { // POST
      targetUrl = APPS_SCRIPT_URL;
      // req.body já vem parseado pela Vercel automaticamente
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      options = {
        method:  'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'application/json' },
        body,
      };
    }

    const response = await fetch(targetUrl, options);
    const text     = await response.text();

    // Apps Script às vezes retorna HTML de erro
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Apps Script retornou não-JSON:', text.slice(0, 300));
      return res.status(502).json({
        error: 'O Apps Script retornou uma resposta inválida. Verifique: (1) Deploy publicado como "Qualquer pessoa", (2) URL correta nas variáveis da Vercel.'
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('Erro no proxy:', err);
    return res.status(500).json({ error: 'Erro ao chamar o Apps Script: ' + err.message });
  }
};
