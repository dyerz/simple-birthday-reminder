var SAVE_RELOAD_COUNTER = 0;

/**
 * Called when the client library is loaded to start the auth flow.
 */
function handleClientLoad(){
	window.setTimeout(checkAuth, 1);
}

function checkAuth(){
	var backgroundPage = chrome.extension.getBackgroundPage();
	var sbr = backgroundPage.sbr;
	var FB = backgroundPage.FB;
	
	backgroundPage.ga('send', 'pageview', {
		'page': '/popup.html',
		'title': 'Popup'
	});


	var content_html = '';
	var googleReady = false;
	
	// handle Google
	if(sbr.googleAuthorized){
		content_html = 'Authorized with Google. <br />';
		var googleReady = true;
//		if(sbr.apiOk){
//			if(localStorage['stored_spreadsheet']){
//				sbr.loadSpreadsheet();
//				window.setTimeout(showData, 500);
//			}
//			else{
//				sbr.retrieveAllFiles(showList);
//			}
//		}
//		else{
//			sbr.requestGoogleAuth();
//			window.setTimeout(checkAuth, 500);
//		}
	}
	else{
		$('#pre-content').hide();
		
		// No access token could be retrieved, show the button to start the
		// authorization flow.
		$('#content').html('<input type="button" id="authorizeGoogleButton" value="Authorize with Google" />');

		$('#authorizeGoogleButton').on('click', function(){
			backgroundPage.ga('send', 'event', 'button', 'click', 'google authorization');

			gapi.auth.authorize({
				'client_id' : sbr.clientId,
				'scope' : sbr.scopes,
				'immediate' : false
			}, handleGoogleAuthResult);
			
			$('#pre-content').hide();
			$('#content').html('Click Continue after closing the authorization window.<br /><input type="button" id="continueButton" value="Continue" />');

			$('#continueButton').on('click', function(){
				backgroundPage.ga('send', 'event', 'button', 'click', 'google authorization continue');

				$('#pre-content').show();
				$('#content').html('');
				sbr.requestGoogleAuth();
				window.setTimeout(checkAuth, 500);
			});
		});
	}
	
	// handle facebook
	if(FB.getLoginStatus(checkFacebookLoginStatus)){
		
	}
	else{
		$('#pre-content').hide();

		// No access token could be retrieved, show the button to start the
		// authorization flow.
		$('#content').html('<input type="button" id="authorizeFacebookButton" value="Authorize with Facebook" />');

		$('#authorizeFacebookButton').on('click', function(){
			backgroundPage.ga('send', 'event', 'button', 'click', 'facebook authorization');

			//FB.login(checkFacebookLoginStatus, {scope:'friends_birthday'});
			var scope = 'friends_birthday'
			var url = "https://graph.facebook.com/oauth/authorize?client_id=" + backgroundPage.FB_APP_ID + "&redirect_uri=http://simple-birthday-reminder.googlecode.com/svn/trunk/sbrjs/facebook.html&type=user_agent&display=page&scope=" + scope;
			window.open(url, 'checkFacebookLoginStatus');			
			
			$('#pre-content').hide();
			$('#content').html('Click Continue after closing the authorization window.<br /><input type="button" id="continueButton" value="Continue" />');

			$('#continueButton').on('click', function(){
				backgroundPage.ga('send', 'event', 'button', 'click', 'facebook authorization continue');

				$('#pre-content').show();
				$('#content').html('');
				sbr.requestGoogleAuth();
				window.setTimeout(checkAuth, 500);
			});
		});
		
	}
	
}

function handleGoogleAuthResult(authResult){
	if (authResult && !authResult.error) {
		ga('send', 'event', 'automatic', 'authorization', 'success', {
			'nonInteraction' : true
		});

		sbr.requestGoogleAuth();
		window.setTimeout(checkAuth, 1000);
	}
	else {
		ga('send', 'event', 'automatic', 'authorization', 'failure', {
			'nonInteraction' : true
		});


	}
}

