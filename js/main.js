/**
 * Globals for all views
 */
let ratings, users, movie_data, movie_data_indexed;
let genre_list = {};
let country_list = {};
let lang_list = {};
let limit = 10;
let num_top_movies = 100;

// Selected users from user selector
let selected_user1_info = null;
let selected_user2_info = null;

// Dispatcher for all charts
let dispatcher = d3.dispatch(
  "barchartDispatch",
  "userMovieHover",
  "userMovieMouseOut"
);

let activeGenre = [];
let activeCountry = [];
let activeLanguage = [];
let activeRating = [];
let activeEra = [];

/**
 * Load data from CSV file asynchronously and render bar chart
 */
Promise.all([
  d3.json("data/ratings.json"),
  d3.json("data/users.json"),
  d3.json("data/movie_data.json"),
])
  .then(function (files) {
    ratings = files[0];
    users = files[1];
    movie_data = files[2];
    movie_data_indexed = {};

    // Use map for performance
    movie_data.forEach((m) => {
      movie_data_indexed[m.movie_id] = m;
    });

    // USER SELECT
    var user1 = d3.selectAll("#user1Select");
    var user2 = d3.selectAll("#user2Select");

    users.forEach((value) => {
      user1.append("option").text(value.user_id).attr("value", value._id);
      user2.append("option").text(value.user_id).attr("value", value._id);
    });

    selected_user1_info = getUserInfo(user1.property("value"));
    selected_user2_info = getUserInfo(user2.property("value"));

    let numUsers = 8139; // from Kaggle dataset

    // GROUPED BARCHARTS
    // USER GENRE COMPARISON
    let user_genre_list = {};

    let groupedGenreBarchart = new GroupedBarchart(
      { parentElement: "#genre-barchart" },
      movie_data,
      user_genre_list,
      limit,
      selected_user1_info,
      selected_user2_info,
      movie_data_indexed,
      numUsers,
      dispatcher
    );
    groupedGenreBarchart.updateVis();

    // USER COUNTRY COMPARISON
    let user_country_list = {};

    let groupedCountryBarchart = new GroupedBarchart(
      { parentElement: "#country-barchart" },
      movie_data,
      user_country_list,
      limit,
      selected_user1_info,
      selected_user2_info,
      movie_data_indexed,
      numUsers,
      dispatcher
    );
    groupedCountryBarchart.updateVis();

    // USER LANG COMPARISON
    let user_lang_list = {};

    // user level bar charts
    let groupedLangBarchart = new GroupedBarchart(
      { parentElement: "#language-barchart" },
      movie_data,
      user_lang_list,
      limit,
      selected_user1_info,
      selected_user2_info,
      movie_data_indexed,
      numUsers,
      dispatcher
    );
    groupedLangBarchart.updateVis();

    // PIE CHARTS
    // User 1 piechart
    let user1Piechart = new Piechart(
      { parentElement: "#user1-piechart" },
      movie_data,
      ratings,
      users,
      user1.property("value"),
      movie_data_indexed,
      dispatcher
    );
    user1Piechart.updateVis();

    // User 2 piechart
    let user2Piechart = new Piechart(
      { parentElement: "#user2-piechart" },
      movie_data,
      ratings,
      users,
      user2.property("value"),
      movie_data_indexed,
      dispatcher
    );
    user2Piechart.updateVis();

    // AVERAGE HOURS
    var user1AverageHours = document.getElementById("user1-average-hours");
    var user1Hours = document.createElement("h2");

    if (selected_user1_info._id == -1) {
      var hours = 0;
      users.forEach((user) => {
        if (user._id != -1) hours += user.total_watchtime;
      });
      hours = hours / (users.length - 1);
      user1Hours.textContent = `${hours.toLocaleString(
        "en-US"
      )} average hours watched per user`;
    } else {
      user1Hours.textContent = `${selected_user1_info.total_watchtime.toLocaleString(
        "en-US"
      )} hours watched by ${selected_user1_info.display_name}`;
    }
    user1AverageHours.appendChild(user1Hours);

    var user2AverageHours = document.getElementById("user2-average-hours");
    var user2Hours = document.createElement("h2");

    if (selected_user2_info._id == -1) {
      var hours = 0;
      users.forEach((user) => {
        if (user._id != -1) hours += user.total_watchtime;
      });
      hours = hours / (users.length - 1);
      user2Hours.textContent = `${hours.toLocaleString(
        "en-US"
      )} average hours watched per user`;
    } else {
      user2Hours.textContent = `${selected_user2_info.total_watchtime.toLocaleString(
        "en-US"
      )} hours watched by ${selected_user2_info.display_name}`;
    }
    user2AverageHours.appendChild(user2Hours);

    // RATINGS BARCHARTS
    let user1RatingsBarchart = new RatingsBarchart(
      { parentElement: "#user1-ratings-barchart" },
      ratings,
      users,
      user1.property("value"),
      dispatcher
    );
    user1RatingsBarchart.updateVis();

    let user2RatingsBarchart = new RatingsBarchart(
      { parentElement: "#user2-ratings-barchart" },
      ratings,
      users,
      user2.property("value"),
      dispatcher
    );
    user2RatingsBarchart.updateVis();

    // dynamically show username in legend
    var user1Legend = document.getElementById("legend-user1");
    var user1Name = document.createElement("span");
    user1Name.textContent = `${selected_user1_info.display_name}`;
    user1Legend.appendChild(user1Name);
    var user2Legend = document.getElementById("legend-user2");
    var user2Name = document.createElement("span");
    user2Name.textContent = `${selected_user2_info.display_name}`;
    user2Legend.appendChild(user2Name);

    // SCATTERPLOTS
    // Initialize scatterplot data
    let u1_ratings = getRatings(
      selected_user1_info,
      num_top_movies,
      movie_data_indexed
    );
    let u2_ratings = getRatings(
      selected_user2_info,
      num_top_movies,
      movie_data_indexed
    );

    let u1_movies = getMovieIDsFromRatings(u1_ratings);
    let u2_movies = getMovieIDsFromRatings(u2_ratings);

    let movies_both = getUnion(u1_movies, u2_movies);

    let u1_scatterplot = new ScatterPlot(
      {
        parentElement: "#scatter-plot-u1",
        color: "#488f31",
      },
      dispatcher,
      u1_ratings,
      movie_data_indexed,
      selected_user1_info,
      u1_movies,
      movies_both
    );

    let u2_scatterplot = new ScatterPlot(
      {
        parentElement: "#scatter-plot-u2",
        color: "#de425b",
      },
      dispatcher,
      u2_ratings,
      movie_data_indexed,
      selected_user2_info,
      u2_movies,
      movies_both
    );

    // DISPATCHERS
    // Dispatcher for hovering on movies watched by both users: highlight both points on movie hover
    dispatcher.on("userMovieHover", (hovered_user, movie, plot) => {
      if (movie) {
        plot_id = plot == "u1" ? "u2" : "u1";
        let point_id =
          hovered_user.user_id == selected_user1_info.user_id
            ? "#" + selected_user2_info.user_id
            : "#" + selected_user1_info.user_id;
        point_id += "-" + plot_id + "-" + movie.movie_id;
        d3.select(point_id).attr("class", "point highlighted");
      }
    });

    // Dispatcher on mouse out: unhighlight points on mouse out
    dispatcher.on("userMovieMouseOut", (hovered_user, movie, plot) => {
      if (movie) {
        plot_id = plot == "u1" ? "u2" : "u1";
        let point_id =
          hovered_user.user_id == selected_user1_info.user_id
            ? "#" + selected_user2_info.user_id
            : "#" + selected_user1_info.user_id;
        point_id += "-" + plot_id + "-" + movie.movie_id;
        d3.select(point_id).attr("class", "point");
      }
    });

    // Dispatchers for barchart selects
    dispatcher.on("barchartDispatch", (obj) => {
      // genre processing
      if (obj.chartType == "genre") {
        if (!activeGenre.includes(obj.category)) {
          activeGenre = [];
          activeGenre.push(obj.category);
        } else {
          activeGenre = [];
        }
      }

      if (obj.chartType == "country") {
        if (!activeCountry.includes(obj.category)) {
          activeCountry = [];
          activeCountry.push(obj.category);
        } else {
          activeCountry = [];
        }
      }

      if (obj.chartType == "language") {
        if (!activeLanguage.includes(obj.category)) {
          activeLanguage = [];
          activeLanguage.push(obj.category);
        } else {
          activeLanguage = [];
        }
      }

      if (obj.chartType == "piechart") {
        if (!activeEra.includes(obj.category.data.ind)) {
          activeEra = [];
          activeEra.push(obj.category.data.ind);
        } else {
          activeEra = [];
        }
      }

      if (obj.chartType == "ratings") {
        if (!activeRating.includes(obj.category[0])) {
          activeRating = [];
          activeRating.push(obj.category[0]);
        } else {
          activeRating = [];
        }
      }

      let filtered_movie_data = movie_data;

      if (activeEra.length != 0) {
        era = activeEra[0];

        filtered_movie_data = filtered_movie_data.filter((d) => {
          let year = d.year_released;
          if (year) {
            if (era == 0) {
              if (year < 1920) return d;
            } else if (era == 1) {
              if (year >= 1920 && year < 1960) return d;
            } else if (era == 2) {
              if (year >= 1960 && year < 1990) return d;
            } else if (era == 3) {
              if (year >= 1990) return d;
            }
          }
        });
      }

      // filtering required
      if (activeGenre.length != 0) {
        filtered_movie_data = filtered_movie_data.filter((d) => {
          let gen = JSON.parse(d.genres);
          if (gen) {
            if (gen.includes(activeGenre[0])) {
              return d;
            }
          }
        });
      }

      if (activeCountry.length != 0) {
        filtered_movie_data = filtered_movie_data.filter((d) => {
          let country = JSON.parse(d.production_countries);
          if (country) {
            if (country.includes(activeCountry[0])) {
              return d;
            }
          }
        });
      }

      if (activeLanguage.length != 0) {
        filtered_movie_data = filtered_movie_data.filter((d) => {
          let lang_of_movie = d.original_language;
          if (lang_of_movie && langMap[lang_of_movie]) {
            if (langMap[lang_of_movie] == activeLanguage[0]) {
              return d;
            }
          }
        });
      }

      let filtered_movie_data_indexed = getFilteredMovies(filtered_movie_data);

      groupedCountryBarchart.movie_data_indexed = filtered_movie_data_indexed;
      groupedGenreBarchart.movie_data_indexed = filtered_movie_data_indexed;
      groupedLangBarchart.movie_data_indexed = filtered_movie_data_indexed;
      groupedCountryBarchart.data = filtered_movie_data;
      groupedGenreBarchart.data = filtered_movie_data;
      groupedLangBarchart.data = filtered_movie_data;

      user1Piechart.movie_data_indexed = filtered_movie_data_indexed;
      user2Piechart.movie_data_indexed = filtered_movie_data_indexed;

      updateScatterplotData(u1_scatterplot, u2_scatterplot);

      updateGroupedBarchartData(
        groupedGenreBarchart,
        groupedCountryBarchart,
        groupedLangBarchart
      );
      updateRatingsBarchart(
        user1RatingsBarchart,
        user2RatingsBarchart,
        filtered_movie_data_indexed
      );
      updatePiechart(user1Piechart, user2Piechart);

      updateScatterplots(u1_scatterplot, u2_scatterplot);
    });

    // Event handlers for selection/interactions
    d3.selectAll("#top-movies").on("change", function () {
      updateScatterplotData(u1_scatterplot, u2_scatterplot);
      updateScatterplots(u1_scatterplot, u2_scatterplot);
    });

    d3.selectAll("#user1Select").on("change", function () {
      selected_user1_info = getUserInfo(
        d3.selectAll("#user1Select").property("value")
      );
      selected_user2_info = getUserInfo(
        d3.selectAll("#user2Select").property("value")
      );

      updateAverageHours(selected_user1_info, selected_user2_info);
      updateScatterplotData(u1_scatterplot, u2_scatterplot);
      updateScatterplots(u1_scatterplot, u2_scatterplot);
      updateGroupedBarchartData(
        groupedGenreBarchart,
        groupedCountryBarchart,
        groupedLangBarchart
      );
      updatePiechart(user1Piechart, user2Piechart);
      updateRatingsBarchart(
        user1RatingsBarchart,
        user2RatingsBarchart,
        movie_data_indexed
      );
      updateUserLegend();
    });

    d3.selectAll("#user2Select").on("change", function () {
      selected_user1_info = getUserInfo(
        d3.selectAll("#user1Select").property("value")
      );
      selected_user2_info = getUserInfo(
        d3.selectAll("#user2Select").property("value")
      );

      updateAverageHours(selected_user1_info, selected_user2_info);
      updateScatterplotData(u1_scatterplot, u2_scatterplot);
      updateScatterplots(u1_scatterplot, u2_scatterplot);
      updateGroupedBarchartData(
        groupedGenreBarchart,
        groupedCountryBarchart,
        groupedLangBarchart
      );
      updatePiechart(user1Piechart, user2Piechart);
      updateRatingsBarchart(
        user1RatingsBarchart,
        user2RatingsBarchart,
        movie_data_indexed
      );
      updateUserLegend();
    });
  })
  .catch(function (err) {
    console.log("Error: " + err);
  });

