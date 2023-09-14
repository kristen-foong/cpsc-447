class Piechart {
  /**
   * Class constructor with basic chart configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(
    _config,
    _movies_data,
    _ratings_data,
    _users_data,
    _user,
    _movie_data_indexed,
    _dispatcher
  ) {
    // Configuration object with defaults
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 250,
      containerHeight: _config.containerHeight || 200,
      margin: _config.margin || { top: 25, right: 5, bottom: 25, left: 50 },
      reverseOrder: _config.reverseOrder || false,
      tooltipPadding: _config.tooltipPadding || 15,
    };

    this.movies_data = _movies_data;
    this.ratings_data = _ratings_data;
    this.movie_data_indexed = _movie_data_indexed;
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
    vis.radius = Math.min(vis.width, vis.height) / 2;

    // Initialize scales and axes
    // Define the color scale
    vis.colorScale = d3
      .scaleOrdinal()
      .domain([0, 1, 2, 3])
      .range(["#46ff33", " #3356ff ", "#33ffe9", " #fd33ff"]);

    // Define the arc generator
    vis.arc = d3.arc().innerRadius(0).outerRadius(vis.radius);

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
        `translate(${vis.width / 2 + vis.config.margin.left}, ${
          vis.height / 2 + vis.config.margin.top
        })`
      );
  }

  /**
   * Prepare data and scales before we render it
   */
  updateVis() {
    let vis = this;

    // group user by their ratings
    let ratingsByUser = d3.groups(vis.ratings_data, (d) => d.user_id);

    // Index 0 is Pre-1920 movies, index 12 is 2020's
    var releaseYears = new Array(4).fill(0);

    if (this.user) {
      // individual user
      let userRatings = ratingsByUser.find(
        (user) => user[0] === vis.user.user_id
      );

      userRatings[1].forEach((rating) => {
        var movie = this.movie_data_indexed[rating.movie_id];
        if (movie) {
          var releaseYear = movie.year_released;

          // Algebra trick for putting the release year into the right index of array
          var ind =
            releaseYear < 1920
              ? 0
              : releaseYear < 1960
              ? 1
              : releaseYear >= 1990
              ? 3
              : 2;
          releaseYears[ind] += 1;
        }
      });
    } else {
      // global user
      ratingsByUser.forEach((user) => {
        user[1].forEach((rating) => {
          var movie = vis.movie_data_indexed[rating.movie_id];

          if (movie && typeof movie !== "undefined") {
            var releaseYear = movie.year_released;

            // Algebra tricks yay
            var ind =
              releaseYear < 1920
                ? 0
                : releaseYear < 1960
                ? 1
                : releaseYear >= 1990
                ? 3
                : 2;
            releaseYears[ind] += 1;
          }
        });
      });
    }

    let yearData = [];
    releaseYears.forEach((d, i) => {
      yearData.push({ ind: i, count: d });
    });
    vis.yearsData = yearData;

    //vis.colorScale.domain([0, 1, 2, 3]);

    vis.renderVis();
  }

  /**
   * Bind data to visual elements
   */
  renderVis() {
    let vis = this;

    // Define pie layout
    const pie = d3.pie().value((d) => d.count);

    pie.sort((a, b) => (a.ind > b.ind ? -1 : 1));

    // Create pie chart
    const arcs = vis.chart
      .selectAll("arc")
      .data(pie(vis.yearsData))
      .enter()
      .append("g")
      .attr("class", "arc");

    // Draw each arc
    arcs
      .append("path")
      .attr("d", vis.arc)
      .attr("fill", (d) => vis.colorScale(d.data.ind));

    // Tooltip event listeners
    arcs
      .on("mouseover", (event, d) => {
        let era = "";
        if (d.data.ind == 0) {
          era = "Early Age of movies (1890-1920)";
        } else if (d.data.ind == 1) {
          era = "Classic Age of movies (1920-1960)";
        } else if (d.data.ind == 2) {
          era = "Modern Age of movies (1960-1990)";
        } else if (d.data.ind == 3) {
          era = "Contemporary Age of movies (1990-present)";
        }

        d3.select("#piechart-tooltip")
          .style("opacity", 1)
          .style("display", "block")
          // Format number with million and thousand separator
          .html(
            `<div class="piechart-tooltip-label"></div><b>${d3.format(",")(
              d.data.count
            )}</b> movies from the <b>${era}</b>`
          );
      })
      .on("mousemove", (event) => {
        d3.select("#piechart-tooltip")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px");
      })
      .on("mouseleave", () => {
        d3.select("#piechart-tooltip")
          .style("opacity", 0)
          .style("display", "none");
      })
      .on("click", function (event, d) {
        const isActive = d3.select(this).classed("active");
        d3.select(this).classed("active", !isActive);

        if (vis.config.parentElement == "#user1-piechart") {
          vis.dispatcher.call("barchartDispatch", event, {
            category: d,
            isActive: isActive,
            chartType: "piechart",
          }); // pass object or id & if it is active or not
        } else if (vis.config.parentElement == "#user2-piechart") {
          vis.dispatcher.call("barchartDispatch", event, {
            category: d,
            isActive: isActive,
            chartType: "piechart",
          }); // pass object or id & if it is active or not
        }
      });
  }
}
