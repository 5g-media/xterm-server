require("dotenv").config();

var express = require("express");
var app = express();
var expressWs = require("express-ws")(app);
var os = require("os");
var pty = require("node-pty");
var bodyParser = require("body-parser");

app.use(bodyParser.json());

app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept',
  );
  res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');

  next();
});

var terminals = {},
  logs = {};
  
getPath = type => {
console.log(type);
  if (type === "osm") {
    return process.env.HOME + process.env.osm;
  } else if (type === "leanow") {
    return process.env.HOME + process.env.leanow;
  } else {
    return process.env.HOME;
  }
};

app.post("/terminals", function(req, res) {
  var cols = parseInt(req.query.cols),
    rows = parseInt(req.query.rows),
    type = req.body.type,
    term = pty.spawn(process.platform === "win32" ? "cmd.exe" : "bash", [], {
      name: "xterm-color",
      cols: cols,
      rows: rows,
      cwd: getPath(type),
      env: process.env
    });

  console.log("Created terminal with PID: " + term.pid);
  terminals[term.pid] = term;
  logs[term.pid] = "";
  term.on("data", function(data) {
    logs[term.pid] += data;
  });
  res.send(term.pid.toString());
  res.end();
});

app.post("/terminals/:pid/size", function(req, res) {
  var pid = parseInt(req.params.pid),
    cols = parseInt(req.query.cols),
    rows = parseInt(req.query.rows),
    term = terminals[pid];

  term.resize(cols, rows);
  console.log(
    "Resized terminal " + pid + " to " + cols + " cols and " + rows + " rows."
  );
  res.end();
});

app.post("/terminals/:pid/writeln", function(req, res) {
  var pid = parseInt(req.params.pid),
    term = terminals[pid],
    command = Object.keys(req.body)[0];

  term.write(command + "\r");
  res.end();
});

app.ws("/terminals/:pid", function(ws, req) {
  var term = terminals[parseInt(req.params.pid)];
  console.log("Connected to terminal " + term.pid);
  ws.send(logs[term.pid]);

  term.on("data", function(data) {
    try {
      ws.send(data);
    } catch (ex) {
      // The WebSocket is not open, ignore
    }
  });
  ws.on("message", function(msg) {
    term.write(msg);
  });
  ws.on("close", function() {
    term.kill();
    console.log("Closed terminal " + term.pid);
    // Clean things up
    delete terminals[term.pid];
    delete logs[term.pid];
  });
});

var port = process.env.PORT || 7000,
  host = os.platform() === "win32" ? "127.0.0.1" : "0.0.0.0";

console.log("App listening to http://" + host + ":" + port);
app.listen(port, host);