function updateUserLegend() {
  // dynamically show username in legend
  var user1Legend = document.getElementById("legend-user1");
  user1Legend.textContent = "";
  var user1Name = document.createElement("span");
  user1Name.textContent = `${user1_info.user_id}`;
  user1Legend.appendChild(user1Name);
  var user2Legend = document.getElementById("legend-user2");
  user2Legend.textContent = "";
  var user2Name = document.createElement("span");
  user2Name.textContent = `${user2_info.user_id}`;
  user2Legend.appendChild(user2Name);
}

function getRatings(user, numRatings, movies) {
  let userRatings = [];

  ratings.forEach((r) => {
    if (r.user_id == user.user_id && movies[r.movie_id]) {
      userRatings.push(r);
    }
  });

  userRatings.sort((a, b) => {
    return b.rating_val - a.rating_val;
  });

  userRatings = userRatings.slice(0, numRatings);

  return userRatings;
}

function getRatingsForBarchart(user, movies) {
  let userRatings = [];

  ratings.forEach((r) => {
    if (r.user_id == user.user_id && movies[r.movie_id]) {
      userRatings.push(r);
    }
  });

  userRatings.sort((a, b) => {
    return b.rating_val - a.rating_val;
  });
  return userRatings;
}

function getMovieIDsFromRatings(ratings) {
  let movies = new Set([]);

  ratings.forEach((u) => {
    movies.add(u.movie_id);
  });
  return movies;
}

