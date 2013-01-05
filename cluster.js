var spawn = require('child_process').spawn
var argv = require('optimist').argv

var n = argv.n || 3
var processes = []
var endpoints = []

for (var i = 0; i < n; i++) {
	endpoints.push('localhost:' + (11111 + i))
}

for (var i = 0; i < n; i++) {
	var args = ['./basic-server.js']
	args.push('--id=localhost:' + (11111 + i))
	args.push('--listen=' + (11111 + i))
	var proc = spawn('node', args.concat(endpoints), { cwd: __dirname })
	proc.stdout.pipe(process.stdout)
	processes.push(proc)
}
