// 1) Cole aqui a configuração do app Web que o Firebase Console mostra
//    em: Configurações do projeto > Seus apps > SDK setup and configuration > Config.
//    Estes valores não são senhas: podem ficar no GitHub. Quem protege os dados são as regras do Firestore.
export const firebaseConfig = {
  apiKey: 'AIzaSyBUK_wmTUgRAuwKmoOvtem8D1tMnZX-V6o',
  authDomain: 'escala-rodizio.firebaseapp.com',
  projectId: 'escala-rodizio',
  storageBucket: 'escala-rodizio.firebasestorage.app',
  messagingSenderId: '347363406143',
  appId: '1:347363406143:web:3296cd31ade1ef3a68e38a',
};

// 2) E-mail Google do primeiro administrador. No primeiro login dele, o sistema cria o acesso automaticamente.
//    Precisa ser igual ao e-mail que está no arquivo firestore.rules.
export const ADMIN_INICIAL = 'profjorge.rg@gmail.com';
