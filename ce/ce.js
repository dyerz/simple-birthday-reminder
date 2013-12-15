var FIRST_DATE = 1;

/**
 * Called when the client library is loaded to start the auth flow.
 */
function handleClientLoad(){
	window.setTimeout(checkAuth, 1);
}

function checkAuth(){
	var backgroundPage = chrome.extension.getBackgroundPage();
	var sbr = backgroundPage.sbr;
	
	backgroundPage.ga('send', 'pageview', {
		'page': '/popup.html',
		'title': 'Popup'
	});

	if(sbr.authorized){
		if(sbr.apiOk){
			if(localStorage['stored_spreadsheet']){
				sbr.loadSpreadsheet();
				window.setTimeout(showData, 500);
			}
			else{
				sbr.retrieveAllFiles(showList);
			}
		}
		else{
			sbr.requestAuth();
			window.setTimeout(checkAuth, 500);
		}
	}
	else{
		// No access token could be retrieved, show the button to start the
		// authorization flow.
		$('#content').html('<input type="button" id="authorizeButton" value="Authorize" />');

		$('#authorizeButton').on('click', function(){
			backgroundPage.ga('send', 'event', 'button', 'click', 'authorization');

			gapi.auth.authorize({
				'client_id' : sbr.clientId,
				'scope' : sbr.scopes,
				'immediate' : false
			}, handleAuthResult);
			
			$('#pre-content').hide();
			$('#content').html('Click Continue after closing the authorization window.<br /><input type="button" id="continueButton" value="Continue" />');

			$('#continueButton').on('click', function(){
				backgroundPage.ga('send', 'event', 'button', 'click', 'authorization continue');

				$('#pre-content').show();
				$('#content').html('');
				sbr.requestAuth();
				window.setTimeout(checkAuth, 500);
			});
		});
	}
}

function handleAuthResult(authResult){
	if (authResult && !authResult.error) {
		ga('send', 'event', 'automatic', 'authorization', 'success', {
			'nonInteraction' : true
		});

		sbr.requestAuth();
		window.setTimeout(checkAuth, 1000);
	}
	else {
		ga('send', 'event', 'automatic', 'authorization', 'failure', {
			'nonInteraction' : true
		});


	}
}

/**
 * Called when the drive API has been loaded.
 * 
 * @param {Object}
 *            result Array of all spreadsheets.
 * 
 */
function showList(result){
	var backgroundPage = chrome.extension.getBackgroundPage();
	var sbr = backgroundPage.sbr;

	var spreadsheets = [];

	for (var i = 0; i < result.length; i++) {
		if (result[i].mimeType === 'application/vnd.google-apps.spreadsheet') {
			spreadsheets.push(result[i]);
		}
	}

	backgroundPage.ga('send', 'event', 'automatic', 'showList', 'success', spreadsheets.length, {
		'nonInteraction' : true
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
		delete localStorage['worksheet_url'];
		localStorage['stored_spreadsheet'] = evt.target.value;

		sbr.loadSpreadsheet();
		window.setTimeout(showData, 500);
		
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
			backgroundPage.ga('send', 'event', 'button', 'click', 'create file');

			$('#spinner-text').html('Creating new spreadsheet.');
			$('#pre-content').show();
			$('#content').html('');

			sbr.insertFile(title, insertFileOk);
		}
	});
}


function insertFileOk(){
	var backgroundPage = chrome.extension.getBackgroundPage();
	var sbr = backgroundPage.sbr;

	backgroundPage.ga('send', 'event', 'automatic', 'insertFileOk', 'success', {
		'nonInteraction' : true
	});

	$('#spinner-text').html('Spreadsheet created. Retrieving list of spreadsheets.');

	sbr.retrieveAllFiles(showList);
}

