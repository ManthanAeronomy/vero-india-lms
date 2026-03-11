import { Router } from 'express'
import { Lead } from '../models/Lead.js'

const router = Router()
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

function isTeamMember(req) {
  return req.user?.role === 'team_member'
}

function buildSummary(leads) {
  const totalLeads = leads.length
  const converted = leads.filter((l) => l.stage === 'Won').length
  const lost = leads.filter((l) => l.stage === 'Lost').length
  const inPipeline = totalLeads - converted - lost
  const revenue = leads.filter((l) => l.stage === 'Won').reduce((s, l) => s + (l.value ?? 0), 0)
  const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0
  const closedRate = converted + lost > 0 ? Math.round((converted / (converted + lost)) * 100) : 0

  const byChannel = {}
  for (const l of leads) {
    const ch = l.channel ?? 'other'
    if (!byChannel[ch]) byChannel[ch] = { leads: 0, converted: 0, revenue: 0 }
    byChannel[ch].leads += 1
    if (l.stage === 'Won') {
      byChannel[ch].converted += 1
      byChannel[ch].revenue += l.value ?? 0
    }
  }

  const byStage = {}
  for (const l of leads) {
    const st = l.stage ?? 'New'
    byStage[st] = (byStage[st] ?? 0) + 1
  }

  const byExecutive = {}
  for (const l of leads) {
    const ex = l.assignedTo || 'Unassigned'
    if (!byExecutive[ex]) byExecutive[ex] = { leads: 0, converted: 0, revenue: 0 }
    byExecutive[ex].leads += 1
    if (l.stage === 'Won') {
      byExecutive[ex].converted += 1
      byExecutive[ex].revenue += l.value ?? 0
    }
  }

  return {
    totalLeads,
    converted,
    lost,
    inPipeline,
    revenue,
    conversionRate,
    closedRate,
    byChannel,
    byStage,
    byExecutive,
  }
}

// Serialize leads for AI context (all fields, readable format)
function serializeLeadsForAI(leads) {
  return leads.map((l) => {
    const lead = { ...l }
    if (lead._id) lead.id = lead._id.toString()
    delete lead._id
    delete lead.__v
    if (lead.meetingAt && lead.meetingAt instanceof Date) lead.meetingAt = lead.meetingAt.toISOString()
    if (lead.createdAt && lead.createdAt instanceof Date) lead.createdAt = lead.createdAt.toISOString()
    if (lead.updatedAt) delete lead.updatedAt
    return lead
  })
}

const DEFAULT_MODEL = 'openai/gpt-3.5-turbo'

const ALLOWED_MODELS = [
  'openai/gpt-3.5-turbo',
  'openai/gpt-4',
  'openai/gpt-4o',
  'openai/gpt-5',
  'openai/gpt-5-nano',
  'openai/gpt-5-mini',
  'openai/gpt-5.2',
  'openai/gpt-5.4',
  'anthropic/claude-haiku-4.5',
]

async function openRouterChat(apiKey, messages, model) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.error?.message ?? data?.message ?? `OpenRouter error: ${res.status}`)
    err.status = res.status
    throw err
  }

  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Empty response from AI')
  return text
}

async function generateWithOpenRouter(apiKey, messages, modelOrModels, maxRetries = 2) {
  const models = Array.isArray(modelOrModels) ? modelOrModels : [modelOrModels]
  for (const model of models) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await openRouterChat(apiKey, messages, model)
      } catch (err) {
        const is429 = err?.status === 429 || String(err?.message ?? '').includes('quota') || String(err?.message ?? '').includes('rate limit')
        if (is429 && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
          continue
        }
        if (model !== models[models.length - 1]) break
        throw err
      }
    }
  }
  throw new Error('AI unavailable. Please try again later.')
}

