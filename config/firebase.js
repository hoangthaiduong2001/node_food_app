const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "cloud-image-food-app.firebasestorage.app",
});

const bucket = admin.storage().bucket();

module.exports = bucket;
