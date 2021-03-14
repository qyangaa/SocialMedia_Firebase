const { admin, db } = require("../util/admin");

exports.getAllScreams = async (req, res) => {
  try {
    const data = await admin
      .firestore()
      .collection("screams")
      .orderBy("createdAt", "desc")
      .get();
    let screams = [];
    data.forEach((doc) => {
      screams.push({
        screamId: doc.id,
        ...doc.data(),
      });
    });
    return res.json(screams);
  } catch (error) {
    console.error(error);
  }
};

exports.postOneScream = async (req, res) => {
  const newScream = {
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString(),
    userImage: req.user.imageUrl,
    likeCount: 0,
    commentCount: 0,
  };

  try {
    const doc = await db.collection("screams").add(newScream);
    const resScream = newScream;
    resScream.screamId = doc.id;
    return res.json(resScream);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `something went wrong` });
  }
};

exports.getScream = async (req, res) => {
  try {
    const doc = await db.doc(`/screams/${req.params.screamId}`).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Scream not found" });
    }
    const screamData = doc.data();
    screamData.screamId = doc.id;
    const data = await db
      .collection("comments")
      .orderBy("createdAt", "desc")
      .where("screamId", "==", req.params.screamId)
      .get();
    screamData.comments = [];
    data.forEach((d) => {
      screamData.comments.push(d.data());
    });
    return res.json(screamData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.code });
  }
};

exports.commentOnScream = async (req, res) => {
  if (req.body.body.trim() === "")
    return res.status(400).json({ comment: "Must not be empty" });

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    screamId: req.params.screamId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
  };

  try {
    const doc = await db.doc(`screams/${req.params.screamId}`).get();
    if (!doc.exists) return res.status(404).json({ error: "Scream not found" });
    let commentCount = doc.data().commentCount;
    if (!commentCount) commentCount = 0;
    await doc.ref.update({ commentCount: commentCount + 1 });
    await db.collection("comments").add(newComment);
    return res.json(newComment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

exports.likeScream = async (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("screamId", "==", req.params.screamId)
    .limit(1);
  const screamDocument = db.doc(`/screams/${req.params.screamId}`);
  try {
    const doc = await screamDocument.get();
    if (!doc.exists) return res.status(404).json({ error: "Scream not found" });
    const screamData = doc.data();
    screamData.screamId = doc.id;
    const data = await likeDocument.get();
    if (data.empty) {
      await db
        .collection("likes")
        .add({ screamId: req.params.screamId, userHandle: req.user.handle });
      if (!screamData.likeCount) screamData.likeCount = 0;
      screamData.likeCount++;
      await screamDocument.update({ likeCount: screamData.likeCount });
      return res.json(screamData);
    } else {
      return res.status(400).json({ error: "Scream already liked" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.code });
  }
};
exports.unlikeScream = async (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("screamId", "==", req.params.screamId)
    .limit(1);
  const screamDocument = db.doc(`/screams/${req.params.screamId}`);
  try {
    const doc = await screamDocument.get();
    if (!doc.exists) return res.status(404).json({ error: "Scream not found" });
    const screamData = doc.data();
    screamData.screamId = doc.id;
    const data = await likeDocument.get();
    if (data.empty) {
      return res.status(400).json({ error: "Scream not liked" });
    } else {
      await db.collection("likes").doc(data.docs[0].id).delete();
      screamData.likeCount--;
      await screamDocument.update({ likeCount: screamData.likeCount });
      return res.json(screamData);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.code });
  }
};

exports.deleteScream = async (req, res) => {
  const document = db.doc(`/screams/${req.params.screamId}`);
  try {
    const doc = await document.get();
    if (!doc.exists) return res.status(404).json({ error: "Scream not found" });
    if (doc.data().userHandle !== req.user.handle) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    await document.delete();
    return res.json({ message: "Scream deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.code });
  }
};
