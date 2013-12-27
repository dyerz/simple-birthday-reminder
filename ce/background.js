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
	
	sbr.requestGoogleAuth();
}

chrome.runtime.onMessageExternal.addListener(
		function(request, sender, sendResponse) {
			var backgroundPage = chrome.extension.getBackgroundPage();
			var FB = backgroundPage.FB;
			return  FB;
});