var MILLISECONDS_IN_HOUR = 3600000;
var MILLISECONDS_IN_DAY = 86400000;

var self = null;

SimpleBirthdayReminder = function(){
	self = this;

	// test client id
//	self.clientId = '310837256871-nv2otqr7qojvir1u6enjqh2s7h71tvcj.apps.googleusercontent.com';
	// store client id
	self.clientId = '310837256871-q21g2ngu6vjke564upgul2lf6ssvqg56.apps.googleusercontent.com';

	self.scopes = 'https://www.googleapis.com/auth/drive https://spreadsheets.google.com/feeds';
	
	self.statusText = '';
	
	self.authorized = false;
	self.apiOk = false;
	self.updateComplete = false;
	self.validFeed = true;
	
	self.birthdaysObject = {};
	
}

SimpleBirthdayReminder.prototype.load = function(){
	(function(i, s, o, g, r, a, m) {
		i['GoogleAnalyticsObject'] = r;
		i[r] = i[r] || function() {(i[r].q = i[r].q || []).push(arguments)}, i[r].l = 1 * new Date();
		a = s.createElement(o), m = s.getElementsByTagName(o)[0];
		a.async = 1; a.src = g; m.parentNode.insertBefore(a, m)
	})(window, document, 'script', '//www.google-analytics.com/analytics.js',
			'ga');

	ga('create', 'UA-45859822-1', 'google.com');	
	
}

/**
 * Check if the current user has authorized the application.
 */
SimpleBirthdayReminder.prototype.requestAuth = function(){
	gapi.auth.authorize({
		'client_id' : self.clientId,
		'scope' : self.scopes,
		'immediate' : true
	}, self.handleAuthResult);
}

/**
 * Called when authorization server replies.
 * 
 * @param {Object}
 *            authResult Authorization result.
 */
SimpleBirthdayReminder.prototype.handleAuthResult = function(authResult){
	if (authResult && !authResult.error) {
		ga('send', 'event', 'automatic', 'authorization', 'success', {
			'nonInteraction' : 1
		});
		self.statusText = 'Authorization successful.';
		self.authorized = true;
		// Access token has been successfully retrieved, requests can be sent to
		// the API.
		gapi.client.load('drive', 'v2', self.driveAPIOk);
	}
	else {
		ga('send', 'event', 'automatic', 'authorization', 'failure', {
			'nonInteraction' : 1
		});


	}
}

SimpleBirthdayReminder.prototype.driveAPIOk = function(){
	self.apiOk = true;
	
	ga('send', 'event', 'automatic', 'driveAPIOk', 'success', {
		'nonInteraction' : 1
	});

	self.statusText = 'Authorization successful.';
	self.loadSpreadsheet();
}

SimpleBirthdayReminder.prototype.loadSpreadsheet = function(){
	var storedSpreadsheet = localStorage['stored_spreadsheet'];
	self.updateComplete = false;

	if(storedSpreadsheet){
		chrome.browserAction.setBadgeText({
			text : '.'
		});

		self.birthdaysObject = {};
		
		self.statusText = 'Authorization successful. Retrieving previous spreadsheet.';
		var targetUrl = 'https://spreadsheets.google.com/feeds/worksheets/' + storedSpreadsheet + '/private/basic?alt=json';
		self.downloadFile(targetUrl, self.spreadsheetWorksheets);
	}
}

/**
 * Called when the spreadsheet has been loaded.
 * 
 * @param {Object}
 *            JSON_response JSON object with the worksheets in the selected
 *            spreadsheet.
 * 
 */
