require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});

let urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number,
});
let Url = mongoose.model("Url", urlSchema);

app.post(
  "/api/shorturl",
  bodyParser.urlencoded({ extended: false }),
  async (req, res) => {
    const original_url = req.body.url;
    let short_url = 0;
    // Check if the URL is valid
    urlRegex =
      /(https?:\/\/)([\w\-])+\.{1}([a-zA-Z]{2,63})([\/\w-]*)*\/?\??([^#\n\r]*)?#?([^\n\r]*)/g;
    if (original_url.match(urlRegex)) {
      try {
        // look for the url in the database
        const existingUrl = await Url.findOne({ original_url: original_url }).exec();
        if (existingUrl) {
          // if the url is found, return the short url
          return res.json({
            original_url: existingUrl.original_url,
            short_url: existingUrl.short_url,
          });
        } else {
          // if the url is not found, create a new entry in the database
          const dbUrl = await Url.findOne().sort({ short_url: -1 }).exec();
          short_url = dbUrl ? dbUrl.short_url + 1 : 1;
          const newUrl = new Url({
            original_url: original_url,
            short_url: short_url,
          });
          // save the new url to the database
          const savedUrl = await newUrl.save();
          return res.json({
            original_url: savedUrl.original_url,
            short_url: savedUrl.short_url,
          });
        }
      } catch (err) {
        return res.json({ error: "Internal server error" });
      }
    } else {
      return res.json({ error: "invalid url" });
    }
  },
);

app.get("/api/shorturl/:short_url", async (req, res) => {
  const short_url = req.params.short_url;
  try {
    // get the original url from the database
    const existingUrl = await Url.findOne({ short_url: short_url }).exec();
    if (existingUrl) {
      res.redirect(existingUrl.original_url);
    } else {
      return res.json({ error: "no short URL found for the given input" });
    }
  } catch (err) {
    return res.json({ error: "Internal server error" });
  }
});