// POST /api/ai/chat - Chat with AI about leads and conversions
router.post('/chat', async (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.API_KEY
    if (!apiKey) {
      return res.status(503).json({ error: 'AI chat unavailable: OPENROUTER_API_KEY or API_KEY not configured' })
    }

    const { messages = [], model } = req.body
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' })
    }

    const query = isTeamMember(req) ? { assignedTo: req.user.name } : {}
    const leads = await Lead.find(query).lean()
    const summary = buildSummary(leads)

    const leadsData = serializeLeadsForAI(leads)
    const systemContent = `You are a helpful sales analytics assistant for a B2B CRM called LeadFlow. You have access to the following leads and conversions data. Use it to answer the user's questions. Be concise, actionable, and professional. Use bullet points when listing items. Format numbers in Indian Rupees (₹) when relevant.

Summary:
- Total leads: ${summary.totalLeads}
- Converted (Won): ${summary.converted}
- Lost: ${summary.lost}
- In pipeline: ${summary.inPipeline}
- Total revenue: ₹${summary.revenue}
- Conversion rate: ${summary.conversionRate}%
- Win rate (closed): ${summary.closedRate}%

By channel: ${JSON.stringify(summary.byChannel)}
By stage: ${JSON.stringify(summary.byStage)}
By executive: ${JSON.stringify(summary.byExecutive)}

All leads (full data):
${JSON.stringify(leadsData, null, 2)}`

    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role !== 'user') {
      return res.status(400).json({ error: 'Last message must be from user' })
    }

    const openRouterMessages = [
      { role: 'system', content: systemContent },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const requestedModel = model && String(model).trim()
    const modelsToTry = requestedModel && ALLOWED_MODELS.includes(requestedModel)
      ? [requestedModel]
      : [DEFAULT_MODEL]
    const text = await generateWithOpenRouter(apiKey, openRouterMessages, modelsToTry)
    res.json({ message: text })
  } catch (err) {
    console.error('AI chat error:', err)
    const msg = err?.message || 'Failed to get AI response'
    const isQuota = msg.includes('quota') || msg.includes('429') || msg.includes('rate limit')
    res.status(isQuota ? 429 : 500).json({ error: msg })
  }
})

// POST /api/ai/insights - Generate AI insights from leads and conversions
router.post('/insights', async (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.API_KEY
    if (!apiKey) {
      return res.status(503).json({ error: 'AI insights unavailable: OPENROUTER_API_KEY or API_KEY not configured' })
    }

    const query = isTeamMember(req) ? { assignedTo: req.user.name } : {}
    const leads = await Lead.find(query).lean()
    const summary = buildSummary(leads)

    const leadsData = serializeLeadsForAI(leads)
    const prompt = `You are a sales analytics expert for a B2B CRM. Based on the following leads and conversions data (including full lead records), provide actionable insights in a structured format.

Summary:
- Total leads: ${summary.totalLeads}
- Converted (Won): ${summary.converted}
- Lost: ${summary.lost}
- In pipeline (active): ${summary.inPipeline}
- Total revenue (₹): ${summary.revenue}
- Overall conversion rate: ${summary.conversionRate}%
- Win rate (closed deals): ${summary.closedRate}%

By channel:
${JSON.stringify(summary.byChannel, null, 2)}

By stage:
${JSON.stringify(summary.byStage, null, 2)}

By executive:
${JSON.stringify(summary.byExecutive, null, 2)}

All leads (full data - name, company, email, phone, channel, stage, priority, value, assignedTo, meetingAt, meetingLocation, notes, location, comments, etc.):
${JSON.stringify(leadsData, null, 2)}

Respond with a JSON object containing exactly these keys (use arrays of strings for each):
- "highlights": 3-5 key takeaways (short bullet points)
- "recommendations": 3-5 actionable recommendations to improve conversions
- "risks": 2-4 potential risks or areas of concern
- "summary": a 2-3 sentence executive summary

Return ONLY valid JSON, no markdown or extra text.`

    const { model } = req.body || {}
    const chatMessages = [{ role: 'user', content: prompt }]
    const requestedModel = model && String(model).trim()
    const modelsToTry = requestedModel && ALLOWED_MODELS.includes(requestedModel)
      ? [requestedModel]
      : [DEFAULT_MODEL]
    const text = await generateWithOpenRouter(apiKey, chatMessages, modelsToTry)

    let insights
    try {
      const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '').trim()
      insights = JSON.parse(cleaned)
    } catch {
      insights = {
        highlights: ['Analysis complete. Raw response:', text.slice(0, 500)],
        recommendations: ['Review the raw data in Reports for more detail.'],
        risks: [],
        summary: text.slice(0, 300) || 'Unable to parse AI response.',
      }
    }

    res.json({
      insights,
      summary: {
        totalLeads: summary.totalLeads,
        converted: summary.converted,
        revenue: summary.revenue,
        conversionRate: summary.conversionRate,
      },
    })
  } catch (err) {
    console.error('AI insights error:', err)
    res.status(500).json({
      error: err.message || 'Failed to generate AI insights',
    })
  }
})

export default router
