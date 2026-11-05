import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { collection, deleteDoc, deleteField, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, configurado, db, provider } from './firebase.js';
import { ADMIN_INICIAL } from './firebaseConfig.js';
import {
  apoio, COR, efetivo, escalaPadrao, NOMES_INICIAIS, nomesDeExemplo, nowIdx, nPes, nSet, parse, periodo, pnome, situacao, titular, troca, vistoKey,
} from './escala.js';
import { imagemEscala, textoEscala } from './compartilhar.js';
import { I } from './icones.jsx';

const PAPEL = { admin: 'Administrador', chefe: 'Enfermeira chefe', equipe: 'Equipe' };
const inicial = (s) => (String(s || '?').trim()[0] || '?').toUpperCase();

export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [status, setStatus] = useState(configurado ? 'carregando' : 'naoconfigurado');
  const [E, setE] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [view, setView] = useState('semana');
  const [semW, setSemW] = useState(null);
  const [destaque, setDestaque] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [share, setShare] = useState(null);
  const [msg, setMsg] = useState('');
  const timer = useRef();

  const toast = (t) => { setMsg(t); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 2200); };
  const email = fbUser?.email?.toLowerCase() || '';
  const canEdit = perfil?.papel === 'admin' || perfil?.papel === 'chefe';
  const isAdmin = perfil?.papel === 'admin';
  const escRef = db ? doc(db, 'escala', 'principal') : null;

  // Login
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setFbUser(u); setPerfil(null); setE(null);
      setStatus(u ? 'carregando' : 'login');
    });
  }, []);

  // Perfil do usuário (usuarios/{email})
  useEffect(() => {
    if (!fbUser || !db) return;
    const ref = doc(db, 'usuarios', email);
    return onSnapshot(ref, async (snap) => {
      if (snap.exists()) { setPerfil(snap.data()); setStatus('ok'); return; }
      if (email === ADMIN_INICIAL.toLowerCase()) {
        try { await setDoc(ref, { nome: fbUser.displayName || 'Administrador', papel: 'admin', pessoa: null }); }
        catch { setStatus('semacesso'); }
        return;
      }
      // Sem cadastro: registra um pedido de acesso para a chefe ou o administrador aprovar.
      try {
        const pRef = doc(db, 'pedidos', email);
        const ja = await getDoc(pRef);
        if (!ja.exists()) await setDoc(pRef, { nome: fbUser.displayName || email, email, criado: serverTimestamp() });
        setStatus('pedido');
      } catch { setStatus('semacesso'); }
    }, () => setStatus('semacesso'));
  }, [fbUser, email]);

  // Escala compartilhada
  useEffect(() => {
    if (status !== 'ok' || !escRef) return;
    return onSnapshot(escRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setE({ ...escalaPadrao(), ...d, vistos: d.vistos || {}, trocas: d.trocas || [] });
        // Uma única vez: troca os nomes de exemplo pelos nomes da folha de papel.
        if (canEdit && nomesDeExemplo(d.pessoas) && d.pessoas.length === NOMES_INICIAIS.length)
          updateDoc(escRef, { pessoas: NOMES_INICIAIS.slice() }).catch(() => {});
      } else {
        setE(false);
        if (canEdit) setDoc(escRef, escalaPadrao()).catch(() => toast('Não foi possível criar a escala.'));
      }
    }, () => toast('Sem conexão com a escala.'));
  }, [status, canEdit]);

  // Pedidos de acesso (administrador e enfermeira chefe)
  useEffect(() => {
    if (status !== 'ok' || !canEdit) { setPedidos([]); return; }
    return onSnapshot(collection(db, 'pedidos'), (q) =>
      setPedidos(q.docs.map((d) => ({ email: d.id, ...d.data() }))), () => setPedidos([]));
  }, [status, canEdit]);

  // Lista de usuários (só administrador)
  useEffect(() => {
    if (status !== 'ok' || !isAdmin) { setUsuarios([]); return; }
    return onSnapshot(collection(db, 'usuarios'), (q) =>
      setUsuarios(q.docs.map((d) => ({ email: d.id, ...d.data() })).sort((a, b) => a.nome.localeCompare(b.nome))));
  }, [status, isAdmin]);

  useEffect(() => { if (E && semW === null) setSemW(Math.max(0, nowIdx(E))); }, [E, semW]);
  useEffect(() => { if (view === 'cadastros' && !canEdit) setView('semana'); }, [view, canEdit]);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') { setSheet(null); setShare(null); } };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, []);

  const salvar = (campos, ok) =>
    updateDoc(escRef, campos).then(() => ok && toast(ok)).catch(() => toast('Não foi possível salvar. Verifique a internet e tente de novo.'));

  async function entrar() {
    try { await signInWithPopup(auth, provider); }
    catch (e) {
      if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') await signInWithRedirect(auth, provider);
      else if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') toast('Não foi possível entrar. Tente de novo.');
    }
  }

  // ---------- Telas sem escala ----------
  if (status === 'naoconfigurado') return <Casca><div className="login"><h2>Falta configurar o Firebase</h2>
    <p className="muted" style={{ margin: 0 }}>Cole a configuração do seu projeto no arquivo <b>src/firebaseConfig.js</b> e publique de novo. O passo a passo está no README.</p></div></Casca>;
  if (status === 'carregando') return <Casca><p className="muted" style={{ textAlign: 'center', marginTop: 40 }}>Carregando…</p></Casca>;
  if (status === 'login') return <Casca><div className="login"><h2>Bem-vindo(a)</h2>
    <p className="muted" style={{ margin: 0 }}>Entre com a sua conta Google para ver a escala.</p>
    <button className="gbtn" onClick={entrar}>{I.google}Entrar com Google</button></div><Toast msg={msg} /></Casca>;
  if (status === 'pedido') return <Casca><div className="login"><h2>Pedido enviado</h2>
    <p style={{ margin: 0 }}>Olá, <b>{fbUser?.displayName || email}</b>. Seu pedido de acesso chegou para a enfermeira chefe.</p>
    <p className="muted" style={{ margin: 0 }}>Assim que ela aprovar, a escala abre sozinha nesta tela. Se preferir, feche e volte mais tarde.</p>
    <button className="btn ghost" onClick={() => signOut(auth)}>Usei a conta errada</button></div></Casca>;
  if (status === 'semacesso') return <Casca><div className="login"><h2>Conta sem acesso</h2>
    <p style={{ margin: 0, color: 'var(--danger)', fontWeight: 700 }}>O e-mail {email} ainda não foi liberado.</p>
    <p className="muted" style={{ margin: 0 }}>Peça ao administrador para cadastrar você.</p>
    <button className="btn" onClick={() => signOut(auth)}>Entrar com outra conta</button></div></Casca>;

  const user = <div className="userbox">
    <span className="avatar">{inicial(perfil?.nome)}</span>
    <span className="uname"><b>{perfil?.nome}</b><span>{PAPEL[perfil?.papel]}</span></span>
    <button className="btn ghost small" onClick={() => { setSheet(null); setShare(null); signOut(auth); }}>Sair</button>
  </div>;

  if (!E) return <Casca user={user}><p className="muted" style={{ textAlign: 'center', marginTop: 40 }}>
    {E === false && !canEdit ? 'A escala ainda não foi criada pela enfermeira chefe.' : 'Carregando a escala…'}</p></Casca>;

  const w = semW ?? 0, ni = nowIdx(E), eu = perfil?.pessoa ?? null;
  const p = { E, w, ni, eu, canEdit, isAdmin, salvar, toast, setSemW, setSheet, setShare, destaque, setDestaque, usuarios, email, pedidos };

  return <>
    <div className="no-print">
      <Casca user={user}>
        <nav className="tabs" aria-label="Telas">
          <Tab v="escala" view={view} setView={setView} icon={I.tabela}>Escala</Tab>
          <Tab v="semana" view={view} setView={setView} icon={I.calendario}>Trocas</Tab>
          {canEdit && <Tab v="cadastros" view={view} setView={setView} icon={I.ajustes}>Cadastros{pedidos.length > 0 && <span className="badge-n">{pedidos.length}</span>}</Tab>}
        </nav>
        <main>
          {view === 'escala' && <Escala {...p} />}
          {view === 'semana' && <Semana {...p} />}
          {view === 'cadastros' && canEdit && <Cadastros {...p} />}
        </main>
      </Casca>
      {sheet && canEdit && <TrocaSheet {...p} sheet={sheet} />}
      {share && <ShareSheet {...p} share={share} inicio={Math.max(0, view === 'semana' ? w : ni)} />}
      <Toast msg={msg} />
    </div>
    {share && <Impressao E={E} w0={Math.max(0, view === 'semana' ? w : ni)} k={share.k} ni={ni} />}
  </>;
}

