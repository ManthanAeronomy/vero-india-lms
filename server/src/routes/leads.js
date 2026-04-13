import { Router } from 'express'
import { Lead, LEAD_CHANNELS, LEAD_PRIORITIES, LEAD_STAGES } from '../models/Lead.js'

const router = Router()

const channelMap = {
  indiamart: 'indiamart',
  website: 'website',
  whatsapp: 'whatsapp',
  justdial: 'justdial',
  email: 'email',
  referral: 'referral',
  '3m': '3m',
  other: 'other',
}

function normalizeChannel(channel) {
  if (channel === null || channel === undefined || channel === '') return 'other'
  const raw = String(channel).trim().toLowerCase()
  const mapped = channelMap[raw] ?? raw
  return LEAD_CHANNELS.includes(mapped) ? mapped : 'other'
}

function normalizeStage(stage) {
  if (stage === null || stage === undefined || stage === '') return undefined
  const s = String(stage).trim()
  return LEAD_STAGES.includes(s) ? s : 'New'
}

function normalizePriority(priority) {
  if (priority === null || priority === undefined || priority === '') return undefined
  const p = String(priority).trim()
  return LEAD_PRIORITIES.includes(p) ? p : 'Medium'
}

function omitNullishStrings(data, keys) {
  for (const k of keys) {
    if (k in data && (data[k] === null || data[k] === undefined)) delete data[k]
  }
}

function sanitizeLeadPayload(payload) {
  const raw = payload && typeof payload === 'object' ? payload : {}
  const data = { ...raw }

  const stringKeys = ['name', 'company', 'email', 'phone', 'assignedTo', 'meetingLocation', 'notes', 'location']
  omitNullishStrings(data, stringKeys)
  for (const k of stringKeys) {
    if (k in data && typeof data[k] !== 'string') data[k] = String(data[k])
  }

  if ('channel' in raw) {
    data.channel = normalizeChannel(data.channel)
  }

  if ('stage' in data) {
    const s = normalizeStage(data.stage)
    if (s === undefined) delete data.stage
    else data.stage = s
  }
  if ('priority' in data) {
    const p = normalizePriority(data.priority)
    if (p === undefined) delete data.priority
    else data.priority = p
  }

  if ('value' in data) {
    const v = Number(data.value)
    data.value = Number.isFinite(v) ? v : 0
  }

  if ('assignedTo' in data) data.assignedTo = data.assignedTo ?? ''
  if ('meetingAt' in data) data.meetingAt = data.meetingAt ? new Date(data.meetingAt) : null
  if ('meetingLocation' in data) data.meetingLocation = data.meetingLocation ?? ''
  if ('meetingSiteVisit' in data) {
    data.meetingSiteVisit = {
      address: String(data.meetingSiteVisit?.address ?? '').trim(),
      postalCode: String(data.meetingSiteVisit?.postalCode ?? '').trim(),
    }
  }
  delete data.comments
  return data
}

function isTeamMember(req) {
  return req.user?.role === 'team_member'
}

function canAccessLead(req, lead) {
  if (!isTeamMember(req)) return true
  return lead.assignedTo === req.user.name
}

// GET all leads
router.get('/', async (req, res) => {
  try {
    const query = isTeamMember(req) ? { assignedTo: req.user.name } : {}
    const leads = await Lead.find(query).sort({ createdAt: -1 })
    res.json(leads)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single lead
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
    if (!lead) return res.status(404).json({ error: 'Lead not found' })
    if (!canAccessLead(req, lead)) return res.status(403).json({ error: 'Access denied' })
    res.json(lead)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// CREATE lead
router.post('/', async (req, res) => {
  try {
    const lead = new Lead(sanitizeLeadPayload(req.body))
    await lead.save()
    res.status(201).json(lead)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/:id/comments', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
    if (!lead) return res.status(404).json({ error: 'Lead not found' })
    if (!canAccessLead(req, lead)) return res.status(403).json({ error: 'Access denied' })

    const message = String(req.body?.message ?? '').trim()
    if (!message) {
      return res.status(400).json({ error: 'Comment message is required' })
    }

    lead.comments.push({
      authorId: req.user.id,
      authorName: req.user.name,
      message,
    })

    await lead.save()
    res.status(201).json(lead)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// INGEST lead (used by Make automation) — same schema as POST /; all fields optional
router.post('/ingest/lead', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? { ...req.body } : {}
    const { service, message, product_interest, ...rest } = body
    const extraNotes = [
      service != null && String(service).trim() ? `Service: ${String(service).trim()}` : '',
      product_interest != null && String(product_interest).trim()
        ? `Product: ${String(product_interest).trim()}`
        : '',
      message != null && String(message).trim() ? String(message).trim() : '',
    ].filter(Boolean).join('\n\n')
    const notesMerged = [rest.notes, extraNotes].filter(Boolean).join('\n\n').trim()

    const lead = new Lead(
      sanitizeLeadPayload({
        ...rest,
        ...(notesMerged ? { notes: notesMerged } : {}),
        company: rest.company != null && String(rest.company).trim() ? rest.company : 'Individual',
        channel: rest.channel != null && String(rest.channel).trim() ? rest.channel : 'website',
      })
    )

    await lead.save()

    res.status(201).json({
      success: true,
      lead,
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

async function updateLead(req, res) {
  try {
    if (isTeamMember(req)) {
      const existingLead = await Lead.findById(req.params.id)
      if (!existingLead) return res.status(404).json({ error: 'Lead not found' })
      if (!canAccessLead(req, existingLead)) return res.status(403).json({ error: 'Access denied' })
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { $set: sanitizeLeadPayload(req.body) },
      { new: true, runValidators: true }
    )

    if (!lead) return res.status(404).json({ error: 'Lead not found' })

    res.json(lead)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

// UPDATE lead
router.put('/:id', updateLead)
router.patch('/:id', updateLead)

// DELETE lead
router.delete('/:id', async (req, res) => {
  try {
    if (isTeamMember(req)) {
      const existingLead = await Lead.findById(req.params.id)
      if (!existingLead) return res.status(404).json({ error: 'Lead not found' })
      if (!canAccessLead(req, existingLead)) return res.status(403).json({ error: 'Access denied' })
    }

    const lead = await Lead.findByIdAndDelete(req.params.id)

    if (!lead) return res.status(404).json({ error: 'Lead not found' })

    res.json({ message: 'Lead deleted', id: lead._id.toString() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router