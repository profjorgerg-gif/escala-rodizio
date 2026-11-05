// 1) Cole aqui a configuração do app Web que o Firebase Console mostra
//    em: Configurações do projeto > Seus apps > SDK setup and configuration > Config.
//    Estes valores não são senhas: podem ficar no GitHub. Quem protege os dados são as regras do Firestore.
export const firebaseConfig = {
  apiKey: 'COLE_AQUI',
  authDomain: 'COLE_AQUI.firebaseapp.com',
  projectId: 'COLE_AQUI',
  storageBucket: 'COLE_AQUI.appspot.com',
  messagingSenderId: 'COLE_AQUI',
  appId: 'COLE_AQUI',
};

// 2) E-mail Google do primeiro administrador. No primeiro login dele, o sistema cria o acesso automaticamente.
//    Precisa ser igual ao e-mail que está no arquivo firestore.rules.
export const ADMIN_INICIAL = 'profjorge.rg@gmail.com';
