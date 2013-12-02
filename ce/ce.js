//var CLIENT_ID = '310837256871-nv2otqr7qojvir1u6enjqh2s7h71tvcj.apps.googleusercontent.com';
var CLIENT_ID = '310837256871-q21g2ngu6vjke564upgul2lf6ssvqg56.apps.googleusercontent.com';
var SCOPES = 'https://www.googleapis.com/auth/drive https://spreadsheets.google.com/feeds';
var MILLISECONDS_IN_DAY = 86400000;

/**
 * Called when the client library is loaded to start the auth flow.
 */
function handleClientLoad(){
	(function(i, s, o, g, r, a, m) {
		i['GoogleAnalyticsObject'] = r;
		i[r] = i[r] || function() {(i[r].q = i[r].q || []).push(arguments)}, i[r].l = 1 * new Date();
		a = s.createElement(o), m = s.getElementsByTagName(o)[0];
		a.async = 1; a.src = g; m.parentNode.insertBefore(a, m)
	})(window, document, 'script', '//www.google-analytics.com/analytics.js',
			'ga');

	ga('create', 'UA-45859822-1', 'google.com');
	
	window.setTimeout(checkAuth, 1);
}

/**
 * Check if the current user has authorized the application.
 */
function checkAuth(){
	ga('send', 'event', 'automatic', 'page load');
	gapi.auth.authorize({
		'client_id' : CLIENT_ID,
		'scope' : SCOPES,
		'immediate' : true
	}, handleAuthResult);
}

/**
 * Called when authorization server replies.
 * 
 * @param {Object}
 *            authResult Authorization result.
 */
function handleAuthResult(authResult){
	if (authResult && !authResult.error) {
		ga('send', 'event', 'automatic', 'authorization', 'success', {
			'nonInteraction' : 1
		});
		$('#spinner-text').html('Authorization successful.');
		// Access token has been successfully retrieved, requests can be sent to
		// the API.
		gapi.client.load('drive', 'v2', driveAPIOk);
	}
	else {
		ga('send', 'event', 'automatic', 'authorization', 'failure', {
			'nonInteraction' : 1
		});

		// No access token could be retrieved, show the button to start the
		// authorization flow.
		$('#content').html('<input type="button" id="authorizeButton" value="Authorize" />');

		$('#authorizeButton').on('click', function(){
			ga('send', 'event', 'button', 'click', 'authorization');
			gapi.auth.authorize({
				'client_id' : CLIENT_ID,
				'scope' : SCOPES,
				'immediate' : false
			}, handleAuthResult);
		});
	}
}

/**
 * Called when the drive API has been loaded.
 * 
 */
function driveAPIOk(){
	ga('send', 'event', 'automatic', 'driveAPIOk', 'success', {
		'nonInteraction' : 1
	});

	var storedSpreadsheet = localStorage['stored_spreadsheet'];

	if(!storedSpreadsheet){
		$('#spinner-text').html('Authorization successful. Retrieving list of spreadsheets.');
		retrieveAllFiles(showList);
	}
	else{
		$('#spinner-text').html('Authorization successful. Retrieving previous spreadsheet.');
		var targetUrl = 'https://spreadsheets.google.com/feeds/worksheets/' + storedSpreadsheet + '/private/basic?alt=json';
		downloadFile(targetUrl, spreadsheetWorksheets);
	}
}

/**
 * Retrieve a list of File resources.
 * 
 * @param {Function}
 *            callback Function to call when the request is complete.
 */
