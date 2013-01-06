var argv = require('optimist').argv
var express = require('express')
var request = require('request')
var Paxos = require('paxos-core')

var cluster = {}
var peers = argv._
var port = argv.listen
var majority = Math.floor(peers.length / 2) + 1
var paxos = new Paxos(argv.id, majority)
console.log('starting', paxos.proposer.id, process.pid)

for (var i = 0; i < peers.length; i++) {
	var peer = peers[i]
	cluster[peer] = peer
}

var app = express()
app.use(express.bodyParser())

function broadcast(name, message) {
	for (var i = 0; i < peers.length; i++) {
		var peer = peers[i]
		if (peer !== argv.id) {
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

function reply(name, message) {
	var peer = cluster[message.requester]
	request.post(
		{
			uri: 'http://' + peer + '/paxos/' + name,
			json: message
		},
		function noop() {}
	)
}

function handle(handler) {
	return function (req, res) {
		var proposal = Paxos.Proposal.parse(req.body)
		console.log('id %s %s\t%s', argv.id, req.path.replace('/paxos/',''), proposal)
		handler(proposal)
		res.send(202)
	}
}

var api = ['prepare', 'promised', 'accept', 'accepted', 'rejected', 'learn']

for (var i = 0; i < api.length; i++) {
	var call = api[i]
	app.post('/paxos/' + call, handle(paxos[call]))
}

paxos.on('prepare', broadcast.bind(null, 'prepare'))
paxos.on('promised', reply.bind(null, 'promised'))
paxos.on('accept', broadcast.bind(null, 'accept'))
paxos.on('accepted', reply.bind(null, 'accepted'))
paxos.on('rejected', reply.bind(null, 'rejected'))
paxos.on('data', broadcast.bind(null, 'learn'))

app.post('/submit', function (req, res) {
	var x = Object.keys(req.body)[0]
	console.log('submit', x)
	paxos.submit(x)
	paxos.once('learned', function (fact) {
		res.send(fact)
	})
})

app.listen(port)
