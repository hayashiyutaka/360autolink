//Controller
window.onload = function()
{
try
{
	//return 0;
	
	var page = "/webopac/147";
	pageTracker._trackPageview(page);
	
	
	//1. Scrape
	var bibid = _getBibid();
	var cattp = _getCattp();
	page += "/" + cattp;
	pageTracker._trackPageview(page);
	
	
	if ((cattp !== 'SB') && (cattp !== 'EJ')) return 0;
	
	var issn = _getISSN();
	page += "/" + (issn ? "issn" : "noissn");
	pageTracker._trackPageview(page);
	
	var title = _getTitle();
	
	
	if (!issn && title === "") return 0;
	
	
	//2. Resolve (Call 360 LINK XML API)
	var ar = new AutoResolver
	({
		api: location.protocol + "//" + location.hostname + "/cgi-bin/usr/147.cgi",
		param: {
			issn: issn,
			title: title,
			version: "1.0"
		}
	});
	var array = ar.resolve();
	
	//3. Text
	var arText = "";
	if (array.length > 0)
	{
		page += "/view";
		pageTracker._trackPageview(page);
		
		arText = "<p id=\"header\">電子ジャーナルが利用できます / E-Journals available here (<span id=\"what\"><a href=\"http://www.kulib.kyoto-u.ac.jp/modules/service/index.php?content_id=34\">What's this?</a></span>):</p>\n<ol>\n";
		for (var i = 0; i < array.length; i++)
		{
			var h = array[i];
			
			var range = (h.startDate) ? h.startDate + " - " + h.endDate : "";
			
			arText += "<li>"
					+ "<a onclick=\"javascript:pageTracker._trackPageview('" + page + "/fulltext');\" "
					+ "href=\"http://tt2mx4dc7s.search.serialssolutions.com/log?L=TT2MX4DC7S&D=" + h.databaseId + "&U=" + h.url + "\">"
					+ (range ? range : "Link to E-Journals")
					+ "</a> <span class=\"provider\">(" + h.databaseName +  ")</span></li>\n";
		}
		arText += "</ol>\n";
		
		arText += "<p id=\"footer\">"
				+ "<a onclick=\"javascript:pageTracker._trackPageview('" + page + "/resolver');\" "
				+ "href=\"http://tt2mx4dc7s.search.serialssolutions.com/?"
				+ "url_ver=Z39.88-2004&"
				+ "url_ctx_fmt=info%3Aofi%2Ffmt%3Akev%3Amtx%3Actx&"
				+ "rfr_id=info%3Asid%2Fkyoto-u.ac.jp%3AwebOPAC&"
				+ "rft_val_fmt=info%3Aofi%2Ffmt%3Akev%3Amtx%3Ajournal&"
				+ "rft.genre=journal&"
				+ "rfr_dat=" + bibid + "&"
				+ "rft.title=" + encodeURI(title) + "&"
				+ "rft.issn=" + issn + "\">"
				+ "<img src=\"usr/image/albutton2.gif\" height=\"15\" width=\"100\" alt=\"京大Article Linker\" title=\"More full text options\" />"
				+ "</a>"
			
				//+ "<br /><span id=\"what\"><a href=\"https://docs.google.com/Edit?id=dcqzjk6h_203cv7d83c9\">What's this?</a></span>"
			
				+ "</p>";
	}
	else
	{
		return 0;
	}
	
	//4. Show
	var layer = new TransparentLayerBuilder
	({
		root:
		{
			id: "autoResolver",
			display: "none"
		},
		text:
		{
			id: "arText",
			text: arText
		},
		btn:
		{
			id: "arBtn",
			img:
			{
				open: "usr/image/arrow1_sw.gif",
				close: "usr/image/arrow1_ne.gif"
			}
		},
		style: "usr/css/white-blue.css"
	});
	layer.build();
	layer.show();
}
catch(e)
{
	//alert(e);
}
};

/* ------------------------------------------------------------- */

//View: TransparentLayerBuilder
var TransparentLayerBuilder = function(s)
{
	this.root = s.root;
	this.text = s.text;
	this.btn = s.btn;
	this.style = s.style;
	return this;
}
TransparentLayerBuilder.prototype =
{
	build: function()
	{
		//<link rel="stylesheet" type="text/css" href="...">
		var link = document.createElement("link");
			link.rel = "stylesheet";
			link.type = "text/css";
			link.href = this.style;
		document.getElementsByTagName("head")[0].appendChild(link);
		
		//<div id="this.divTagId.root">
		//  <div id="this.divTagId.text"><!-- with innerHTML --></div>
		//  <div id="this.divTagId.btn"><!-- with background-image --></div>
		//</div>
		var rootDiv = document.createElement("div");
			rootDiv.id = this.root.id;
			rootDiv.style.display = this.root.display;
		var textDiv = document.createElement("div");
			textDiv.id = this.text.id;
			textDiv.innerHTML = this.text.text;
		var btnDiv = document.createElement("div");
			btnDiv.id = this.btn.id;
			btnDiv.style.backgroundImage = "url(\"" + this.btn.img.close + "\")";
			//btnDiv.innerHTML = "-";
			btnDiv.img = this.btn.img;//肝
			btnDiv.onclick = function(){
				//console.log(textDiv.style.display);
				if (textDiv.style.display == "none")
				{
					textDiv.style.display = "block";
					btnDiv.style.backgroundImage = "url(\"" + this.img.close + "\")";
					//btnDiv.innerHTML = "-";
				}
				else
				{
					textDiv.style.display = "none";
					btnDiv.style.backgroundImage = "url(\"" + this.img.open + "\")";
					//btnDiv.innerHTML = "+";
				}
			};
		
		rootDiv.appendChild(textDiv);
		rootDiv.appendChild(btnDiv);
		document.getElementsByTagName("body")[0].appendChild(rootDiv);
		
		return this;
	},
	show: function()
	{
		document.getElementById(this.root.id).style.display = "block";
		return this;
	}
};

