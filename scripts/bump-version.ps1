param (
    [Parameter(Mandatory=$true, Position=0)]
    [string]$NewVersion,

    [Parameter(Mandatory=$false, Position=1)]
    [string]$ReleaseNotes = "
)

$ErrorActionPreference = Stop

Write-Host Updating Antigravity version to $NewVersion... -ForegroundColor Cyan

# 1. Update package.json
$pkgPath = $PSScriptRoot\..\package.json
$pkg = Get-Content -Raw -Path $pkgPath | ConvertFrom-Json
$pkg.version = $NewVersion
$pkg | ConvertTo-Json -Depth 10 | Set-Content -Path $pkgPath -Encoding UTF8
Write-Host  [OK] Updated package.json -ForegroundColor Green

# 2. Update app.json
$appPath = $PSScriptRoot\..\app.json
$app = Get-Content -Raw -Path $appPath | ConvertFrom-Json
$app.expo.version = $NewVersion
$app | ConvertTo-Json -Depth 10 | Set-Content -Path $appPath -Encoding UTF8
Write-Host  [OK] Updated app.json -ForegroundColor Green

# 3. Git commit & tag if git is available
try {
 git add package.json app.json
 $commitMsg = if ($ReleaseNotes) { chore(release): bump version to v$NewVersion - $ReleaseNotes } else { chore(release): bump version to v$NewVersion }
 git commit -m $commitMsg
 git tag -a v$NewVersion -m Release Antigravity v$NewVersion: $ReleaseNotes
 Write-Host  [OK] Created Git commit and Tag: v$NewVersion -ForegroundColor Green
 Write-Host 
To push and trigger IPA build on GitHub Actions, run: -ForegroundColor Yellow
 Write-Host git push origin main --tags
 -ForegroundColor White
} catch {
 Write-Host Note: Git commit/tag skipped (Git not detected or no git repository initialized yet). -ForegroundColor Yellow
}
