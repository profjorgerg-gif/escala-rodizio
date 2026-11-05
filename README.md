# Escala de Rodízio

App web de rodízio semanal por atribuição (CME, Laboratório, Copa/Conforto, Sala de Mat. + Caixa de leite, Revisão).
Funciona no celular, no tablet e no computador.

- **Login com conta Google**, com três perfis:
  - **Administrador:** faz tudo e libera ou remove acessos.
  - **Enfermeira chefe:** atualiza a escala (nomes, atribuições, datas, vistos e trocas).
  - **Equipe:** só visualiza.
- **Telas:** Escala, Trocas e Cadastros.
- **Compartilhar:** texto pelo WhatsApp, imagem (baixar ou enviar), imprimir e salvar em PDF.
- **Tecnologia:** React + Vite, Firebase Authentication e Cloud Firestore, com publicação pelo GitHub Pages.

---

## Parte 1 — Firebase Console

Acesse **https://console.firebase.google.com** com a sua conta Google.

### 1. Criar o projeto
1. Clique em **Criar um projeto** (ou **Adicionar projeto**).
2. Nome: `escala-rodizio`. Avance.
3. Desative o **Google Analytics**, porque ele não é necessário. Clique em **Criar projeto**.

### 2. Ativar o login com Google
1. No menu à esquerda: **Criação** (Build) → **Authentication** → **Vamos começar**.
2. Na aba **Método de login**, escolha **Google** → **Ativar**.
3. Em **E-mail de suporte do projeto**, escolha o seu e-mail → **Salvar**.
4. Ainda em Authentication, vá em **Configurações** → **Domínios autorizados** → **Adicionar domínio**.
5. Digite `SEU-USUARIO.github.io`, trocando pelo seu usuário do GitHub, sem `https://` e sem barra no final.

### 3. Criar o banco de dados
1. No menu: **Criação** → **Firestore Database** → **Criar banco de dados**.
2. Local: **southamerica-east1 (São Paulo)**. Depois de criado, o local não pode ser trocado.
3. Escolha **Iniciar no modo de produção** → **Criar**.
4. Abra a aba **Regras**.
5. Apague tudo, cole o conteúdo do arquivo [`firestore.rules`](firestore.rules) e clique em **Publicar**.

### 4. Registrar o app Web e copiar a configuração
1. Clique na engrenagem ⚙ ao lado de "Visão geral do projeto" → **Configurações do projeto**.
2. Em **Seus apps**, clique no ícone **Web** (`</>`).
3. Apelido: `Escala Web`. Não marque o Firebase Hosting. Clique em **Registrar app**.
4. Copie os valores do bloco `firebaseConfig` (apiKey, authDomain, projectId, storageBucket, messagingSenderId e appId).
5. Cole esses valores no arquivo [`src/firebaseConfig.js`](src/firebaseConfig.js), substituindo cada `COLE_AQUI`.

> Esses valores **não são senhas** e podem ficar no GitHub. Quem protege os dados são as regras do Firestore.

> **Administrador inicial:** o e-mail em `ADMIN_INICIAL` (`src/firebaseConfig.js`) e em `adminInicial()` (`firestore.rules`) vira administrador no primeiro login. Se for usar outro e-mail, troque **nos dois arquivos** e publique as regras de novo.

---

## Parte 2 — GitHub

### 1. Criar o repositório
1. Acesse **https://github.com/new**.
2. Nome: `escala-rodizio`. Visibilidade: **Public**, porque o GitHub Pages gratuito exige repositório público.
3. Não marque "Add a README". Clique em **Create repository**.

### 2. Enviar os arquivos
Na página do repositório recém-criado:
1. Clique em **uploading an existing file**.
2. Arraste **todo o conteúdo** desta pasta, inclusive a pasta `.github`. Não envie as pastas `node_modules` nem `dist`, se existirem.
3. Clique em **Commit changes**.

### 3. Ligar o GitHub Pages
1. No repositório: **Settings** → **Pages**.
2. Em **Build and deployment** → **Source**, escolha **GitHub Actions**.
3. Abra a aba **Actions** e aguarde o processo **Publicar no GitHub Pages** ficar verde (cerca de 1 a 2 minutos).
4. O endereço do app será: `https://SEU-USUARIO.github.io/escala-rodizio/`

Cada vez que um arquivo for alterado no GitHub, o app é publicado de novo automaticamente.

---

## Parte 3 — Primeiro uso

1. Abra o endereço do app e clique em **Entrar com Google**, usando o e-mail do administrador inicial.
2. O sistema cria o seu acesso de administrador e uma escala padrão.
3. Em **Cadastros**, preencha:
   - **Nomes da equipe:** inclua ou exclua pessoas. A ordem é a posição de cada uma na primeira semana.
   - **Atribuições:** confira os nomes e a ordem do rodízio.
   - **Início do rodízio:** de preferência, uma segunda-feira.
   - **Quem pode entrar:** libere o e-mail Google da enfermeira chefe (perfil *Enfermeira chefe*) e de cada pessoa da equipe (perfil *Equipe*). Ligue cada pessoa ao número dela na escala para que ela veja a própria atribuição destacada.
4. **Instalar no celular:** no Chrome, abra o app → menu ⋮ → **Adicionar à tela inicial**. Ele passa a abrir como um aplicativo.

## Como funciona o rodízio
- A cada semana, cada pessoa passa para a atribuição seguinte, da esquerda para a direita.
- Com mais pessoas que atribuições, quem sobra na semana fica no **Apoio** e pode cobrir faltas.
- **Trocas:** a enfermeira chefe toca em **Trocar** e escolhe quem vai cobrir. A troca aparece em laranja na escala.
- **Visto:** um toque no círculo da atribuição. O círculo fica verde.

## Problemas comuns
| Mensagem ou sintoma | Solução |
|---|---|
| "Falta configurar o Firebase" | Preencha `src/firebaseConfig.js` (Parte 1, passo 4). |
| Erro `auth/unauthorized-domain` ao entrar | Adicione `SEU-USUARIO.github.io` em Authentication → Configurações → Domínios autorizados. |
| "Conta sem acesso" | O administrador precisa liberar exatamente esse e-mail em Cadastros → Quem pode entrar. |
| Nada salva ou "Não foi possível salvar" | Confira se as regras do `firestore.rules` foram publicadas no Firestore. |
| A janela do Google não abre no celular | Permita pop-ups para o site, ou abra o app direto pelo Chrome. |

## Rodar no computador (opcional, para desenvolvimento)
```bash
npm install
npm run dev
```
Para testar o login em `localhost`, ele já vem autorizado por padrão no Firebase.
