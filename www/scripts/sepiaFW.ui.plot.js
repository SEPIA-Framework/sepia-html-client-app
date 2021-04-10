//AUDIO PLAYER
function sepiaFW_build_ui_plot(){
	var Plot = {};

	//TODO: we can use 'SepiaFW.config.uiIsIE11' to create fallbacks

	//µPlot (lazy) defaults:
	if ("uPlot" in window){
		//colors and sizes
		uPlot.lazy.chartBackground = "#141619";
		uPlot.lazy.chartTextColor = "#c7d0d9";
		uPlot.lazy.axisFont = "10px sans-serif";
		//uPlot.lazy.axisSizeY = 42;
		uPlot.lazy.axisSizeX = 42;
		uPlot.lazy.pointSize = 6;
		uPlot.lazy.pointWidth = 1;
		uPlot.lazy.strokeWidth = 2;
		uPlot.lazy.colorPalette = ["#ceff1a", "#3caea3", "#e24d42", "#f6d55c", "#20639b"];
		uPlot.lazy.fillPalette =  ["#ceff1aaa", "#3caea3aa", "#e24d42aa", "#f6d55caa", "#20639baa"];
	}

	function createContainer(){
		var ele = document.createElement("div");
		ele.className = "sepiaFW-plot-container";
		return ele;
	}

	//create container inside any parent element
	Plot.appendContainerToElement = function(parentElement){
		var plotContainer = createContainer();
		parentElement.appendChild(plotContainer);
		return plotContainer;
	}

	//create container directly inside "chat", "myView" or "bigResults"
	Plot.addContainerToTargetView = function(targetView){
		var plotContainer = createContainer();
		var cardElement = SepiaFW.ui.cards.buildCardContainer(true, true);
		cardElement.classList.add("sepia-plot-card");
		cardElement.appendChild(plotContainer);
		var resultView = SepiaFW.ui.getResultViewByName(targetView);
		SepiaFW.ui.addDataToResultView(resultView, cardElement);
		return plotContainer;
	}

	//plot one or more lines with given or contructed x-values
	Plot.lines = function(x, data, targetViewOrElement, plotOptions){
		var c;
		if (!targetViewOrElement) targetViewOrElement = "chat";		//default target: chat
		if (typeof targetViewOrElement == "string"){
			c = Plot.addContainerToTargetView(targetViewOrElement);
		}else{
			c = Plot.appendContainerToElement(targetViewOrElement);
		}
		var cfg = {
			targetElement: c,
			//showPoints: false,
			strokeWidth: 1,
			axisSizeX: 42
		}
		if (plotOptions) $.extend(true, cfg, plotOptions);
		var isMultiplot = data && Array.isArray(data) && Array.isArray(data[0]);
		if (isMultiplot){
			if (!x || x === "auto") x = uPlot.lazy.createSequence(0, data[0].length);
			//cfg.data = [x, ...data];
			cfg.data = [x];
			data.forEach(function(d){ cfg.data.push(d); });
		}else{
			if (!x || x === "auto") x = uPlot.lazy.createSequence(0, data.length);
			cfg.data = [x, data];
		}
		var plot = uPlot.lazy.plot(cfg);
		//var opts = uPlot.lazy.getPlotOptions(cfg);
		//var plot = new uPlot(opts, cfg.data, cfg.targetElement);
		var ro = SepiaFW.ui.addResizeObserverWithBuffer(c.parentElement, function(){
			if (plot.root && plot.root.parentNode && c && c.parentElement && document.body.contains(c)){
				uPlot.lazy.resizePlot(plot);
			}else{
				ro.disconnect();
			}
		});
		return plot;
	}

	//create a line-plot series that appends data dynamically until max-points is reached and then drops the first values
	Plot.createLineSeries = function(targetElement, maxPoints, seriesOptions, plotOptions){
		var sOpt = {
			rememberMax: true
		}
		var pOpt = {
			showPoints: false,
			strokeWidth: 1,
			showAxisX: false,
			showAxisY: true
		}
		if (seriesOptions){
			sOpt = $.extend(true, {}, sOpt, seriesOptions);
		}
		if (plotOptions){
			pOpt = $.extend(true, {}, pOpt, plotOptions);
		}
		var plotSeries = new uPlot.lazy.AutoSeries(targetElement, maxPoints || 150, sOpt, pOpt);
		if (targetElement.parentElement){
			var ro = SepiaFW.ui.addResizeObserverWithBuffer(targetElement.parentElement, function(){
				var plot = plotSeries.getPlot();
				if (!plot){
					//not yet initialized - skip
				}else if (plot.root && plot.root.parentNode && targetElement && targetElement.parentElement && document.body.contains(targetElement)){
					uPlot.lazy.resizePlot(plot);
				}else{
					ro.disconnect();
				}
			});
		}
		return plotSeries;
		//INFO: To add data use: 'plotSeries.addValues(data)' or 'plotSeries.addValues(...data)' then finish with 'plotSeries.draw()'
	}

	return Plot;
}