function Casca({ user, children }) {
  return <div className="wrap">
    <header className="top">
      <h1>Escala de Rodízio</h1>
      {user}
    </header>
    {children}
  </div>;
}
const Toast = ({ msg }) => msg ? <div className="toast" role="status">{msg}</div> : null;
const Tab = ({ v, view, setView, icon, children }) =>
  <button aria-current={view === v ? 'page' : 'false'} onClick={() => { setView(v); scrollTo({ top: 0 }); }}>{icon}{children}</button>;

// ---------- Trocas (semana) ----------
function Semana({ E, w, ni, eu, canEdit, salvar, setSemW, setSheet, setShare }) {
  const temEu = eu != null && eu < nPes(E);
  const st = temEu ? situacao(E, w, eu) : null;
  const ap = apoio(E, w);
  return <>
    <div className="weeknav">
      <button className="btn" aria-label="Semana anterior" disabled={w <= 0} onClick={() => setSemW(Math.max(0, w - 1))}>{I.esq}</button>
      <div className="mid"><div className="date num">{periodo(E, w)}</div>
        <div className="small muted">{w === ni ? 'Esta semana' : w === ni + 1 ? 'Próxima semana' : 'Semana ' + ((w % nPes(E)) + 1) + ' do rodízio'}</div></div>
      <button className="btn" aria-label="Próxima semana" onClick={() => setSemW(w + 1)}>{I.dir}</button>
    </div>
    {w !== ni && ni >= 0 && <div style={{ textAlign: 'center', marginTop: 6 }}><button className="btn ghost small" onClick={() => setSemW(ni)}>Voltar para esta semana</button></div>}
    {temEu && (st.s >= 0
      ? <div className="hero"><div className="lbl">{w === ni ? 'Esta semana você está em' : 'Nesta semana você estará em'}</div>
          <div className="big">{E.setores[st.s]}</div>{troca(E, w, st.s) && <div className="lbl">Você está cobrindo uma troca</div>}</div>
      : <div className="hero free"><div className="lbl">Nesta semana</div><div className="big">{st.sub ? 'Você foi substituído(a)' : 'Você está no apoio'}</div>
          {!st.sub && <div className="lbl">Sem atribuição fixa: pode ser chamado(a) para cobrir faltas</div>}</div>)}
    <div className="rows">
      {E.setores.map((nome, s) => {
        const t = troca(E, w, s), ef = efetivo(E, w, s), ok = !!E.vistos[vistoKey(w, s)];
        return <div key={s} className={'srow' + (ef === eu ? ' me' : '')}>
          <span className="stripe" style={{ background: COR(s) }} />
          <div className="sinfo"><div className="sname">{nome}</div><div className="pname">{pnome(E, ef)}</div>
            {t && <div className="swapnote">No lugar de {pnome(E, titular(E, w, s))}</div>}</div>
          {canEdit
            ? <div className="acts">
                <button className="btn tbtn" aria-label={'Trocar pessoa em ' + nome} onClick={() => setSheet({ w, s })}>{I.troca}<span>Trocar</span></button>
                <button className="vbtn" aria-pressed={ok} aria-label={(ok ? 'Tirar visto' : 'Dar visto') + ' em ' + nome}
                  onClick={() => salvar({ ['vistos.' + vistoKey(w, s)]: ok ? deleteField() : true }, ok ? 'Visto retirado' : 'Visto dado')}>{I.check}</button>
              </div>
            : <span className={'vstat' + (ok ? ' ok' : '')} title={ok ? 'Visto dado' : 'Sem visto'}>{ok && I.check}</span>}
        </div>;
      })}
      {ap.length > 0 && <div className={'srow' + (ap.includes(eu) ? ' me' : '')}>
        <span className="stripe" style={{ background: 'var(--line-strong)' }} />
        <div className="sinfo"><div className="sname">Apoio (sem atribuição nesta semana)</div><div className="pname">{ap.map((i) => pnome(E, i)).join(', ')}</div></div>
      </div>}
    </div>
    <div style={{ marginTop: 12 }}><button className="btn" style={{ width: '100%' }} onClick={() => setShare({ k: 1 })}>{I.share}Compartilhar esta escala</button></div>
    <p className="help">{canEdit
      ? <>Toque no círculo para dar o visto. Se alguém faltar, toque em <b>Trocar</b> e escolha quem vai cobrir.</>
      : 'O círculo verde mostra que a atribuição já recebeu o visto da enfermeira chefe.'}</p>
    {temEu && <div className="section"><h3>Suas próximas semanas</h3><div className="next">
      {[1, 2, 3, 4].map((k) => { const ww = Math.max(0, ni) + k, s2 = situacao(E, ww, eu);
        return <div key={k}><span className="num">{periodo(E, ww)}</span><b>{s2.s >= 0 ? E.setores[s2.s] : s2.sub ? 'Substituído(a)' : 'Apoio'}</b></div>; })}
    </div></div>}
  </>;
}