function getUnion(m1, m2) {
  let mUnion = new Set([]);

  Array.from(m1).forEach((m) => {
    if (m2.has(m)) {
      mUnion.add(m);
    }
  });
  return mUnion;
}

function updateAverageHours(user1, user2) {
  user1AverageHours = document.getElementById("user1-average-hours");
  user2AverageHours = document.getElementById("user2-average-hours");
  user1AverageHours.textContent = "";
  user2AverageHours.textContent = "";

  var user1Hours = document.createElement("h2");
  var user2Hours = document.createElement("h2");

  if (user1._id == -1) {
    var hours = 0;
    users.forEach((user) => {
      if (user._id != -1) hours += user.total_watchtime;
    });
    hours = hours / (users.length - 1);
    user1Hours.textContent = `${hours.toLocaleString(
      "en-US"
    )} average hours watched per user`;
  } else {
    user1Hours.textContent = `${user1.total_watchtime.toLocaleString(
      "en-US"
    )} hours watched by ${user1.display_name}`;
  }

  if (user2._id == -1) {
    var hours = 0;
    users.forEach((user) => {
      if (user._id != -1) hours += user.total_watchtime;
    });
    hours = hours / (users.length - 1);
    user2Hours.textContent = `${hours.toLocaleString(
      "en-US"
    )} average hours watched per user`;
  } else {
    user2Hours.textContent = `${user2.total_watchtime.toLocaleString(
      "en-US"
    )} hours watched by ${user2.display_name}`;
  }

  user1AverageHours.appendChild(user1Hours);
  user2AverageHours.appendChild(user2Hours);
}