SimpleBirthdayReminder.prototype.spreadsheetWorksheets = function(JSON_response, targetUrl){
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
						ga('send', 'event', 'automatic', 'spreadsheetWorksheets', 'success', {
							'nonInteraction' : 1
						});

						chrome.browserAction.setBadgeText({
							text : '..'
						});

						self.downloadFile(listUrl, self.spreadsheetCells);
						failed = false;
					}
					else {
						failedIndex = 5;
					}
				}
				else {
					failedIndex = 4;
				}
			}
			else {
				failedIndex = 3;
			}
		}
		else {
			failedIndex = 2;
		}
	}
	else {
		failedIndex = 1;
	}

	if (failed === true) {
		self.statusText = 'Problem retrieving spreadsheet worksheets.';
		ga('send', 'event', 'automatic', 'spreadsheetWorksheets', 'failure', failedIndex, {
			'nonInteraction' : 1
		});
	}
}

SimpleBirthdayReminder.prototype.spreadsheetCells = function (JSON_response, targetUrl){
	ga('send', 'event', 'automatic', 'spreadsheetCells', 'success', {
		'nonInteraction' : 1
	});

	var todayString = $.datepicker.formatDate("mm/dd", new Date());
	var birthdayTodayCount = 0;

	var cellsObj = jQuery.parseJSON(JSON_response);
	
	var iconTitle = '';

	if (cellsObj.feed.entry) {
		for (var i = 0; i < cellsObj.feed.entry.length; i++) {
			var cellTitle = cellsObj.feed.entry[i].title['$t'];
			var cellContent = cellsObj.feed.entry[i].content['$t'];

			var thisRow = cellTitle.substr(1);
			if (!(thisRow in self.birthdaysObject)) {
				self.birthdaysObject[thisRow] = {
					'today': false,
					'date': null,
					'date-str': '',
					'age': 0,
					'day-of-year': '',
					'days-away': '',
					'name': ''
				};
			}

			switch (cellTitle[0]) {
				case 'A':
					if(cellContent.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)){
						var cellDate = $.datepicker.parseDate('mm/dd/yy', cellContent);
						var cellDateString = $.datepicker.formatDate( "mm/dd/yy", cellDate );

						self.birthdaysObject[thisRow]['date'] = cellDate;
						self.birthdaysObject[thisRow]['date-str'] = cellDateString;
						self.birthdaysObject[thisRow]['age'] = self.calculateAge(cellDate);
						self.birthdaysObject[thisRow]['day-of-year'] = self.calculateDayOfYear(cellDate);
						
						if(cellDateString.substr(0, 5) == todayString){
							birthdayTodayCount++;
							self.birthdaysObject[thisRow]['today'] = true;
						}
						else{
							self.birthdaysObject[thisRow]['days-away'] = self.calculateDaysAway(cellDate);
						}
					}
					else{
						tableHtml += '<br />Please put the date in the first column.';
						self.validFeed = false;
					}
					
					break;
				case 'B':
					self.birthdaysObject[thisRow]['name'] = cellContent;
					
					if(self.birthdaysObject[thisRow]['today']){
						if(iconTitle == ''){
							iconTitle += 'Today\'s Birthdays:'
						}
						iconTitle += '\n' + cellContent;
					}
					
					break;
				case 'C':
					self.birthdaysObject[thisRow]['e-mail'] = cellContent;
					break;
				default:
					break;
			}
			
			if(!self.validFeed){
				self.birthdaysObject = {};
				break;
			}
		}
	}

	self.spreadsheetUrl = null;
	if(cellsObj.feed.link){
		self.spreadsheetUrl = cellsObj.feed.link[0]['href'];
	}
	
	chrome.browserAction.setBadgeText({
		text : birthdayTodayCount + ''
	});

	if(iconTitle != ''){
		chrome.browserAction.setTitle({
			title : iconTitle
		});
	}
	
	if(localStorage['backgroundTimeout']){
		window.clearTimeout(parseInt(localStorage['backgroundTimeout']));
	}
	
	self.updateComplete = true;
	localStorage['backgroundTimeout'] = window.setTimeout(self.loadSpreadsheet, MILLISECONDS_IN_HOUR);
}