// ---------- Escala completa ----------
function Escala({ E, ni, eu, destaque, setDestaque, setShare }) {
  const hl = destaque ?? eu ?? null, tot = Math.max(10, ni + nPes(E) + 1), temAp = nPes(E) > nSet(E);
  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <h2>Escala completa</h2><button className="btn" onClick={() => setShare({ k: 4 })}>{I.share}Compartilhar</button></div>
    <p className="muted small" style={{ margin: '4px 0 0' }}>Toque em um nome para destacar as atribuições da pessoa.</p>
    <div className="chips">{E.pessoas.map((_, i) =>
      <button key={i} className="chip" aria-pressed={hl === i} onClick={() => setDestaque(hl === i ? -1 : i)}>{pnome(E, i)}</button>)}</div>
    <p className="dragtip muted small" style={{ margin: '10px 0 0' }}>Arraste a tabela para o lado para ver todas as atribuições.</p>
    <div className="tablewrap"><table><thead><tr><th>Semana</th>
      {E.setores.map((x, s) => <th key={s}><span className="hdot" style={{ background: COR(s) }} />{x}</th>)}
      {temAp && <th>Apoio</th>}</tr></thead><tbody>
      {Array.from({ length: tot }, (_, w) => <tr key={w} className={w === ni ? 'now' : ''}>
        <td className="lbl num">{periodo(E, w)}{w === ni && <div className="small" style={{ color: 'var(--accent)' }}>Esta semana</div>}</td>
        {E.setores.map((_, s) => { const t = troca(E, w, s), ef = efetivo(E, w, s);
          return <td key={s} className={'c' + (t ? ' sw' : '') + (ef === hl ? ' hl' : '')}><b className="num">{ef + 1}</b><span>{pnome(E, ef)}</span></td>; })}
        {temAp && <td className="c">{apoio(E, w).map((i) => <span key={i} style={i === hl ? { color: 'var(--accent)', fontWeight: 700 } : null}>{i + 1} · {pnome(E, i)}</span>)}</td>}
      </tr>)}
    </tbody></table></div>
    <div className="legend">{E.pessoas.map((_, i) => <span key={i}><b>{i + 1}</b> = {pnome(E, i)}</span>)}</div>
    <p className="help">Nome em laranja: troca registrada. A cada semana, cada pessoa passa para a atribuição seguinte.{temAp && ' Quem não tem atribuição na semana fica no Apoio.'}</p>
  </>;
}

