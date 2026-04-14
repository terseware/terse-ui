# Default (runs from workspace root)

npx nx cli forge --no-tui -- forge list
npx nx cli forge --no-tui -- forge add button --inputs hardDisabled:disabled --dry-run

# Target examples app as cwd

npx nx cli forge --no-tui -c examples -- forge init --prefix app --output-dir src/generated --style none
npx nx cli forge --no-tui -c examples -- forge add button --preset terse --prefix terse --dry-run

# Remove --dry-run to actually write files

npx nx cli forge --no-tui -c examples -- forge add button --inputs hardDisabled:disabled

The -c examples configuration sets cwd to apps/examples/. You can add more configurations for other apps (e.g., "web": { "cwd": "apps/web" }). The cli target auto-builds forge first via dependsOn: ["build"].