// Check the result of the user status and display login button if necessary
function checkFacebookLoginStatus(response) {
  if(response && response.status == 'connected') {
    alert('User is authorized');
    
    FB.api('/me/friends', {'fields': 'id,name,birthday'}, function(response) {
        console.log('Good to see you, ' + response + '.');
      });
    
    // Hide the login button
    document.getElementById('loginButton').style.display = 'none';
    
    // Now Personalize the User Experience
   // console.log('Access Token: ' + response.authResponse.accessToken);
  } else {
    alert('User is not authorized');
    
    // Display the login button
    document.getElementById('loginButton').style.display = 'block';
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

				tableHtml = '<table class="draggable" id="content-table"><thead><tr>';
				tableHtml += '<th class="dateColumn">Date</th>';
				tableHtml += '<th class="nameColumn">Name</th>';
				tableHtml += '<th class="ageColumn">Age</th>';
				tableHtml += '<th class="daysAwayColumn">Days Away</th>';
				tableHtml += '<th class="actionsColumn">Actions</th></tr></thead>';
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

					var email_html = '';
					
					if(birthdaysArray[i]['setting-days-away'] <= 2 * localStorage['pastDays'] && birthdaysArray[i]['days-away'] != ''){
						email_html += '<img src="amazon.ico" title="Send an Amazon Gift Card" id="amazonIcon" />';
					}
					
					if ('e-mail' in birthdaysArray[i]) {
						email_html += ' <div class="icon-wrapper"><span id="email_' + i + '" class="ui-icon ui-icon-mail-closed" title="Send Email"></span></div>';
					}
					
					if(birthdaysArray[i]['name'] !== 'Today'){
						email_html += '<div class="icon-wrapper" style="float: right;"><span id="edit_' + birthdaysArray[i]['row'] + '" class="ui-icon ui-icon-pencil" title="Edit Details"></span></div>';
					}

					tableHtml += '<td>' + email_html + '</td>';

					tableHtml += '</tr>';
				}
				tableHtml += '<table>';			

				refreshHtml += '<div class="icon-wrapper"><span class="ui-icon ui-icon-refresh" title="Refresh Data" id="refreshTableButton"></span></div>';
				refreshHtml += '<img id="refresh-spinner" class="hidden" src="ajax-loader.gif" />';
			}
			else{
				tableHtml = 'Spreadsheet contains no data.';
			}
		}
		else if(sbr.errorMessage){
			tableHtml = sbr.errorMessage
		}

		var postContentHtml = '<div class="icon-wrapper"><span class="ui-icon ui-icon-transferthick-e-w" title="Change Spreadsheet" id="changeSpreadsheetButton"></span></div>';
		
		var spreadsheetUrl = sbr.spreadsheetUrl;
		if(spreadsheetUrl){
			postContentHtml += '<div class="icon-wrapper"><span class="ui-icon ui-icon-document" title="Edit Spreadsheet" id="viewSpreadsheetButton"></span></div>';
		}
		
		var worksheetUrl = localStorage['worksheet_url']
		if(worksheetUrl){
			postContentHtml += '<div class="icon-wrapper"><span class="ui-icon ui-icon-plusthick" title="Add Birthday" id="addBirthdayButton"></span></div>';
		}
		
		refreshHtml += '<div class="icon-wrapper" style="float: right;"><span class="ui-icon ui-icon-help" title="Help" id="helpButton"></span></div>';
		
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

		$('#amazonIcon').on('click', function(){
			backgroundPage.ga('send', 'event', 'button', 'click', 'send amazon');
			var amazonUrl = 'http://www.amazon.com/gp/product/B004LLIKVU/ref=as_li_tf_tl?ie=UTF8&camp=1789&creative=9325&creativeASIN=B004LLIKVU&linkCode=as2&tag=simpbirtremi-20';
			
			chrome.tabs.create({ url: amazonUrl });
		});		

		$('.ui-icon-pencil').each(function(){
			$(this).on('click', function(){
				var rowKey = this.id.split('_')[1];
				showAddOverlay(parseInt(rowKey));
			});
		});		
		
		$('#addBirthdayButton').on('click', function(){
			backgroundPage.ga('send', 'event', 'button', 'click', 'add birthday');
			showAddOverlay(null);
		});		

		if(sbr.validFeed && birthdaysArray.length == 0){
			backgroundPage.ga('send', 'event', 'automatic', 'showData', 'empty spreadsheet', {
				'nonInteraction' : true
			});
			showAddOverlay(null);
		}

	}
	else{
		if(localStorage['backgroundTimeout']){
			backgroundPage.clearTimeout(parseInt(localStorage['backgroundTimeout']));
		}
		
		sbr.requestGoogleAuth();
		window.setTimeout(showData, 500);
	}
	
}

