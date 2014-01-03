var MILLISECONDS_IN_HOUR = 3600000;
var MILLISECONDS_IN_DAY = 86400000;

var self = null;

// Initialize Facebook-lite
FB.init('1445031395711238', 'friends_birthday');

SimpleBirthdayReminder = function(){
	self = this;
	
	var extensionId = chrome.i18n.getMessage("@@extension_id");

	if(extensionId == 'jghfdcpjihdllimebedhfoibipfhghbi'){
		// test client id
		self.clientId = '310837256871-nv2otqr7qojvir1u6enjqh2s7h71tvcj.apps.googleusercontent.com';
	}
	else{
		// store client id
		self.clientId = '310837256871-q21g2ngu6vjke564upgul2lf6ssvqg56.apps.googleusercontent.com';
	}

	self.scopes = 'https://www.googleapis.com/auth/drive https://spreadsheets.google.com/feeds';
	
	self.statusText = '';
	
	self.googleAuthorized = false;
	self.apiOk = false;
	self.validFeed = true;
	
	self.facebookAuthorized = false;
	
	self.settingDaysAway = 14;
	if(!localStorage.pastDays){
		localStorage.pastDays = '' + self.settingDaysAway;
	}
	
	self.birthdaysObject = {};
	self.birthdayTodayCount = 0;
	self.birthdaysUpcoming = [];
	
	self.updateComplete = true;
	self.googleUpdateComplete = true;
	self.facebookUpdateComplete = true;
};

SimpleBirthdayReminder.prototype.load = function(){
	
};

SimpleBirthdayReminder.prototype.loadData = function(callback){
	
	var showGoogleData = localStorage.showGoogleData || 'Yes';
	var showFacebookData = localStorage.showFacebookData || 'Yes';

	if(self.updateComplete){
		self.updateComplete = false;
		
		self.birthdaysUpcoming.length = 0;
		self.birthdaysUpcoming = [];

		delete self.birthdaysObject;
		self.birthdaysObject = {};
		
		self.settingDaysAway = parseInt(localStorage.pastDays, 10);

		if(showGoogleData === 'Yes'){
			self.googleUpdateComplete = false;
			self.requestGoogleAuth();
		}
		else{
			self.googleUpdateComplete = true;
		}

		if(showFacebookData === 'Yes'){
			self.facebookUpdateComplete = false;
			self.requestFacebookAuth();
		}
		else{
			self.facebookUpdateComplete = true;
		}

		window.setTimeout(function(){self.loadData(callback);}, 500);
	}
	else{
		if(self.googleUpdateComplete === true && self.facebookUpdateComplete === true){
			chrome.browserAction.setBadgeText({
				text : self.birthdaysUpcoming.length + ''
			});

			var iconTitle = 'No Upcoming Birthdays';
			if(self.birthdaysUpcoming.length > 0){
				var birthdaysArray = self.birthdaysUpcoming.sort(sortByDaysAway);
				
				iconTitle = 'Upcoming Birthdays\n';
				for(var i = 0; i < birthdaysArray.length; i++){
					iconTitle += birthdaysArray[i]['date-str'] + ': ' + birthdaysArray[i].name + '\n';
				}
			}

			chrome.browserAction.setTitle({
				title : iconTitle
			});
			
			self.updateComplete = true;
			if(callback){
				callback();
			}
		}
		else{
			if(self.googleUpdateComplete === false){
				if(showGoogleData === 'Yes'){
					self.requestGoogleAuth();
				}
				else{
					self.googleUpdateComplete = true;
				}
			}

			if(self.facebookUpdateComplete === false){
				if(showFacebookData === 'Yes'){
					self.requestFacebookAuth();
				}
				else{
					self.facebookUpdateComplete = true;
				}
			}
			
			if((showGoogleData === 'No' || self.googleAuthorized) && (showFacebookData === 'No' || self.facebookAuthorized)){
				window.setTimeout(function(){self.loadData(callback);}, 500);
			}
		}
	}
};



/**
 * Check if the current user has googleAuthorized the application.
 */
