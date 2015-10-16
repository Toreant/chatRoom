/**
 * Created by apache on 15-10-4.
 */
var express =require('express');
var app = express();
var http = require('http');
var path = require('path');
var emojify = require('emojify.js');

var server  = http.createServer(app);
var io = require('socket.io').listen(server);

var multer = require('multer');
var upload = multer({dest : './public/upload/'});

var passport = require('passport');
var GithubStrategy = require('passport-github').Strategy;

/**
 * must use server.listen()
 */
server.listen('3000',function(){
    console.log("server is listen 3000 port");
});


app.use(express.static(__dirname + '/public'));
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');


/**
 * user and number of user
 */
var user = {};
var userNums = 0 ;

app.use(passport.initialize());
passport.use(new GithubStrategy({
    clientID: "84284d0da13a339320ef",
    clientSecret: "4f38d45fc49f2259bf7876d21dff2c2233fbfdcf",
    callbackURL: "http://localhost:3000"
}, function(accessToken, refreshToken, profile, done) {
    done(null, profile);    
}));
app.get("/login/github", passport.authenticate("github", {session: false}));
app.get("/login/github/callback", passport.authenticate("github", {
    session: false,
    failureRedirect: '/me',
    successFlash: '功登陆成！'
}), function (req, res) {
    req.session.user = {name: req.user.username, head: "https://gravatar.com/avatar/" + req.user._json.gravatar_id + "?s=48"};
    res.redirect('/me');
});

app.get('/me',function(req,res,next){
    res.send("hehe");
});

app.post('/api/upload',upload.single('file'),function(req,res,next){
    var option;
    switch(req.file.mimetype){
        case 'image/jpeg' :
        case 'image/gif' :
        case 'image/png' : option = 1;break;
        case 'audio/mp3' : option = 2;break;
    }
    res.json({
        meta : 'success',
        'status': 200,
        'data': {
            'path' : req.file.path,
            'option' : option
        }
    });
});

/*
 * socket.io program
 */
io.on('connection',function(socket){
    socket.join("apache");
    /**
     * for the new message function
     */
    socket.on('new message',function(data){
        if(socket.join === true) {
            /**
             * option 0--message 1--img
             */
            socket.in('apache').emit('message',{
                userName : socket.userName,
                message : data.content,
                option : data.option
            });
        } else {
            socket.emit('error',{
                error : "you must login"
            });
        }
    });

    /**
     * for the new user function
     */
    socket.on('login',function(data){
        /**
         * check if the user is already in the user line
         */
        if(!user.hasOwnProperty(data)) {
            socket.userName = data;
            //user.push(data);
            userNums++;
        }

        socket.join = true;

        socket.emit("you login",{
            userName : socket.userName
        });

        socket.in('apache').emit('logined',{
            userName : socket.userName,
            num : userNums
        });

    });

    /**
     * when an user is leaving,broadcast the message
     */
    socket.on('disconnect',function(data){
        userNums--;
        socket.in("apache").emit('user left',{
            userName : socket.userName,
            userNums : userNums
        });
    });

    /**
     * for the user typing
     */
    socket.on('typing',function(data){
        io.emit('typing',{
            message : data.message
        });
    });

    /**
     * for the file upload
     */
    socket.on("file upload",function(data){
        socket.in('apache').emit('upload succsee',{
            name : "hehe"
        });
    });
});

app.get('/',function(req,res,next){
    res.render('index');
});

app.use(function(req,res,err){
    res.status = 404;
    res.send("404 not found");
});



module.exports = app;