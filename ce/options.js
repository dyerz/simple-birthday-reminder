window.setTimeout(optionsLoad, 1);

function optionsLoad(){
	var backgroundPage = chrome.extension.getBackgroundPage();
	var sbr = backgroundPage.sbr;
	
	backgroundPage.ga('send', 'pageview', {
		'page': '/options.html',
		'title': 'Options'
	});
	
	var iconBadgeColor = localStorage['iconBadgecColor'] || '#FF0000';
	var showGoogleData = localStorage['showGoogleData'] || 'Yes';
	var showFacebookData = localStorage['showFacebookData'] || 'Yes';

	if(showGoogleData === 'Yes'){
		$('#googleCheckbox').attr('checked', 'checked');
	}
	
	$('#googleCheckbox').on('change', function(){
		showGoogleData = localStorage['showGoogleData'] || 'Yes';
		showFacebookData = localStorage['showFacebookData'] || 'Yes';
		
		if(showFacebookData === 'Yes'){
			if($(this).is(":checked")){
				localStorage['showGoogleData'] = 'Yes';
			}
			else{
				localStorage['showGoogleData'] = 'No';
			}
			
			sbr.loadData();
		}
		else{
			alert('You must select at least one type of data to view.');
			this.checked = true;
			return false;
		}
		
	});
	
	if(showFacebookData === 'Yes'){
		$('#facebookCheckbox').attr('checked', 'checked');
	}

	$('#facebookCheckbox').on('change', function(){
		showFacebookData = localStorage['showFacebookData'] || 'Yes';
		
		if(showGoogleData === 'Yes'){
			if($(this).is(":checked")){
				localStorage['showFacebookData'] = 'Yes';
			}
			else{
				localStorage['showFacebookData'] = 'No';
			}

			sbr.loadData();
		}
		else{
			alert('You must select at least one type of data to view.');
			this.checked = true;
			return false;
		}
		
	});
	
	
	$("#iconBadgeColor").spectrum({
	    color: iconBadgeColor,
	    change: function(newColor){
	    	var newColorString = newColor.toHexString();
	    	localStorage['iconBadgecColor'] = newColorString;
	    	chrome.browserAction.setBadgeBackgroundColor({color: newColorString});
	    }
	});	
	
	$("#pastDays").val(localStorage['pastDays']).prop('selected', true);

	$("#pastDays").on('change', function(){
		localStorage['pastDays'] = this.value;
	});

	
	$("#clearSettings").on('click', function(){
		delete localStorage['iconBadgecColor'];
		
		delete localStorage['facebook_access_token']
		
		delete localStorage['worksheet_url'];
		delete localStorage['stored_spreadsheet'];
		
		delete localStorage['showGoogleData'];
		delete localStorage['showFacebookData'];
		
		if(localStorage['backgroundTimeout']){
			backgroundPage.window.clearTimeout(parseInt(localStorage['backgroundTimeout']));
			delete localStorage['backgroundTimeout'];
		}

		chrome.runtime.reload();
//		var id = chrome.i18n.getMessage("@@extension_id");
//	    chrome.management.setEnabled(id, false, function() {
//	        chrome.management.setEnabled(id, true);
//	    });
	});
}