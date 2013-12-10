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
	chrome.browserAction.setBadgeText({
		text : '?'
	});
	
	sbr.requestAuth();
}