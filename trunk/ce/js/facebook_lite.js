(function() {
	var app_id = false;
	var scope = 'friends_birthday';
    
    var FB = {
        _uid: '',
        init: function(id, perms) {
            app_id = id;
            scope = perms || '';
        },
        getAccessToken: function() {
        	return localStorage['facebook_access_token'];
        },
        setAccessToken: function(token) {
    		localStorage['facebook_access_token'] = token
        },
        login: function() {
            var url = "https://graph.facebook.com/oauth/authorize?client_id=" + app_id + "&redirect_uri=http://simple-birthday-reminder.googlecode.com/svn/trunk/ce/facebook.html&type=user_agent&display=page&scope=" + scope;
			window.open(url, 'fbauth');
        },
        api: function(path /*, type [post/get], params obj, callback fn */) {
            var args = Array.prototype.slice.call(arguments, 1),
                fn = false,
                params = {},
                method = 'get';
            
            /* Parse arguments to their appropriate position */
            for(var i in args) {
                switch(typeof args[i]) {
                    case 'function':
                        fn = args[i];
                    break;
                    case 'object':
                        params = args[i];
                    break;
                    case 'string':
                        method = args[i].toLowerCase();
                    break;
                }
            }
            
            /* Make sure there is a path component */
            if(!path && !params.batch) {
                return fn && fn(false);
            }
            
            /* Use the passed method i.e. get, post, delete */
            params.method = method;
            params.access_token = this.getAccessToken();
            
            /* Make call */
            $.get('https://graph.facebook.com/' + path, params, function(res) {
                /* If there is an auth error, don't continue and make them login */
                if(res && res.error && res.error.type && (res.error.message == 'Invalid OAuth access token.' || res.error.message.indexOf('Error validating access token') > -1)) {
                    FB.login();
                    return;
                }
                if(typeof fn == 'function') {
                    fn(res);
                }
            }, 'json').fail(function(){
            	delete localStorage['facebook_access_token'];
            	return;
            });
        }
    };
    
    window.FB = FB;
})();