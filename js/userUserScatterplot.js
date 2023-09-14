class ScatterPlot {
  constructor(
    _config,
    _dispatcher,
    _ratings,
    _movie_data,
    _user,
    _movies_seen,
    _movies_both
  ) {
    this.config = {
      parentElement: _config.parentElement,
      plot: _config.parentElement == "#scatter-plot-u1" ? "u1" : "u2",
      color: _config.color,
      containerWidth: 400,
      tooltipPadding: 15,
      containerHeight: 400,
      margin: { top: 20, right: 15, bottom: 20, left: 15 },
    };

    this.dispatcher = _dispatcher;

    this.ratings = _ratings;
    this.data = [];
    this.movie_data = _movie_data;
    this.movies_seen = _movies_seen;
    this.movies_both = _movies_both;
    this.user = _user; // selected user to compare
    this.colors = [_config.color, "#f5b173"]; // Red indicates movies both have watched

    this.extractData();
    this.initVis();
  }

  extractData() {
    let ratings = this.ratings;
    let movie_data = this.movie_data;
    this.data = [];
    ratings.forEach((r) => {
      // deep copy so as to not change the original indexed movie data object
      let movie = JSON.parse(JSON.stringify(movie_data[r.movie_id]));
      movie.user_rating = r.rating_val;
      this.data.push(movie);
    });
  }

  initVis() {
    // Create SVG area, initialize scales and axes
    let vis = this;
    let margin = this.config.margin;
    const categories = ["user", "both"];
    const colors = this.colors;

    vis.colorScale = d3.scaleOrdinal().domain(categories).range(colors);

    vis.width =
      vis.config.containerWidth -
      vis.config.margin.left -
      vis.config.margin.right;
    vis.height =
      vis.config.containerHeight -
      vis.config.margin.top -
      vis.config.margin.bottom;

    // Define size of SVG drawing area
    vis.svg = d3
      .select(vis.config.parentElement)
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight);

    // Append group element that will contain our actual chart
    // and position it according to the given margin config
    vis.chartArea = vis.svg
      .append("g")
      .attr(
        "transform",
        `translate(${vis.config.margin.left},${vis.config.margin.top})`
      );

    vis.chartArea
      .append("text")
      .attr("class", "axis-text-x-" + vis.config.plot)
      .attr("font-weight", "bold")
      .attr("x", 0)
      .attr("y", margin.top - 10)
      .text(vis.user.display_name + " Rating")
      .style("fill", "white");

    vis.svg
      .append("text")
      .attr("class", "axis-text-y")
      .attr("font-weight", "bold")
      .attr("text-align", "center")
      .attr("x", vis.width - margin.right * 10)
      .attr("y", vis.height + margin.bottom + 5)
      .text("Movie Vote Average Rating")
      .style("fill", "white");

    // X-axis: Movie Vote Average Rating
    vis.xScale = d3.scaleLinear().range([0, vis.width]);

    // Y-axis: User Rating
    vis.yScale = d3
      .scaleLinear()
      .range([vis.height - margin.bottom, margin.top]);

    // Initialize axes
    vis.xAxis = d3
      .axisBottom(vis.xScale)
      .ticks(10)
      .tickSizeInner(
        -vis.height + vis.config.margin.top + vis.config.margin.bottom
      );
    vis.yAxis = d3.axisLeft(vis.yScale).ticks(10).tickSizeInner(-vis.width);

    vis.xAxisGroup = vis.chartArea
      .append("g")
      .attr("class", "axis x-axis")
      .attr(
        "transform",
        `translate(0,${vis.height - vis.config.margin.bottom})`
      );
    vis.yAxisGroup = vis.chartArea.append("g").attr("class", "axis y-axis");

    vis.xAxisGroup.call(vis.xAxis);
    vis.yAxisGroup.call(vis.yAxis);
    vis.updateVis();
  }

  updateVis() {
    // Prepare data and scales
    let vis = this;
    d3.selectAll(".axis-text-x-" + vis.config.plot).text(
      vis.user.display_name + " Rating"
    );

    vis.xValue = (d) => +d.vote_average;
    vis.yValue = (d) => +d.user_rating;
    vis.isBoth = (d) => (vis.movies_both.has(d.movie_id) ? "both" : "user");

    vis.yScale.domain([0, 10]);
    vis.xScale.domain([0, 10]);
    this.renderVis();
  }

  renderVis() {
    // Bind data to visual elements, update axes
    let vis = this;
    let data = vis.data;

    // Add points
    const points = vis.chartArea
      .selectAll(".point")
      .data(data)
      .join("circle")
      .attr("class", "point")
      .attr(
        "id",
        (d) => vis.user.user_id + "-" + vis.config.plot + "-" + d.movie_id
      )
      .attr("r", 5)
      .attr("opacity", 0.5)
      .attr("cy", (d) => vis.yScale(vis.yValue(d)))
      .attr("cx", (d) => vis.xScale(vis.xValue(d)))
      .attr("fill", (d) => {
        return vis.colorScale(vis.isBoth(d));
      });

    points
      .on("mouseover", function (event, d) {
        // From join tutorial
        d3.selectAll("#scatterplot-tooltip").style("opacity", 1);

        d3
          .selectAll("#scatterplot-tooltip-text")
          .style("opacity", 1) // override opacity being set to 0
          .style(
            "display",
            "inline-block"
          ).html(`<div class="tooltip-label"><h4>${d.movie_title}</h4></div><br>
              <i>${
                d.year_released ? d.year_released : "None"
              }, ${d.original_language ? langMap[d.original_language] : "None"} </i>
              <br><br>
              <b><i>User rating:</i></b> ${d.user_rating}
              <br><b><i>Average rating:</i></b> ${
                d.vote_average ? d.vote_average : "None"
              }
              <p><b><i>Synopsis:</i></b> ${
                d.overview ? d.overview : "None"
              }</p>`);

        if (vis.movies_both.has(d.movie_id)) {
          vis.dispatcher.call(
            "userMovieHover",
            event,
            vis.user,
            d,
            vis.config.plot
          );
          d3.select("#" + this.id).attr("class", "point highlighted");
        }
      })
      .on("mouseleave", function (event, d) {
        d3.selectAll("#scatterplot-tooltip-text").style("display", "none");
        if (vis.movies_both.has(d.movie_id)) {
          vis.dispatcher.call(
            "userMovieMouseOut",
            event,
            vis.user,
            d,
            vis.config.plot
          );
          d3.select("#" + this.id).attr("class", "point");
        }
      });

    // Update the axes/gridlines
    vis.xAxisGroup.call(vis.xAxis);
    vis.yAxisGroup.call(vis.yAxis);
  }
}
