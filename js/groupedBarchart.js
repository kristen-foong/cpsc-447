class GroupedBarchart {
  /**
   * Class constructor with basic chart configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(
    _config,
    _data,
    _key_list,
    _limit,
    _user1,
    _user2,
    _movie_data_indexed,
    _numUsers,
    _dispatcher
  ) {
    // Configuration object with defaults
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 400,
      containerHeight: _config.containerHeight || 200,
      margin: _config.margin || { top: 10, right: 10, bottom: 25, left: 120 },
      reverseOrder: _config.reverseOrder || false,
      tooltipPadding: _config.tooltipPadding || 15,
    };
    this.data = _data;
    this.key_list = _key_list;
    this.limit = _limit;
    this.user1 = _user1;
    this.user2 = _user2;
    this.movie_data_indexed = _movie_data_indexed;
    this.numUsers = _numUsers;
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

    let user1_ratings = ratings.filter(
      (rating) => vis.user1.user_id == rating.user_id
    );
    let user2_ratings = ratings.filter(
      (rating) => vis.user2.user_id == rating.user_id
    );

    // Moved this from main
    if (vis.config.parentElement == "#language-barchart") {
      let lang_list = {};
      // check if user 1 is global
      if (vis.user1.user_id == "global") {
        vis.data.forEach((d) => {
          // get # users
          // get # of ratings in category
          // divide # ratings in category by # users
          if (vis.movie_data_indexed[d.movie_id]) {
            let lang_of_movie =
              vis.movie_data_indexed[d.movie_id].original_language;
            if (lang_of_movie && langMap[lang_of_movie]) {
              if (!lang_list[langMap[lang_of_movie]]) {
                lang_list[langMap[lang_of_movie]] = {
                  key: langMap[lang_of_movie],
                  u1: d.vote_count,
                  u2: 0,
                };
              } else {
                lang_list[langMap[lang_of_movie]].u1 += d.vote_count;
              }
            }
          }
        });
        for (const [key, u1, u2] of Object.entries(lang_list)) {
          lang_list[key].u1 = Math.round(lang_list[key].u1 / vis.numUsers);
        }
      } else {
        user1_ratings.forEach((d) => {
          if (vis.movie_data_indexed[d.movie_id]) {
            let lang_of_movie =
              vis.movie_data_indexed[d.movie_id].original_language;
            if (lang_of_movie && langMap[lang_of_movie]) {
              if (!lang_list[langMap[lang_of_movie]]) {
                lang_list[langMap[lang_of_movie]] = {
                  key: langMap[lang_of_movie],
                  u1: 1,
                  u2: 0,
                };
              } else {
                lang_list[langMap[lang_of_movie]].u1 += 1;
              }
            }
          }
        });
      }
      // check if user 2 is global
      if (vis.user2.user_id == "global") {
        vis.data.forEach((d) => {
          // get # users
          // get # of ratings in category
          // divide # ratings in category by # users
          if (vis.movie_data_indexed[d.movie_id]) {
            let lang_of_movie =
              vis.movie_data_indexed[d.movie_id].original_language;
            if (lang_of_movie && langMap[lang_of_movie]) {
              if (!lang_list[langMap[lang_of_movie]]) {
                lang_list[langMap[lang_of_movie]] = {
                  key: langMap[lang_of_movie],
                  u1: 0,
                  u2: d.vote_count,
                };
              } else {
                lang_list[langMap[lang_of_movie]].u2 += d.vote_count;
              }
            }
          }
        });
        for (const [key, u1, u2] of Object.entries(lang_list)) {
          lang_list[key].u2 = Math.round(lang_list[key].u2 / vis.numUsers);
        }
      } else {
        user2_ratings.forEach((d) => {
          if (vis.movie_data_indexed[d.movie_id]) {
            let lang_of_movie =
              vis.movie_data_indexed[d.movie_id].original_language;
            if (lang_of_movie && langMap[lang_of_movie]) {
              if (!lang_list[langMap[lang_of_movie]]) {
                lang_list[langMap[lang_of_movie]] = {
                  key: langMap[lang_of_movie],
                  u1: 0,
                  u2: 1,
                };
              } else {
                lang_list[langMap[lang_of_movie]].u2 += 1;
              }
            }
          }
        });
      }
      vis.key_list = lang_list;
    } else {
      let key_list = {};
      // check if user 1 is global
      if (vis.user1.user_id == "global") {
        vis.data.forEach((movie) => {
          if (vis.movie_data_indexed[movie.movie_id]) {
            let movie_info =
              vis.config.parentElement == "#genre-barchart"
                ? JSON.parse(vis.movie_data_indexed[movie.movie_id].genres)
                : JSON.parse(
                    vis.movie_data_indexed[movie.movie_id].production_countries
                  );
            if (movie_info) {
              movie_info.forEach((d) => {
                if (!key_list[d]) {
                  key_list[d] = { key: d, u1: movie.vote_count, u2: 0 };
                } else {
                  key_list[d].u1 += movie.vote_count;
                }
              });
            }
          }
        });
        for (const [key, u1, u2] of Object.entries(key_list)) {
          key_list[key].u1 = Math.round(key_list[key].u1 / vis.numUsers);
        }
      } else {
        user1_ratings.forEach((d) => {
          if (vis.movie_data_indexed[d.movie_id]) {
            let movie_info =
              vis.config.parentElement == "#genre-barchart"
                ? JSON.parse(vis.movie_data_indexed[d.movie_id].genres)
                : JSON.parse(
                    vis.movie_data_indexed[d.movie_id].production_countries
                  );
            if (movie_info) {
              movie_info.forEach((d) => {
                if (!key_list[d]) {
                  key_list[d] = { key: d, u1: 1, u2: 0 };
                } else {
                  key_list[d].u1 += 1;
                }
              });
            }
          }
        });
      }
      // check if user 2 is global
      if (vis.user2.user_id == "global") {
        vis.data.forEach((movie) => {
          if (vis.movie_data_indexed[movie.movie_id]) {
            let movie_info =
              vis.config.parentElement == "#genre-barchart"
                ? JSON.parse(vis.movie_data_indexed[movie.movie_id].genres)
                : JSON.parse(
                    vis.movie_data_indexed[movie.movie_id].production_countries
                  );
            if (movie_info) {
              movie_info.forEach((d) => {
                if (!key_list[d]) {
                  key_list[d] = { key: d, u1: 0, u2: movie.vote_count };
                } else {
                  key_list[d].u2 += movie.vote_count;
                }
              });
            }
          }
        });
        for (const [key, u1, u2] of Object.entries(key_list)) {
          key_list[key].u2 = Math.round(key_list[key].u2 / vis.numUsers);
        }
      } else {
        user2_ratings.forEach((d) => {
          if (vis.movie_data_indexed[d.movie_id]) {
            let movie_info =
              vis.config.parentElement == "#genre-barchart"
                ? JSON.parse(vis.movie_data_indexed[d.movie_id].genres)
                : JSON.parse(
                    vis.movie_data_indexed[d.movie_id].production_countries
                  );
            if (movie_info) {
              movie_info.forEach((d) => {
                if (!key_list[d]) {
                  key_list[d] = { key: d, u1: 0, u2: 1 };
                } else {
                  key_list[d].u2 += 1;
                }
              });
            }
          }
        });
      }
      vis.key_list = key_list;
    }

    vis.limited = {};
    let sorted_keys = Object.keys(vis.key_list).sort((a, b) => {
      return (
        vis.key_list[b].u1 +
        vis.key_list[b].u2 -
        (vis.key_list[a].u1 + vis.key_list[a].u2)
      );
    });
    if (sorted_keys.length > limit) {
      sorted_keys = sorted_keys.slice(0, limit);
    }
    sorted_keys.forEach((d) => {
      vis.limited[d] = vis.key_list[d];
    });
    vis.xScale.domain(sorted_keys);
    if (vis.limited[sorted_keys[0]].u1 > vis.limited[sorted_keys[0]].u2) {
      vis.yScale.domain([0, vis.limited[sorted_keys[0]].u1]);
    } else {
      vis.yScale.domain([0, vis.limited[sorted_keys[0]].u2]);
    }

    //   vis.xScale.domain(vis.key_list.keys());
    //   vis.yScale.domain([0, d3.max(vis.key_list, d => d[1])]);

    vis.renderVis();
  }

  /**
   * Bind data to visual elements
   */
  renderVis() {
    let vis = this;

    let sameUser = vis.user1.user_id == vis.user2.user_id;

    // Add rectangles
    const bars = vis.chart
      .selectAll(".bar.u1")
      .data(Object.values(vis.limited), (d) => d.key);

    const barEnter = bars.enter().append("rect").attr("class", "d-row");

    barEnter
      .merge(bars)
      .attr("class", "bar u1")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .attr("x", 0)
      .attr("y", (d) => {
        return vis.xScale(d.key);
      })
      .attr("width", (d) => {
        return vis.yScale(d.u1);
      })
      .attr("height", (d) => {
        if (sameUser) {
          return vis.xScale.bandwidth();
        } else {
          return vis.xScale.bandwidth() / 2;
        }
      })
      .attr("fill", (d) => {
        if (
          d.key == activeGenre[0] ||
          d.key == activeCountry[0] ||
          d.key == activeLanguage[0]
        ) {
          return "#0094f6";
        } else {
          return "#488f31";
        }
      });

    barEnter
      .on("mouseover", function (event, d) {
        d3.select("#barchart-tooltip")
          .style("display", "inline-block")
          .style("opacity", 1)
          // Format number with million and thousand separator
          .html(
            `<div class="tooltip-label"><b>${d.key}</b></div>
            ${d3.format(",")(d.u1)}`
          );
      })
      .on("mousemove", function (event, d) {
        d3.select("#barchart-tooltip")
          .style("left", event.pageX + vis.config.tooltipPadding + "px")
          .style("top", event.pageY + vis.config.tooltipPadding + "px");
      })
      .on("mouseleave", function (event, d) {
        d3.select("#barchart-tooltip")
          .style("opacity", 0)
          .style("display", "none");
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
      });

    const bars2 = vis.chart
      .selectAll(".bar.u2")
      .data(Object.values(vis.limited), (d) => d.key);

    // User 2
    const bar2Enter = bars2.enter().append("rect").attr("class", "d-row");

    bar2Enter
      .merge(bars2)
      .attr("class", "bar u2")
      .style("opacity", 0.5)
      .style("display", (d) => {
        if (sameUser) {
          return "none";
        } else {
          return "block";
        }
      })
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .attr("x", 0)
      .attr("y", (d) => {
        return vis.xScale(d.key) + vis.xScale.bandwidth() / 2;
      })
      .attr("width", (d) => {
        return vis.yScale(d.u2);
      })
      .attr("height", vis.xScale.bandwidth() / 2)
      .attr("fill", (d) => {
        if (
          d.key == activeGenre[0] ||
          d.key == activeCountry[0] ||
          d.key == activeLanguage[0]
        ) {
          return "#0094f6";
        } else {
          return "#de425b";
        }
      });

    bar2Enter
      .on("mouseover", function (event, d) {
        d3.select("#barchart-tooltip")
          .style("opacity", 1)
          // Format number with million and thousand separator
          .html(
            `<div class="tooltip-label">${d.key}</div>${d3.format(",")(d.u2)}`
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
      });

    // Update axes
    vis.xAxisG.call(vis.xAxis);
    vis.yAxisG.call(vis.yAxis);

    bars.exit().remove();
    bars2.exit().remove();
  }

  // Helper function for constructing key list
  constructKeyList() {
    return 0;
  }
}
