const express = require('express')
const app = express()
const reverseImageSearch = require('node-reverse-image-search')
const multer = require('multer')
const cloudinary = require('cloudinary')
const fsExtra = require('fs-extra')
const fs = require('fs')
var sightengine = require('sightengine')('1294866927', 'xL6p7JdqNucZu7EX5jsA');
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret
});


if (!fs.existsSync('./photos')) {
  fs.mkdirSync('./photos');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'photos')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix)
  }
})

const upload = multer({ storage: storage, dest: './photos/' }).fields([{ name: "image" }, { name: "video" }])


app.post('/image', async (req, res) => {
  try {

    upload(req, res, async (err) => {
     
      const upload = await cloudinary.v2.uploader.upload(req.files.image[0].path)
      let imageResult
      await reverseImageSearch(upload.secure_url, (resu) => imageResult = resu);

      if (imageResult.length > 1)
        res.status(200).json({
          status: 'success',
          message: 'Duplicate image'
        })

      else {
        const imageContent = await sightengine.check(['nudity', 'type', 'properties', 'wad', 'face', 'celebrities', 'scam', 'offensive']).set_url(upload.secure_url)
        console.log(typeof imageContent.weapon)
        let obj = {};
        obj.nudity = imageContent.nudity
        obj.weapon = imageContent.weapon
        obj.alcohol = imageContent.alcohol;
        obj.drugs = imageContent.drugs
        obj.scam = imageContent.scam;
        obj.offensive = imageContent.offensive
        obj.faces = imageContent.faces

        res.status(200).json({
          status: 'Success',
          data: obj
        })

      }
      await fsExtra.emptyDirSync('./photos')
    })

  } catch (err) {

    res.status(404).json({
      status: 'Fail',
      message: err.message
    })
    await fsExtra.emptyDirSync('./photos')

  }


})

app.post('/video', async (req, res) => {
  try {
    upload(req, res, async (err) => {

      const upload = await cloudinary.v2.uploader.upload(req.files.video[0].path, {
        resource_type: "video",

      })

    
      let videoData = await sightengine.check(['wad', 'offensive', 'gore']).video_sync(upload.secure_url)
    //  console.log(videoData.data.frames);
      // let totalFrames = videoData.data.frames.length

      let obj = {
        weapon: 0,
        alcohol: 0,
        drugs: 0,
        offensive: 0,
        gore: 0,
      };

      videoData.data.frames.forEach(frame => {
      
        if (frame.weapon)
          obj.weapon += parseFloat(frame.weapon)
        if (frame.alcohol)
          obj.alcohol += parseFloat(frame.alcohol);
        if (frame.drugs)
          obj.drugs += parseFloat(frame.drugs);
        if (frame.offensive.prob)
          obj.offensive += parseFloat(frame.offensive.prob)
        if (obj.gore.prob)
          obj.gore += parseFloat(frame.gore.prob)
      })

  //    console.log(obj)

      // let final = {
      //   weapon: obj.weapon / totalFrames,
      //   alcohol: obj.alcohol / totalFrames,
      //   drugs: obj.drugs / totalFrames,
      //   offensive: obj.offensive / totalFrames,
      //   gore: obj.gore / totalFrames,
      //   photo: obj.photo / totalFrames,
      //   weapon: obj.weapon / totalFrames
      // }

      // console.log(final)

        if(obj.weapon>.2)
          obj.isTerror = true
          else if(obj.weapon >.25 || obj.offensive > .25)
        obj.isTerror = true 
        else obj.isTerrorDanger = false

      res.status(200).json({
        obj
      })

      await fsExtra.emptyDirSync('./photos')
    })//uploads


  } catch (err) {
    console.log('here')
    console.log(err.message)
  }
})


const port = process.env.PORT || 8000


app.listen(port, () => {
  console.log(`Server is running ar port ${port}`)
})