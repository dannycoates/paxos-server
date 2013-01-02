var argv = require('optimist').argv
var express = require('express')
var request = require('request')
var Paxos = require('paxos-core')

var cluster = argv._
var port = argv.listen
var majority = Math.floor(cluster.length / 2) + 1
var paxos = new Paxos(argv.id, majority)

var app = express()
app.use(express.bodyParser())

function send(name, message) {
	for (var i = 0; i < cluster.length; i++) {
		var peer = cluster[i]
		if (peer !== 'localhost:' + port) {
			request.post(
				{
					uri: 'http://' + peer + '/paxos/' + name,
					json: message
				},
				function noop() {}
			)
		}
	}
}

function handle(handler) {
	return function (req, res) {
		handler(req.body)
		res.send(202)
	}
}

var api = ['prepare', 'promised', 'accept', 'accepted', 'rejected']

for (var i = 0; i < api.length; i++) {
	var call = api[i]
	paxos.on(call, send.bind(null, call))
	app.post('/paxos/' + call, handle(paxos[call]))
}

app.post('/submit', function (req, res) {
	paxos.submit(Object.keys(req.body)[0])

	paxos.once('learned', function (fact) {
		res.send(fact)
	})
})

app.listen(port)