function updateRatingsBarchart(
  user1RatingsBarchart,
  user2RatingsBarchart,
  filtered_movie_data_indexed
) {
  let selected_user1_info = d3.select("#user1Select").property("value");
  let selected_user2_info = d3.select("#user2Select").property("value");
  user1_info = users.find((user) => user._id === selected_user1_info);
  user2_info = users.find((user) => user._id === selected_user2_info);

  if (user1_info._id == -1) {
    user1RatingsBarchart.user = null;
    user1RatingsBarchart.ratings_data = ratings;
  } else {
    user1RatingsBarchart.user = user1_info;
    user1RatingsBarchart.ratings_data = getRatingsForBarchart(
      user1_info,
      filtered_movie_data_indexed
    );
  }

  if (user2_info._id == -1) {
    user2RatingsBarchart.user = null;
    user2RatingsBarchart.ratings_data = ratings;
  } else {
    user2RatingsBarchart.user = user2_info;
    user2RatingsBarchart.ratings_data = getRatingsForBarchart(
      user2_info,
      filtered_movie_data_indexed
    );
  }

  user1RatingsBarchart.updateVis();
  user2RatingsBarchart.updateVis();
}

function updatePiechart(user1Piechart, user2Piechart) {
  let selected_user1_info = d3.select("#user1Select").property("value");
  let selected_user2_info = d3.select("#user2Select").property("value");
  user1_info = users.find((user) => user._id === selected_user1_info);
  user2_info = users.find((user) => user._id === selected_user2_info);

  user1Piechart.user = user1_info._id == -1 ? null : user1_info;
  user2Piechart.user = user2_info._id == -1 ? null : user2_info;
  user1Piechart.updateVis();
  user2Piechart.updateVis();
}

