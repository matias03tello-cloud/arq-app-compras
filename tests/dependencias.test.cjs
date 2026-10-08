const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const net = require('node:net');
const { Buffer } = require('node:buffer');
const { once } = require('node:events');

test('xcode genera IDs válidos y únicos con la dependencia sustituida', () => {
  const project = require('xcode').project('prueba.pbxproj');
  project.hash = { project: { objects: { PBXProject: {}, PBXGroup: {} } } };
  const ids = Array.from({ length: 200 }, () => project.generateUuid());
  assert.equal(new Set(ids).size, 200);
  for (const id of ids) assert.match(id, /^[A-F0-9]{24}$/);
});

test('query-string mantiene URLs con tildes, espacios y parámetros repetidos', () => {
  const query = require('query-string');
  const parsed = query.parse('nombre=Arroz%20integral&marca=Col%C3%BAn&id=1&id=2');
  assert.equal(parsed.nombre, 'Arroz integral');
  assert.equal(parsed.marca, 'Colún');
  assert.deepEqual(parsed.id, ['1', '2']);
  assert.equal(query.parse(query.stringify({ nombre: 'Tomate fresco', kg: '1,5' })).kg, '1,5');
});

test('el parser FTP corregido acepta un listado normal y rechaza uno malformado', () => {
  const fromGetUri = createRequire(require.resolve('get-uri'));
  const ftp = fromGetUri('basic-ftp');
  assert.equal(typeof ftp.Client, 'function');
  const parsed = ftp.parseList('-rw-r--r-- 1 owner group 42 Jan 1 2020 arroz.txt\r\n');
  assert.equal(parsed[0].name, 'arroz.txt');
  assert.equal(parsed[0].size, 42);
  assert.throws(() => ftp.parseList('-rw-r--r-- 1 ' + 'a '.repeat(2048) + '!'));
});

test('get-uri descarga por FTP usando basic-ftp corregido en un servidor local', { timeout: 10000 }, async () => {
  const sockets = new Set();
  let dataSocket;
  const dataServer = net.createServer(socket => { dataSocket = socket; sockets.add(socket); });
  const control = net.createServer(socket => {
    sockets.add(socket);
    socket.setEncoding('utf8');
    socket.write('220 Prueba local\r\n');
    let pending = '';
    socket.on('data', chunk => {
      pending += chunk;
      let end;
      while ((end = pending.indexOf('\r\n')) >= 0) {
        const command = pending.slice(0, end).split(' ')[0].toUpperCase();
        pending = pending.slice(end + 2);
        if (command === 'USER') socket.write('331 Password\r\n');
        else if (command === 'PASS') socket.write('230 Logged in\r\n');
        else if (command === 'FEAT') socket.write('211-Features\r\n UTF8\r\n211 End\r\n');
        else if (command === 'MDTM') socket.write('213 20261006120000\r\n');
        else if (command === 'EPSV') socket.write(`229 Entering Extended Passive Mode (|||${dataServer.address().port}|)\r\n`);
        else if (command === 'RETR') {
          socket.write('150 Opening data\r\n');
          dataSocket.end('catalogo-local');
          socket.write('226 Transfer complete\r\n');
        } else if (command === 'QUIT') socket.end('221 Bye\r\n');
        else socket.write('200 OK\r\n');
      }
    });
  });
  try {
    dataServer.listen(0, '127.0.0.1'); await once(dataServer, 'listening');
    control.listen(0, '127.0.0.1'); await once(control, 'listening');
    const stream = await require('get-uri').getUri(`ftp://prueba:clave@127.0.0.1:${control.address().port}/catalogo.txt`);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString(), 'catalogo-local');
  } finally {
    for (const socket of sockets) socket.destroy();
    await Promise.all([control, dataServer].map(server => new Promise(resolve => server.close(resolve))));
  }
});
