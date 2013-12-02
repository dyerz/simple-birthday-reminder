var CLIENT_ID = '310837256871-nv2otqr7qojvir1u6enjqh2s7h71tvcj.apps.googleusercontent.com';
var SCOPES = 'https://www.googleapis.com/auth/drive https://spreadsheets.google.com/feeds';
var MILLISECONDS_IN_HOUR = 3600000;

addScript('jquery-1.9.1.js');
addScript('jquery-ui.js');
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
	
	gapi.auth.authorize({
		'client_id' : CLIENT_ID,
		'scope' : SCOPES,
		'immediate' : true
	}, handleAuthResult);
}

function handleAuthResult(authResult){
	if (authResult && !authResult.error) {
		gapi.client.load('drive', 'v2', driveAPIOk);
	}
}

function driveAPIOk(){
	var storedSpreadsheet = localStorage['stored_spreadsheet'];

	if (storedSpreadsheet) {
		chrome.browserAction.setBadgeText({
			text : '.'
		});
		
		var targetUrl = 'https://spreadsheets.google.com/feeds/worksheets/' + storedSpreadsheet + '/private/basic?alt=json';
		downloadFile(targetUrl, spreadsheetWorksheets);
	}
}

function spreadsheetWorksheets(JSON_response, targetUrl){
	var worksheetsObj = jQuery.parseJSON(JSON_response);
	var failed = true;
	var failedIndex = -1;

	if (worksheetsObj.feed) {
		if (worksheetsObj.feed.entry) {
			if (worksheetsObj.feed.entry.length > 0) {
				var worksheetObj = worksheetsObj.feed.entry[0];

				if (worksheetObj.link) {
					var listUrl = null;

					for (var i = 0; i < worksheetObj.link.length; i++) {
						if (worksheetObj.link[i].href.indexOf('/cells/') !== -1) {
							listUrl = worksheetObj.link[i].href + '?alt=json';
							break;
						}
					}

					if (listUrl) {
						chrome.browserAction.setBadgeText({
							text : '..'
						});
						downloadFile(listUrl, spreadsheetCells);
					}
				}
			}
		}
	}
}

function spreadsheetCells(JSON_response, targetUrl){
	var todayString = $.datepicker.formatDate("mm/dd", new Date());
	var birthdayTodayCount = 0;

	var cellsObj = jQuery.parseJSON(JSON_response);
	
	var iconTitle = '';

	if (cellsObj.feed.entry) {
		var birthdaysObject = {};
		for (var i = 0; i < cellsObj.feed.entry.length; i++) {
			var cellTitle = cellsObj.feed.entry[i].title['$t'];
			var cellContent = cellsObj.feed.entry[i].content['$t'];

			var thisRow = cellTitle.substr(1);
			if (!(thisRow in birthdaysObject)) {
				birthdaysObject[thisRow] = {
					'today': false,
					'date': null,
					'date-str': '',
					'age': '',
					'day-of-year': '',
					'days-away': '',
					'name': '',
					'e-mail': null
				};
			}

			switch (cellTitle[0]) {
				case 'A':
					if (cellContent.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
						var cellDate = $.datepicker.parseDate('mm/dd/yy', cellContent);
						var cellDateString = $.datepicker.formatDate("mm/dd", new Date());

						if (cellDateString == todayString) {
							birthdayTodayCount++;
							birthdaysObject[thisRow]['today'] = true;
						}
					}

					break;
				case 'B':
					if(birthdaysObject[thisRow]['today']){
						if(iconTitle != ''){
							iconTitle += '\n';
						}
						
						iconTitle += cellContent;
					}
					
					break;
				case 'C':
				default:
					break;
			}
		}
	}

	chrome.browserAction.setBadgeText({
		text : birthdayTodayCount + ''
	});

	if(iconTitle != ''){
		chrome.browserAction.setTitle({
			title : iconTitle
		});
	}
	
	if(localStorage['backgroundInterval']){
		window.clearInterval(parseInt(localStorage['backgroundInterval']));
	}
	
	localStorage['backgroundInterval'] = window.setInterval(driveAPIOk, MILLISECONDS_IN_HOUR);
}

function downloadFile(targetUrl, callback){
	if (targetUrl) {
		var accessToken = gapi.auth.getToken().access_token;
		var xhr = new XMLHttpRequest();
		xhr.open('GET', targetUrl);
		xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
		xhr.onload = function(){
			callback(xhr.responseText, targetUrl);
		};
		xhr.onerror = function(){
			callback(null, null);
		};
		xhr.send();
	}
	else {
		callback(null, null);
	}
}