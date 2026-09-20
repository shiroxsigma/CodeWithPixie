[CmdletBinding()]
param(
    [string]$Server = "D:\Workspace\llama-cpp\llama.cpp-gpu\bonsai2-amd-hip\llama-server.exe",
    [string]$Model = "D:\Workspace\llama-cpp\llama-gpu-setup\models\Ternary-Bonsai-2-27B-PQ2_0.gguf",
    [int]$Port = 8098,
    [int]$ContextSize = 32768,
    [ValidateRange(0, 32768)]
    [int]$ReasoningBudget = 512,
    [switch]$Restart
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $Server -PathType Leaf)) { throw "llama-server was not found: $Server" }
if (-not (Test-Path -LiteralPath $Model -PathType Leaf)) { throw "Bonsai 2 model was not found: $Model" }

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    if (-not $Restart) {
        Write-Host "Port $Port is already listening (PID $($listener.OwningProcess)). Use -Restart to replace it."
        Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 5 | ConvertTo-Json -Compress
        exit 0
    }
    Stop-Process -Id $listener.OwningProcess -Force
}

$logDir = Join-Path $PSScriptRoot "..\logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$stdout = Join-Path $logDir "bonsai2.out.log"
$stderr = Join-Path $logDir "bonsai2.err.log"

# Offloading the output layer (-ngl 999) corrupts this build's responses.
# Offload the model's 64 transformer blocks and keep the output layer on CPU.
$arguments = @(
    "-m", $Model, "--host", "127.0.0.1", "--port", $Port,
    "-c", $ContextSize, "-ngl", "64", "--parallel", "1", "-fa", "on",
    "--jinja", "--alias", "bonsai2-27b",
    "--temp", "1.0", "--top-p", "0.95", "--top-k", "20", "--min-p", "0",
    "--repeat-penalty", "1.0", "--presence-penalty", "0",
    "--reasoning-format", "deepseek", "--reasoning-budget", $ReasoningBudget
)
$process = Start-Process -FilePath $Server -ArgumentList $arguments -WindowStyle Hidden `
    -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru

$deadline = (Get-Date).AddSeconds(90)
do {
    if ($process.HasExited) { throw "llama-server exited with code $($process.ExitCode). See $stderr" }
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 3
        if ($health.status -eq "ok") {
            Write-Host "Bonsai 2 is ready at http://127.0.0.1:$Port (PID $($process.Id))."
            Write-Host "Logs: $stdout and $stderr"
            exit 0
        }
    } catch { Start-Sleep -Milliseconds 500 }
} while ((Get-Date) -lt $deadline)

Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
throw "Bonsai 2 did not become healthy within 90 seconds. See $stderr"
