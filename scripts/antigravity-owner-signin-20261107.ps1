# This window is for the owner to sign in. It does not submit an AI prompt.
$ErrorActionPreference = 'Stop'
# Keep saved API keys and API-billing overrides out of this child session.
Get-ChildItem Env: | Where-Object { $_.Name -match 'API_KEY|AUTH_TOKEN|ACCESS_TOKEN|GITHUB.*TOKEN|OPENROUTER|GOOGLE_APPLICATION_CREDENTIALS|AGY_ADC_AUTH|GOOGLE_CLOUD_PROJECT|ANTHROPIC_AUTH_TOKEN' } | ForEach-Object { Remove-Item -LiteralPath ('Env:' + $_.Name) }
$agySignInFolder = Join-Path $env:TEMP 'devsquad-antigravity-signin-20261107'
New-Item -ItemType Directory -Path $agySignInFolder -Force | Out-Null
Set-Location -LiteralPath $agySignInFolder
Write-Host 'Sign in using your PERSONAL Google account. Do not choose API-key or Google Cloud billing.'
Write-Host 'Do not enter an AI prompt. Stop if any card, payment or purchase is required.'
Write-Host 'After sign-in, you may use /usage to view quota. Do not send any ordinary message.'
& (Join-Path $env:LOCALAPPDATA 'agy\bin\agy.exe') --sandbox