SimpleBirthdayReminder.prototype.requestGoogleAuth = function(){
	gapi.auth.authorize({
		'client_id' : self.clientId,
		'scope' : self.scopes,
		'immediate' : true
	}, self.handleGoogleAuthResult);
};

/**
 * Called when authorization server replies.
 * 
 * @param {Object}
 *            authResult Authorization result.
 */
SimpleBirthdayReminder.prototype.handleGoogleAuthResult = function(authResult){
	if (authResult && !authResult.error) {
		ga('send', 'event', 'automatic', 'authorization', 'success', {
			'nonInteraction' : true
		});
		self.statusText = 'Authorization successful.';
		self.googleAuthorized = true;
		// Access token has been successfully retrieved, requests can be sent to
		// the API.
		
		if(self.apiOk === false){
			gapi.client.load('drive', 'v2', self.driveAPIOk);
		}
		else{
			self.loadSpreadsheet();			
		}
	}
	else {
		ga('send', 'event', 'automatic', 'authorization', 'failure', {
			'nonInteraction' : true
		});


	}
};

SimpleBirthdayReminder.prototype.driveAPIOk = function(){
	self.apiOk = true;
	
	ga('send', 'event', 'automatic', 'driveAPIOk', 'success', {
		'nonInteraction' : true
	});

	self.statusText = 'Authorization successful.';
	self.loadSpreadsheet();
};

SimpleBirthdayReminder.prototype.loadSpreadsheet = function(){
	var storedWorksheetUrl = localStorage.worksheet_url;
	
	if(storedWorksheetUrl){
		self.downloadFile(storedWorksheetUrl, self.spreadsheetCells);
	}
	else{
		var storedSpreadsheet = localStorage.stored_spreadsheet;
		self.googleUpdateComplete = false;

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
};

/**
 * Called when the spreadsheet has been loaded.
 * 
 * @param {Object}
 *            JSON_response JSON object with the worksheets in the selected
 *            spreadsheet.
 * 
 */
SimpleBirthdayReminder.prototype.spreadsheetWorksheets = function(JSON_response, targetUrl){
	var worksheetsObj = {'feed': null};
	
	try{
		worksheetsObj = jQuery.parseJSON(JSON_response);
	}
	catch(err){
		
	}

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
							'nonInteraction' : true
						});
						
						localStorage.worksheet_url = listUrl;

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
			'nonInteraction' : true
		});
	}
};

SimpleBirthdayReminder.prototype.spreadsheetCells = function (JSON_response, targetUrl){
	ga('send', 'event', 'automatic', 'spreadsheetCells', 'success', {
		'nonInteraction' : true
	});

	var nowDate = new Date();

	var todayString = $.datepicker.formatDate("mm/dd", nowDate);
	

	var cellsObj = {'feed': null};
	
	try{
		cellsObj = jQuery.parseJSON(JSON_response);
	}
	catch(err){
		
	}
	
	if(cellsObj.feed === null){
		return;
	}
	
	var iconTitle = '';
	var upcomingBirthdays = [];
	self.errorMessage = null;
	
	self.settingDaysAway = parseInt(localStorage.pastDays, 10);
	var daysAwayDate = new Date(new Date().setDate(nowDate.getDate() - self.settingDaysAway));
	var thisRow = null;

	if (cellsObj.feed.entry) {
		for (var i = 0; i < cellsObj.feed.entry.length; i++) {
			var cellTitle = cellsObj.feed.entry[i].title.$t;
			var cellContent = cellsObj.feed.entry[i].content.$t;
			
			if(cellContent === ''){
				continue;
			}

			var lastRow = thisRow;
			thisRow = cellTitle.substr(1);
			if (!(thisRow in self.birthdaysObject)) {
				if(lastRow){
					self.addPerson(self.birthdaysObject[lastRow]);
				}
				
				self.birthdaysObject[thisRow] = {
					'row': thisRow,
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
						self.birthdaysObject[thisRow].birthday = cellDateString;
					}
					else{
						self.errorMessage = 'Please put the date in the first column.';
						self.validFeed = false;
					}
					
					break;
				case 'B':
					self.birthdaysObject[thisRow].name = cellContent;
					
					if(self.birthdaysObject[thisRow]['days-away'] <= self.settingDaysAway){
						upcomingBirthdays.push(self.birthdaysObject[thisRow]['date-str'] + ': ' + cellContent);
					}
					
					break;
				case 'C':
					self.birthdaysObject[thisRow]['e-mail'] = cellContent;
					break;
				default:
					break;
			}
			
			if(!self.validFeed){
//				self.birthdaysObject = {};
				break;
			}
		}

		if(self.validFeed && thisRow){
			self.addPerson(self.birthdaysObject[thisRow]);				
		}
	}

	self.spreadsheetUrl = null;
	if(cellsObj.feed.link){
		self.spreadsheetUrl = cellsObj.feed.link[0].href;
	}
	
	if(localStorage.backgroundTimeout){
		this.window.clearTimeout(parseInt(localStorage.backgroundTimeout, 10));
	}
	
	self.googleUpdateComplete = true;
	localStorage.backgroundTimeout = this.window.setTimeout(self.requestGoogleAuth, MILLISECONDS_IN_HOUR);
};

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
		var authToken = gapi.auth.getToken();
		if(authToken){
			var accessToken = authToken.access_token;
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
		else{
			self.requestGoogleAuth();
		}
	}
	else {
		callback(null, null);
	}
};