/* ------------------------------------------------------------- */

//Model: AutoResolver
var AutoResolver = function(s)
{
	this.api = s.api;
	this.param = s.param;
	return this;
};
AutoResolver.prototype =
{
	resolve: function()
	{
		var array = [];
		
		var query = ((this.param.issn) ? "issn=" + this.param.issn + "&" : "") 
					+ "title=" + encodeURI(this.param.title) 
					+ "&version=" + this.param.version;
		
		//Call API
		var httpObj = new JKL.ParseXML(this.api + "?" + query);
		var json = httpObj.parse();
		
		//var linkGroups = json["ssopenurl:openURLResponse"]["ssopenurl:results"]["ssopenurl:result"]["ssopenurl:linkGroups"];
		var result = json["ssopenurl:openURLResponse"]["ssopenurl:results"]["ssopenurl:result"];
		var linkGroups = (result.length > 1) ? result[0]["ssopenurl:linkGroups"] : result["ssopenurl:linkGroups"];
		
		if (linkGroups)
		{
			var linkGroup = _toArray(linkGroups["ssopenurl:linkGroup"]);
			for (var i = 0; i < linkGroup.length; i++)
			{
				var hash = {};
				
				if (linkGroup[i]["type"] !== "holding") { continue; }
				
				//url
				var u = _toArray(linkGroup[i]["ssopenurl:url"]);
				for (var j = 0; j < u.length; j++)
				{
					if (u[j]["type"] == "journal")
					{
						hash["url"] = u[j]["#text"];
						break;
					}
				}
				
				//other data
				var holdingData = linkGroup[i]["ssopenurl:holdingData"];
				//if(!holdingData){ continue; }	//00928674
				hash["databaseName"] = holdingData["ssopenurl:databaseName"];
				hash["databaseId"] = holdingData["ssopenurl:databaseId"];
				//hash["providerName"] = holdingData["ssopenurl:providerName"];
				if (holdingData["ssopenurl:normalizedData"])	//SB03028323
				{
					hash["startDate"] = holdingData["ssopenurl:normalizedData"]["ssopenurl:startDate"];
					hash["endDate"] = holdingData["ssopenurl:normalizedData"]["ssopenurl:endDate"] ? holdingData["ssopenurl:normalizedData"]["ssopenurl:endDate"] : "Present";
				}
				array.push(hash);
			}
			array.sort(function(a, b){ return (a.endDate < b.endDate); });
		}
		
		return array;
	}
};

//cattpを調べる
//<font class="info">雑誌情報</font>
//<font class="info">SerialsInformation</font>
function _getCattp()
{
	var cattp =
	{
		ja:
		{
			"図書" : "BB",
			"雑誌" : "SB",
			"電子ブック" : "EB",
			"電子ジャーナル" : "EJ"
		},
		en:
		{
			"Books" : "BB",
			"Serials" : "SB",
			"E-books" : "EB",
			"E-journals" : "EJ"
		}
	};
	
	var info = '';
	try
	{
		info = document.getElementsByClassName('info')[0].innerHTML;
	}
	catch(e)
	{
		//prototype.js
		info = document.getElementsByClassName('info').entries()[0].innerHTML;
	}
	
	if (info.match(/(.*)情報/)){
		return cattp.ja[RegExp.$1];
	} else if (info.match(/(.*)Information/)){
		return cattp.en[RegExp.$1];
	} else {
		return 'undefined';
	}
}

//書誌IDを抜き出す
//<font class="hdl_sub">&nbsp;&lt;SB00065349&gt;</font>
function _getBibid()
{
	return document.catsrhform.pkey.value;
}

//ISSNを抜き出す
//Operaではうまくいかない
function _getISSN()
{
	var issn = '';
	
	//IE
	if (document.all)
	{
		document.body.innerText.match(/ISSN([0-9X]{8})/);
	}
	//Firefox, Safari, Opera
	else
	{
		document.body.innerHTML.match(/<div class=\"lst_value\">\s+([0-9X]{8})/);
	}
	issn = RegExp.$1;

	return issn.match(/^[0-9X]{8}$/) ? issn : '';
}

//<div class="hdl_main">&nbsp;&nbsp;キネマ旬報 / キネマ旬報社編. </div>
//⇒ キネマ旬報
function _getTitle()
{
	var tr = '';
	var t = '';
	
	var ws = (navigator.userAgent.match(/(Safari|Opera)/)) ? "  " : "&nbsp;&nbsp;";
	
	try
	{	//Firefox, Safari, Opera
		tr = document.getElementsByClassName('hdl_main')[0].innerHTML;
	}
	catch(e)
	{
		//IE (depends on prototype.js)
		tr = document.getElementsByClassName('hdl_main').entries()[0].innerHTML;
	}
	tr = tr.substring(ws.length, tr.length - 2);
	t = (tr.match(/\//)) ? tr.split(" / ")[0] : tr;
	
	//normalize
	t = t.split(" = ")[0];
	t = t.split(" ; ")[0];
	t = t.split(" : ")[0];
	
	return t;
}

//non-array to array
function _toArray(a)
{
	return (a instanceof Array) ? a : [a];
}
/* ------------------------------------------------------------- */


