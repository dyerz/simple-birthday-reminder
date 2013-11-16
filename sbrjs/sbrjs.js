var CLIENT_ID = '310837256871-o5rrsg5sqbb14tl5l6mk7i7mdh2l9jte.apps.googleusercontent.com';
var SCOPES = 'https://www.googleapis.com/auth/drive https://spreadsheets.google.com/feeds';
var MILLISECONDS_IN_DAY = 86400000; 

/**
 * Called when the client library is loaded to start the auth flow.
 */
function handleClientLoad() {
	window.setTimeout(checkAuth, 1);
}

/**
 * Check if the current user has authorized the application.
 */
function checkAuth() {
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
function handleAuthResult(authResult) {
	if (authResult && !authResult.error) {
		$('#spinner-text').html(
				'Authorization successful. Retrieving list of spreadsheets.');
		// Access token has been successfully retrieved, requests can be sent to
		// the API.
		gapi.client.load('drive', 'v2', driveAPIOk);
	} else {
		// No access token could be retrieved, show the button to start the
		// authorization flow.
		$('#content')
				.html(
						'<input type="button" id="authorizeButton" value="Authorize" />');

		$('#authorizeButton').onclick = function() {
			gapi.auth.authorize({
				'client_id' : CLIENT_ID,
				'scope' : SCOPES,
				'immediate' : false
			}, handleAuthResult);
		};
	}
}

/**
 * Called when the drive API has been loaded.
 * 
 */
function driveAPIOk() {
	retrieveAllFiles(showList);
}

/**
 * Retrieve a list of File resources.
 * 
 * @param {Function}
 *            callback Function to call when the request is complete.
 */
function retrieveAllFiles(callback) {
	var retrievePageOfFiles = function(request, result) {
		request.execute(function(resp) {
			result = result.concat(resp.items);
			var nextPageToken = resp.nextPageToken;
			if (nextPageToken) {
				request = gapi.client.drive.files.list({
					'pageToken' : nextPageToken
				});
				retrievePageOfFiles(request, result);
			} else {

				if (!callback) {
					callback = function(file) {
						console.log(file);
					};
				}
				callback(result);
			}
		});
	};

	var initialRequest = gapi.client.drive.files.list();
	retrievePageOfFiles(initialRequest, []);
}

/**
 * Called when the drive API has been loaded.
 * 
 * @param {Object}
 *            result Array of all spreadsheets.
 * 
 */
function showList(result) {
	$('#spinner').hide();
	$('#spinner-text').hide();

	$('#content').html('<select id="fileLister"></select>');
	
	var fileListerHtml = '<option>Select a Spreadsheet</option>';
	for (var i = 0; i < result.length; i++) {
		if (result[i].mimeType === 'application/vnd.google-apps.spreadsheet') {
			fileListerHtml += '<option value="' + result[i].id + '" >'
					+ result[i].title + '</option>';
		}
	}

	$('#fileLister').html(fileListerHtml);

	fileLister.onchange = function(evt) {
		var targetUrl = 'https://spreadsheets.google.com/feeds/worksheets/'
				+ evt.target.value + '/private/basic?alt=json';
		downloadFile(targetUrl, spreadsheetWorksheets);

		$('#spinner').show();
		$('#spinner-text').html('Retrieving spreadsheet data.');
		$('#spinner-text').show();
	};
}

/**
 * Download a file's content.
 * 
 * @param {String}
 *            targetUrl URL to the file.
 * @param {Function}
 *            callback Function to call when the request is complete.
 */
function downloadFile(targetUrl, callback) {
	if (targetUrl) {
		var accessToken = gapi.auth.getToken().access_token;
		var xhr = new XMLHttpRequest();
		xhr.open('GET', targetUrl);
		xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
		xhr.onload = function() {
			callback(xhr.responseText);
		};
		xhr.onerror = function() {
			callback(null);
		};
		xhr.send();
	} else {
		callback(null);
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
function spreadsheetWorksheets(JSON_response) {
	var worksheetsObj = eval('(' + JSON_response + ')');

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
						downloadFile(listUrl, spreadsheetCells);
					}
				}
			}
		}
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
function spreadsheetCells(JSON_response) {
	$('#spinner').hide();
	$('#spinner-text').hide();

	var cellsObj = eval('(' + JSON_response + ')');

	var tableHtml = 'Problem retrieving the spreadsheet data.';
	if (cellsObj.feed.entry) {
		var birthdaysObject = {};
		for (var i = 0; i < cellsObj.feed.entry.length; i++) {
			var cellTitle = cellsObj.feed.entry[i].title['$t'];
			var cellContent = cellsObj.feed.entry[i].content['$t'];

			var thisRow = cellTitle.substr(1);
			if (!(thisRow in birthdaysObject)) {
				birthdaysObject[thisRow] = {};
			}

			switch (cellTitle[0]) {
			case 'A':
				birthdaysObject[thisRow]['date'] = $.datepicker.parseDate('mm/dd/yy',
						cellContent);
				birthdaysObject[thisRow]['date-str'] = cellContent;
				birthdaysObject[thisRow]['age'] = calculateAge(birthdaysObject[thisRow]['date']);
				birthdaysObject[thisRow]['day-of-year'] = calculateDayOfYear(birthdaysObject[thisRow]['date']);
				birthdaysObject[thisRow]['days-away'] = calculateDaysAway(birthdaysObject[thisRow]['date']);

				break;
			case 'B':
				birthdaysObject[thisRow]['name'] = cellContent;
				break;
			case 'C':
				birthdaysObject[thisRow]['e-mail'] = cellContent;
				break;
			}
		}
		
		var birthdaysArray = [];

		for ( var key in birthdaysObject) {
			birthdaysArray.push(birthdaysObject[key]);
		}
		
		birthdaysArray = birthdaysArray.sort(sortByDayOfYear);

		tableHtml = '<table class="draggable" id="content-table">';
		tableHtml += '<thead><tr><th>Date</th><th>Name</th><th>Age</th><th>Days Away</th><th>Email</th></tr></thead>';
		for ( var i = 0; i < birthdaysArray.length; i++) {
			tableHtml += '<tr>';

			tableHtml += '<td>' + birthdaysArray[i]['date-str'] + '</td>';
			tableHtml += '<td>' + birthdaysArray[i]['name'] + '</td>';
			tableHtml += '<td>' + birthdaysArray[i]['age'] + '</td>';
			tableHtml += '<td>' + birthdaysArray[i]['days-away'] + '</td>';

			var email_html = '&nbsp;';
			if ('e-mail' in birthdaysArray[i]) {
				email_html = '<a href="mailto:' + birthdaysArray[i]['e-mail']
						+ '">Send Email</a>';
			}

			tableHtml += '<td>' + email_html + '</td>';

			tableHtml += '</tr>';
		}
		tableHtml += '<table>';

	}

	$('#content').html(tableHtml);
	
	dragtable.makeDraggable(document.getElementById('content-table'));

}

/**
 * Calculates the age from the date provided
 * 
 * @param {Date}
 *            dataDate Date of birth.
 * 
 */
function calculateAge(dataDate) {
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
function calculateDaysAway(dataDate) {
	var nowDate = new Date();
	var nowDayOfYear = calculateDayOfYear(nowDate);
	var dataDayOfYear = calculateDayOfYear(dataDate);
	
	var nextYear = nowDate.getFullYear();
	dataDate.setFullYear(nextYear);
	
	if(nowDayOfYear > dataDayOfYear){
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
	if(a['day-of-year'] < b['day-of-year']){
		return -1;
	}
	else if(a['day-of-year'] > b['day-of-year']){
		return 1;
	}
	else{
		return 0;
	}
}