const { db, admin } = require("../util/admin");
const firebase = require("firebase");
const firebaseConfig = require("../firebaseCredential");
const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require("../util/validators");
firebase.initializeApp(firebaseConfig);

exports.signup = async (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  const { errors, valid } = validateSignupData(newUser);

  if (!valid) return res.status(400).json({ errors });

  const noImg = "no_img.png";
  //db calls
  try {
    const doc = db.doc(`/users/${newUser.handle}`).get();
    if (doc.exists) {
      return res.status(400).json({ handle: "this handle is already taken" });
    }
    const data = await firebase
      .auth()
      .createUserWithEmailAndPassword(newUser.email, newUser.password);
    const token = await data.user.getIdToken();
    const userCredentials = {
      handle: newUser.handle,
      email: newUser.email,
      createdAt: new Date().toISOString(),
      imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
      userId: data.user.uid,
    };
    await db.doc(`/users/${newUser.handle}`).set(userCredentials);
    return res.status(201).json({ token });
  } catch (error) {
    console.error(error);
    if (error.code === "auth/email-already-in-use") {
      return res.status(400).json({ email: "Email is already in use" });
    } else {
      return res
        .status(500)
        .json({ general: "Something went wrong, please try again" });
    }
  }
};

exports.login = async (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  const { errors, valid } = validateLoginData(user);

  if (!valid) return res.status(400).json({ errors });

  try {
    const data = await firebase
      .auth()
      .signInWithEmailAndPassword(user.email, user.password);
    const token = await data.user.getIdToken();
    return res.json({ token });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ general: "Something went wrong, please try again" });
  }
};

// Add user details
exports.addUserDetails = async (req, res) => {
  const userDetails = reduceUserDetails(req.body);
  try {
    await db.doc(`/users/${req.user.handle}`).update(userDetails);
    return res.json({ message: "Details added successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.code });
  }
};

// Get other users Details
exports.getUserDetails = async (req, res) => {
  try {
    const doc = await db.doc(`/users/${req.params.handle}`).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "User not found" });
    }
    const userData = doc.data();
    const data = await db
      .collection("screams")
      .where("userHandle", "==", req.params.handle)
      .orderBy("createdAt", "desc")
      .get();
    userData.screams = [];
    data.forEach((doc) => {
      userData.screams.push({
        ...doc.data(),
        screamId: doc.id,
      });
    });
    return res.json(userData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.code });
  }
};

// Get own user Details
exports.getAuthenticatedUser = async (req, res) => {
  const userData = {};
  try {
    const doc = await db.doc(`/users/${req.user.handle}`).get();
    if (doc.exists) {
      userData.credentials = doc.data();
      const data = await db
        .collection("likes")
        .where("userHandle", "==", req.user.handle)
        .get();
      userData.likes = [];
      data.forEach((doc) => {
        userData.likes.push(doc.data());
      });
    }
    const notifications = await db
      .collection("notifications")
      .where("recipient", "==", req.user.handle)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();
    userData.notifications = [];
    notifications.forEach((doc) => {
      userData.notifications.push({
        ...doc.data(),
        notificationId: doc.id,
      });
    });
    return res.json(userData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.code });
  }
};

// Upload profile image for user
exports.uploadImage = async (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong File Type Submitted" });
    }

    console.log({ fieldname, file, filename, encoding, mimetype });
    // my.image.png
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    imageFileName = `${Math.round(
      Math.random() * 100000000000
    )}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on("finish", async () => {
    try {
      await admin
        .storage()
        .bucket()
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype,
            },
          },
        });
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;

      await db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      return res.json({ message: "Image uploaded successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.code });
    }
  });
  busboy.end(req.rawBody);
};

exports.markNotificationsRead = async (req, res) => {
  // req.body is an array of ids
  let batch = db.batch();
  req.body.forEach((notificationId) => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  try {
    await batch.commit();
    return res.json({ message: "Notifications marked read" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.code });
  }
};