function showAddOverlay(rowKey){
	var backgroundPage = chrome.extension.getBackgroundPage();
	var sbr = backgroundPage.sbr;
	
	var buttonRowHtml = '<input type="button" value="Cancel" id="cancelButton" />';
	buttonRowHtml += '<input type="button" value="Save" id="saveButton"/> <img id="save-spinner" src="ajax-loader.gif" class="hidden" />';

	$('#buttonRow').html(buttonRowHtml);
	
	var nameVal = '';
	var birthdayVal = '';
	var emailVal = '';
	var nextRow = sbr.getBirthdaysSize() + 1;

	if(rowKey){
		nameVal = sbr.birthdaysObject[rowKey]['name'];
		birthdayVal = sbr.birthdaysObject[rowKey]['date-str'];
		emailVal = sbr.birthdaysObject[rowKey]['email'];
		nextRow = rowKey;
	}

	$('#nameInput').val(nameVal);
	$('#birthdayInput').val(birthdayVal);
	$('#emailInput').val(emailVal);
//	$('#rowKey').html(rowKey);
	$('#overlay').show();
	$('#overlay-form-div').show();
	
	$('#birthdayInput').datepicker({
		showOtherMonths: true,
		selectOtherMonths: true,
	    changeMonth: true,
	    changeYear: true
	});
   
	$('#overlay').on('click', function(){
		backgroundPage.ga('send', 'event', 'overlay', 'click', 'cancel add birthday');
		$(this).hide();
		$('#overlay-form-div').hide();
	});

	$('#cancelButton').on('click', function(){
		backgroundPage.ga('send', 'event', 'button', 'click', 'cancel add birthday');
		$('#overlay').hide();
		$('#overlay-form-div').hide();
	});

	$('#saveButton').on('click', function(){
		backgroundPage.ga('send', 'event', 'button', 'click', 'save birthday');
		
		var name = xmlEscape($('#nameInput').val().trim());
		var birthday = xmlEscape($('#birthdayInput').val().trim());
		var email = xmlEscape($('#emailInput').val().trim());
		
		var nameOk = false;
		if(name !== ''){
			nameOk = true;
		}
		
		var dateOk = false;
		if(birthday != '' && birthday.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)){
			dateOk = true;
		}
		
		if(nameOk && dateOk){
			sbr.changeCell(nextRow, 1, birthday);
			sbr.changeCell(nextRow, 2, name);
			sbr.changeCell(nextRow, 3, email);

			$('#save-spinner').show();
			SAVE_RELOAD_COUNTER = 0;
			window.setTimeout(saveComplete, 500);
		}
		else{
			if(!nameOk){
				$('#nameInput').css('border-color', 'red');
			}

			if(!dateOk){
				$('#birthdayInput').css('border-color', 'red');
			}
		}
	});	
}

function saveComplete(){
	var backgroundPage = chrome.extension.getBackgroundPage();
	var sbr = backgroundPage.sbr;

	if(sbr.saveComplete){
		backgroundPage.ga('send', 'event', 'automatic', 'saveComplete', 'success', {
			'nonInteraction' : true
		});
		
		$('#overlay').hide();
		$('#overlay-form-div').hide();
		$('#save-spinner').hide();
		
		sbr.loadSpreadsheet();
		window.setTimeout(showData, 500);
	}
	else{
		SAVE_RELOAD_COUNTER++;
		
		if(SAVE_RELOAD_COUNTER < 10){
			window.setTimeout(saveComplete, 500);
		}
		else{
			chrome.runtime.reload();
		}
	}
}

function xmlEscape(unsafe){
	return unsafe
	    .replace(/&/g, "&amp;")
	    .replace(/</g, "&lt;")
	    .replace(/>/g, "&gt;")
	    .replace(/"/g, "&quot;");
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