SimpleBirthdayReminder.prototype.changeCell = function(row, column, value){
	self.saveComplete = false;
	
	var worksheetUrl = localStorage.worksheet_url;
	var rowCol = 'R' + row + 'C' + column;
	
	if(worksheetUrl){
		worksheetUrl = worksheetUrl.replace('basic?alt=json', 'full/') + rowCol;
	
		var xml = self.buildXML(worksheetUrl, row, column, value);
		
		if(xml){
			self.putChange(worksheetUrl, xml, self.changeStatus);
		}
		else{
			alert('fail');
		}
	}
	else{
		alert('not possible');
	}
	
};

SimpleBirthdayReminder.prototype.changeStatus = function(responseText){
	self.saveComplete = true;
};

SimpleBirthdayReminder.prototype.buildXML = function(worksheetUrl, row, column, value){
	var xml = null;
	//worksheetUrl = localStorage.worksheet_url;
	var rowCol = 'R' + row + 'C' + column;
	
	if(worksheetUrl){
		worksheetUrl = worksheetUrl.replace('basic?alt=json', 'full/');
		
		xml = '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:gs="http://schemas.google.com/spreadsheets/2006">';
		xml += '<id>' + worksheetUrl + '</id>';
		xml += '<link rel="edit" type="application/atom+xml" href="' + worksheetUrl + '"/>';
		xml += '<gs:cell row="' + row + '" col="' + column + '" inputValue="' + value + '"/>';
		xml += '</entry>';
	}

	return xml;
};


SimpleBirthdayReminder.prototype.putChange = function(targetUrl, xml, callback){
	if (targetUrl) {
		var authToken = gapi.auth.getToken();
		if(authToken){
			var accessToken = authToken.access_token;
			var xhr = new XMLHttpRequest();
			xhr.open('PUT', targetUrl);
			xhr.setRequestHeader('GData-Version', '3.0');
			
			// To override the versioning system and update the entry regardless 
			// of whether someone else has updated it since you retrieved it, 
			// use If-Match: * instead of specifying the ETag in the header.
			// https://developers.google.com/gdata/docs/2.0/reference
			xhr.setRequestHeader('If-Match', '*');
			xhr.setRequestHeader('Content-Type','application/atom+xml');
			xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
			xhr.onload = function(){
				callback(xhr.responseText, targetUrl);
			};
			xhr.onerror = function(){
				callback(null);
			};
			xhr.send(xml);
			
		}
		else {
			callback(null);
		}
	}
	else {
		callback(null);
	}
};

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
};

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
};


