var express = require('express');
var session = require('express-session')
const fileUpload = require('express-fileupload');
var bodyParser = require("body-parser");
var path = require('path');
const fs = require('fs');
var pm2 = require('pm2');

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
//app.use(express.static(__dirname + '/view'));

app.use(fileUpload());



app.engine('html',require('ejs').renderFile);
   app.set('view engine', 'html');
   app.set('views',(__dirname + '/view'));

// Use the session middleware
app.use(session({ secret: 'fdslfslf #$% 9879sdf41fs5d00-',
resave: true,
saveUninitialized: true,
cookie: { maxAge: 6000000 }}))


const testFolder = './';
view=__dirname +'/view/';
uploadRoot='/home/';

username='admin';
password='ns123456ns';

app.get('/', function(req, res) {
  res.render('index');
});

app.post('/loginUser', function(req, res) {

  user=req.body.username ;
  pass=req.body.password;

  if(user!=null && pass !=null && user===username && pass==password){
    req.session.login=true;
    res.send({ok:true,se:'se:'+req.session.login});
  }else{
    res.send({ok:false,se:'se:'+req.session.login});
  }

});
app.get('/nitro', function(req, res) {
  if(req.session.login==null  || req.session.login !=true){
    //res.send({ok:false,msg:'access danied',se:'se:'+req.session.login});
    res.redirect('/');
  }
  else{
    app.use(express.static(__dirname + '/'));
    req.session.login=true;
    if(req.session.path===undefined){
      req.session.path='';
    }
    res.render("nitro");
  }
});

app.post('/upload', function(req, res) {
  if(req.session.login==null  || req.session.login !=true){
    //res.send({ok:false,msg:'access danied',se:'se:'+req.session.login});
    res.redirect('/');
    return;
  }
  if (!req.files)
  return res.status(400).send('No files were uploaded.');

  let sampleFile = req.files.myfile;
  if(req.session.path===undefined){
    req.session.path='';
  }
  sampleFile.mv(uploadRoot+req.session.path+sampleFile.name, function(err) {
    if (err)
    return res.status(500).send(err);

    res.send('File uploaded! : '+sampleFile.name);
  });
});

app.post('/setPath', function(req, res) {
  if(req.body.path==null){
    res.send({ok:false,path:req.session.path});
    return;
  }
  if(req.session.login==null  || req.session.login !=true){
    //res.send({ok:false,msg:'access danied',se:'se:'+req.session.login});
    res.redirect('/');
    return;
  }
  gpath=req.body.path;
  gpathTemp=gpath.split('/');
  if(gpathTemp[gpathTemp.length-1]!=='' ){
    gpath=gpath+'/';
  }
  req.session.path=gpath;
  res.send({ok:true,path:req.body.path});
});
app.post('/getDirList', function(req, res) {
  if(req.session.login==null  || req.session.login !=true){
    //res.send({ok:false,msg:'access danied',se:'se:'+req.session.login});
    res.redirect('/');
    return;
  }
  mpath=(uploadRoot+req.session.path);
  dirList={dirs:[],files:[],path:req.session.path,pm2:[]};
  try {


    fs.readdir(mpath, function(err, items) {
      try{
        for (var i=0; i<items.length; i++) {
          var file = mpath + items[i];

          if(fs.statSync(file).isDirectory()){
            name=file.split('/');
            dirList.dirs.push(name[name.length-1]);
          }
          else{
            name=file.split('/');
            dirList.files.push(name[name.length-1]);
          }
        }

      } catch (e) {
        mpath=(uploadRoot);
        req.session.path=mpath;
        dirList={dirs:[],files:[],path:req.session.path,pm2:[]};
        res.send(dirList);
      }
      pm2.connect(function(err) {
        if (err) {
          console.error(err);
          process.exit(2);
        }
        pm2.list(function(a,b) {
          //  res.send({ok:true,result:b});
          dirList.pm2=b;
          res.send(dirList);
        });
      });
      //res.send(dirList);

    });
  } catch (e) {
    mpath=(uploadRoot);
    req.session.path=mpath;
    dirList={dirs:[],files:[],path:req.session.path,pm2:[]};
    res.send(dirList);
  }
})
var deleteFolderRecursive = function(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};
app.post('/deleteItem', function(req, res) {
  if(req.session.login==null  || req.session.login !=true){
    res.send({ok:false,msg:'access danied'});
    return;
  }

  mpath=(uploadRoot+req.session.path+req.body.name);
  //r= fs.unlinkSync(mpath);
  try {
    if(fs.lstatSync(mpath).isDirectory()){
      deleteFolderRecursive(mpath);
    }
    else{
      fs.unlinkSync(mpath);
    }
    res.send({ok:true});
  } catch (e) {
    res.send({ok:false,msg:'error'});
  }
});

app.post('/pm2', function(req, res) {
  if(req.session.login==null  || req.session.login !=true){
    res.send({ok:false,msg:'access danied'});
    return;
  }

  if (req.body.by==='path' || req.body.by==null) {
    mpath=(uploadRoot+req.session.path+req.body.name);
  }
  else {
    mpath=(req.body.name);
  }
  if(req.body.action ===undefined){
    res.send({ok:false,msg:'error 100'});
    return;
  }
  pm2.connect(function(err) {
    if (err) {
      console.error(err);
      process.exit(2);
    }
    console.log(req.body.action);
    if(req.body.action==='start'){
      if (req.body.appname !=null && req.body.appname !=='') {
        mpath={
          script:mpath,
          name:req.body.appname}
        }
        console.log(mpath);
        pm2.start(mpath, function(err, apps) {
          pm2.disconnect();   // Disconnects from PM2
          res.send({ok:true,app:apps});
          if (err) throw err
        });
      }
      else if (req.body.action==='list') {
        pm2.list(function(a,b) {
          pm2.disconnect();
          res.send({ok:true,result:b});
        });
      }
      else if (req.body.action==='stop') {
        pm2.stop(mpath,function(a,apps) {
          pm2.disconnect();
          res.send({ok:true,app:apps});
        });
      }
      else if (req.body.action==='flush'){
        pm2.flush(function(a,b) {
          pm2.disconnect();

        });
        res.send({ok:true});
      }
      else{
        res.send({ok:false,msg:'no action'});

      }
    });

  });


  app.post('/deleteItem', function(req, res) {
    if(req.session.login==null  || req.session.login !=true){
      res.send({ok:false,msg:'access danied'});
      return;
    }

    mpath=(uploadRoot+req.session.path+req.body.name);

  });
  app.get('/getLog', function(req, res) {
    if(req.session.login==null  || req.session.login !=true){
      res.send({ok:false,msg:'access danied'});
      return;
    }

    log={};
    console.log(req.query);
  /*  res.send({ok:true});
    return;*/
    fs.readFile(req.query.log, 'utf8', function(err, data) {
        if (err) throw err;
        log.log=data;
        fs.readFile(req.query.error, 'utf8', function(err, data_error) {
            if (err) throw err;
            log.error=data_error;
            res.send({ok:true,result:log});
        });
    });

  });


  app.get('/downloadFile', function(req, res) {
    if(req.session.login==null  || req.session.login !=true){
      res.send({ok:false,msg:'access danied'});
      return;
    }
    mpath=(uploadRoot+req.session.path+req.query.name);
    res.sendFile(mpath);
  });


app.listen(8080);