function retrieveAllFiles(callback){
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
 * Called when the drive API has been loaded.
 * 
 * @param {Object}
 *            result Array of all spreadsheets.
 * 
 */
function showList(result){
	var spreadsheets = [];

	for (var i = 0; i < result.length; i++) {
		if (result[i].mimeType === 'application/vnd.google-apps.spreadsheet') {
			spreadsheets.push(result[i]);
		}
	}

	ga('send', 'event', 'automatic', 'showList', 'success', spreadsheets.length, {
		'nonInteraction' : 1
	});

	$('#pre-content').hide();

	var contentHtml = '';
	var createNewHtml = '';
	
	if (spreadsheets.length > 0) {

		var fileListerHtml = '<select id="fileLister">';
		fileListerHtml += '<option>Select a Spreadsheet</option>';
		for (var i = 0; i < spreadsheets.length; i++) {
			fileListerHtml += '<option value="' + spreadsheets[i].id + '" >' + spreadsheets[i].title + '</option>';
		}

		fileListerHtml += '</select>';

		contentHtml += fileListerHtml;

		createNewHtml = '<h2><span class="line-center">Or</span></h2>';
	}
	else{
		contentHtml += '<div>No spreadsheets found.</div>';
	}

	{
		createNewHtml += '<h3>Create A New Spreadsheet</h3>';
		createNewHtml += '<label>Title <input type="text" id="newSpreadsheetTitle" /></label>';
		createNewHtml += '<input type="button" id="createNewButton" value="Go" />';

		contentHtml += createNewHtml;
	}

	$('#content').html(contentHtml);

	$('#fileLister').on('change', function(evt){
		localStorage['stored_spreadsheet'] = evt.target.value;
		var targetUrl = 'https://spreadsheets.google.com/feeds/worksheets/' + evt.target.value + '/private/basic?alt=json';
		downloadFile(targetUrl, spreadsheetWorksheets);

		$('#spinner-text').html('Retrieving spreadsheet data.');
		$('#pre-content').show();
		$('#content').html('');

	});

	$('#createNewButton').on('click', function(){
		var title = $('#newSpreadsheetTitle').val();
		if (title == '') {
			alert('Please enter a title.');
			return;
		}
		else {
			ga('send', 'event', 'button', 'click', 'create file');

			$('#spinner-text').html('Creating new spreadsheet.');
			$('#pre-content').show();
			$('#content').html('');

			insertFile(title, insertFileOk);
		}
	});
}

/**
 * Insert new file.
 * 
 * @param {String}
 *            docTitle Title of the new spreadsheet.
 * @param {Function}
 *            callback Function to call when the request is complete.
 */
function insertFile(docTitle, callback){
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

function insertFileOk(){
	ga('send', 'event', 'automatic', 'insertFileOk', 'success', {
		'nonInteraction' : 1
	});

	$('#spinner-text').html('Spreadsheet created. Retrieving list of spreadsheets.');
	retrieveAllFiles(showList);
}

/**
 * Download a file's content.
 * 
 * @param {String}
 *            targetUrl URL to the file.
 * @param {Function}
 *            callback Function to call when the request is complete.
 */
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

/**
 * Called when the spreadsheet has been loaded.
 * 
 * @param {Object}
 *            JSON_response JSON object with the worksheets in the selected
 *            spreadsheet.
 * 
 */
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
						ga('send', 'event', 'automatic', 'spreadsheetWorksheets', 'success', {
							'nonInteraction' : 1
						});

						downloadFile(listUrl, spreadsheetCells);
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
		$('#spinner-text').html('Problem retrieving spreadsheet worksheets.');
		ga('send', 'event', 'automatic', 'spreadsheetWorksheets', 'failure', failedIndex, {
			'nonInteraction' : 1
		});
	}
}

/**
 * Called when the spreadsheet worksheet has been loaded.
 * 
 * @param {Object}
 *            JSON_response JSON object with the cells in the selected
 *            worksheet.
 * 
 */
