import admin from "firebase-admin";

const email = process.env.ADMIN_EMAIL?.trim();
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!email || !serviceAccountPath) {
  console.error(
    "Set ADMIN_EMAIL and GOOGLE_APPLICATION_CREDENTIALS before running npm run set-admin.",
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const user = await admin.auth().getUserByEmail(email);
await admin.auth().setCustomUserClaims(user.uid, { admin: true });

console.log(`Admin claim assigned to ${email}. The user must sign out and sign in again.`);