function updateGroupedBarchartData(
  groupedGenreBarchart,
  groupedCountryBarchart,
  groupedLangBarchart
) {
  let selected_user1_info = d3.select("#user1Select").property("value");
  let selected_user2_info = d3.select("#user2Select").property("value");
  user1_info = users.find((user) => user._id === selected_user1_info);
  user2_info = users.find((user) => user._id === selected_user2_info);

  groupedCountryBarchart.user1 = user1_info;
  groupedGenreBarchart.user1 = user1_info;
  groupedLangBarchart.user1 = user1_info;
  groupedCountryBarchart.user2 = user2_info;
  groupedGenreBarchart.user2 = user2_info;
  groupedLangBarchart.user2 = user2_info;
  groupedCountryBarchart.updateVis();
  groupedGenreBarchart.updateVis();
  groupedLangBarchart.updateVis();
}

function updateScatterplotData(u1_scatterplot, u2_scatterplot) {
  let indexed_filtered = getFilteredMovies();
  let num = d3.selectAll("#top-movies").property("value");

  let u1_ratings = getRatings(selected_user1_info, num, indexed_filtered);
  let u2_ratings = getRatings(selected_user2_info, num, indexed_filtered);

  let u1_movies = getMovieIDsFromRatings(u1_ratings);
  let u2_movies = getMovieIDsFromRatings(u2_ratings);

  let movies_both = getUnion(u1_movies, u2_movies);
  // Filter data and update vis
  u1_scatterplot.user = selected_user1_info;
  u1_scatterplot.ratings = u1_ratings;
  u1_scatterplot.movies_both = movies_both;
  u1_scatterplot.extractData();

  u2_scatterplot.user = selected_user2_info;
  u2_scatterplot.ratings = u2_ratings;
  u2_scatterplot.movies_both = movies_both;
  u2_scatterplot.extractData();
}

function updateScatterplots(u1_scatterplot, u2_scatterplot) {
  u1_scatterplot.updateVis();
  u2_scatterplot.updateVis();
}

function getUserInfo(user_id) {
  return users.find((u) => u._id === user_id);
}

function getFilteredMovies() {
  let filtered_movie_data = movie_data;

  if (activeGenre.length != 0) {
    filtered_movie_data = filtered_movie_data.filter((d) => {
      let gen = JSON.parse(d.genres);
      if (gen) {
        if (gen.includes(activeGenre[0])) {
          return d;
        }
      }
    });
  }

  if (activeCountry.length != 0) {
    filtered_movie_data = filtered_movie_data.filter((d) => {
      let country = JSON.parse(d.production_countries);
      if (country) {
        if (country.includes(activeCountry[0])) {
          return d;
        }
      }
    });
  }

  if (activeLanguage.length != 0) {
    filtered_movie_data = filtered_movie_data.filter((d) => {
      let lang_of_movie = d.original_language;
      if (lang_of_movie && langMap[lang_of_movie]) {
        if (langMap[lang_of_movie] == activeLanguage[0]) {
          return d;
        }
      }
    });
  }

  if (activeEra.length != 0) {
    era = activeEra[0];

    filtered_movie_data = filtered_movie_data.filter((d) => {
      let year = d.year_released;
      if (year) {
        if (era == 0) {
          if (year < 1920) return d;
        } else if (era == 1) {
          if (year >= 1920 && year < 1960) return d;
        } else if (era == 2) {
          if (year >= 1960 && year < 1990) return d;
        } else if (era == 3) {
          if (year >= 1990) return d;
        }
      }
    });
  }

  let indexed_filtered = {};
  filtered_movie_data.forEach((f) => {
    indexed_filtered[f.movie_id] = f;
  });

  return indexed_filtered;
}
