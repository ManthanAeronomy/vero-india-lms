import { Router } from 'express';
import { User } from '../models/User.js';

const router = Router();

function toTeamMember(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    region: 'Team Member',
    email: user.email,
  };
}

router.get('/', async (_req, res) => {
  try {
    const teamMembers = await User.find({ role: 'team_member' }).sort({ name: 1 });
    res.json(teamMembers.map(toTeamMember));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const teamMember = await User.findOne({ _id: req.params.id, role: 'team_member' });
    if (!teamMember) return res.status(404).json({ error: 'Team member not found' });
    res.json(toTeamMember(teamMember));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  res.status(405).json({ error: 'Create team members by signing up with the Team member role' });
});

router.put('/:id', async (req, res) => {
  res.status(405).json({ error: 'Update team members from account settings' });
});

router.patch('/:id', async (req, res) => {
  res.status(405).json({ error: 'Update team members from account settings' });
});

router.delete('/:id', async (req, res) => {
  res.status(405).json({ error: 'Delete team members from the user account system' });
});

export default router;
