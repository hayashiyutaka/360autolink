/* ------------------------------------------------------------- */
/*   Controller                                                  */
/* ------------------------------------------------------------- */
window.onload = function()
{
try
{

//Used in _checkBlack()
BLACKLIST = [
	'紀要',
	'研究紀要',
	'Bulletin',
	'ESP'
	//'Annual Report',
];

var page = "/webopac/147";
pageTracker._trackPageview(page);
var bib = kulineScrape();
if (!bib.issn.match(/^[0-9X]{8}$/))	bib.issn = '';
if (bib.isBlack)	bib.title = '';	//Fukuda
page += "/" + bib.cattp;
pageTracker._trackPageview(page);
if ((bib.cattp !== 'SB') && (bib.cattp !== 'EJ')) return 0;
page += "/" + (bib.issn !== '') ? "issn" : "noissn";
pageTracker._trackPageview(page);
//if (!bib.issn && (bib.title === '' || bib.isBlack)) return 0;
if (bib.issn === '' && bib.title === '')	return 0;	//Fukuda

var ar = new AutoResolver
({
	api: location.protocol + "//" + location.hostname + "/cgi-bin/usr/147.cgi",
	param: {
		issn: bib.issn,
		title: bib.title,
		version: "1.0"
	},
	callback: function (array)
	{
		if (array.length <= 0)	return 0;	//ok?
		
		page += "/view";
		pageTracker._trackPageview(page);
		
		//Modelから返ってきたデータ(array)を使って作文し，
		var arText = "<p id=\"header\">電子ジャーナルが利用できます / E-Journals available here (<span id=\"what\"><a href=\"http://www.kulib.kyoto-u.ac.jp/modules/service/index.php?content_id=34&from=ar\">What's this?</a></span>):</p>\n<ol>\n";
		for (var i = 0; i < array.length; i++)
		{
			var h = array[i];
			var range = (h.startDate) ? h.startDate + " - " + h.endDate : "";
			arText += "<li>"
				+ "<a onclick=\"javascript:pageTracker._trackPageview('" + page + "/fulltext');\" "
				+ "href=\"http://tt2mx4dc7s.search.serialssolutions.com/log?L=TT2MX4DC7S&D=" + h.databaseId + "&U=" + h.url + "\">"
				+ ((range) ? range : "Link to E-Journals")
				+ "</a> <span class=\"provider\">(" + h.databaseName +  ")</span></li>\n";
		}
		arText += "</ol>\n"
			+ "<p id=\"footer\">"
			+ "<a onclick=\"javascript:pageTracker._trackPageview('" + page + "/resolver');\" "
			+ "href=\"http://tt2mx4dc7s.search.serialssolutions.com/?"
			+ "url_ver=Z39.88-2004&"
			+ "url_ctx_fmt=info%3Aofi%2Ffmt%3Akev%3Amtx%3Actx&"
			+ "rfr_id=info%3Asid%2Fkyoto-u.ac.jp%3AwebOPAC&"
			+ "rft_val_fmt=info%3Aofi%2Ffmt%3Akev%3Amtx%3Ajournal&"
			+ "rft.genre=journal&"
			+ "rfr_dat=" + bib.bibid + "&"
			+ "rft.title=" + encodeURI(bib.title) + "&"
			+ "rft.issn=" + bib.issn + "\">"
			+ "<img src=\"usr/image/albutton2.gif\" height=\"15\" width=\"100\" alt=\"京大Article Linker\" title=\"More full text options\" />"
			+ "</a>"
			+ "</p>";
		
		//Viewに渡す
		var layer = new TransparentLayerBuilder
		({
			ns: "autoResolver",
			display: "none",
			text: arText,
			img: {
				open: "usr/image/arrow1_sw.gif",
				close: "usr/image/arrow1_ne.gif"
			},
			css: "usr/css/white-blue.css"
		});
		layer.build();
		layer.show();
	}
});
ar.resolve();
}
catch(e)
{
	//alert(e);
}
};

/* ------------------------------------------------------------- */
/*   Model                                                       */
/* ------------------------------------------------------------- */
//API(proxy)をコール，取得したXMLをJSONへ変換し，this.callbackに渡す
var AutoResolver = function(s)
{
	this.api = s.api;
	this.param = s.param;
	this.callback = s.callback;
};
AutoResolver.prototype =
{
	resolve: function()
	{
		var query = "issn=" + this.param.issn + "&"
				+ "title=" + encodeURI(this.param.title) + "&"
				+ "version=" + this.param.version;
		var http = new JKL.ParseXML(this.api + "?" + query);
		http.setOutputArrayElements(["ssopenurl:result", "ssopenurl:linkGroup", "ssopenurl:url"]);
		http.async(this._parse, this);
		http.parse();
	},
	_parse: function (json, that)	//that = ar
	{
		var array = [];
		var journals = json["ssopenurl:openURLResponse"]["ssopenurl:results"]["ssopenurl:result"];
		for (var k = 0; k < journals.length; k++)
		{
			//journals[k]["ssopenurl:linkGroups"]は存在しないことも(e.g.,SB00078704,SB02071978)
			if (!journals[k]["ssopenurl:linkGroups"])	continue;
			var holdings = journals[k]["ssopenurl:linkGroups"]["ssopenurl:linkGroup"];
			for (var i = 0; i < holdings.length; i++)
			{
				var hash = {};
				var holding = holdings[i];
				if (holding["type"] !== "holding")	continue;
				//url
				var urls = holding["ssopenurl:url"];
				for (var j = 0; j < urls.length; j++)
				{
					if (urls[j]["type"] === "journal")
					{
						hash["url"] = urls[j]["#text"];
						break;
					}
				}
				//other data
				var holdingData = holding["ssopenurl:holdingData"];
				hash["databaseName"] = holdingData["ssopenurl:databaseName"];
				hash["databaseId"] = holdingData["ssopenurl:databaseId"];
				hash["providerName"] = holdingData["ssopenurl:providerName"];
				var normalizedData = holdingData["ssopenurl:normalizedData"];
				if (normalizedData)	//e.g., SB03028323
				{
					hash["startDate"] = normalizedData["ssopenurl:startDate"];
					hash["endDate"] = (normalizedData["ssopenurl:endDate"]) ? 
										normalizedData["ssopenurl:endDate"] : "Present";
				}
				array.push(hash);
			}
		}
		//startDateも入れたほうがいいかも
		array.sort(function(a, b){ return (a.endDate < b.endDate); });
		
		//もともとのコールバック関数に渡す
		that.callback(array);
	}
};

