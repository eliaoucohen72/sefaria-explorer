import express from 'express'
import cors from 'cors'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

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
    const result = await callTool('search', { query: q })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/text', async (req, res) => {
  try {
    const { ref } = req.query
    if (!ref) return res.status(400).json({ error: 'Missing ref' })
    const result = await callTool('get_text', { reference: ref })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/links', async (req, res) => {
  try {
    const { ref } = req.query
    if (!ref) return res.status(400).json({ error: 'Missing ref' })
    const result = await callTool('get_links', { reference: ref })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/parsha', async (req, res) => {
  try {
    const result = await callTool('get_parsha', {})
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/calendars', async (req, res) => {
  try {
    const result = await callTool('get_calendars', {})
    res.json(result)
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
