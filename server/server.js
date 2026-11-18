require("dotenv").config();
const homeRouter = require("./homeRouter.js");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");
const fs = require("fs");
const request = require("request");
const sharp = require("sharp");
const multer = require("multer");
const nodeFetch = require("node-fetch");
const PORT = 3000;
const app = express();
const maxUploadImageAccepted = 15;
// const canvasSize = 528; //somehow although it's set to be 500, it is actually 561; might fix later
const canvasSize = 564; //somehow although it's set to be 500, it is actually 561; might fix later
const ColorThief = require("colorthief");
let sizeOf = require("image-size");
const { resolve } = require("path");
const { createApi } = require("unsplash-js");
const { removeBackground } = require("@imgly/background-removal-node");
const { Config } = require("@imgly/background-removal-node");
const unsplash = createApi({
  accessKey: process.env.UNSPLASH_API_KEY,
  fetch: nodeFetch.default,
});

app.set("view engine", "ejs");
const corsOptions = {
  origin: "*",
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(morgan("combined"));
app.use(express.static(path.join(__dirname, "../public")));
app.use(homeRouter);
app.use(bodyParser.json({ limit: "50mb", extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
  if (!allowedTypes.includes(file.mimetype)) {
    const error = new Error("Incorrect file");
    error.code = "INCORRECT_FILETYPE";
    return cb(error, false);
  }
  cb(null, true);
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.resolve(__dirname, "../public/uploads"); // inside frontend public
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname || `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

app.post(
  "/upload",
  upload.array("file", maxUploadImageAccepted),
  async (req, res) => {
    try {
      const dimensionArr = [];
      const fileArr = [];

      for (let file of req.files) {
        const fullPath = path.resolve(file.destination, file.filename);
        const dimensions = sizeOf(fullPath);
        dimensionArr.push(dimensions);

        const publicPath = `uploads/${file.filename}`;
        fileArr.push(publicPath);
      }
      console.log(fileArr, dimensionArr);
      res.json({
        files: fileArr, // e.g. ["/uploads/image1.jpg", "/uploads/image2.png"]
        dimensionArr,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload files" });
    }
  },
);
app.post("/save-img-file", async (req, res) => {
  try {
    let { newImgUrl, imgSavePath } = req.body;
    let base64Data;
    if (newImgUrl.includes("base64")) {
      const m = newImgUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      base64Data = Buffer.from(m[2], "base64");
    } else {
      base64Data = newImgUrl;
    }

    await sharp(base64Data, {
      failOn: "none",
      unlimited: true,
    })
      .trim()
      .toFile(imgSavePath);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error saving drawn image: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

//sending semi transparent masks will cause some issues with image has some transparency such as some png images.. to be fixed later
app.post("/send-semi-mask", async (req, res) => {
  try {
    const { maskId, partId, maskUrl, extractPayload, imgWidth, imgHeight } =
      req.body;
    const tempMaskPath = "public/assets/images/masks/mask.png";
    const rawMaskPath =
      "public/assets/images/masks/mask" + maskId + "-" + partId + ".png";
    const extractImagePath =
      "public/assets/images/extract/extract" + maskId + "-" + partId + ".png";

    //base64 => literal image path
    const m = maskUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let imageBuffer = Buffer.from(m[2], "base64");

    await new Promise((resolve, reject) => {
      fs.writeFile(tempMaskPath, imageBuffer, (error) => {
        if (error) {
          console.error("Error extracting mask: ", error);
          reject();
        } else {
          console.log("Mask extracted successfully: ", rawMaskPath);
          resolve();
        }
      });
    });
    const uploadImagePath = "public/uploads/" + maskId + ".png";
    sharp.cache(false);
    await sharp(tempMaskPath, {
      failOn: "none",
      unlimited: true,
    })
      .threshold(1)
      .negate()
      .toFile(rawMaskPath)
      .then(() => {
        sharp(uploadImagePath, {
          failOn: "none",
          unlimited: true,
        })
          .resize({ width: imgWidth, height: imgHeight })
          .composite([{ input: rawMaskPath, blend: "xor" }])
          .toFormat("png")
          .toBuffer()
          .then((data) =>
            sharp(data)
              .extract(extractPayload)
              .toFile(extractImagePath, (err, info) => {
                if (err) {
                  console.error("Error extracting: ", err);
                  res.status(500).json({ status: false });
                } else {
                  const img = resolve(process.cwd(), extractImagePath);
                  ColorThief.getPalette(img, 5)
                    .then((palette) => {
                      res.status(200).json({ status: true, palette: palette });
                    })
                    .catch((err) => {
                      res.status(500).json({ status: err });
                    });
                }
              }),
          );
      });
  } catch (error) {
    console.error("Error extracting transparent mask: ", error);
    res.status(500).json({ error: error });
  }
});

app.post("/send-local-area", async (req, res) => {
  try {
    const { greyMaskBase64 } = req.body;
    const greyM = greyMaskBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let greyMBuffer = Buffer.from(greyM[2], "base64");

    let base64Url;
    sharp.cache(false);
    await sharp(greyMBuffer, {
      failOn: "none",
      unlimited: true,
    })
      .removeAlpha()
      .threshold(1)
      .resize(canvasSize, canvasSize)
      .toBuffer()
      .then((data) => {
        // Convert the image data to a Base64 string
        const base64String = data.toString("base64");

        // Create a Base64 data URL
        base64Url = `data:image/png;base64,${base64String}`;
        // Optionally write the Base64 string to a file
      });
    res.status(200).json(base64Url);
  } catch (error) {
    console.error("Error extracting transparent mask: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/send-color-mask", async (req, res) => {
  try {
    const { colorMaskBase64 } = req.body;
    const colorM = colorMaskBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let colorMBuffer = Buffer.from(colorM[2], "base64");

    let base64Url;
    sharp.cache(false);
    await sharp(colorMBuffer, {
      failOn: "none",
      unlimited: true,
    })
      .removeAlpha()
      .greyscale()
      .threshold(1)
      .resize({ width: canvasSize, height: canvasSize })
      .toBuffer()
      .then((data) => {
        // Convert the image data to a Base64 string
        const base64String = data.toString("base64");

        // Create a Base64 data URL
        base64Url = `data:image/png;base64,${base64String}`;

        // Optionally write the Base64 string to a file
      });
    res.status(200).json(base64Url);
  } catch (error) {
    console.error("Error extracting transparent mask: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/combined-mask", async (req, res) => {
  try {
    const { colorMaskPath, textureMaskPath } = req.body;
    const colorM = colorMaskPath.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const textureM = textureMaskPath.match(
      /^data:([A-Za-z-+\/]+);base64,(.+)$/,
    );
    let colorMBuffer = Buffer.from(colorM[2], "base64");
    let textureMBuffer = Buffer.from(textureM[2], "base64");

    let base64Url;
    sharp.cache(false);
    await sharp(colorMBuffer, {
      failOn: "none",
      unlimited: true,
    })
      .removeAlpha()
      .greyscale()
      .threshold(1)
      .resize({ width: canvasSize, height: canvasSize })
      .composite([{ input: textureMBuffer, blend: "overlay" }])
      .toBuffer()
      .then((data) => {
        // Convert the image data to a Base64 string
        const base64String = data.toString("base64");

        // Create a Base64 data URL
        base64Url = `data:image/png;base64,${base64String}`;

        // Optionally write the Base64 string to a file
      });
    res.status(200).json(base64Url);
  } catch (error) {
    console.error("Error extracting combined mask: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use((err, req, res, next) => {
  if (err.code === "INCORRECT_FILETYPE") {
    res
      .status(422)
      .json({ error: "File types allowed are jpeg, jpg, and png." });
    return;
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    res.status(422).json({ error: "Allowed maximum file size is 20 MB." });
  }
});

app.post("/unsplash-download", async (req, res) => {
  try {
    const { url, fileName } = req.body;
    if (!url) return res.status(400).json({ error: "Missing URL" });

    // Make sure uploads folder exists
    const uploadPath = path.resolve(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadPath))
      fs.mkdirSync(uploadPath, { recursive: true });

    // Generate filename
    const safeFileName = fileName || `unsplash-${Date.now()}.jpg`;
    const filePath = path.join(uploadPath, safeFileName);

    // Fetch the image
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch image");

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));
    const dimensions = sizeOf(filePath);
    console.log(dimensions);
    // Return URL that frontend can use
    // const publicUrl = `/uploads/${safeFileName}`;
    res.send({ dimensions: dimensions });
  } catch (err) {
    console.error("Unsplash download error:", err);
    res.status(500).json({ error: "Failed to download image" });
  }
});

app.post("/unsplash", async (req, res) => {
  try {
    const { query, page = 1, per_page = 30 } = req.body;
    const response = await unsplash.search.getPhotos({
      query: query,
      page: page,
      perPage: per_page,
    });
    const feed = response.response;
    // extract total and results array from response
    const { total, results } = feed;
    res.send({ total, results }); //somehow if i set res.status it doesn't work but i i use res.send it works
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

app.post("/bg-remove", async (req, res) => {
  try {
    let bg_removed_path = "public/assets/images/bgrem/"; // the path on the local file system
    const { imgSource } = req.body;
    bg_removed_path += imgSource.replace("public/assets/images/extract/", "");
    bg_removed_path = bg_removed_path.replace(/\?timeStamp.*/, "");
    console.log(bg_removed_path);
    // Path to the input image
    const blob = await removeBackground(imgSource);

    // Converting Blob to buffer
    const buffer = Buffer.from(await blob.arrayBuffer());
    await sharp(buffer, {
      failOn: "none",
      unlimited: true,
    })
      .trim()
      .toFile(bg_removed_path);
    res.send({ message: true }); //somehow if i set res.status it doesn't work but i i use res.send it works
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

app.listen(PORT, () => {
  console.log(`https://localhost:${PORT}`);
});
