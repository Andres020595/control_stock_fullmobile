import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function logLogin(email: string) {
    try {
        await addDoc(collection(db, 'logs'), {
            email,
            action: 'LOGIN',
            details: 'Inicio de sesión exitoso',
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error logging login:', error);
    }
}

export async function logAction(email: string, action: string, details: any) {
    try {
        await addDoc(collection(db, 'logs'), {
            email,
            action,
            details: typeof details === 'string' ? details : JSON.stringify(details),
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error logging action:', error);
    }
}
