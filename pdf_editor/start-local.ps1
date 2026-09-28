$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$pythonCandidates = @(
    (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'),
    'python.exe',
    'py.exe'
)
$python = $null
foreach ($candidate in $pythonCandidates) {
    try {
        & $candidate -c 'import sys; print(sys.executable)' *> $null
        if ($LASTEXITCODE -eq 0) { $python = $candidate; break }
    } catch { }
}
if (-not $python) {
    throw 'Python 3 is required to run the local converter. Install Python, then run this script again.'
}

$packages = Join-Path $PSScriptRoot '.local-python'
$env:PYTHONPATH = $packages
& $python -c 'from pdf2docx import Converter' *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Installing the PDF to Word converter locally (first run only)...'
    & $python -m pip install --target $packages -r (Join-Path $PSScriptRoot 'requirements-local.txt')
    if ($LASTEXITCODE -ne 0) { throw 'The converter installation failed.' }
}

& $python (Join-Path $PSScriptRoot 'local_server.py')