/**
 * Download a file's content.
 * 
 * @param {String}
 *            targetUrl URL to the file.
 * @param {Function}
 *            callback Function to call when the request is complete.
 */
SimpleBirthdayReminder.prototype.downloadFile = function(targetUrl, callback){
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

/**
 * Retrieve a list of File resources.
 * 
 * @param {Function}
 *            callback Function to call when the request is complete.
 */
SimpleBirthdayReminder.prototype.retrieveAllFiles = function(callback){
	var retrievePageOfFiles = function(request, result){
		request.execute(function(resp){
			result = result.concat(resp.items);
			var nextPageToken = resp.nextPageToken;
			if (nextPageToken) {
				request = gapi.client.drive.files.list({
					'trashed' : false,
					'pageToken' : nextPageToken,
					'q' : 'mimeType=application/vnd.google-apps.spreadsheet'
				});
				retrievePageOfFiles(request, result);
			}
			else {

				if (!callback) {
					callback = function(file){
						console.log(file);
					};
				}
				callback(result);
			}
		});
	};

	var initialRequest = gapi.client.drive.files.list({
		'trashed' : false,
		'q' : 'mimeType=\'application/vnd.google-apps.spreadsheet\''
	});
	retrievePageOfFiles(initialRequest, []);
}

/**
 * Insert new file.
 * 
 * @param {String}
 *            docTitle Title of the new spreadsheet.
 * @param {Function}
 *            callback Function to call when the request is complete.
 */
SimpleBirthdayReminder.prototype.insertFile = function(docTitle, callback){
	var boundary = '-------314159265358979323846';
	var delimiter = "\r\n--" + boundary + "\r\n";
	var close_delim = "\r\n--" + boundary + "--";

	var contentType = 'application/vnd.google-apps.spreadsheet';
	var metadata = {
		'title' : docTitle,
		'mimeType' : contentType
	};

	var body = '';
	var multipartRequestBody = delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata);
	multipartRequestBody += delimiter + 'Content-Type: ' + contentType + '\r\n' + '\r\n' + body + close_delim;

	var request = gapi.client.request({
		'path' : '/upload/drive/v2/files',
		'method' : 'POST',
		'params' : {
			'uploadType' : 'multipart'
		},
		'headers' : {
			'Content-Type' : 'multipart/related; boundary="' + boundary + '"'
		},
		'body' : multipartRequestBody
	});
	if (!callback) {
		callback = function(multipartRequestBody){
			console.log(multipartRequestBody);
		};
	}
	request.execute(callback);
}



/**
 * Calculates the age from the date provided
 * 
 * @param {Date}
 *            dataDate Date of birth.
 * 
 */
SimpleBirthdayReminder.prototype.calculateAge = function(dataDate){
	var nowDate = new Date();
	return nowDate.getFullYear() - dataDate.getFullYear();
}

/**
 * Calculates the number of days until the next birthday
 * 
 * @param {Date}
 *            dataDate Date of birth.
 * 
 */
SimpleBirthdayReminder.prototype.calculateDaysAway = function(dataDate){
	var nowDate = new Date();
	var nowDayOfYear = self.calculateDayOfYear(nowDate);
	var dataDayOfYear = self.calculateDayOfYear(dataDate);

	var nextYear = nowDate.getFullYear();
	dataDate.setFullYear(nextYear);

	if (nowDayOfYear > dataDayOfYear) {
		dataDate.setFullYear(nextYear + 1);
	}

	return Math.ceil((dataDate - nowDate) / MILLISECONDS_IN_DAY);
}

/**
 * Calculates the day of the year from the date provided
 * 
 * @param {Date}
 *            dayDate Date to calculate.
 * 
 */
SimpleBirthdayReminder.prototype.calculateDayOfYear = function(dayDate){
	var oneJan = new Date(dayDate.getFullYear(), 0, 1);
	return Math.ceil((dayDate - oneJan) / MILLISECONDS_IN_DAY);
}
