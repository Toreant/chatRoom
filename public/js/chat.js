/**
 * Created by apache on 15-10-4.
 */
$(function(){
    var $window = $(window);
    var $loginPage = $("[data-page='login']");
    var $chatPage = $("[data-page='chat']");
    var $error = $(".error-block");
    var socket = io();
    var connect = false;
    var DEFAULT_HASH = "login";
    /**
     * init the page
     */
    function init(){
        if(!window.location.hash) {
            changeHash(DEFAULT_HASH);
        } else {
            loadContent();
        }
    }

    init();

    function changeHash(hash){
        window.location.hash = hash;
    }

    function _initEmoji() {
        var $emojiBlock = $(".emoji-block");
        for(var i=1;i<41;i++) {
            var $emojiItem = $('<img class="emoji">');
            $emojiItem.attr('src',"/img/emoji/"+i+".png");
            $emojiItem.attr("title",i);
            $emojiBlock.append($emojiItem);
        }
    }

    /**
     * when the hash change ,change the page
     */
    window.onhashchange = loadContent;

    function loadContent(){
        var hash = window.location.hash;
        hash = hash.split("#")[1];
        if(hash === "chat" && connect) {
            $loginPage.hide();
            $chatPage.show();
            _initEmoji();
        } else if(hash === 'login') {
            $loginPage.show();
            $chatPage.hide();
        } else {
            window.location.hash = "login";
            $loginPage.show();
            $chatPage.hide();
        }
    }

    /**
     * login
     */
    $("#login").click(function(){
        _login();
    });

    function _login(){
        var user = $("#login-name").val();
        user = _cleanInput(user.trim());
        if( user === "") {
            $error.text("you must input you name");
            $error.fadeIn(400);
        } else {
            socket.emit('login',user);
            $(".loading").show();
        }
    }
    /**
     * send message
     */
    $("#send-message").click(function(){
        sendMessage();
    });

    /**
     * emoji btn & music-btn & img-btn
     */
    $("[data-send]").click(function(){
        var target = $(this).attr("data-send");
        target = "."+target+"-block";
        $("[data-block]").css("display","none");
        $(target).toggle();
        console.log("hehe");
    });

    /**
     * open the file-modal
     */
    $(".local-file").click(function(){
        $(".modal").show();
    });

    var onProgress = function(e){
        if(typeof FileReader !== 'undefined') {
            var accepteTypes = {
                'image/jpeg' : true,
                'image/png' : true,
                'image/gif' : true,
                'audio/mp3' : true
            };

            var target = e.get(0).files[0];

            if(accepteTypes[target.type] == true) {
                var fileReader = new FileReader();
                fileReader.readAsDataURL(target);
                var $content;
                fileReader.onload = function(e){
                    if(target.type !== 'audio/mp3') {
                        $content = $('<img id="pre-img" width="200" />').attr("src",this.result);
                    } else {
                        $content = $('<span class="fa fa-music"></span>')
                    }
                    $(".pre-img-block").html($content);
                    document.getElementById('file-upload').removeAttribute('disabled');
                };
            } else {
                console.log("heh");
                $error.text('type error').fadeIn(400);
            }
        } else {
            console.log("error fileReader");
        }
    };
    $("[name='file']").on("change",function(){
        onProgress($(this));
    });
    var onUpload = function(e){
        var formData = new FormData();
        formData.append("file",e.get(0).files[0]);
        $.ajax({
            type : 'post',
            dataType : 'json',
            cache : false,
            url : '/api/upload',
            data : formData,
            processData : false,
            contentType : false,
            success : function(data){
                $(".modal").hide();
                var result = data.data.path;
                result = result.split('/')[2];
                var $content;
                if(data.data.option == 1) {
                    $content = $("<img>");
                    $content.attr({"src":'/upload/'+result,"data-action":"zoom"}).css("max-width","500px");
                } else if(data.data.option == 2) {
                    $content = $('<audio controls preload="none">');
                    $content.attr('src','/upload/'+result);
                }
                var $img = $("<img>");
                $("#pre-img").attr('src','');
                $("#file-upload").attr('disabled','disabled');
                addMessage($content,0);
                socket.emit('new message',{
                    content : '/upload/'+result,
                    option : data.data.option
                });
            }
        });
    };
    $("#file-upload").click(function(){
        onUpload($("#file"));
    });

    $(".close").click(function(){
        $(".modal").hide();
    });

    $(".emoji-block").on("click",".emoji",function(){
        var $this = $(this);
        var $message = $(".input-message");
        var message = $message.val();
        message =  message+'[emoji:'+$this.attr("title")+']';
        $message.val(message);
    });

    $("#img-send").click(function(){
        var url = $("#img-url").val();
        if(url === "") {
            $error.text("img url must used!!!").fadeIn(400);
        } else {
            var $img = $("<img>");
            $img.attr({"src":url,"data-action":"zoom"}).css("max-width","500px");
            addMessage($img,0);
            $("#img-url").val("");
            $("#img-block").css("display","none");
            socket.emit("new message",{content:url,option:1});
        }
    });

    $("body").click(function(e){

        var emojiBtn = document.getElementById("emoji-btn"),
            imgBtn = document.getElementById("img-btn"),
            imgBlock = document.getElementById("img-block"),
            emojiBlock = document.getElementById("emoji-block"),
            imgUrl = document.getElementById("img-url"),
            imgSend = document.getElementById("img-send"),
            file_modal = document.getElementById('file-modal'),
            musicBlock = document.getElementById('music-block'),
            musicBtn = document.getElementById('music-btn'),
            musicUrl = document.getElementById('music-url'),
            musicSend = document.getElementById('music-send'),
            target = e.target;
        if(target !== emojiBlock && target !== imgBlock && target !== musicBlock && target !== musicBtn && target !==musicUrl && target !==musicSend
            && target !== imgSend && target !== emojiBtn && target !== imgBtn && target !== imgUrl && target !== file_modal){
            $("[data-block]").css('display',"none");
        }
    });

    $(document).keydown(function(event){
        if(event.ctrlKey && event.which === 13) {
            sendMessage();
        } else if (event.which === 13 && window.location.hash === "#login") {
            _login();
        }
    });

    function sendMessage() {
        var $inputMessage = $(".input-message");
        var message = $inputMessage.val() || "&nbsp";
        message = _cleanInput(message);
        $inputMessage.val("");
        addMessage(message,0);
        socket.emit("new message",{content: message,option: 0});
    }

    /**
     * socket listen
     */

    socket.on("you login",function(){
        connect = true;
        $error.text("you have connect the server!!").fadeIn(400);
        $(".loading").hide();
        $loginPage.hide();
        $chatPage.show();
        window.location.hash = "chat";
    });

    socket.on("message",function(data){
        addMessage(data,1);
    });

    socket.on('error',function(){
        $error.text("error").fadeIn(400);
    });

    socket.on("user left",function(data){
        $error.text(data.userName+" left").fadeIn(400);
    });

    socket.on('upload succsess',function(data){
        $error.text(data.name).fadeIn(400);
    });

    /**
     * clear the error
     */
    $error.on('mouseout',function(){
        $(this).fadeOut(400);
    });

    /**
     * @param data
     * @param option 1--me 0--other
     */
    function addMessage(data,option) {
        var $li = $('<li></li>');
        var $img = $('<img class="user-img">');
        var $message = $('<div class="chat-message"></div>');
        var $chatList = $(".chat-list");
        var $content;
        
        switch (option){
            case 0:
                $li.addClass('me');
                $img.attr("src","/img/me.png");
                $message.html(_showEmoji(data));
                $li.append($img,$message);
                $chatList.append($li);
                break;
            case 1:
                $li.addClass('other');
                $img.attr("src","/img/time.png");
                if(data.option == 0) {
                    $message.html(_showEmoji(data.message));
                } else if(data.option == 1) {
                    $content = $("<img>");
                    $content.attr({"src":data.message,"data-action":"zoom"}).css("max-width","500px");
                    $message.html($content);
                } else if(data.option == 2) {
                    $content = $('<audio controls preload="none">');
                    $content.attr('src',data.message);
                    $message.html($content);
                }
                $li.append($img,$message);
                $chatList.append($li);
                break;
        }
        var scrollTop = $chatList[0].scrollHeight;
        $chatList.animate({scrollTop:scrollTop},400);
    }

    /**
     * show the emoji in the message
     */
    function _showEmoji(data){
        var reg = /\[emoji:\d+\]/g ,
                match,
                result = data,
                img,
                emojiNum = document.getElementById("emoji-block").children.length;
        while(match = reg.exec(data)){
                var emojiIndex = match[0].slice(7,-1);
                if(emojiIndex > emojiNum) {
                    result = result.replace(match[0],"X");
                }  else {
                    img  = '<img src="/img/emoji/'+emojiIndex+'.png" width="20">';
                    result = result.replace(match[0].toString(),img);
                }
        }
        return result;
    }

    /**
     * clean the input if the input has injected 
     * @param input  
     * @return the cleanInput
     */
     function _cleanInput(input) {
        return $("<div/>").text(_striScript(input)).text();
     }

     function _striScript(input){
         return input.replace(/<script.*?>.*?<\/script>/ig, '');  
     }
});