// ---------- Cadastros ----------
function Cadastros({ E, isAdmin, salvar, toast, usuarios, email, setDestaque, pedidos }) {
  const [abertos, setAbertos] = useState({ nomes: true });
  const [confirmar, setConfirmar] = useState(null);
  const tg = (k) => (e) => { const o = e.currentTarget.open; setAbertos((a) => ({ ...a, [k]: o })); };
  const isMon = parse(E.inicio).getDay() === 1;
  const P = nPes(E), N = nSet(E);

  const salvarPessoa = (i, v) => { if ((E.pessoas[i] || '') === v.trim()) return; const ps = [...E.pessoas]; ps[i] = v.trim(); salvar({ pessoas: ps }, 'Nome salvo'); };
  const salvarSetor = (s, v) => { const nv = v.trim() || 'Atribuição ' + (s + 1); if (E.setores[s] === nv) return; const ss = [...E.setores]; ss[s] = nv; salvar({ setores: ss }, 'Atribuição salva'); };

  async function excluirPessoa(i) {
    if (confirmar !== 'p' + i) { setConfirmar('p' + i); return; }
    setConfirmar(null);
    const ps = E.pessoas.filter((_, k) => k !== i);
    const tr = E.trocas.filter((t) => t.cobriu !== i).map((t) => ({ ...t, cobriu: t.cobriu > i ? t.cobriu - 1 : t.cobriu }));
    await salvar({ pessoas: ps, trocas: tr }, 'Pessoa excluída');
    setDestaque(null);
    if (isAdmin) {
      const b = writeBatch(db);
      usuarios.forEach((u) => {
        if (u.pessoa === i) b.update(doc(db, 'usuarios', u.email), { pessoa: null });
        else if (u.pessoa != null && u.pessoa > i) b.update(doc(db, 'usuarios', u.email), { pessoa: u.pessoa - 1 });
      });
      b.commit().catch(() => toast('Confira o número das pessoas em "Quem pode entrar".'));
    }
  }

  return <>
    <h2>Cadastros</h2>
    <Pedidos E={E} pedidos={pedidos} isAdmin={isAdmin} toast={toast} />
    <details className="card" open={!!abertos.nomes} onToggle={tg('nomes')}><summary>Nomes da equipe</summary>
      <p className="muted small" style={{ margin: '6px 0 0' }}>O número de cada pessoa é a ordem dela na primeira semana.</p>
      {E.pessoas.map((x, i) => <div className="pair" key={i + ':' + x}>
        <span className="avatar num">{i + 1}</span>
        <input type="text" defaultValue={x} maxLength={30} placeholder="Nome" aria-label={'Pessoa ' + (i + 1)} onBlur={(e) => salvarPessoa(i, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
        <button className={'btn small ' + (confirmar === 'p' + i ? 'danger' : 'ghost')} disabled={P <= N}
          title={P <= N ? 'A equipe precisa ter pelo menos uma pessoa por atribuição' : undefined} onClick={() => excluirPessoa(i)}>
          {confirmar === 'p' + i ? 'Confirmar' : 'Excluir'}</button>
      </div>)}
      <button className="btn" style={{ marginTop: 12 }} disabled={P >= 12} onClick={() => salvar({ pessoas: [...E.pessoas, ''] }, 'Pessoa incluída')}>{I.mais}Incluir pessoa</button>
      <p className="muted small" style={{ margin: '8px 0 0' }}>{P <= N ? 'Para excluir alguém, a equipe precisa ter mais pessoas que atribuições.'
        : 'Com mais pessoas que atribuições, quem sobra em cada semana fica no Apoio e pode cobrir faltas.'}</p>
    </details>

    <details className="card" open={!!abertos.setores} onToggle={tg('setores')}><summary>Atribuições</summary>
      <p className="muted small" style={{ margin: '6px 0 0' }}>A ordem é o caminho do rodízio.</p>
      {E.setores.map((x, s) => <div className="pair" key={s + ':' + x}>
        <span className="stripe" style={{ background: COR(s), height: 40 }} />
        <input type="text" defaultValue={x} maxLength={30} aria-label={'Atribuição ' + (s + 1)} onBlur={(e) => salvarSetor(s, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} /></div>)}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <button className="btn" disabled={N >= 8 || N >= P} onClick={() => salvar({ setores: [...E.setores, 'Nova atribuição'] }, 'Atribuição adicionada')}>{I.mais}Adicionar atribuição</button>
        <button className="btn" disabled={N <= 2} onClick={() => {
          const vistos = { ...E.vistos }; Object.keys(vistos).forEach((k) => { if (+k.split('_s')[1] >= N - 1) delete vistos[k]; });
          salvar({ setores: E.setores.slice(0, -1), trocas: E.trocas.filter((t) => t.s < N - 1), vistos }, 'Atribuição removida');
        }}>Remover a última</button></div>
      <p className="muted small" style={{ margin: '8px 0 0' }}>{N >= P ? 'Para incluir uma atribuição, cadastre antes mais uma pessoa na equipe.' : 'Cada atribuição precisa de uma pessoa por semana.'}</p>
    </details>

    <details className="card" open={!!abertos.inicio} onToggle={tg('inicio')}><summary>Início do rodízio</summary>
      <label className="fl">Primeira semana começa em
        <input type="date" defaultValue={E.inicio} key={E.inicio} onChange={(e) => e.target.value && salvar({ inicio: e.target.value }, 'Data salva')} /></label>
      <p className="small" style={{ margin: '8px 0 0', color: isMon ? 'var(--fg-2)' : 'var(--warn)' }}>{isMon ? 'Começa numa segunda-feira.' : 'Sugestão: escolha uma segunda-feira.'}</p>
    </details>

    {isAdmin && <Acessos E={E} usuarios={usuarios} email={email} toast={toast} aberto={!!abertos.acessos} onToggle={tg('acessos')} />}
  </>;
}

function Pedidos({ E, pedidos, isAdmin, toast }) {
  const link = 'https://escala-rodizio.web.app';
  const convite = '*Escala de Rodízio*\nAbra o link e entre com a sua conta Google:\n' + link
    + '\n\nDepois é só aguardar a liberação. No celular, use o menu ⋮ do Chrome > Adicionar à tela inicial.';
  const sugestao = (nome) => {
    const n1 = String(nome || '').trim().split(/\s+/)[0]?.toLowerCase();
    const i = E.pessoas.findIndex((x) => x.trim() && x.trim().split(/\s+/)[0].toLowerCase() === n1);
    return i >= 0 ? String(i) : '';
  };
  async function aprovar(pd, form) {
    const pv = form.pessoa.value, papel = form.papel?.value || 'equipe';
    const b = writeBatch(db);
    b.set(doc(db, 'usuarios', pd.email), { nome: pd.nome || pd.email, papel, pessoa: pv === '' ? null : +pv });
    b.delete(doc(db, 'pedidos', pd.email));
    try { await b.commit(); toast('Acesso liberado para ' + (pd.nome || pd.email)); }
    catch { toast('Não foi possível liberar. Tente de novo.'); }
  }
  const recusar = (pd) => deleteDoc(doc(db, 'pedidos', pd.email)).then(() => toast('Pedido recusado'), () => toast('Não foi possível recusar.'));
  return <>
    <div className="card">
      <h3>Convidar a equipe</h3>
      <p className="muted small" style={{ margin: '6px 0 0' }}>Envie o link no grupo. Cada pessoa entra com a conta Google e o pedido aparece aqui para você aprovar.</p>
      <a className="btn wa" style={{ width: '100%', marginTop: 12 }} href={'https://wa.me/?text=' + encodeURIComponent(convite)} target="_blank" rel="noopener noreferrer">Enviar convite pelo WhatsApp</a>
    </div>
    {pedidos.length > 0 && <div className="card pedidos">
      <h3>Pedidos de acesso ({pedidos.length})</h3>
      {pedidos.map((pd) => <form key={pd.email} className="pedido" onSubmit={(e) => { e.preventDefault(); aprovar(pd, e.currentTarget); }}>
        <div className="li" style={{ borderBottom: 0, paddingBottom: 4 }}>
          <span className="avatar">{inicial(pd.nome)}</span>
          <div className="what"><b>{pd.nome}</b><div className="small muted">{pd.email}</div></div>
        </div>
        <label className="fl" style={{ marginTop: 4 }}>Quem é na escala?
          <select name="pessoa" defaultValue={sugestao(pd.nome)}>
            <option value="">Não está na escala</option>
            {E.pessoas.map((_, i) => <option key={i} value={i}>{i + 1} · {pnome(E, i)}</option>)}</select></label>
        {isAdmin && <label className="fl">Acesso<select name="papel" defaultValue="equipe">
          <option value="equipe">Equipe (só vê a escala)</option><option value="chefe">Enfermeira chefe</option><option value="admin">Administrador</option></select></label>}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn primary" type="submit" style={{ flex: 2 }}>{I.check}Aprovar</button>
          <button className="btn" type="button" style={{ flex: 1 }} onClick={() => recusar(pd)}>Recusar</button>
        </div>
      </form>)}
    </div>}
  </>;
}

function Acessos({ E, usuarios, email, toast, aberto, onToggle }) {
  const [confirmar, setConfirmar] = useState(null);
  const [erro, setErro] = useState('');
  const form = useRef();
  const admins = usuarios.filter((u) => u.papel === 'admin').length;

  async function liberar(e) {
    e.preventDefault();
    const f = form.current, nome = f.nome.value.trim(), em = f.email.value.trim().toLowerCase();
    if (!nome) return setErro('Escreva o nome.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setErro('Escreva um e-mail válido, como nome@gmail.com.');
    if (usuarios.some((u) => u.email === em)) return setErro('Este e-mail já tem acesso.');
    const pv = f.pessoa.value;
    try { await setDoc(doc(db, 'usuarios', em), { nome, papel: f.papel.value, pessoa: pv === '' ? null : +pv }); f.reset(); toast('Acesso liberado'); }
    catch { setErro('Não foi possível liberar. Tente de novo.'); }
  }

  return <details className="card" open={aberto} onToggle={onToggle}><summary>Quem pode entrar ({usuarios.length})</summary>
    <div>{usuarios.map((u) => { const self = u.email === email, last = u.papel === 'admin' && admins <= 1;
      return <div className="li" key={u.email}>
        <span className="avatar">{inicial(u.nome)}</span>
        <div className="what"><b>{u.nome}</b>{self && ' (você)'}<div className="small muted">{u.email}{u.pessoa != null && ' · nº ' + (u.pessoa + 1) + ' na escala'}</div></div>
        <select value={u.pessoa ?? ''} style={{ width: 'auto' }} aria-label={'Número na escala de ' + u.nome}
          onChange={(e) => updateDoc(doc(db, 'usuarios', u.email), { pessoa: e.target.value === '' ? null : +e.target.value }).then(() => toast('Vínculo salvo'))}>
          <option value="">Fora da escala</option>{E.pessoas.map((_, i) => <option key={i} value={i}>{i + 1} · {pnome(E, i)}</option>)}</select>
        <select value={u.papel} disabled={self || last} style={{ width: 'auto' }} aria-label={'Acesso de ' + u.nome}
          onChange={(e) => updateDoc(doc(db, 'usuarios', u.email), { papel: e.target.value }).then(() => toast('Acesso alterado'))}>
          {Object.entries(PAPEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        {!self && !last && <button className={'btn small ' + (confirmar === u.email ? 'danger' : 'ghost')} onClick={() => {
          if (confirmar !== u.email) return setConfirmar(u.email);
          deleteDoc(doc(db, 'usuarios', u.email)).then(() => toast('Acesso removido')); setConfirmar(null);
        }}>{confirmar === u.email ? 'Confirmar' : 'Remover'}</button>}
      </div>; })}</div>
    <h3 style={{ marginTop: 16 }}>Liberar novo acesso</h3>
    <form ref={form} onSubmit={liberar} onInput={() => setErro('')} noValidate>
      <label className="fl">Nome<input type="text" name="nome" maxLength={40} placeholder="Maria Souza" /></label>
      <label className="fl">E-mail Google<input type="text" name="email" maxLength={80} placeholder="maria.souza@gmail.com" inputMode="email" autoComplete="off" /></label>
      <label className="fl">Acesso<select name="papel" defaultValue="equipe">
        <option value="equipe">Equipe (só vê a escala)</option><option value="chefe">Enfermeira chefe (atualiza a escala)</option><option value="admin">Administrador</option></select></label>
      <label className="fl">Quem é na escala<select name="pessoa" defaultValue="">
        <option value="">Não está na escala</option>{E.pessoas.map((_, i) => <option key={i} value={i}>{i + 1} · {pnome(E, i)}</option>)}</select></label>
      <div className="err">{erro}</div>
      <button className="btn primary" type="submit" style={{ width: '100%' }}>Liberar acesso</button>
    </form>
  </details>;
}

// ---------- Janela de troca ----------
function TrocaSheet({ E, sheet, salvar, setSheet }) {
  const { w, s } = sheet, tit = titular(E, w, s), t = troca(E, w, s), ap = apoio(E, w);
  const lista = E.pessoas.map((_, i) => i).filter((i) => i !== tit).sort((x, y) => ap.includes(y) - ap.includes(x));
  const fechar = () => setSheet(null);
  const gravar = (trocas, ok) => { salvar({ trocas }, ok); fechar(); };
  return <Fundo onClose={fechar} titulo={'Quem vai cobrir ' + E.setores[s] + '?'}>
    <p className="muted" style={{ margin: '6px 0 0' }}>Semana de {periodo(E, w)} · no lugar de <b>{pnome(E, tit)}</b></p>
    <div className="pick">{lista.map((i) => { const k = E.setores.findIndex((_, z) => z !== s && efetivo(E, w, z) === i);
      return <button key={i} style={t?.cobriu === i ? { borderColor: 'var(--accent)', borderWidth: 2 } : null}
        onClick={() => gravar([...E.trocas.filter((x) => !(x.w === w && x.s === s)), { id: Date.now().toString(36), w, s, cobriu: i }], 'Troca registrada')}>
        <span className="avatar num">{i + 1}</span>
        <span style={{ flex: 1 }}>{pnome(E, i)}<span className="small" style={{ display: 'block', fontWeight: 400, color: ap.includes(i) ? 'var(--ok)' : 'var(--fg-2)' }}>
          {ap.includes(i) ? 'No apoio, livre' : k >= 0 ? 'Já está em ' + E.setores[k] : ''}</span></span>
      </button>; })}</div>
    {t && <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={() => gravar(E.trocas.filter((x) => !(x.w === w && x.s === s)), 'Troca desfeita')}>Desfazer troca (volta {pnome(E, tit)})</button>}
    <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={fechar}>Cancelar</button>
  </Fundo>;
}

// ---------- Compartilhar ----------
function ShareSheet({ E, share, setShare, inicio, ni, toast }) {
  const k = share.k, txt = useMemo(() => textoEscala(E, inicio, k), [E, inicio, k]);
  const [img, setImg] = useState(null);
  const [gerando, setGerando] = useState(false);
  useEffect(() => () => img && URL.revokeObjectURL(img.url), [img]);
  useEffect(() => setImg(null), [k]);
  const nomeArq = 'escala-' + periodo(E, inicio).split(' a ')[0].replace('/', '-') + '.png';
  const podeEnviarArquivo = !!img && navigator.canShare?.({ files: [new File([img.blob], nomeArq, { type: 'image/png' })] });

  async function gerar() {
    setGerando(true);
    try { const blob = await imagemEscala(E, inicio, k, ni); setImg({ blob, url: URL.createObjectURL(blob) }); }
    catch { toast('Não foi possível gerar a imagem.'); }
    setGerando(false);
  }
  async function enviarImagem() {
    try { await navigator.share({ files: [new File([img.blob], nomeArq, { type: 'image/png' })], title: 'Escala de Rodízio' }); }
    catch (e) { if (e?.name !== 'AbortError') toast('Não foi possível enviar. Use "Baixar imagem".'); }
  }
  function copiar() {
    navigator.clipboard?.writeText(txt).then(() => toast('Texto copiado'), () => toast('Não foi possível copiar.'));
  }

  return <Fundo onClose={() => setShare(null)} titulo="Compartilhar escala">
    <div className="chips">{[[1, 'Esta semana'], [4, '4 semanas'], [8, '8 semanas']].map(([v, l]) =>
      <button key={v} className="chip" aria-pressed={k === v} onClick={() => setShare({ k: v })}>{l}</button>)}</div>
    <div className="msg">{txt}</div>
    <div className="shbtns">
      <a className="btn wa" href={'https://wa.me/?text=' + encodeURIComponent(txt)} target="_blank" rel="noopener noreferrer">Enviar texto pelo WhatsApp</a>
      <button className="btn" onClick={copiar}>Copiar texto</button>
      <button className="btn" onClick={() => window.print()}>{I.impressora}Imprimir ou salvar em PDF</button>
      <button className="btn" disabled={gerando} onClick={gerar}>{gerando ? 'Gerando…' : img ? 'Gerar imagem de novo' : 'Gerar imagem da escala'}</button>
    </div>
    {img && <div className="preview">
      <img src={img.url} alt={'Imagem da escala de ' + periodo(E, inicio)} />
      <div className="shbtns">
        {podeEnviarArquivo && <button className="btn wa" onClick={enviarImagem}>Enviar imagem (WhatsApp e outros)</button>}
        <a className="btn" href={img.url} download={nomeArq}>Baixar imagem</a>
      </div>
    </div>}
    <p className="small muted" style={{ margin: '12px 0 0' }}>Para PDF: em "Imprimir", escolha o destino <b>Salvar como PDF</b>.</p>
    <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setShare(null)}>Fechar</button>
  </Fundo>;
}

function Fundo({ onClose, titulo, children }) {
  return <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="sheet" role="dialog" aria-modal="true" aria-label={titulo}><h2>{titulo}</h2>{children}</div>
  </div>;
}

// ---------- Versão para impressão / PDF ----------
function Impressao({ E, w0, k, ni }) {
  const temAp = nPes(E) > nSet(E);
  return <div className="print-only">
    <h1>Escala de Rodízio</h1>
    <p>{k === 1 ? 'Semana de ' + periodo(E, w0) : 'De ' + periodo(E, w0).split(' a ')[0] + ' a ' + periodo(E, w0 + k - 1).split(' a ')[1]}</p>
    <table><thead><tr><th>Semana</th>{E.setores.map((x, s) => <th key={s}>{x}</th>)}{temAp && <th>Apoio</th>}<th>Visto</th></tr></thead>
      <tbody>{Array.from({ length: k }, (_, j) => { const w = w0 + j;
        return <tr key={w} className={w === ni ? 'now' : ''}><td>{periodo(E, w)}</td>
          {E.setores.map((_, s) => { const ef = efetivo(E, w, s), t = troca(E, w, s); return <td key={s}><b>{ef + 1}{t ? '*' : ''}</b><br />{pnome(E, ef)}</td>; })}
          {temAp && <td>{apoio(E, w).map((i) => pnome(E, i)).join(', ')}</td>}<td></td></tr>; })}</tbody></table>
    <p>{E.pessoas.map((_, i) => (i + 1) + ' = ' + pnome(E, i)).join('   ·   ')}</p>
    <p className="pmuted">* troca registrada. Regra: a cada semana, cada pessoa passa para a atribuição seguinte.</p>
  </div>;
}