SimpleBirthdayReminder.prototype.requestFacebookAuth = function(){
	var facebookAccessToken = localStorage.facebook_access_token;
	
	if(facebookAccessToken) {
		self.facebookAuthorized = true;
		FB.api('/me/friends', {'fields': 'id,name,birthday,link'}, function(response) {
			ga('send', 'event', 'automatic', 'requestFacebookAuth', 'success', {
				'nonInteraction' : true
			});

			var data = response.data;
			for(var i = 0; i < data.length; i++){
				var person = data[i];
				
				if(person.birthday){
					self.addPerson(person);
				}
			}
			
			self.facebookUpdateComplete = true;
			});
	}
	else{
		self.facebookAuthorized = false;
	}
};

SimpleBirthdayReminder.prototype.addPerson = function(person){
	var nowDate = new Date();

	var todayString = $.datepicker.formatDate("mm/dd", nowDate);

	var iconTitle = '';
	var upcomingBirthdays = [];
	self.errorMessage = null;
	
	var daysAwayDate = new Date(new Date().setDate(nowDate.getDate() - self.settingDaysAway));

	var uid = null;
	
	if('id' in person){
		uid = person.id;
	}
	else if('row' in person){
		uid = person.row;
	}
	
	self.birthdaysObject[uid] = {
			'facebook_id': person.id || null,
			'facebook_link': person.link || null,
			'row': person.row || null,
			'today': false,
			'date': null,
			'date-str': '',
			'age': 0,
			'day-of-year': '',
			'days-away': '',
			'name': person.name,
			'e-mail': person['e-mail'] || null
		};
	

	var cellDateString = person.birthday;
	
	if(cellDateString.length == 5){
		cellDateString += "/" + nowDate.getFullYear();
	}
	
	var cellDate = $.datepicker.parseDate('mm/dd/yy', cellDateString);

	self.birthdaysObject[uid].date = cellDate;
	self.birthdaysObject[uid]['date-str'] = cellDateString;
	self.birthdaysObject[uid].age = self.calculateAge(cellDate);
	self.birthdaysObject[uid]['day-of-year'] = self.calculateDayOfYear(cellDate);
	
	if(cellDateString.substr(0, 5) == todayString){
		self.birthdaysObject[uid]['days-away'] = '';
		self.birthdaysObject[uid].today = true;
		self.birthdayTodayCount++;
	}
	else{
		self.birthdaysObject[uid]['days-away'] = self.calculateDaysAway(nowDate, cellDate);
	}
	
	self.birthdaysObject[uid]['setting-days-away'] = self.calculateDaysAway(daysAwayDate, cellDate);    
	
	if(self.birthdaysObject[uid]['days-away'] <= self.settingDaysAway){
		self.birthdaysUpcoming.push(self.birthdaysObject[uid]);
	}	
	
};



/**
 * Calculates the age from the date provided
 * 
 * @param {Date}
 *            dataDate Date of birth.
 * 
 */
SimpleBirthdayReminder.prototype.calculateAge = function(dataDate){
	var nowDate = new Date();
	var age = nowDate.getFullYear() - dataDate.getFullYear();
	if(age < 0){
		age = '';
	}
	
	return age; 
};

/**
 * Calculates the number of days until the next birthday
 * 
 * @param {Date}
 *            dataDate Date of birth.
 * 
 */
SimpleBirthdayReminder.prototype.calculateDaysAway = function(fromDate, toDate){
	var nowDayOfYear = self.calculateDayOfYear(fromDate);
	var dataDayOfYear = self.calculateDayOfYear(toDate);

	var nextYear = fromDate.getFullYear();
	toDate.setFullYear(nextYear);

	if (nowDayOfYear > dataDayOfYear) {
		toDate.setFullYear(nextYear + 1);
	}

	return Math.ceil((toDate - fromDate) / MILLISECONDS_IN_DAY);
};

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
};

SimpleBirthdayReminder.prototype.getBirthdaysSize = function(dayDate){
	var length = 0;
    for( var key in self.birthdaysObject ) {
        ++length;
    }
    return length;	
};


function sortByDaysAway(a, b){
	if (a['days-away'] < b['days-away']) {
		return -1;
	}
	else if (a['days-away'] > b['days-away']) {
		return 1;
	}
	else {
		return 0;
	}
}