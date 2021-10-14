(function(){
	//CustomEvent
	if("function"!=typeof window.CustomEvent){window.CustomEvent=function(a,b){b=b||{bubbles:!1,cancelable:!1,detail:null};var c=document.createEvent("CustomEvent");return c.initCustomEvent(a,b.bubbles,b.cancelable,b.detail),c}}
	//Number.parseInt
	if (Number.parseInt === undefined) Number.parseInt = window.parseInt;
	//Object.values
	if (!Object.values) Object.values = function(o){ return Object.keys(o).map(function(k){ return o[k]; }); }
	//Array.find
	Array.prototype.find||(Array.prototype.find=function(a){if(null==this)throw new TypeError("Array.prototype.find called on null or undefined");if("function"!=typeof a)throw new TypeError("predicate must be a function");for(var b,c=Object(this),d=c.length>>>0,e=arguments[1],f=0;f<d;f++)if(b=c[f],a.call(e,b,f,c))return b});	
})();
