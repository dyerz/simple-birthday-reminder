window.setTimeout(optionsLoad, 1);

function optionsLoad(){
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
}