const functions = require("firebase-functions");
const { db } = require("./util/admin");
const app = require("express")();

const {
  getAllScreams,
  postOneScream,
  getScream,
  commentOnScream,
  likeScream,
  unlikeScream,
  deleteScream,
} = require("./handlers/screams");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead,
} = require("./handlers/users");
const FBAuth = require("./util/FBAuth");

// Scream Routes
app.get("/screams", getAllScreams);
app.post("/scream", FBAuth, postOneScream);
app.get("/scream/:screamId", getScream);
app.delete("/scream/:screamId", FBAuth, deleteScream);
app.get("/scream/:screamId/like", FBAuth, likeScream);
app.get("/scream/:screamId/unlike", FBAuth, unlikeScream);
app.post("/scream/:screamId/comment", FBAuth, commentOnScream);

// Users Routes
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUser);
app.get("/user/:handle", getUserDetails);
app.post("/notifications", markNotificationsRead);

exports.api = functions.https.onRequest(app); // host/api/endpoints

exports.createNotificationOnLike = functions.firestore
  .document("likes/{id}")
  .onCreate(async (snapshot) => {
    try {
      const doc = await db.doc(`/screams/${snapshot.data().screamId}`).get();
      if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
        await db.doc(`/notifications/${snapshot.id}`).set({
          recipient: doc.data().userHandle,
          sender: snapshot.data().userHandle,
          read: "false",
          screamId: doc.id,
          type: "like",
          createdAt: new Date().toISOString(),
        });
      }
      return;
    } catch (error) {
      console.error(error);
      return;
    }
  });

exports.deleteNotificationOnUnLike = functions.firestore
  .document("likes/{id}")
  .onDelete(async (snapshot) => {
    try {
      await db.doc(`/notifications/${snapshot.id}`).delete();
      return;
    } catch (error) {
      console.error(error);
      return;
    }
  });

exports.createNotificationOnComment = functions.firestore
  .document("comments/{id}")
  .onCreate(async (snapshot) => {
    try {
      const doc = await db.doc(`/screams/${snapshot.data().screamId}`).get();
      if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
        await db.doc(`/notifications/${snapshot.id}`).set({
          recipient: doc.data().userHandle,
          sender: snapshot.data().userHandle,
          read: "false",
          screamId: doc.id,
          type: "comment",
          createdAt: new Date().toISOString(),
        });
      }
      return;
    } catch (error) {
      console.error(error);
      return;
    }
  });

exports.onUserImageChange = functions.firestore
  .document("/users/{userId}")
  .onUpdate(async (change) => {
    // change.before:
    // change.after:
    const batch = db.batch();
    if (change.before.data().imageUrl === change.after.data().imageUrl)
      return true;
    try {
      const data = await db
        .collection("screams")
        .where("userHandle", "==", change.before.data().handle)
        .get();
      data.forEach((doc) => {
        const scream = db.doc(`/screams/${doc.id}`);
        batch.update(scream, { userImage: change.after.data().imageUrl });
      });
      await batch.commit();
    } catch (error) {
      console.error(error);
      return;
    }
  });

exports.onScreamDelete = functions.firestore
  .document("/screams/{screamId}")
  .onDelete(async (snapshot, context) => {
    const screamId = context.params.screamId;
    const batch = db.batch();
    const comments = await db
      .collection("comments")
      .where("screamId", "==", screamId)
      .get();
    comments.forEach((doc) => {
      batch.delete(db.doc(`/comments/${doc.id}`));
    });
    const likes = await db
      .collection("likes")
      .where("screamId", "==", screamId)
      .get();
    likes.forEach((doc) => {
      batch.delete(db.doc(`/likes/${doc.id}`));
    });
    const notifications = await db
      .collection("notifications")
      .where("screamId", "==", screamId)
      .get();
    notifications.forEach((doc) => {
      batch.delete(db.doc(`/notifications/${doc.id}`));
    });
    try {
      await batch.commit();
      return;
    } catch (error) {
      console.error(error);
      return;
    }
  });
