class RatingsBarchart {
  /**
   * Class constructor with basic chart configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _ratings_data, _users_data, _user, _dispatcher) {
    // Configuration object with defaults
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 350,
      containerHeight: _config.containerHeight || 250,
      margin: _config.margin || { top: 10, right: 5, bottom: 50, left: 50 },
      reverseOrder: _config.reverseOrder || false,
      tooltipPadding: _config.tooltipPadding || 15,
    };

    this.ratings_data = _ratings_data;
    this.users_data = _users_data;
    this.user = this.users_data.find((user) => user._id === _user) || null;
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
    vis.yScale = d3.scaleLinear().range([vis.height, 0]);

    vis.xScale = d3.scaleBand().range([0, vis.width]).paddingInner(0.1);

    vis.yAxis = d3.axisLeft(vis.yScale).ticks(6).tickSizeOuter(0);

    vis.xAxis = d3.axisBottom(vis.xScale).ticks(10).tickSizeOuter(0);

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
    vis.xAxisG = vis.chart
      .append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${vis.height})`);

    // Append y-axis group
    vis.yAxisG = vis.chart.append("g").attr("class", "axis y-axis");
  }

  /**
   * Prepare data and scales before we render it
   */
  updateVis() {
    let vis = this;

    // group user by their ratings
    let ratingsByUser = d3.groups(vis.ratings_data, (d) => d.user_id);

    if (this.user) {
      // individual user
      let userRatings = ratingsByUser.find(
        (user) => user[0] === vis.user.user_id
      );

      // get ratings spread of user
      vis.ratingsSpread = d3.groups(userRatings[1], (d) => d.rating_val);
      vis.ratingsSpread.sort((a, b) => a[0] - b[0]);

      let max_num_ratings = 0;
      vis.ratingsSpread.forEach((rating) => {
        if (rating[1].length > max_num_ratings)
          max_num_ratings = rating[1].length;
      });
      vis.yScale.domain([0, max_num_ratings + 50]);
    } else {
      // global user
      vis.ratingsSpread = new Array(10).fill(0);

      ratingsByUser.forEach((user) => {
        var userRatingsSpread = d3.groups(user[1], (d) => d.rating_val);
        userRatingsSpread.sort((a, b) => a[0] - b[0]);

        // Add the individual ratings spread of each user together
        userRatingsSpread.forEach((rating) => {
          vis.ratingsSpread[rating[0] - 1] += rating[1].length;
        });
      });

      vis.yScale.domain([0, 150000]);
    }

    // Set the scale input domains
    vis.xScale.domain([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);

    vis.renderVis();
  }

  /**
   * Bind data to visual elements
   */
  renderVis() {
    let vis = this;

    // Add rectangles
    let bars = vis.chart.selectAll(".bar").data(vis.ratingsSpread).join("rect");

    bars
      .style("opacity", 0.5)
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .style("fill", "#0094f6")
      .attr("class", "bar")
      .attr("x", (d) =>
        this.user
          ? vis.xScale(d[0] / 2)
          : vis.xScale((vis.ratingsSpread.indexOf(d) + 1) / 2)
      )
      .attr("y", (d) => (this.user ? vis.yScale(d[1].length) : vis.yScale(d)))
      .attr("width", vis.xScale.bandwidth())
      .attr("height", (d) =>
        this.user
          ? vis.height - vis.yScale(d[1].length)
          : vis.height - vis.yScale(d)
      );

    // Tooltip event listeners
    bars
      .on("mouseover", (event, d) => {
        d3.select("#ratings-barchart-tooltip")
          .style("opacity", 1)
          .style("display", "block")
          // Format number with million and thousand separator
          .html(
            `<div class="ratings-barchart-tooltip-label"></div>${d3.format(",")(
              this.user ? d[1].length : d
            )} movies`
          );
      })
      .on("mousemove", (event) => {
        d3.select("#ratings-barchart-tooltip")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px");
      })
      .on("mouseleave", () => {
        d3.select("#ratings-barchart-tooltip")
          .style("opacity", 0)
          .style("display", "none");
      })
      .on("click", function (event, d) {
        const isActive = d3.select(this).classed("active");
        d3.select(this).classed("active", !isActive);

        if (vis.config.parentElement == "#user1-ratings-barchart") {
          vis.dispatcher.call("barchartDispatch", event, {
            category: d,
            isActive: isActive,
            chartType: "ratings",
          }); // pass object or id & if it is active or not
        } else if (vis.config.parentElement == "#user2-ratings-barchart") {
          vis.dispatcher.call("barchartDispatch", event, {
            category: d,
            isActive: isActive,
            chartType: "ratings",
          });
        }
      });

    // Axis labels

    // y-axis title
    vis.svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -5)
      .attr("x", -(vis.height / 2))
      .attr("dy", "1em")
      .attr("padding", "10")
      .style("text-anchor", "middle")
      .style("fill", "white")
      .text("Number of Ratings");

    // x-axis title
    vis.svg
      .append("text")
      .attr(
        "transform",
        `translate(${vis.width / 2}, ${vis.height + vis.config.margin.bottom})`
      )
      .style("text-anchor", "middle")
      .style("fill", "white")
      .text("Rating");

    // Update axes
    vis.xAxisG.transition().duration(1000).call(vis.xAxis);

    vis.yAxisG.call(vis.yAxis);
  }
}
