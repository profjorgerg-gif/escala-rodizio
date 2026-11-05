import { apoio, COR_IMPRESSAO, efetivo, fmt, nPes, nSet, periodo, pnome, titular, troca } from './escala.js';

/** Mensagem de texto para WhatsApp. */
export function textoEscala(E, w0, k) {
  let t = '*Escala de Rodízio*\n';
  for (let w = w0; w < w0 + k; w++) {
    t += '\n*Semana ' + periodo(E, w) + '*\n';
    E.setores.forEach((x, s) => {
      const tr = troca(E, w, s);
      t += '• ' + x + ': ' + pnome(E, efetivo(E, w, s)) + (tr ? ' (no lugar de ' + pnome(E, titular(E, w, s)) + ')' : '') + '\n';
    });
    const ap = apoio(E, w);
    if (ap.length) t += '• Apoio: ' + ap.map((i) => pnome(E, i)).join(', ') + '\n';
  }
  return t.trim();
}

/** Desenha a escala em um canvas branco, pronto para salvar ou enviar. Devolve um Blob PNG. */
export async function imagemEscala(E, w0, k, semanaAtual) {
  try { await document.fonts.ready; } catch { /* segue com a fonte padrão */ }
  const temAp = nPes(E) > nSet(E);
  const cols = nSet(E) + (temAp ? 1 : 0);
  const W = 1240, M = 36, c0 = 190, cw = (W - 2 * M - c0) / cols, rh = 64, top = 150;
  const H = top + 60 + k * rh + 90, esc = 2;
  const cv = document.createElement('canvas');
  cv.width = W * esc; cv.height = H * esc;
  const c = cv.getContext('2d');
  c.scale(esc, esc);
  const F = '"Atkinson Hyperlegible", "Segoe UI", sans-serif';
  const D = '"Familjen Grotesk", "Segoe UI", sans-serif';
  const cut = (t, mw) => { if (c.measureText(t).width <= mw) return t; while (t.length > 1 && c.measureText(t + '…').width > mw) t = t.slice(0, -1); return t + '…'; };

  c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#0B6E6A'; c.fillRect(0, 0, W, 10);
  c.fillStyle = '#15282A'; c.font = '700 38px ' + D; c.fillText('Escala de Rodízio', M, 72);
  c.fillStyle = '#4D6265'; c.font = '22px ' + F;
  c.fillText(k === 1 ? 'Semana de ' + periodo(E, w0)
    : 'De ' + periodo(E, w0).split(' a ')[0] + ' a ' + periodo(E, w0 + k - 1).split(' a ')[1] + ' · ' + k + ' semanas', M, 110);

  let y = top;
  c.fillStyle = '#E9EFEF'; c.fillRect(M, y, W - 2 * M, 60);
  c.font = '700 16px ' + F; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#4D6265'; c.fillText('SEMANA', M + c0 / 2, y + 30);
  const heads = [...E.setores, ...(temAp ? ['Apoio'] : [])];
  heads.forEach((x, i) => {
    const cx = M + c0 + cw * i + cw / 2, txt = cut(x.toUpperCase(), cw - 30);
    c.fillStyle = i < nSet(E) ? COR_IMPRESSAO[i % 8] : '#7A8D8F';
    c.beginPath(); c.arc(cx - c.measureText(txt).width / 2 - 6, y + 30, 6, 0, 7); c.fill();
    c.fillStyle = '#4D6265'; c.fillText(txt, cx + 6, y + 30);
  });
  y += 60;
  for (let w = w0; w < w0 + k; w++) {
    c.fillStyle = w === semanaAtual ? '#D9EEEC' : ((w - w0) % 2 ? '#F6F9F9' : '#FFFFFF');
    c.fillRect(M, y, W - 2 * M, rh);
    c.strokeStyle = '#D3DDDD'; c.lineWidth = 1; c.beginPath(); c.moveTo(M, y + rh); c.lineTo(W - M, y + rh); c.stroke();
    c.fillStyle = '#15282A'; c.font = '700 19px ' + F; c.fillText(periodo(E, w), M + c0 / 2, y + rh / 2);
    E.setores.forEach((_, s) => {
      const ef = efetivo(E, w, s), tr = troca(E, w, s), cx = M + c0 + cw * s + cw / 2;
      c.fillStyle = tr ? '#9A5B00' : '#15282A'; c.font = '700 22px ' + D; c.fillText((ef + 1) + (tr ? '*' : ''), cx, y + 22);
      c.font = '16px ' + F; c.fillStyle = tr ? '#9A5B00' : '#4D6265'; c.fillText(cut(pnome(E, ef), cw - 16), cx, y + 46);
    });
    if (temAp) {
      const cx = M + c0 + cw * nSet(E) + cw / 2;
      c.font = '16px ' + F; c.fillStyle = '#4D6265';
      c.fillText(cut(apoio(E, w).map((i) => pnome(E, i)).join(', '), cw - 16), cx, y + rh / 2);
    }
    y += rh;
  }
  c.strokeStyle = '#AFC0C0'; c.strokeRect(M, top, W - 2 * M, y - top);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.font = '17px ' + F; c.fillStyle = '#15282A';
  c.fillText(cut(E.pessoas.map((_, i) => (i + 1) + ' = ' + pnome(E, i)).join('    '), W - 2 * M), M, y + 40);
  c.fillStyle = '#7A8D8F'; c.font = '15px ' + F;
  c.fillText('* troca registrada · gerado em ' + fmt(new Date()) + '/' + new Date().getFullYear(), M, y + 70);
  return new Promise((ok) => cv.toBlob(ok, 'image/png'));
}
