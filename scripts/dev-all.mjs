import { spawn, spawnSync } from 'node:child_process'
import { access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

// 실행 위치와 무관하게 현재 프로젝트의 Vite와 API 사용
const root = fileURLToPath(new URL('../', import.meta.url))
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const apiDirectory = fileURLToPath(new URL('../backend/Tenvi.Backend/Tenvi.Api/', import.meta.url))
const windows = process.platform === 'win32'
const children = []
let stopping = false

// 직접 시작한 프로세스 트리만 종료하여 dotnet 하위 API 프로세스 잔류 방지
const stop = (exitCode) => {
  if (stopping) return
  stopping = true
  process.exitCode = exitCode
  for (const child of children) {
    if (!child.pid || child.exitCode !== null || child.signalCode !== null) continue
    if (windows) {
      const result = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
      if (result.error) child.kill()
    } else {
      try { process.kill(-child.pid, 'SIGTERM') } catch { /* 이미 종료된 프로세스 그룹 */ }
    }
  }
}

const start = (name, command, args, cwd) => {
  const child = spawn(command, args, { cwd, stdio: 'inherit', windowsHide: true, detached: !windows })
  children.push(child)
  child.on('error', (error) => {
    console.error(`[${name}] 실행 실패: ${error.message}`)
    stop(1)
  })
  child.on('exit', (code, signal) => {
    if (stopping) return
    console.error(`[${name}] 종료 (${signal || code}). 함께 실행한 서버도 종료합니다.`)
    stop(code || 1)
  })
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))

try {
  await access(vite)
  await access(`${apiDirectory}Tenvi.Api.csproj`)
  const dotnet = spawnSync('dotnet', ['--version'], { cwd: root, encoding: 'utf8', windowsHide: true })
  if (dotnet.error || dotnet.status !== 0) throw new Error('.NET SDK를 실행할 수 없습니다. .NET 9 SDK 설치와 PATH를 확인하세요.')

  if (process.argv.includes('--check')) {
    console.log(`실행 준비 확인: Vite, Tenvi.Api.csproj, .NET SDK ${dotnet.stdout.trim()}`)
  } else {
    console.log('Frontend: http://localhost:5173\nBackend:  http://localhost:5032\nCtrl+C로 두 서버를 종료합니다.')
    // CORS 허용 주소와 일치하도록 포트를 고정하고, 충돌 시 다른 포트로 우회하지 않음
    start('frontend', process.execPath, [vite, '--host', 'localhost', '--port', '5173', '--strictPort'], root)
    start('backend', 'dotnet', ['run', '--project', 'Tenvi.Api.csproj', '--launch-profile', 'http'], apiDirectory)
  }
} catch (error) {
  console.error(`통합 실행 준비 실패: ${error.message}`)
  stop(1)
}
