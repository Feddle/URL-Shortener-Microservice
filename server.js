
const express = require('express');
const mongo = require('mongodb').MongoClient;
const crypto = require('crypto');

const app = express();
const url = 'mongodb://'+process.env.DB_USER+':'+process.env.DB_PASS+'@'+process.env.DB_HOST+':'+process.env.DB_PORT+'/'+process.env.DB_NAME;
const regex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;

app.use(express.static('public'))


app.get("/", (request, response) => {
  response.sendFile(__dirname + '/views/index.html')
})


app.get("/new/*", (req, res, next) => {    
  res.set('Content-Type', "application/json");   
  if(!req.params[0].match(regex)) {
    let err = "URL was not of valid format. ex. http://www.example.com";
    res.send({error: err});
  }
  else {
    next();
  }
}, (req, res) => {
  mongo.connect(url, function (err, client) {
      if (err) res.end("Error connectin to database");      
      let original_url = req.originalUrl.substring(5);    
      console.log("Connection established to database");
      const glitch_db = client.db("glitch");
      const coll = glitch_db.collection('urlShortener'); 
      let short_url = crypto.randomBytes(3).toString('hex');
      let obj = {"orig_url": original_url, "short_url": short_url};

      coll.insert(obj, {forceServerObjectId: true}, (err, data) => {
        if(err) res.send(err); 
        else {res.send({"original_url": obj.orig_url, "short_url": `https://short-url-feddle.glitch.me/${obj.short_url}`}); client.close();}
      });          
    });
})


app.get("/:url", (req, res) => {
  mongo.connect(url, function (err, client) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
      res.send(err);
    }
    else {
      console.log("Connection established to database");
      const glitch_db = client.db("glitch");
      const coll = glitch_db.collection('urlShortener');       
      coll.findOne({"short_url": req.params.url}, function(err, doc) {
        if(err) res.send({error: err});
        if(!doc) res.send({error: "No such url in database"});
        else {
          res.redirect(doc.orig_url);
          client.close();
        }
      });            
    }
  });  
})

app.get("*", (req, res) => {
  res.status(404).end("Page not found");
})


// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`)
})


