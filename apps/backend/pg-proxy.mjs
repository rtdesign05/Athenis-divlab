// TCP proxy: 0.0.0.0:5433 → 127.0.0.1:5432 (run inside WSL)
import net from 'net'

const PG_HOST = '127.0.0.1'
const PG_PORT = 5432
const LISTEN_PORT = 5433

const server = net.createServer((clientSocket) => {
  const pgSocket = net.createConnection({ host: PG_HOST, port: PG_PORT })
  clientSocket.pipe(pgSocket)
  pgSocket.pipe(clientSocket)
  pgSocket.on('error', (e) => { clientSocket.destroy(); })
  clientSocket.on('error', (e) => { pgSocket.destroy(); })
})

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`[pg-proxy] 0.0.0.0:${LISTEN_PORT} → ${PG_HOST}:${PG_PORT}`)
})
