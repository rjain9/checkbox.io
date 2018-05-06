var express = require('express');
var cors = require('cors');
var marqdown = require('./marqdown.js');
var create = require('./routes/create.js');
var study = require('./routes/study.js');
var admin = require('./routes/admin.js');

var app = express();
var redis = require('redis');
var os = require('os');
var exec = require('child_process').exec;
var fs = require('fs');
var readline = require('readline');

var client = redis.createClient(6379, "18.191.35.179", {})
client.auth("password")
client.ltrim('reboot', -1, 0);

var rd = readline.createInterface({
	input: fs.createReadStream('nodes'),
	output: process.stdout,
	console: false
});

rd.on('line', function (line) {
	client.lpush("proxy", line);
});

var server = app.listen(3003, function () {
	var host = server.address().address
	var port = server.address().port
	console.log('Example app listening at http://%s:%s', host, port)
});

app.configure(function () {
	app.use(express.static('../../public_html/'));
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
});

var whitelist = ['http://chrisparnin.me', 'http://pythontutor.com', 'http://happyface.io', 'http://happyface.io:8003', 'http://happyface.io/hf.html'];
var corsOptions = {
	origin: function (origin, callback) {
		var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
		callback(null, originIsWhitelisted);
	}
};

app.options('/api/study/vote/submit/', cors(corsOptions));

app.post('/api/design/survey',
	function (req, res) {
		//console.log(req.body.markdown);
		//var text = marqdown.render( req.query.markdown );
		var text = marqdown.render(req.body.markdown);
		res.send({ preview: text });
	}
);

//// ################################
// Towards general study management.
app.get('/api/study/load/:id', study.loadStudy);
app.get('/api/study/vote/status', study.voteStatus);
app.get('/api/study/status/:id', study.status);

app.get('/api/study/listing', study.listing);

app.post('/api/study/create', create.createStudy);
app.post('/api/study/vote/submit/', cors(corsOptions), study.submitVote);

//// ADMIN ROUTES
app.get('/api/study/admin/:token', admin.loadStudy);
app.get('/api/study/admin/download/:token', admin.download);
app.get('/api/study/admin/assign/:token', admin.assignWinner);

app.post('/api/study/admin/open/', admin.openStudy);
app.post('/api/study/admin/close/', admin.closeStudy);
app.post('/api/study/admin/notify/', admin.notifyParticipant);


// Create function to get CPU information
function cpuTicksAcrossCores() {
	//Initialise sum of idle and time of cores and fetch CPU info
	var totalIdle = 0, totalTick = 0;
	var cpus = os.cpus();

	//Loop through CPU cores
	for (var i = 0, len = cpus.length; i < len; i++) {
		//Select CPU core
		var cpu = cpus[i];
		//Total up the time in the cores tick
		for (type in cpu.times) {
			totalTick += cpu.times[type];
		}
		//Total up the idle time of the core
		totalIdle += cpu.times.idle;
	}

	//Return the average Idle and Tick times
	return { idle: totalIdle / cpus.length, total: totalTick / cpus.length };
}

var startMeasure = cpuTicksAcrossCores();

function cpuAverage() {
	var endMeasure = cpuTicksAcrossCores();

	//Calculate the difference in idle and total time between the measures
	var idleDifference = endMeasure.idle - startMeasure.idle;
	var totalDifference = endMeasure.total - startMeasure.total;

	//Calculate the average percentage CPU usage
	return (totalDifference - idleDifference) / totalDifference * 100;
}

app.get('/cpu', function (req, res) {
	res.send(cpuAverage().toString());
});
