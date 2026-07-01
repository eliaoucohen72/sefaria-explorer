import express from 'express'
import cors from 'cors'
import https from 'https'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

function collectJson(res) {
  return new Promise((resolve, reject) => {
    const chunks = []
    res.on('data', chunk => chunks.push(chunk))
    res.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch (e) { reject(e) }
    })
  })
}

function sefariaFetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { agent: httpsAgent }, (res) => {
      collectJson(res).then(resolve).catch(reject)
    }).on('error', reject)
  })
}

function sefariaPost(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const req = https.request({
      hostname: 'www.sefaria.org',
      path,
      method: 'POST',
      agent: httpsAgent,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => {
      collectJson(res).then(resolve).catch(reject)
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

const app = express()
app.use(cors())
app.use(express.json())

let mcpClient = null

async function getMcpClient() {
  if (mcpClient) return mcpClient

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', 'sefaria-mcp-server'],
  })

  mcpClient = new Client({ name: 'sefaria-app', version: '1.0.0' })
  await mcpClient.connect(transport)
  return mcpClient
}

async function callTool(name, args) {
  const client = await getMcpClient()
  const result = await client.callTool({ name, arguments: args })
  return result
}

app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query
    if (!q) return res.status(400).json({ error: 'Missing query' })
    const data = await sefariaPost('/api/search-wrapper', { query: q, type: 'text', limit: 50, field: 'exact' })
    const hits = data?.hits?.hits || []

    const CATEGORIES = [
      ['Talmud', /\b(talmud|gemara|daf|tractate|masechet|masekhot|bavli|yerushalmi)\b/i],
      ['Mishnah', /\b(mishnah|mishna|mishneh|tosefta)\b/i],
      ['Torah', /\b(genesis|exodus|leviticus|numbers|deuteronomy|torah|chumash|pentateuch|bereishit|shemot|vayikra|bamidbar|devarim)\b/i],
      ['Tanakh', /\b(tanakh|prophets|writings|psalms|proverbs|isaiah|jeremiah|ezekiel|samuel|kings|chronicles|ruth|esther|job|song of songs|ecclesiastes|lamentations)\b/i],
      ['Halakhah', /\b(halakhah|halacha|shulchan|arukh|rambam|mishneh torah|responsa|teshuvot|kitzur)\b/i],
      ['Midrash', /\b(midrash|aggadah|rabbah|tanchuma|yalkut)\b/i],
      ['Kabbalah', /\b(zohar|kabbalah|kabbalistic|sefirот|tanya|chasidut|hasidut|chassidut)\b/i],
      ['Commentary', /\b(commentary|rashi|ramban|ibn ezra|sforno|nachmanides|maimonides|tosafot|maharsha|maharal)\b/i],
    ]

    function guessCategory(book) {
      for (const [cat, re] of CATEGORIES) {
        if (re.test(book)) return cat
      }
      return 'Other'
    }

    const results = hits.map(h => {
      const fullId = h._id
      const withoutMeta = fullId.replace(/\s*\([^)]*\)\s*$/, '').trim()
      const ref = withoutMeta
      // Extract book title: everything before the first section number (digits after a space)
      // e.g. "Sha'ar HaGilgulim 2:2" → "Sha'ar HaGilgulim"
      // e.g. "Genesis 1:1" → "Genesis"
      // Fallback: split on comma if present
      let bookTitle
      const commaIdx = withoutMeta.indexOf(', ')
      if (commaIdx !== -1) {
        bookTitle = withoutMeta.slice(0, commaIdx).trim()
      } else {
        const sectionMatch = withoutMeta.match(/^(.*?)\s+(\d[\d.:abAB]*)$/)
        bookTitle = sectionMatch ? sectionMatch[1].trim() : withoutMeta
      }
      const langMatch = fullId.match(/\[(en|he)\]/)
      const lang = langMatch ? (langMatch[1] === 'he' ? 'Hebrew' : 'English') : 'Other'
      const category = guessCategory(bookTitle)
      return {
        ref,
        book: bookTitle,
        lang,
        category,
        score: h._score,
        snippet: h.highlight?.exact?.[0] || '',
      }
    })
    res.json({ content: [{ type: 'text', text: JSON.stringify(results) }] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Cache Hebrew titles to avoid redundant API calls
const heTitleCache = new Map()

app.post('/api/he-titles', async (req, res) => {
  try {
    const { books } = req.body
    if (!Array.isArray(books)) return res.status(400).json({ error: 'Missing books array' })
    const uncached = books.filter(b => !heTitleCache.has(b))
    await Promise.all(uncached.map(async (book) => {
      try {
        const slug = book.replace(/ /g, '_')
        const data = await sefariaFetch(`https://www.sefaria.org/api/index/${encodeURIComponent(slug)}`)
        heTitleCache.set(book, data.heTitle || null)
      } catch {
        heTitleCache.set(book, null)
      }
    }))
    const result = {}
    books.forEach(b => { result[b] = heTitleCache.get(b) || null })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/text', async (req, res) => {
  try {
    const { ref } = req.query
    if (!ref) return res.status(400).json({ error: 'Missing ref' })
    const data = await sefariaFetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}`)
    res.json({ content: [{ type: 'text', text: JSON.stringify(data) }] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/links', async (req, res) => {
  try {
    const { ref } = req.query
    if (!ref) return res.status(400).json({ error: 'Missing ref' })
    const data = await sefariaFetch(`https://www.sefaria.org/api/links/${encodeURIComponent(ref)}`)
    res.json({ content: [{ type: 'text', text: JSON.stringify(data) }] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/parsha', async (req, res) => {
  try {
    const diaspora = req.query.diaspora ?? '0'
    const data = await sefariaFetch(`https://www.sefaria.org/api/calendars?diaspora=${diaspora}`)
    const parsha = data.calendar_items?.find(item => item.title?.en === 'Parashat Hashavua')
    if (!parsha) return res.status(404).json({ error: 'Parsha not found' })
    res.json({ content: [{ type: 'text', text: JSON.stringify(parsha) }] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/calendars', async (req, res) => {
  try {
    const diaspora = req.query.diaspora ?? '0'
    const data = await sefariaFetch(`https://www.sefaria.org/api/calendars?diaspora=${diaspora}`)
    res.json({ content: [{ type: 'text', text: JSON.stringify(data.calendar_items) }] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/book', async (req, res) => {
  try {
    const { title } = req.query
    if (!title) return res.status(400).json({ error: 'Missing title' })
    const result = await callTool('get_book_info', { title })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/related', async (req, res) => {
  try {
    const { ref } = req.query
    if (!ref) return res.status(400).json({ error: 'Missing ref' })
    const result = await callTool('get_related', { reference: ref })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = 3001
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
