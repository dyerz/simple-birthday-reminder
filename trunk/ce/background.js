var sbr = new SimpleBirthdayReminder();
sbr.load();

ga('create', 'UA-45859822-1', {
  'cookieDomain': 'auto'
});	


addScript('https://apis.google.com/js/client.js?onload=beginBackgroundUpdate');

function addScript(src){
	var s = document.createElement('script');
	s.setAttribute('src', src);
	document.body.appendChild(s);
}

function beginBackgroundUpdate(){
	ga('send', 'pageview', {
		'page': '/background.html',
		'title': 'Background'
	});

	
	var iconBadgeColor = localStorage['iconBadgecColor'];
	
	if(!iconBadgeColor){
		iconBadgeColor = '#FF0000';
	}
	
	chrome.browserAction.setBadgeBackgroundColor({color: iconBadgeColor});
	
	chrome.browserAction.setBadgeText({
		text : '?'
	});
	
	sbr.loadData();
}

chrome.runtime.onMessageExternal.addListener(
		function(request, sender, sendResponse) {
			if(sender.url){
				var start = sender.url.indexOf('=') + 1;
				var end = sender.url.indexOf('&');
				var access_token = sender.url.substring(start, end);
				
				var backgroundPage = chrome.extension.getBackgroundPage();
				var FB = backgroundPage.FB;
				
				FB.setAccessToken(access_token);
				
				chrome.extension.sendRequest(chrome.i18n.getMessage("@@extension_id"), {});
			}
});