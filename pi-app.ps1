$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& node "$scriptDir\scripts\pi-app.mjs" @args
