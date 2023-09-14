class Barchart {
  /**
   * Class constructor with basic chart configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data, _key_list, _limit, _dispatcher) {
    // Configuration object with defaults
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 300,
      containerHeight: _config.containerHeight || 200,
      margin: _config.margin || { top: 10, right: 5, bottom: 25, left: 100 },
      reverseOrder: _config.reverseOrder || false,
      tooltipPadding: _config.tooltipPadding || 15,
    };
    this.data = _data;
    this.key_list = _key_list;
    this.limit = _limit;
    this.dispatcher = _dispatcher;
    this.initVis();
  }

  /**
   * Initialize scales/axes and append static elements, such as axis titles
   */
  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width =
      vis.config.containerWidth -
      vis.config.margin.left -
      vis.config.margin.right;
    vis.height =
      vis.config.containerHeight -
      vis.config.margin.top -
      vis.config.margin.bottom;

    // Initialize scales and axes
    // Important: we flip array elements in the y output range to position the rectangles correctly
    vis.yScale = d3.scaleLinear().range([0, vis.width]);

    vis.xScale = d3.scaleBand().range([0, vis.height]).paddingInner(0.1);

    vis.yAxis = d3.axisBottom(vis.yScale).ticks(6).tickSizeOuter(0);

    vis.xAxis = d3.axisLeft(vis.xScale).tickSizeOuter(0);
    // Format y-axis ticks as millions

    // Define size of SVG drawing area
    vis.svg = d3
      .select(vis.config.parentElement)
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight);

    // SVG Group containing the actual chart; D3 margin convention
    vis.chart = vis.svg
      .append("g")
      .attr(
        "transform",
        `translate(${vis.config.margin.left},${vis.config.margin.top})`
      );

    // Append empty x-axis group and move it to the bottom of the chart
    vis.yAxisG = vis.chart
      .append("g")
      .attr("class", "axis y-axis")
      .attr("transform", `translate(0,${vis.height})`);

    // Append y-axis group
    vis.xAxisG = vis.chart.append("g").attr("class", "axis x-axis");
  }

  /**
   * Prepare data and scales before we render it
   */
  updateVis() {
    let vis = this;

    // Moved this from main
    if (vis.config.parentElement == "#language-barchart") {
      let movie_data = vis.data;
      let lang_list = {};
      movie_data.forEach((d) => {
        let lang_of_movie = d.original_language;
        if (lang_of_movie && langMap[lang_of_movie]) {
          if (!lang_list[langMap[lang_of_movie]]) {
            lang_list[langMap[lang_of_movie]] = {
              key: langMap[lang_of_movie],
              count: 1,
            };
          } else {
            lang_list[langMap[lang_of_movie]].count += 1;
          }
        }
      });
      vis.key_list = lang_list;
    } else {
      let movie_data = vis.data;
      let key_list = {};
      movie_data.forEach((d) => {
        let movie_info =
          vis.config.parentElement == "#genre-barchart"
            ? JSON.parse(d.genres)
            : JSON.parse(d.production_countries);
        if (movie_info) {
          movie_info.forEach((d) => {
            if (!key_list[d]) {
              key_list[d] = { key: d, count: 1 };
            } else {
              key_list[d].count += 1;
            }
          });
        }
      });
      vis.key_list = key_list;
    }

    // Set the scale input domains

    vis.limited = {};
    let sorted_keys = Object.keys(vis.key_list).sort((a, b) => {
      return vis.key_list[b].count - vis.key_list[a].count;
    });
    if (sorted_keys.length > limit) {
      sorted_keys = sorted_keys.slice(0, limit);
    }
    sorted_keys.forEach((d) => {
      vis.limited[d] = vis.key_list[d];
    });
    vis.xScale.domain(sorted_keys);
    vis.yScale.domain([0, vis.limited[sorted_keys[0]].count]);

    //   vis.xScale.domain(vis.key_list.keys());
    //   vis.yScale.domain([0, d3.max(vis.key_list, d => d[1])]);

    vis.renderVis();
  }

  /**
   * Bind data to visual elements
   */
  renderVis() {
    let vis = this;

    // Add rectangles
    const bars = vis.chart
      .selectAll(".bar")
      .data(Object.values(vis.limited), (d) => d.key)
      .join("rect")
      .on("mouseover", function (event, d) {
        d3.select("#barchart-tooltip")
          .style("opacity", 1)
          // Format number with million and thousand separator
          .html(
            `<div class="tooltip-label">${d.key}</div>${d3.format(",")(
              d.count
            )}`
          );
      })
      .on("mousemove", function (event, d) {
        d3.select("#barchart-tooltip")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px");
      })
      .on("mouseleave", function (event, d) {
        d3.select("#barchart-tooltip").style("opacity", 0);
      })
      .on("click", function (event, d) {
        const isActive = d3.select(this).classed("active");
        d3.select(this).classed("active", !isActive);

        if (vis.config.parentElement == "#genre-barchart") {
          vis.dispatcher.call("barchartDispatch", event, {
            category: d.key,
            isActive: isActive,
            chartType: "genre",
          }); // pass object or id & if it is active or not
        } else if (vis.config.parentElement == "#country-barchart") {
          vis.dispatcher.call("barchartDispatch", event, {
            category: d.key,
            isActive: isActive,
            chartType: "country",
          });
        } else if (vis.config.parentElement == "#language-barchart") {
          vis.dispatcher.call("barchartDispatch", event, {
            category: d.key,
            isActive: isActive,
            chartType: "language",
          });
        }
      })
      .attr("class", "d-row")
      .attr("class", "bar")
      .style("opacity", 0.5)
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .attr("x", 0)
      .attr("y", (d) => {
        return vis.xScale(d.key);
      })
      .attr("width", (d) => {
        return vis.yScale(d.count);
      })
      .attr("height", vis.xScale.bandwidth())
      .attr("fill", (d) => {
        if (
          d.key == activeGenre[0] ||
          d.key == activeCountry[0] ||
          d.key == activeLanguage[0]
        ) {
          return "#5d5472";
        } else {
          return "#f38874";
        }
      });

    // Update axes
    vis.xAxisG.call(vis.xAxis);
    vis.yAxisG.call(vis.yAxis);

    // bars.exit().remove();
  }

  // Helper function for constructing key list
  constructKeyList() {
    return 0;
  }
}
