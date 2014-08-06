'use strict';
define(['q'],
    function (Q) {
        function databaseTab(rest3dToTree,data,parent) {
            this.rest3dToTree = rest3dToTree;
            this.name = data.name;
            this.indexLogin = data.indexLogin;
            this.picture = data.picture;
            this.description = data.description;
            this.upload = data.upload;
            this.login = data.login;
            this.signin = data.signin;
            this.parent = parent;
            var nodeBuffer;
            var stock = this;
   
            //     stock = this;
            //     if (this.login != 2) {
            //         // stock.treeCallback();

            //     }
            //     else {
            //         // treeCallback(); 
            //         window.treeCallback = stock.treeCallback();
            //     }

            // };

            //window["trees_"+stock.name]
            this.loginArea = function () {
                // var html = $("<div id='loginDiv' style='border:2px solid red'></div>");
                // renderMenu["tab_"+stock.name].append(html)"login_"+stock.name
                var im;
                stock = this;
                var loginButton = GUI.button("", this.parent, function () {
                    var tmp = '<div id="frame_' + stock.name + '"></div>';
                    var notif = GUI.notification({
                        title: stock.name + " login",
                        text: tmp,
                        type: "text",
                    });

                    //GUI.addInput = function (_id, _defaultValue, _parent, _onChangeCallback) {
                    tmp = $("#frame_" + stock.name);
                    var username = GUI.addInput("username_" + stock.name, "Username", tmp);
                    var pwd = GUI.addInput("pwd_" + stock.name, "pwd", tmp, "", "pwd");
                    var callbackAuth = function () {
                        window.pleaseWait(true);

                        function async() {
                            var defer = Q.defer();
                            $.ajax({
                                type: "POST",
                                url: '/rest3d/login/' + stock.name ,
                                data: {
                                    "user": username.val(),
                                    "passwd": pwd.val()
                                },
                                success: function (data) {
                                    data = jQuery.parseJSON(data);
                                    im.prop("src", "../gui/images/traffic-cone_blue.png");
                                    loginButton.prop('disabled', true);
                                    GUI.addTooltip({
                                        parent: loginButton,
                                        content: data,
                                    });
                                    tmp2.prop('disabled', true);
                                    notif.remove();
                                    GUI.notification({
                                        title: stock.name + " login",
                                        text: data,
                                        type: "info",
                                    });
                                    $("#header_" + stock.name).text("Welcome " + data.split(" ").pop() + "!");
                                    stock.rest3dToTree.buildContent();
                                    // setTimeout(function(){
                                    //       stock.rest3dToTree.setUpload();
                                    //       //stock.rest3dToTree.tree.openAll();
                                    // },50); 
                                    //stock.generateCoreTab();
                                    //window.treeCallback
                                    defer.resolve();
                                },
                                error: function (data) {
                                    // data = jQuery.parseJSON(data);
                                    GUI.notification({
                                        title: stock.name + " login",
                                        text: "Authentification failed",
                                        type: "info",
                                    });
                                    defer.resolve();
                                },
                                contentType: 'application/x-www-form-urlencoded',
                            });
                            return defer.promise;
                        }
                        async().then(
                            function () {
                                window.pleaseWait(false);
                            })
                    }
                    var tmp2 = GUI.button("", tmp, callbackAuth);
                    pwd.keypress(
                        function (e) {
                            if (e.keyCode == 13) {
                                tmp2.click();
                            }
                        });
                    tmp2.find("span").remove();
                    GUI.addIcon(tmp2, "ui-icon-unlocked");
                });
                loginButton.css({
                    "float": "right",
                    "box-shadow": "3px 3px 1px #888888",
                });
                loginButton.find("span").remove();
                GUI.addTooltip({
                    parent: loginButton,
                    content: "Not connected",
                });
                im = GUI.image(loginButton, "traffic-light", "../gui/images/traffic-cone_red.png", '20', '20');


            };
            this.descriptionArea = function () {
                this.parent.append("<br>");
                var html = $('<div style="background:white;box-shadow: 5px 5px 5px #888888;">');
                this.parent.append(html);
                html.append(stock.description);
                this.parent.append("<br>");
            }
            stock = this;
            window["login_" + stock.name] = function () {
                if (typeof stock.signin == "string") {
                    $("#dialog").dialog("close");
                    var gitHtml = $('<div id="dialog"><iframe id="myIframe" src="" style="height:100% !important; width:100% !important; border:0px;"></div>');
                    $('body').append(gitHtml);
                    $("#dialog").dialog({
                        title: stock.name + " sign in!",
                        width: '600',
                        height: '500',
                        open: function () {
                            $('#myIframe').attr('src', stock.signin);
                        },
                        close: function () {
                            gitHtml.remove();
                        },
                    });
                    $("#dialog").css({
                        'min-height': 'none !important;'
                    });
                }
                else {
                    var win = window.open(stock.signin[0], '_blank');
                    win.focus();
                }
            }
            // this.generateCoreTab();

            switch (this.indexLogin) {
            case 0:
                       if (this.indexLogin == 0) {
                    var text = '(no authentification required)';
                }
                else {
                    var text = '(authentification not yet implemented)';
                }
                var tmp = $("<a style='color: red;'>" + text + "</a>");
                this.parent.append(tmp);
                this.parent.append("<br><br>");
                this.descriptionArea();
                this.parent.append("<br><hr><br>")
                var stock = this;
                var flag = true;
                this.parent.focusTab(function(){
                    if(flag){
                    stock.rest3dToTree.createTree();
                    setTimeout(function(){
                          stock.rest3dToTree.setUpload();
                          //stock.rest3dToTree.tree.openAll();
                    },50);   
                    }
                    flag=false;               
                });    
                break;
            case 3:
                if (this.indexLogin == 0) {
                    var text = '(no authentification required)';
                }
                else {
                    var text = '(authentification not yet implemented)';
                }
                var tmp = $("<a style='color: red;'>" + text + "</a>");
                this.parent.append(tmp);
                this.parent.append("<br><br>");
                this.descriptionArea();
                this.parent.append("<a style='float:right;' href='javascript:window.login_" + stock.name + "()'>+Sign in</a><br><hr><br>");
                var stock = this;
                var flag = true;
                this.parent.focusTab(function(){
                    if(flag){
                    stock.rest3dToTree.buildContent();
                    // setTimeout(function(){
                    //       stock.rest3dToTree.setUpload();
                    //       //stock.rest3dToTree.tree.openAll();
                    // },50);   
                    }
                    flag=false;               
                });    
                break;
            case 1:
                var tmp = $("<a style='color: red;'>(authentification is optional)</a>");
                this.parent.append(tmp);
                this.loginArea();
                this.parent.append("<br><br>");
                this.descriptionArea();
                this.parent.append("<a style='float:right;' href='javascript:window.login_" + stock.name + "()'>+Sign in</a><br><hr></br>");
                if(!this.upload){
                    // this.generateCoreTab();
                    this.parent.focusTab(function () {
                        stock.treeCallback();
                        stock.accor["sample_" + stock.name].openAccordion();
                        stock.accor["search_" + stock.name].openAccordion();
                    });
                }
                else{
                    var stock = this;
                    var flag = true;
                    this.parent.focusTab(function(){
                        if(flag){
                            stock.rest3dToTree.createTree();
                        setTimeout(function(){
                              stock.rest3dToTree.setUpload();
                              //stock.rest3dToTree.tree.openAll();
                        },50);   
                        }
                        flag=false;               
                    });                
                }
                break;
            case 2:
                var tmp = $("<a id='header_" + stock.name + "' style='color: red;'>(authentification is required)</a>");
                this.parent.append(tmp);
                this.loginArea();
                this.parent.append("<br><br>");
                this.descriptionArea();
                this.parent.append("<a style='float:right;' href='javascript:window.login_" + stock.name + "()'>+Sign in</a><br><hr><br>");
                break;
            }
            GUI.image(this.parent.title, "img-render", stock.picture, 12, 14, "before");

        };
        return databaseTab;
    });