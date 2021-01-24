// gridlines in x axis function
function make_x_gridlines(xScale) {		
    return d3.axisBottom(xScale)
        .ticks(5)
}

// gridlines in y axis function
function make_y_gridlines(yScale) {		
    return d3.axisLeft(yScale)
        .ticks(5)
}

function graph(result, n, xaxis, maxY) {
	let margin = {top: 50, right: 50, bottom: 50, left: 50};
	let width = window.innerWidth - margin.left - margin.right; // Use the window's width 
	let height = window.innerHeight - margin.top - margin.bottom; // Use the window's height

	let xScale = d3.scaleLinear()
    .domain([0, xaxis[n-1]])
    //.domain(0, n)
    .range([0, width]);
  let xMap = function(d) { return xScale(d[0]); }

	let yScale = d3.scaleLinear()
    .domain([0, maxY])
    .range([height, 0]);
  let yMap = function(d) { return yScale(d[1]); }

	let line = d3.line()
    .x(function(d, i) { return xScale(d[0]); })
    .y(function(d, i) { return yScale(d[1]); })

	let svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	svg.append("g")
    .attr("class", "xaxis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(xScale));

	svg.append("g")
    .attr("class", "yaxis")
    .call(d3.axisLeft(yScale));

  // add the X gridlines
  svg.append("g")			
      .attr("class", "grid")
      .attr("transform", "translate(0," + height + ")")
      .call(make_x_gridlines(xScale)
          .tickSize(-height)
          .tickFormat("")
      )

  // add the Y gridlines
  svg.append("g")			
      .attr("class", "grid")
      .call(make_y_gridlines(yScale)
          .tickSize(-width)
          .tickFormat("")
      )

  // axis labels
  svg.append("text")
  	.attr("transform", "rotate(270)")
		.attr("x", -height/2)
		.attr("y", -32)
		.attr("class", "axisLabel")
		.text("Cycles Per Iteration");

	svg.append("text")
		.attr("x", width/2)
		.attr("y", height + 40)
		.attr("class", "axisLabel")
		.text("Array Size (n x n)");

	// add some dots - should do a better job organizing my data
	svg.selectAll(".dotijkjs")
		.data(result.ijkJS)
		.enter().append("circle")
		.attr("class", "dot")
		.attr("id", "ijkjs")
		.attr("r", 3.5)
		.attr("cx", xMap)
		.attr("cy", yMap);

	svg.selectAll(".dotkjijs")
		.data(result.kjiJS)
		.enter().append("circle")
		.attr("class", "dot")
		.attr("id", "kjijs")
		.attr("r", 3.5)
		.attr("cx", xMap)
		.attr("cy", yMap);

	svg.selectAll(".dotbmmjs")
		.data(result.bmmJS)
		.enter().append("circle")
		.attr("class", "dot")
		.attr("id", "bmmjs")
		.attr("r", 3.5)
		.attr("cx", xMap)
		.attr("cy", yMap);

	svg.selectAll(".dotijkc")
		.data(result.ijkC)
		.enter().append("circle")
		.attr("class", "dot")
		.attr("id", "ijkc")
		.attr("r", 3.5)
		.attr("cx", xMap)
		.attr("cy", yMap);

	svg.selectAll(".dotkjic")
		.data(result.kjiC)
		.enter().append("circle")
		.attr("class", "dot")
		.attr("id", "kjic")
		.attr("r", 3.5)
		.attr("cx", xMap)
		.attr("cy", yMap);

	svg.selectAll(".dotbmmc")
		.data(result.bmmC)
		.enter().append("circle")
		.attr("class", "dot")
		.attr("id", "bmmc")
		.attr("r", 3.5)
		.attr("cx", xMap)
		.attr("cy", yMap);


  // lines
	svg.append("path")
    .datum(result.ijkJS)
    .attr("class", "line")
    .attr("id", "ijkjs")
    .attr("d", line);

	svg.append("path")
    .datum(result.kjiJS)
    .attr("class", "line")
    .attr("id", "kjijs")
    .attr("d", line); 

	svg.append("path")
    .datum(result.bmmJS) 
    .attr("class", "line")
    .attr("id", "bmmjs")
    .attr("d", line);

  svg.append("path")
    .datum(result.ijkC)
    .attr("class", "line")
    .attr("id", "ijkc")
    .attr("d", line);

	svg.append("path")
    .datum(result.kjiC)
    .attr("class", "line")
    .attr("id", "kjic")
    .attr("d", line); 

	svg.append("path")
    .datum(result.bmmC) 
    .attr("class", "line")
    .attr("id", "bmmc")
    .attr("d", line);

  // legend
	svg.append("text")
		.attr("x", 2)
		.attr("y", 15)
		.attr("id", "ijkjs")
		.attr("class", "legend")
		.text("ijk - JS");

	svg.append("text")
		.attr("x", 2)
		.attr("y", 45)
		.attr("id", "kjijs")
		.attr("class", "legend")
		.text("kji - JS");

	svg.append("text")
		.attr("x", 2)
		.attr("y", 75)
		.attr("id", "bmmjs")
		.attr("class", "legend")
		.text("bmm - JS");

	svg.append("text")
		.attr("x", 2)
		.attr("y", 105)
		.attr("id", "ijkc")
		.attr("class", "legend")
		.text("ijk - C");

	svg.append("text")
		.attr("x", 2)
		.attr("y", 135)
		.attr("id", "kjic")
		.attr("class", "legend")
		.text("kji - C");

	svg.append("text")
		.attr("x", 2)
		.attr("y", 165)
		.attr("id", "bmmc")
		.attr("class", "legend")
		.text("bmm - C");
}