var sbr = new SimpleBirthdayReminder();
sbr.load();

(function(i, s, o, g, r, a, m) {
	i['GoogleAnalyticsObject'] = r;
	i[r] = i[r] || function() {(i[r].q = i[r].q || []).push(arguments)}, i[r].l = 1 * new Date();
	a = s.createElement(o), m = s.getElementsByTagName(o)[0];
	a.async = 1; a.src = g; m.parentNode.insertBefore(a, m)
})(window, document, 'script', 'https://ssl.google-analytics.com/analytics.js',
		'ga');

ga('create', 'UA-45859822-1', 'google.com');	


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