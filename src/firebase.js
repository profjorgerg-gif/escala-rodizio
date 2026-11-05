import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig.js';

export const configurado = !String(firebaseConfig.apiKey).includes('COLE_AQUI');

const app = configurado ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
