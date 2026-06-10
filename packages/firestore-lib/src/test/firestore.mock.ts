import { base64ToString, loadEnvFileIfExists, requireEnvKeys } from '@naturalcycles/nodejs-lib'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { FirestoreDB } from '../index.js'

loadEnvFileIfExists()

const { FIREBASE_DB_URL, SECRET_FIREBASE } = requireEnvKeys('FIREBASE_DB_URL', 'SECRET_FIREBASE')
const credential = cert(JSON.parse(base64ToString(SECRET_FIREBASE)))

const app = initializeApp({
  credential,
  databaseURL: FIREBASE_DB_URL,
})

const firestore = getFirestore(app)

export const firestoreDB = new FirestoreDB({
  firestore,
})
