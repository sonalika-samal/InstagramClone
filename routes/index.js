var express = require("express");
var router = express.Router();
const passport = require("passport");
const localStrategy = require("passport-local");  // To make the user logged in using username and password
const userModel = require("./users");  // To import users that is exported from the users.js
const postModel = require("./post");
const storyModel = require("./story");
passport.use(new localStrategy(userModel.authenticate()));
const upload = require("./multer");
const utils = require("../utils/utils");

// GET
router.get("https://instagramclone-1.onrender.com/", function (req, res) {
  res.render("index", { footer: false });
});

router.get("https://instagramclone-1.onrender.com/login", function (req, res) {
  res.render("login", { footer: false });
});

router.get("https://instagramclone-1.onrender.com/like/:postid", async function (req, res) {
  const post = await postModel.findOne({ _id: req.params.postid });
  const user = await userModel.findOne({ username: req.session.passport.user });
  if (post.like.indexOf(user._id) === -1) {
    post.like.push(user._id);
  } else {
    post.like.splice(post.like.indexOf(user._id), 1);
  }
  await post.save();
  res.json(post);
});

router.get("https://instagramclone-1.onrender.com/feed", isLoggedIn, async function (req, res) {
  let user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");

  let stories = await storyModel.find({ user: { $ne: user._id } })
  .populate("user");

  var uniq = {};
  var filtered = stories.filter(item => {
    if(!uniq[item.user.id]){
      uniq[item.user.id] = " ";
      return true;
    }
    else return false;
  })

  let posts = await postModel.find().populate("user");

  res.render("feed", {
    footer: true,
    user,
    posts,
    stories: filtered,
    dater: utils.formatRelativeTime,
  });
});

router.get("https://instagramclone-1.onrender.com/profile", isLoggedIn, async function (req, res) {
  let user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts")
    .populate("saved");
  console.log(user);

  res.render("profile", { footer: true, user });
});

router.get("https://instagramclone-1.onrender.com/profile/:user", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({ username: req.session.passport.user });

  if (user.username === req.params.user) {
    res.redirect("https://instagramclone-1.onrender.com/profile");
  }

  let userprofile = await userModel
    .findOne({ username: req.params.user })
    .populate("posts");

  res.render("userprofile", { footer: true, userprofile, user });
});

router.get("https://instagramclone-1.onrender.com/follow/:userid", isLoggedIn, async function (req, res) {
  let followKarneWaala = await userModel.findOne({
    username: req.session.passport.user,
  });

  let followHoneWaala = await userModel.findOne({ _id: req.params.userid });

  if (followKarneWaala.following.indexOf(followHoneWaala._id) !== -1) {
    let index = followKarneWaala.following.indexOf(followHoneWaala._id);
    followKarneWaala.following.splice(index, 1);

    let index2 = followHoneWaala.followers.indexOf(followKarneWaala._id);
    followHoneWaala.followers.splice(index2, 1);
  } else {
    followHoneWaala.followers.push(followKarneWaala._id);
    followKarneWaala.following.push(followHoneWaala._id);
  }

  await followHoneWaala.save();
  await followKarneWaala.save();

  res.redirect("back");
});

router.get("https://instagramclone-1.onrender.com/search", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({ username: req.session.passport.user });
  res.render("search", { footer: true, user });
});

router.get("https://instagramclone-1.onrender.com/save/:postid", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({ username: req.session.passport.user });

  if (user.saved.indexOf(req.params.postid) === -1) {
    user.saved.push(req.params.postid);
  } else {
    var index = user.saved.indexOf(req.params.postid);
    user.saved.splice(index, 1);
  }
  await user.save();
  res.json(user);
});

router.get("https://instagramclone-1.onrender.com/search/:user", isLoggedIn, async function (req, res) {
  const searchTerm = `^${req.params.user}`;
  const regex = new RegExp(searchTerm);

  let users = await userModel.find({ username: { $regex: regex } });

  res.json(users);
});

router.get("https://instagramclone-1.onrender.com/edit", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("edit", { footer: true, user });
});

router.get("https://instagramclone-1.onrender.com/upload", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({ username: req.session.passport.user });
  res.render("upload", { footer: true, user });
});

router.post("https://instagramclone-1.onrender.com/update", isLoggedIn, async function (req, res) {
  const user = await userModel.findOneAndUpdate(
    { username: req.session.passport.user },
    { username: req.body.username, name: req.body.name, bio: req.body.bio },
    { new: true }
  );
  req.login(user, function (err) {
    if (err) throw err;
    res.redirect("https://instagramclone-1.onrender.com/profile");
  });
});

router.post(
  "https://instagramclone-1.onrender.com/post",
  isLoggedIn,
  upload.single("image"),
  async function (req, res) {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });

    if (req.body.category === "post") {
      const post = await postModel.create({
        user: user._id,
        caption: req.body.caption,
        picture: req.file.filename,
      });
      user.posts.push(post._id);
    } else if (req.body.category === "story") {
      let story = await storyModel.create({
        story: req.file.filename,
        user: user._id,
      });
      user.stories.push(story._id);
    } else {
      res.send("tez mat chalo");
    }

    await user.save();
    res.redirect("https://instagramclone-1.onrender.com/feed");
  }
);

router.post(
  "https://instagramclone-1.onrender.com/upload",
  isLoggedIn,
  upload.single("image"),
  async function (req, res) {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    user.picture = req.file.filename;
    await user.save();
    res.redirect("https://instagramclone-1.onrender.com/edit");
  }
);

// POST

router.post("https://instagramclone-1.onrender.com/register", function (req, res) {
  const user = new userModel({
    username: req.body.username,
    email: req.body.email,
    name: req.body.name,
  });

  userModel.register(user, req.body.password).then(function (registereduser) {
    passport.authenticate("local")(req, res, function () {
      res.redirect("https://instagramclone-1.onrender.com/profile");
    });
  });
});

router.post(
  "https://instagramclone-1.onrender.com/login",
  passport.authenticate("local", {
    successRedirect: "https://instagramclone-1.onrender.com/feed",
    failureRedirect: "https://instagramclone-1.onrender.com/login",
  }),
  function (req, res) {}
);

router.get("https://instagramclone-1.onrender.com/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("https://instagramclone-1.onrender.com/login");
  });
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("https://instagramclone-1.onrender.com/login");
  }
}

module.exports = router;
