var sbr = new SimpleBirthdayReminder();
sbr.load();

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