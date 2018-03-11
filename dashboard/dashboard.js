var emoji = new EmojiConvertor();

emoji.img_sets["google"].path = "img-google-64/";
emoji.img_set = "google";
emoji.replace_mode = "img";
emoji.supports_css = false;
emoji.init_env();

function msgHandler(msg) {
    var el = document.createElement("p"),
        chat = document.getElementById("chat"),
        t = tf(msg["ts"]);

    var ts = "[" + t.h + ":" + t.mi + "]";
        b = msg["body"];

    b = b.replace(/<\!(\w+)>/, "@$1");
    b = b.replace("<", "&lt;");
    b = emoji.replace_colons(b);
    for (var i = 0; i < Object.keys(msg["emoji"]).length; i++) {
        var hmemoji = Object.keys(msg["emoji"])[i];
        b = b.replace(hmemoji, "<img src='" +  msg["emoji"][hmemoji] + "'/>");
    }

    el.innerHTML = ts + " " + msg["from"] + ": " + b;
    if (b.indexOf("@here") > -1 ||
        b.indexOf("@channel") > -1 ||
        b.indexOf("#hackerspace") > -1) {
        el.classList.add("highlight");
    }
    chat.insertBefore(el, chat.firstChild);

    if (chat.childElementCount > 30) {
        chat.removeChild(chat.lastChild);
    }
}

var bottest = "C4TTY27RS";
var hackerspace = "C4XS939EY";
require("js/app").App.connect(hackerspace, msgHandler, function (catchup) {
    catchup.forEach(msgHandler);
});


var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
            'Saturday'];
var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
              'August', 'September', 'October', 'November', 'December'];

function tf(sinceEpoch=false) {
    function leadingZero(i) {
        if (i < 10) i = "0" + i;
        return i;
    }

    var dt = new Date();
    if (sinceEpoch) {
        dt = new Date(0);
        dt.setUTCSeconds(sinceEpoch);
    }

    return { h: dt.getHours(),
             mi: leadingZero(dt.getMinutes()),
             da: days[dt.getDay()],
             mo: months[dt.getMonth()],
             dt: dt.getDate(),
             date: dt };
}

function putTime() {
    var t = tf(),
        dstr = t.da + ' ' + t.mo  + ' ' + t.dt + ', ' + t.h + ":" + t.mi;
    document.getElementById('datetime').innerHTML = dstr;
    t = setTimeout(function () {
        putTime()
    }, 2000);
}
putTime();

var getJSON = function(url, callback, rtype='json') {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = rtype;
    xhr.onload = function() {
        var status = xhr.status;
        if (status === 200 && rtype == 'text') {
            lines = xhr.response.split('\n');
            if (lines.length > 1) {
                for (var i = 0; i < lines.length; i++) {
                    if (lines[i].indexOf("{") > -1) {
                        lines[i] = JSON.parse(lines[i]);
                        if (Object.keys(lines[i]).indexOf("referer")) {
                            lines[i].kind = lines[i].action.split("/")[2].split(" ")[0].split(".")[0];
                            lines[i].time = Date.parse(lines[i].time.replace(":", " "));
                            lines[i].start = false;
                            if (lines[i].kind == "stream") lines[i].start = lines[i].action.indexOf(".html") > -1;
                        }
                    } else {
                        lines.pop(i)
                    }
                }
                callback(null, lines.reverse());
            } else {
                callback(null, []);
            }
        } else if (status === 200) {
            callback(null, xhr.response);
        } else {
            callback(status, xhr.response);
        }
    }
    xhr.send();
};

function checkPatreon() {
    getJSON('https://space.bo.x0.rs/dashboard/patreon.json?' + Math.random(), function(e,d) {
        var sum = "" + d.included[0].attributes.pledge_sum;
        document.getElementById("patreon-money").innerHTML = "$" + sum.slice(0, -2);
        document.getElementById("patrons").innerHTML = d.included[0].attributes.patron_count;
    });
    setTimeout(checkPatreon, 3600000);
}
checkPatreon();

function checkMeetup() {
    getJSON('https://space.bo.x0.rs/dashboard/meetup.json', function(e,d) {
        var wr = document.createElement("ul"),
            today = tf();
        for (var i=0; i < d.length; i++) {
            var mt = tf(d[i].time / 1000);
            var li = document.createElement("li"),
                st = document.createElement("strong"),
                br = document.createElement("br"),
                na = document.createTextNode(d[i].name);
                tt = mt.da + ", " + mt.mo + " " + mt.dt + " (" + d[i].local_time + ") RSVPs: " + d[i].yes_rsvp_count;
            tt = document.createTextNode(tt);
            st.appendChild(na);
            // XXX I feel a bit dirty
            if (today.dt == mt.dt && today.mo == mt.mo) {
                li.classList.add("today");
            }
            li.appendChild(st);
            li.appendChild(br);
            li.appendChild(tt);
            wr.appendChild(li);
        }
        document.getElementById("meetups").innerHTML = wr.innerHTML;
    });
    setTimeout(checkMeetup, 1800000);
}
checkMeetup();

function checkSurveillance() {
    // doesn't support concurrent streams right now, but you know ¯\_(ツ)_/¯
    getJSON('https://space.bo.x0.rs/sousveillance/agent.log?' + Math.random(), function(e,d){
        if (e != null) {
            console.log(e);
            console.log(d);
        } else {
            if (d.length > 0) {
                if (d[0].kind == "snapshot" && (new Date().getTime() / 1000) - (d[0].time / 1000) < 5) {
                    document.body.classList.add("surveilled");
                    setTimeout(function() {
                        document.body.classList.remove("surveilled");
                    }, 7500);
                } else if (d[0].kind == "stream" && d[0].start) {
                    document.body.classList.add("surveilled");
                } else if (d[0].kind == "stream" && ! d[0].start) {
                    document.body.classList.remove("surveilled");
                }
            }
        }
    }, 'text');
    setTimeout(checkSurveillance, 5000);
}
checkSurveillance();

function checkWeather() {
    getJSON('https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20query.multi%20where%20queries%3D%22select%20item.condition%20from%20weather.forecast%20where%20woeid%20%3D%202459115%20and%20u%3D%27c%27%3Bselect%20item.condition%20from%20weather.forecast%20where%20woeid%20%3D%202459115%20and%20u%3D%27f%27%22&format=json&diagnostics=false&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys', function(e,d){
        if (e != null) {
            console.log(e);
            console.log(d);
        } else {
            document.getElementById('weatherc').innerHTML = d.query.results.results[0].channel.item.condition.temp;
            document.getElementById('weatherf').innerHTML = d.query.results.results[1].channel.item.condition.temp;
            document.getElementById('weathert').innerHTML = '(' + d.query.results.results[1].channel.item.condition.text + ')';
        }
    });
    setTimeout(checkWeather, 600000);
}
checkWeather();

if (navigator.userAgent.match(/CrKey/g) != null) {
    document.body.classList.add("chromecast");
}