/* ------------------------------------------------------------- */
/*   View                                                        */
/* ------------------------------------------------------------- */
//渡されたものを表示する
var TransparentLayerBuilder = function(s)
{
	this.ns = s.ns;
	this.display = s.display;
	this.text = s.text;
	this.img = s.img;
	this.css = s.css;
}
TransparentLayerBuilder.prototype =
{
	build: function()
	{
		//<link rel="stylesheet" type="text/css" href="...">
		var link = document.createElement("link");
			link.rel = "stylesheet";
			link.type = "text/css";
			link.href = this.css;
		document.getElementsByTagName("head")[0].appendChild(link);
		
		//<div id="autoResolver">
		//  <div id="arText"><!-- with innerHTML --></div>
		//  <div id="arBtn"><!-- with background-image --></div>
		//</div>
		var rootDiv = document.createElement("div");
			rootDiv.id = this.ns;
			rootDiv.style.display = this.display;
		var textDiv = document.createElement("div");
			textDiv.id = "arText";	//this.ns + "-Text";
			textDiv.innerHTML = this.text;
		var btnDiv = document.createElement("div");
			btnDiv.id = "arBtn";	//this.ns + "-Btn";
			btnDiv.style.backgroundImage = "url(\"" + this.img.close + "\")";
			btnDiv.img = this.img;//肝
			btnDiv.onclick = function(){
				if (textDiv.style.display == "none")
				{
					textDiv.style.display = "block";
					btnDiv.style.backgroundImage = "url(\"" + this.img.close + "\")";
				}
				else
				{
					textDiv.style.display = "none";
					btnDiv.style.backgroundImage = "url(\"" + this.img.open + "\")";
				}
			};
		
		//DOMツリーに追加
		rootDiv.appendChild(textDiv);
		rootDiv.appendChild(btnDiv);
		document.getElementsByTagName("body")[0].appendChild(rootDiv);
		
		return this;
	},
	show: function()
	{
		document.getElementById(this.ns).style.display = "block";
		return this;
	}
};

/* ------------------------------------------------------------- */
/*   Scraper w/ private functions                                */
/* ------------------------------------------------------------- */
//Controllerで使うのはこれだけ
function kulineScrape()
{
	var bib = {
		issn: _getISSN(),
		title: _getTitle(),
		cattp: _getCattp(),
		bibid: document.catsrhform.pkey.value
	};
	bib.isBlack = _checkBlack(bib.title);
	return bib;
}

//ISSN
function _getISSN()
{
	if (document.all)	//IE
		document.body.innerText.match(/ISSN([0-9X]{8})/);
	else	//Firefox,Safari,(Operaではうまくいかない)
		document.body.innerHTML.match(/<div class=\"lst_value\">\s+([0-9X]{8})/);
	return RegExp.$1;
}

//<div class="hdl_main">&nbsp;&nbsp;キネマ旬報 / キネマ旬報社編. </div>
//⇒ キネマ旬報
function _getTitle()
{
	var tr = document.getElementsByClassName('hdl_main')[0].innerHTML;
	//document.getElementsByClassName('hdl_main').entries()[0].innerHTML;
	var ws = (navigator.userAgent.match(/(Safari|Opera)/)) ? "  " : "&nbsp;&nbsp;";
	tr = tr.substring(ws.length, tr.length - 2);
	var t = (tr.match(/\//)) ? tr.split(" / ")[0] : tr;
	t = t.split(" = ")[0];
	t = t.split(" ; ")[0];
	t = t.split(" : ")[0];
	return t;
}

//特定のタイトルではリゾルブしない
function _checkBlack(title)
{
	for (var i = 0; i < BLACKLIST.length; i++)
	{
		if (title === BLACKLIST[i])	return 1;	//black
	}
	return 0;	//white
}

//cattpを調べる
//<font class="info">雑誌情報</font>
//<font class="info">SerialsInformation</font>
function _getCattp()
{
	document.getElementsByClassName('info')[0].innerHTML.match(/(.*)(情報|Information)/);
	return {
		"図書" : "BB",
		"雑誌" : "SB",
		"電子ブック" : "EB",
		"電子ジャーナル" : "EJ",
		"Books" : "BB",
		"Serials" : "SB",
		"E-books" : "EB",
		"E-journals" : "EJ"
	}[RegExp.$1] || 'undefined';
}

/* ------------------------------------------------------------- */
