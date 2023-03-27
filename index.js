const http = require("http");
const https = require("https");
const express = require("express");
const fs = require("fs");
const bdb = require('bdb.js');
let db = bdb.load("ur1s.json", 1);
let ur1s = db.ur1s || (db.ur1s = {});
let reverse = db.reverse || (db.reverse = {});

function random(amount) {
    let chars = 'abcdefghijklmnopqrstuvwxyz';
    chars += chars.toUpperCase();
    chars += '0123456789';
    let r = '';
    for(let i = 0; i < amount; i++) {
        r += chars[Math.floor(Math.random() * chars.length)];
    }
    return r;
}

let app = express();

app.get("/favicon.ico", function(req, re) {
    re.sendFile(__dirname + "/app/favicon.ico");
});

app.get("/link.svg", function(req, re) {
    re.sendFile(__dirname + "/app/link.svg");
});

app.get("/trash.svg", function(req, re) {
    re.sendFile(__dirname + "/app/trash.svg");
});

app.get("/icon.png", function(req, re) {
    re.sendFile(__dirname + "/app/icon.png");
});

app.get("/css", function(req, re) {
    re.sendFile(__dirname + "/app/style.css");
});

app.get("/", function(req, re) {
    let r = req.query;
    if (ur1s[r.l]) {
        let ur1 = ur1s[r.l];
        re.send(
            `<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"><script>window.location.href="${ur1}"</script>Click <a href="${ur1}">here</a>, if your browser does not support redirects!`
        );
        return;
    }
    a: if (!r.l && r.dest && r.domain) {
        if(r.dest.length > 5000)
            break a;
        let data = fs.readFileSync(__dirname + '/app/created.html', 'utf8');
        let key = random(30);
        let link = random(10);
        while (ur1s[link]) link = random(10);
        while (reverse[key]) reverse = random(30);
        if(!r.dest.includes("://")) r.dest = "https://" + r.dest;
        ur1s[link] = r.dest;
        reverse[key] = link;
        re.send(
            data
                .replaceAll("<!--KEY-->", key)
                .replaceAll("<!--LINK-->", link)
                .replaceAll("<!--DOMAIN-->", r.domain)
        );
        return;
    }
    if (!r.l && r.del) {
        let id = reverse[r.del];
        if(id) {
            delete ur1s[id];
            delete reverse[r.del];
        }
        re.sendFile(__dirname + "/app/deleted.html");
        return;
    }
    re.sendFile(__dirname + "/app/create.html");
});

if (process.env.SSLPORT) {
    console.log("setting up https servers...");
    let domains = fs.readdirSync(process.env.SSLDIR);
    let server = null;
    domains.forEach(domain => {
        if(domain !== 'README') {
            let creds = {
                key: fs.readFileSync(process.env.SSLDIR + "/" + domain + "/privkey.pem", "utf8"),
                cert: fs.readFileSync(process.env.SSLDIR + "/" + domain + "/cert.pem", "utf8"),
                ca: fs.readFileSync(process.env.SSLDIR + "/" + domain + "/chain.pem", "utf8")
            };
            console.log("registering https domain " + domain);
            if(!server) {
                server = https.createServer(creds, app);
            }
            else {
                server.addContext(domain, creds);
            }
            console.log("domain " + domain + " running.");
        }
    })
    if(server) {
        server.listen(process.env.SSLPORT);
        console.log("https server started");
    }
    else {
        console.log("no https servers added, this is likely an error. SSLDIR=" + process.env.SSLDIR);
    }
    app = express();
    app.use((req, res, next) => {
        res.redirect("https://nickwil.de");
    })
}
http.createServer({}, app).listen(process.env.PORT);
console.log("http server started");
