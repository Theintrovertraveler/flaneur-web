// inject-analytics.js
// Inietta lo snippet di Vercel Web Analytics in tutti i file .html del progetto
// prima della chiusura di </head> (o </body> se manca </head>).
// Idempotente: se lo snippet e' gia' presente, il file non viene toccato.
//
// Uso: node inject-analytics.js
// Da lanciare come Build Command su Vercel, oppure a mano in locale.

const fs = require('fs')
const path = require('path')

const ROOT_DIR = __dirname
const MARKER = 'window.va = window.va'
const SNIPPET = [
  '<script>',
  '  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };',
  '</script>',
  '<script defer src="/_vercel/insights/script.js"></script>'
].join('\n')

const EXCLUDED_DIRS = new Set(['node_modules', '.git', '.vercel', '.next', 'dist', 'build'])

function findHtmlFiles(dir, results) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue
      findHtmlFiles(path.join(dir, entry.name), results)
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      results.push(path.join(dir, entry.name))
    }
  }
  return results
}

function injectIntoFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8')

  if (original.includes(MARKER)) {
    return 'skipped'
  }

  let updated
  if (/<\/head>/i.test(original)) {
    updated = original.replace(/<\/head>/i, `${SNIPPET}\n</head>`)
  } else if (/<\/body>/i.test(original)) {
    updated = original.replace(/<\/body>/i, `${SNIPPET}\n</body>`)
  } else {
    return 'no-head-or-body'
  }

  fs.writeFileSync(filePath, updated, 'utf8')
  return 'injected'
}

function main() {
  const files = findHtmlFiles(ROOT_DIR, [])

  let injected = 0
  let skipped = 0
  let warnings = 0

  for (const file of files) {
    const result = injectIntoFile(file)
    const relPath = path.relative(ROOT_DIR, file)

    if (result === 'injected') {
      injected += 1
      console.log(`[injected] ${relPath}`)
    } else if (result === 'skipped') {
      skipped += 1
    } else if (result === 'no-head-or-body') {
      warnings += 1
      console.warn(`[warning] Nessun </head> o </body> trovato in ${relPath}, file ignorato`)
    }
  }

  console.log('')
  console.log(`Totale file HTML trovati: ${files.length}`)
  console.log(`Iniettati: ${injected}`)
  console.log(`Gia' presenti (saltati): ${skipped}`)
  console.log(`Warning (nessun head/body): ${warnings}`)
}

main()
