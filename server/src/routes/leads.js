import { Router } from 'express'
import { Lead } from '../models/Lead.js'

const router = Router()

const channelMap = {
  indiamart: 'indiamart',
  website: 'website',
  whatsapp: 'whatsapp',
  justdial: 'justdial',
  email: 'email',
  referral: 'referral',
  other: 'other',
}

function normalizeChannel(channel) {
  if (!channel) return channel
  return channelMap[String(channel).trim().toLowerCase()] ?? String(channel).trim().toLowerCase()
}

function sanitizeLeadPayload(payload) {
  const data = { ...payload }
  if ('channel' in data) data.channel = normalizeChannel(data.channel)
  if ('assignedTo' in data) data.assignedTo = data.assignedTo ?? ''
  if ('meetingAt' in data) data.meetingAt = data.meetingAt ? new Date(data.meetingAt) : null
  if ('meetingLocation' in data) data.meetingLocation = data.meetingLocation ?? ''
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

// INGEST lead (used by Make automation)
router.post('/ingest/lead', async (req, res) => {
  try {
    const { name, email, phone, service, message } = req.body

    const lead = new Lead({
      name,
      email,
      phone,
      company: "Individual",
      channel: "website",
      assignedTo: "",
      meetingAt: null,
      meetingLocation: "",
      service,
      message,
      createdAt: new Date()
    })

    await lead.save()

    res.status(201).json({
      success: true,
      lead
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