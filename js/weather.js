// ===== Weather mini-app =====
// Data: UAPI Weather API (https://uapis.cn) — current weather by city name.
// Free endpoint, no API key required, CORS enabled for browsers.
// Docs/spec: https://uapis.cn/openapi.json  (GET /api/v1/misc/weather)
//
// Flow: city name -> UAPI weather endpoint -> render current conditions.
// The API returns QWeather-style icon codes (e.g. "309"), which we map to
// an English label + emoji below (the API's text fields are Chinese).

(function () {
  var WEATHER_URL = "https://uapis.cn/api/v1/misc/weather";

  // QWeather icon codes -> { label, emoji }
  // https://dev.qweather.com/en/docs/resource/icons/
  var ICONS = {
    100: { label: "Clear sky", emoji: "☀️" },
    101: { label: "Cloudy", emoji: "⛅" },
    102: { label: "Few clouds", emoji: "🌤️" },
    103: { label: "Partly cloudy", emoji: "🌥️" },
    104: { label: "Overcast", emoji: "☁️" },
    150: { label: "Clear night", emoji: "🌙" },
    151: { label: "Few clouds at night", emoji: "🌙" },
    152: { label: "Partly cloudy at night", emoji: "☁️" },
    153: { label: "Cloudy at night", emoji: "☁️" },
    300: { label: "Rain showers", emoji: "🌦️" },
    301: { label: "Heavy rain showers", emoji: "🌦️" },
    302: { label: "Thunderstorms", emoji: "⛈️" },
    303: { label: "Heavy thunderstorms", emoji: "⛈️" },
    304: { label: "Thunderstorms with hail", emoji: "⛈️" },
    305: { label: "Light rain", emoji: "🌦️" },
    306: { label: "Moderate rain", emoji: "🌧️" },
    307: { label: "Heavy rain", emoji: "🌧️" },
    308: { label: "Extreme rainfall", emoji: "🌧️" },
    309: { label: "Drizzle", emoji: "🌦️" },
    310: { label: "Storm", emoji: "🌧️" },
    311: { label: "Heavy storm", emoji: "🌧️" },
    312: { label: "Severe storm", emoji: "🌧️" },
    313: { label: "Freezing rain", emoji: "🌧️" },
    314: { label: "Light to moderate rain", emoji: "🌧️" },
    315: { label: "Moderate to heavy rain", emoji: "🌧️" },
    316: { label: "Heavy rain to storm", emoji: "🌧️" },
    317: { label: "Storm to heavy storm", emoji: "🌧️" },
    318: { label: "Heavy to severe storm", emoji: "🌧️" },
    399: { label: "Rain", emoji: "🌧️" },
    400: { label: "Light snow", emoji: "🌨️" },
    401: { label: "Moderate snow", emoji: "🌨️" },
    402: { label: "Heavy snow", emoji: "❄️" },
    403: { label: "Snowstorm", emoji: "❄️" },
    404: { label: "Sleet", emoji: "🌨️" },
    405: { label: "Rain and snow", emoji: "🌨️" },
    406: { label: "Shower sleet", emoji: "🌨️" },
    407: { label: "Snow flurries", emoji: "🌨️" },
    408: { label: "Light to moderate snow", emoji: "🌨️" },
    409: { label: "Moderate to heavy snow", emoji: "🌨️" },
    410: { label: "Heavy snow to snowstorm", emoji: "❄️" },
    499: { label: "Snow", emoji: "❄️" },
    500: { label: "Mist", emoji: "🌫️" },
    501: { label: "Fog", emoji: "🌫️" },
    502: { label: "Haze", emoji: "😶‍🌫️" },
    503: { label: "Drifting sand", emoji: "🌪️" },
    504: { label: "Dust", emoji: "🌪️" },
    507: { label: "Sandstorm", emoji: "🌪️" },
    508: { label: "Strong sandstorm", emoji: "🌪️" },
    509: { label: "Dense fog", emoji: "🌫️" },
    510: { label: "Freezing fog", emoji: "🌫️" },
    511: { label: "Moderate haze", emoji: "😶‍🌫️" },
    512: { label: "Heavy haze", emoji: "😶‍🌫️" },
    513: { label: "Severe haze", emoji: "😶‍🌫️" },
    514: { label: "Heavy fog", emoji: "🌫️" },
    515: { label: "Extra-tropical fog", emoji: "🌫️" },
    900: { label: "Hot", emoji: "🥵" },
    901: { label: "Cold", emoji: "🥶" },
    999: { label: "Unknown", emoji: "🌡️" }
  };

  // Chinese compass names returned by the API -> English abbreviation
  var WIND_DIR = {
    "北风": "N", "东北风": "NE", "东风": "E", "东南风": "SE",
    "南风": "S", "西南风": "SW", "西风": "W", "西北风": "NW",
    "旋转风": "Variable", "无持续风向": "Variable"
  };

  function describeIcon(code) {
    var key = parseInt(code, 10);
    return ICONS[key] || { label: "Unknown", emoji: "🌡️" };
  }

  // "西南风" -> "SW"; falls back to the raw value if unrecognised.
  function translateWindDirection(text) {
    if (!text) return "";
    return WIND_DIR[text] || text;
  }

  // "3级" -> "3" (Beaufort scale level)
  function windLevel(text) {
    var m = /\d+/.exec(text || "");
    return m ? m[0] : "";
  }

  function round(n) {
    return Math.round(Number(n));
  }

  // Well-known cities UAPI can resolve, used to offer "did you mean" suggestions
  // when a search isn't found. Each entry: [name, country, altNames?].
  // UAPI itself has no city-search endpoint, so suggestions are matched locally.
  var CITIES = [
    ["London", "United Kingdom"], ["Paris", "France"], ["Berlin", "Germany"],
    ["Madrid", "Spain"], ["Barcelona", "Spain"], ["Rome", "Italy"],
    ["Milan", "Italy"], ["Amsterdam", "Netherlands"], ["Brussels", "Belgium"],
    ["Vienna", "Austria"], ["Zurich", "Switzerland"], ["Geneva", "Switzerland"],
    ["Prague", "Czechia"], ["Warsaw", "Poland"], ["Budapest", "Hungary"],
    ["Lisbon", "Portugal"], ["Athens", "Greece"], ["Dublin", "Ireland"],
    ["Copenhagen", "Denmark"], ["Stockholm", "Sweden"], ["Oslo", "Norway"],
    ["Helsinki", "Finland"], ["Reykjavik", "Iceland"], ["Moscow", "Russia"],
    ["Saint Petersburg", "Russia"], ["Kyiv", "Ukraine"], ["Istanbul", "Turkey"],
    ["Belgrade", "Serbia"], ["Bucharest", "Romania"], ["Sofia", "Bulgaria"],
    ["Zagreb", "Croatia"], ["Cairo", "Egypt"], ["Nairobi", "Kenya"],
    ["Lagos", "Nigeria"], ["Cape Town", "South Africa"], ["Johannesburg", "South Africa"],
    ["Casablanca", "Morocco"], ["Dubai", "United Arab Emirates"], ["Abu Dhabi", "United Arab Emirates"],
    ["Doha", "Qatar"], ["Riyadh", "Saudi Arabia"], ["Tehran", "Iran"],
    ["Tel Aviv", "Israel"], ["Mumbai", "India"], ["Delhi", "India"],
    ["Bangalore", "India"], ["Chennai", "India"], ["Kolkata", "India"],
    ["Karachi", "Pakistan"], ["Dhaka", "Bangladesh"], ["Bangkok", "Thailand"],
    ["Singapore", "Singapore"], ["Kuala Lumpur", "Malaysia"], ["Jakarta", "Indonesia"],
    ["Manila", "Philippines"], ["Hanoi", "Vietnam"], ["Ho Chi Minh City", "Vietnam"],
    ["Seoul", "South Korea"], ["Busan", "South Korea"], ["Tokyo", "Japan"],
    ["Osaka", "Japan"], ["Kyoto", "Japan"], ["Sapporo", "Japan"],
    ["Sydney", "Australia"], ["Melbourne", "Australia"], ["Brisbane", "Australia"],
    ["Perth", "Australia"], ["Auckland", "New Zealand"], ["Wellington", "New Zealand"],
    ["Toronto", "Canada"], ["Vancouver", "Canada"], ["Montreal", "Canada"],
    ["Ottawa", "Canada"], ["New York", "United States"], ["Los Angeles", "United States"],
    ["Chicago", "United States"], ["San Francisco", "United States"], ["Seattle", "United States"],
    ["Boston", "United States"], ["Washington", "United States"], ["Miami", "United States"],
    ["Houston", "United States"], ["Dallas", "United States"], ["Atlanta", "United States"],
    ["Denver", "United States"], ["Las Vegas", "United States"], ["Honolulu", "United States"],
    ["Mexico City", "Mexico"], ["Guadalajara", "Mexico"], ["São Paulo", "Brazil", ["Sao Paulo"]],
    ["Rio de Janeiro", "Brazil"], ["Buenos Aires", "Argentina"], ["Santiago", "Chile"],
    ["Lima", "Peru"], ["Bogotá", "Colombia", ["Bogota"]], ["Caracas", "Venezuela"],
    ["Havana", "Cuba"], ["Beijing", "China", ["北京", "Peking"]], ["Shanghai", "China", ["上海"]],
    ["Guangzhou", "China", ["广州"]], ["Shenzhen", "China", ["深圳"]], ["Chengdu", "China", ["成都"]],
    ["Hangzhou", "China", ["杭州"]], ["Wuhan", "China", ["武汉"]], ["Xi'an", "China", ["西安", "Xian"]],
    ["Nanjing", "China", ["南京"]], ["Chongqing", "China", ["重庆"]], ["Tianjin", "China", ["天津"]],
    ["Suzhou", "China", ["苏州"]], ["Qingdao", "China", ["青岛"]], ["Hong Kong", "China", ["香港"]],
    ["Macau", "China", ["澳门"]], ["Taipei", "Taiwan", ["台北"]], ["Kaohsiung", "Taiwan", ["高雄"]]
  ];

  // Lowercase, strip accents and punctuation (keep letters, digits and CJK).
  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
  }

  // Damerau-Levenshtein distance (adjacent transpositions count as one edit,
  // so typos like "lonodn" -> "london" score 1 instead of 2).
  function editDistance(a, b) {
    if (a === b) return 0;
    var la = a.length, lb = b.length;
    if (!la) return lb;
    if (!lb) return la;
    var d = [];
    for (var i = 0; i <= la; i++) d[i] = [i];
    for (var j = 0; j <= lb; j++) d[0][j] = j;
    for (i = 1; i <= la; i++) {
      for (j = 1; j <= lb; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[la][lb];
  }

  // Closest known cities to a (possibly misspelled) query: nearest first, max 5.
  function didYouMean(query) {
    var q = normalize(query);
    if (!q) return [];
    // Tolerate roughly one typo; two only for longer names, where it stays precise.
    var maxDist = q.length <= 7 ? 1 : 2;
    var hits = [];

    for (var i = 0; i < CITIES.length; i++) {
      var c = CITIES[i];
      var names = [c[0]].concat(c[2] || []);
      var best = Infinity;
      for (var k = 0; k < names.length; k++) {
        var n = normalize(names[k]);
        if (!n) continue;
        var d;
        if (n === q) {
          d = 0;
        } else if (n.indexOf(q) === 0 || q.indexOf(n) === 0) {
          d = 1; // one is a leading fragment of the other, e.g. "xiant" -> "Xi'an"
        } else if (q.length <= 3) {
          continue; // too little signal to fuzzy-match a very short query
        } else {
          d = editDistance(q, n);
        }
        if (d < best) best = d;
      }
      if (best <= maxDist) hits.push({ city: c, dist: best });
    }

    hits.sort(function (a, b) {
      return a.dist - b.dist ||
        a.city[0].length - b.city[0].length ||
        a.city[0].localeCompare(b.city[0]);
    });

    var out = [], seen = {};
    for (var h = 0; h < hits.length && out.length < 5; h++) {
      var name = hits[h].city[0];
      if (seen[name]) continue;
      seen[name] = 1;
      out.push(hits[h].city);
    }
    return out;
  }

  function fetchWeather(city) {
    var url = WEATHER_URL +
      "?city=" + encodeURIComponent(city) +
      "&extended=true"; // adds feels_like, visibility, pressure, uv, etc.

    return fetch(url).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) {
          // UAPI returns 404 + {"error":"LOCATION_NOT_FOUND"} for unknown cities
          var err = new Error("HTTP " + res.status);
          err.status = res.status;
          err.apiError = body && body.error;
          throw err;
        }
        return body;
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("weather-form");
    if (!form) return;

    var input = document.getElementById("weather-input");
    var statusEl = document.getElementById("weather-status");
    var resultEl = document.getElementById("weather-result");
    var iconEl = document.getElementById("weather-icon");
    var tempEl = document.getElementById("weather-temp");
    var condEl = document.getElementById("weather-condition");
    var placeEl = document.getElementById("weather-place");
    var updatedEl = document.getElementById("weather-updated");
    var feelsEl = document.getElementById("weather-feels");
    var humidityEl = document.getElementById("weather-humidity");
    var windEl = document.getElementById("weather-wind");
    var suggestionsEl = document.getElementById("weather-suggestions");
    var suggestionListEl = document.getElementById("weather-suggestion-list");
    var searchBtn = form.querySelector("button[type=submit]");

    function setStatus(msg, isError) {
      statusEl.textContent = msg || "";
      statusEl.classList.toggle("is-error", !!isError);
    }

    function clearSuggestions() {
      suggestionsEl.hidden = true;
      suggestionListEl.innerHTML = "";
    }

    // Render "did you mean" chips; each re-runs the search with the fixed name.
    function renderSuggestions(list) {
      clearSuggestions();
      if (!list.length) return;

      list.forEach(function (entry) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "weather-suggestion";
        btn.textContent = entry[1] ? entry[0] + ", " + entry[1] : entry[0];
        btn.addEventListener("click", function () {
          input.value = entry[0];
          clearSuggestions();
          form.requestSubmit();
        });
        suggestionListEl.appendChild(btn);
      });
      suggestionsEl.hidden = false;
    }

    function setLoading(loading) {
      searchBtn.disabled = loading;
      searchBtn.textContent = loading ? "Searching…" : "Search";
    }

    function render(data) {
      var info = describeIcon(data.weather_icon);

      iconEl.textContent = info.emoji;
      tempEl.textContent = round(data.temperature);
      // Show the raw JSON `weather` value alongside an English label
      // derived from the icon code, e.g. "小雨 · Light rain".
      var english = info.label && info.label !== "Unknown" ? info.label : "";
      condEl.textContent = [data.weather, english].filter(Boolean).join(" · ") || "—";

      placeEl.textContent = data.city || "Unknown location";

      // Province is helpful only when it adds info beyond the city name.
      var province = data.province || "";
      if (province && data.city && province.toLowerCase().indexOf(String(data.city).toLowerCase()) === -1) {
        placeEl.textContent += ", " + province;
      }

      // report_time may be an absolute timestamp or a Chinese relative phrase.
      // Show it only when it looks like a timestamp so the EN UI stays clean.
      if (data.report_time && /^\d{4}-\d{2}-\d{2}/.test(data.report_time)) {
        updatedEl.textContent = "Updated " + data.report_time;
        updatedEl.hidden = false;
      } else {
        updatedEl.textContent = "";
        updatedEl.hidden = true;
      }

      feelsEl.textContent = data.feels_like !== undefined && data.feels_like !== null
        ? round(data.feels_like) + "°" : "--";
      humidityEl.textContent = data.humidity !== undefined ? round(data.humidity) + "%" : "--";

      var dir = translateWindDirection(data.wind_direction);
      var level = windLevel(data.wind_power);
      windEl.textContent = [dir, level ? "Lv " + level : ""].filter(Boolean).join(" · ") || "--";

      resultEl.hidden = false;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var city = input.value.trim();
      if (!city) {
        setStatus("Enter a city first.", true);
        input.focus();
        return;
      }

      setLoading(true);
      setStatus("Loading…", false);
      clearSuggestions();
      resultEl.hidden = true;

      fetchWeather(city)
        .then(function (data) {
          render(data);
          setStatus("", false);
        })
        .catch(function (err) {
          resultEl.hidden = true;
          if (err && (err.status === 404 || err.apiError === "LOCATION_NOT_FOUND")) {
            var matches = didYouMean(city);
            if (matches.length) {
              setStatus("Couldn’t find that city — did you mean one of these?", true);
              renderSuggestions(matches);
            } else {
              setStatus("Couldn’t find that city — check the spelling.", true);
            }
          } else if (err && err.status === 429) {
            setStatus("Too many requests. Please wait a moment and try again.", true);
          } else {
            setStatus("Something went wrong while fetching the weather. Please try again later.", true);
            // Keep technical detail in console for F12 debugging
            console.error("[Weather] UAPI request failed:", err);
          }
        })
        .finally(function () {
          setLoading(false);
        });
    });
  });
})();
