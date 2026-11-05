// Regras do rodízio. Funções puras: recebem os dados da escala (E) e calculam.
const DAY = 86400000;

export function parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
export function fmt(d) { return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); }
export function mondayOf(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

// Ordem da folha de papel (semana 1): 1 CME, 2 Laboratório, 3 Copa/Conforto, 4 Sala de Mat., 5 Revisão.
export const NOMES_INICIAIS = ['Emanuella', 'Fabi', 'Gabi', 'Monique', 'Serena'];

/** true quando a equipe ainda está com os nomes de exemplo ("Pessoa 1", "Pessoa 2"...). */
export const nomesDeExemplo = (ps) => Array.isArray(ps) && ps.length > 0 && ps.every((x, i) => !String(x || '').trim() || String(x).trim() === 'Pessoa ' + (i + 1));

export function escalaPadrao() {
  return {
    inicio: iso(mondayOf(new Date())),
    setores: ['CME', 'Laboratório', 'Copa/Conforto', 'Sala de Mat. + Caixa de leite', 'Revisão'],
    pessoas: NOMES_INICIAIS.slice(),
    vistos: {},
    trocas: [],
  };
}

export const nSet = (E) => E.setores.length;
export const nPes = (E) => E.pessoas.length;
export const pnome = (E, i) => (E.pessoas[i] || '').trim() || 'Pessoa ' + (i + 1);
export const vistoKey = (w, s) => `w${w}_s${s}`;

/** Índice da semana atual (0 = primeira semana do rodízio). */
export function nowIdx(E) {
  const hoje = new Date(new Date().toDateString());
  return Math.floor(Math.round((hoje - parse(E.inicio)) / DAY) / 7);
}

/** Quem está escalado na atribuição s da semana w: cada pessoa anda uma coluna para a direita por semana. */
export function titular(E, w, s) { const N = nPes(E); return (((s - w) % N) + N) % N; }
export function troca(E, w, s) { return (E.trocas || []).find((t) => t.w === w && t.s === s); }
export function efetivo(E, w, s) { const t = troca(E, w, s); return t ? t.cobriu : titular(E, w, s); }

/** Pessoas sem atribuição na semana (quando há mais pessoas que atribuições). */
export function apoio(E, w) {
  const usados = E.setores.map((_, s) => efetivo(E, w, s));
  return E.pessoas.map((_, i) => i).filter((i) => !usados.includes(i));
}

/** Onde a pessoa p está na semana w. */
export function situacao(E, w, p) {
  const s = E.setores.findIndex((_, k) => efetivo(E, w, k) === p);
  if (s >= 0) return { s };
  const t = E.setores.findIndex((_, k) => titular(E, w, k) === p);
  return { s: -1, sub: t >= 0 };
}

export function periodo(E, w) {
  const a = new Date(parse(E.inicio).getTime() + w * 7 * DAY);
  const b = new Date(a.getTime() + 6 * DAY);
  return fmt(a) + ' a ' + fmt(b);
}

export const COR = (i) => `var(--s${(i % 8) + 1})`;
export const COR_IMPRESSAO = ['#0B6E6A', '#3E5BA9', '#A0522D', '#7B4C9E', '#5F7F1E', '#B03A6B', '#2F7F9F', '#8A6D1A'];