function spreadsheetCells(JSON_response, targetUrl){
	ga('send', 'event', 'automatic', 'spreadsheetCells', 'success', {
		'nonInteraction' : 1
	});

	$('#pre-content').hide();
	$('#refresh-spinner').hide();
	
	var todayString = $.datepicker.formatDate( "mm/dd", new Date() );
	var birthdayTodayCount = 0;

	var cellsObj = jQuery.parseJSON(JSON_response);

	var tableHtml = 'Problem retrieving the spreadsheet data.';
	
	var refreshHtml = '';

	var birthdaysArray = [];

	var validFeed = true;
	
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
					'name': ''
				};
			}

			switch (cellTitle[0]) {
				case 'A':
					if(cellContent.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)){
						var cellDate = $.datepicker.parseDate('mm/dd/yy', cellContent);
						var cellDateString = $.datepicker.formatDate( "mm/dd", new Date() );

						if(cellDateString == todayString){
							birthdayTodayCount++;
							birthdaysObject[thisRow]['today'] = true;
						}
						else{
							birthdaysObject[thisRow]['days-away'] = calculateDaysAway(birthdaysObject[thisRow]['date']);
						}
						
						birthdaysObject[thisRow]['date'] = cellDate;
						birthdaysObject[thisRow]['date-str'] = cellContent;
						birthdaysObject[thisRow]['age'] = calculateAge(birthdaysObject[thisRow]['date']);
						birthdaysObject[thisRow]['day-of-year'] = calculateDayOfYear(birthdaysObject[thisRow]['date']);
					}
					else{
						tableHtml += '<br />Please put the date in the first column.';
						validFeed = false;
					}
					
					break;
				case 'B':
					birthdaysObject[thisRow]['name'] = cellContent;
					break;
				case 'C':
					birthdaysObject[thisRow]['e-mail'] = cellContent;
					break;
			}
			
			if(!validFeed){
				break;
			}
		}

		if(validFeed){
			for ( var key in birthdaysObject) {
				birthdaysArray.push(birthdaysObject[key]);
			}
			
			if(birthdayTodayCount == 0){
				todayDate = $.datepicker.parseDate('mm/dd/yy', todayString);
				birthdaysArray.push({
					'today': true,
					'date': todayDate,
					'date-str': todayString,
					'age': '',
					'day-of-year': calculateDayOfYear(todayDate),
					'days-away': '',
					'name': 'Today'
				});
			}
	
			birthdaysArray = birthdaysArray.sort(sortByDayOfYear);
	
			tableHtml = '<table class="draggable" id="content-table">';
			tableHtml += '<thead><tr><th>Date</th><th>Name</th><th>Age</th><th>Days Away</th><th>Email</th></tr></thead>';
			for (var i = 0; i < birthdaysArray.length; i++) {
				
				var todayClass = '';
				
				if(birthdaysArray[i]['today']){
					todayClass = ' class="birthdayToday"';
				}
				
				tableHtml += '<tr' + todayClass + '>';
	
				tableHtml += '<td class="centered">' + birthdaysArray[i]['date-str'] + '</td>';
				tableHtml += '<td>' + birthdaysArray[i]['name'] + '</td>';
				tableHtml += '<td class="centered">' + birthdaysArray[i]['age'] + '</td>';
				tableHtml += '<td class="centered">' + birthdaysArray[i]['days-away'] + '</td>';
	
				var email_html = '&nbsp;';
				if ('e-mail' in birthdaysArray[i]) {
					email_html = '<a href="mailto:' + birthdaysArray[i]['e-mail'] + '">Send Email</a>';
				}
	
				tableHtml += '<td>' + email_html + '</td>';
	
				tableHtml += '</tr>';
			}
			tableHtml += '<table>';
		}

		refreshHtml = '<input type="button" value="Refresh" id="refreshTableButton" />';
		refreshHtml += '<img id="refresh-spinner" class="hidden" src="ajax-loader.gif" />';
	}
	else{
		tableHtml += '<br />Spreadsheet contains no data.';
	}

	var postContentHtml = '<input type="button" value="Change Spreadsheet" id="changeSpreadsheetButton" />';
	
	var spreadsheetUrl = null;
	if(cellsObj.feed.link){
		spreadsheetUrl = cellsObj.feed.link[0]['href'];
		postContentHtml += '<input type="button" value="Edit Spreadsheet" id="viewSpreadsheetButton" />';
	}
	
	postContentHtml += refreshHtml;
	
	var contentHtml = tableHtml;

	$('#content').html(contentHtml);
	
	$('#post-content').html(postContentHtml);

	if(birthdaysArray.length > 0){
		dragtable.makeDraggable(document.getElementById('content-table'));
	}

	$('#viewSpreadsheetButton').on('click', function(){
	    chrome.tabs.create({ url: spreadsheetUrl });
	});
	
	$('#refreshTableButton').on('click', function(){
		ga('send', 'event', 'button', 'click', 'refresh table');
		
		$('#refresh-spinner').show();
		
		downloadFile(targetUrl, spreadsheetCells);

	});

	$('#changeSpreadsheetButton').on('click', function(){
		ga('send', 'event', 'button', 'click', 'change spreadsheet');

		$('#content').html('');
		$('#post-content').html('');
		
		retrieveAllFiles(showList);
	});

}

/**
 * Calculates the age from the date provided
 * 
 * @param {Date}
 *            dataDate Date of birth.
 * 
 */
function calculateAge(dataDate){
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
function calculateDaysAway(dataDate){
	var nowDate = new Date();
	var nowDayOfYear = calculateDayOfYear(nowDate);
	var dataDayOfYear = calculateDayOfYear(dataDate);

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
function calculateDayOfYear(dayDate){
	var oneJan = new Date(dayDate.getFullYear(), 0, 1);
	return Math.ceil((dayDate - oneJan) / MILLISECONDS_IN_DAY);
}

/**
 * Function to sort an array by the day-of-year field
 * 
 * @param {Object}
 *            a birthday Object.
 * @param {Object}
 *            b birthday Object.
 * 
 */
function sortByDayOfYear(a, b){
	if (a['day-of-year'] < b['day-of-year']) {
		return -1;
	}
	else if (a['day-of-year'] > b['day-of-year']) {
		return 1;
	}
	else {
		return 0;
	}
}