window.setTimeout(optionsLoad, 1);

function optionsLoad(){
	var backgroundPage = chrome.extension.getBackgroundPage();
	
	backgroundPage.ga('send', 'pageview', {
		'page': '/options.html',
		'title': 'Options'
	});
	
	var iconBadgeColor = localStorage['iconBadgecColor'];
	
	if(!iconBadgeColor){
		iconBadgeColor = '#FF0000';
	}
	
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
		
		delete localStorage['worksheet_url'];
		delete localStorage['stored_spreadsheet'];
		
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