function showData(){
	var backgroundPage = chrome.extension.getBackgroundPage();
	var sbr = backgroundPage.sbr;
	
	var birthdaysArray = [];
	
	if(sbr.updateComplete){
		$('#pre-content').hide();
		$('#refresh-spinner').hide();
		
		var tableHtml = 'Problem retrieving the spreadsheet data.';
		
		var refreshHtml = '';

		if(sbr.validFeed){
			for ( var key in sbr.birthdaysObject) {
				birthdaysArray.push(sbr.birthdaysObject[key]);
			}
			
			if(birthdaysArray.length > 0){
				if(sbr.birthdayTodayCount == 0){
					var todayDate = new Date();
					var todayString = $.datepicker.formatDate('mm/dd', todayDate);
					birthdaysArray.push({
						'today': true,
						'date': todayDate,
						'date-str': todayString,
						'age': '',
						'day-of-year': sbr.calculateDayOfYear(todayDate),
						'days-away': '',
						'setting-days-away': sbr.settingDaysAway,
						'name': 'Today'
					});
				}
				
				FIRST_DATE = sbr.calculateDayOfYear(new Date());
				birthdaysArray = birthdaysArray.sort(sortBySettingDaysAway);

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
						email_html = '<span id="email_' + i + '" class="ui-icon ui-icon-mail-closed" title="Send Email"></span>';
					}

					tableHtml += '<td>' + email_html + '</td>';

					tableHtml += '</tr>';
				}
				tableHtml += '<table>';			

				refreshHtml = '<input type="button" value="Refresh" id="refreshTableButton" />';
				refreshHtml += '<img id="refresh-spinner" class="hidden" src="ajax-loader.gif" />';
			}
			else{
				tableHtml = 'Spreadsheet contains no data.';
			}
		}
		else if(sbr.errorMessage){
			tableHtml = sbr.errorMessage
		}

		var postContentHtml = '<input type="button" value="Change Spreadsheet" id="changeSpreadsheetButton" />';
		
		var spreadsheetUrl = sbr.spreadsheetUrl;
		if(spreadsheetUrl){
			postContentHtml += '<input type="button" value="Edit Spreadsheet" id="viewSpreadsheetButton" />';
		}
		
		var worksheetUrl = localStorage['worksheet_url']
		if(worksheetUrl){
			postContentHtml += '<input type="button" value="Add Birthday" id="addBirthdayButton" />';
		}
		
		postContentHtml += refreshHtml;
		
		var contentHtml = tableHtml;

		$('#content').html(contentHtml);
		
		$('#post-content').html(postContentHtml);

		if(birthdaysArray.length > 0){
			dragtable.makeDraggable(document.getElementById('content-table'));
		}

		$('#viewSpreadsheetButton').on('click', function(){
			backgroundPage.ga('send', 'event', 'button', 'click', 'view spreadsheet');

			chrome.tabs.create({ url: spreadsheetUrl });
		});
		
		$('#refreshTableButton').on('click', function(){
			backgroundPage.ga('send', 'event', 'button', 'click', 'refresh table');
			
			$('#refresh-spinner').show();
			
			sbr.loadSpreadsheet();
			window.setTimeout(showData, 500);
		});

		$('#changeSpreadsheetButton').on('click', function(){
			backgroundPage.ga('send', 'event', 'button', 'click', 'change spreadsheet');

			$('#content').html('');
			$('#post-content').html('');
			
			sbr.retrieveAllFiles(showList);
		});	
		
		$('.ui-icon-mail-closed').each(function(){
			var rowId = parseInt(this.id.split('_')[1]);
			sbr.clickCount[rowId] = 0;
			
			$(this).on('click', function(){
				sbr.clickCount[rowId]++;
				
				if(sbr.clickCount[rowId] > 3){
					if(confirm('Were you able to send an e-mail?')){
						
					}
				}
				else{
					if(rowId < birthdaysArray.length){
						var email = birthdaysArray[rowId]['e-mail'];
						var mailUrl = 'mailto:' + email + '?subject=Happy Birthday';
							
						chrome.tabs.create({ url: mailUrl });
					}
				}
			});
		});

		$('#addBirthdayButton').on('click', function(){
			backgroundPage.ga('send', 'event', 'button', 'click', 'add birthday');

			$('#overlay').show();
			$('#overlay-form-div').show();
			
			$('#birthdayInput').datepicker({
				showOtherMonths: true,
				selectOtherMonths: true,
			    changeMonth: true,
			    changeYear: true
			});
		   
			$('#overlay').on('click', function(){
				$(this).hide();
				$('#overlay-form-div').hide();
			});

			$('#cancelButton').on('click', function(){
				$('#overlay').hide();
				$('#overlay-form-div').hide();
			});
		});		

	}
	else{
		if(localStorage['backgroundTimeout']){
			backgroundPage.clearTimeout(parseInt(localStorage['backgroundTimeout']));
		}
		
		sbr.requestAuth();
		window.setTimeout(showData, 500);
	}
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

/**
 * Function to sort an array by the day-of-year field
 * 
 * @param {Object}
 *            a birthday Object.
 * @param {Object}
 *            b birthday Object.
 * 
 */
function sortBySettingDaysAway(a, b){
	if (a['setting-days-away'] < b['setting-days-away']) {
		return -1;
	}
	else if (a['setting-days-away'] > b['setting-days-away']) {
		return 1;
	}
	else {
		return 0;
	}
}