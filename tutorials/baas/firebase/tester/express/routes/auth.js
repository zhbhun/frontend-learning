const express = require("express");
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} = require("firebase/auth");

const auth = getAuth();

const router = express.Router();

/* GET /signup
 *
 * This route prompts the user to sign up.
 *
 * The 'signup' view renders an HTML form, into which the user enters their
 * desired username and password.  When the user submits the form, a request
 * will be sent to the `POST /signup` route.
 */
router.get("/signup", function (req, res, next) {
  res.render("signup");
});

router.post("/signup", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed in
        const user = userCredential.user;
        console.log(user);
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(error);
      });
    res.redirect("/");
  } catch (e) {
    res.redirect("register");
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      var user = userCredential.user;
    })
    .catch((error) => {
      var errorCode = error.code;
      var errorMessage = error.message;
    });
  res.redirect("/");
});

router.get("/logout", function (req, res) {
  signOut(auth)
    .then(() => {
      res.redirect("/login");
    })
    .catch((error) => {
      // An error happened.
    });
});

module.exports = router;
