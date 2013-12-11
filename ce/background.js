var sbr = new SimpleBirthdayReminder();
sbr.load();

ga('create', 'UA-45859822-1', {
  'cookieDomain': 'chrome-extension://' + chrome.i18n.getMessage("@@extension_id")
});	


addScript('https://apis.google.com/js/client.js?onload=beginBackgroundUpdate');

function addScript(src){
	var s = document.createElement('script');
	s.setAttribute('src', src);
	document.body.appendChild(s);
}

function beginBackgroundUpdate(){
	ga('send', 'pageview');

	
	var iconBadgeColor = localStorage['iconBadgecColor'];
	
	if(!iconBadgeColor){
		iconBadgeColor = '#FF0000';
	}
	
	chrome.browserAction.setBadgeBackgroundColor({color: iconBadgeColor});
	
	chrome.browserAction.setBadgeText({
		text : '?'
	});
	
	sbr.requestAuth();
}