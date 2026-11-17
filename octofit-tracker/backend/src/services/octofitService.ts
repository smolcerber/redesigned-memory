import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(_input: unknown) {
  if (typeof _input !== 'object' || _input === null || Array.isArray(_input)) {
    throw Object.assign(new Error('Activity input must be an object'), { status: 400 });
  }
  const input = _input as Record<string, unknown>;
  const { userId, teamId, type, minutes } = input;
  if (
    typeof userId !== 'string' ||
    !Types.ObjectId.isValid(userId) ||
    typeof teamId !== 'string' ||
    !Types.ObjectId.isValid(teamId) ||
    typeof type !== 'string' ||
    type.trim().length === 0 ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 404 });
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(_input: unknown) {
  if (typeof _input !== 'object' || _input === null || Array.isArray(_input)) {
    throw Object.assign(new Error('Team input must be an object'), { status: 400 });
  }
  const input = _input as Record<string, unknown>;
  const { name, mascot } = input;
  const members = input.members ?? [];
  if (
    typeof name !== 'string' ||
    name.trim().length === 0 ||
    typeof mascot !== 'string' ||
    mascot.trim().length === 0 ||
    !Array.isArray(members) ||
    !members.every((member): member is string => typeof member === 'string' && Types.ObjectId.isValid(member))
  ) {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  const uniqueMemberIds = new Set(members);
  const existingMembers = await User.find({ _id: { $in: [...uniqueMemberIds] } }).select('_id').lean();
  if (existingMembers.length !== uniqueMemberIds.size) {
    throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
  }

  return Team.create({ name, mascot, members: [...uniqueMemberIds] });
}

export async function getLeaderboard() {
  const teams = await Activity.aggregate<{ teamName: string; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    {
      $lookup: {
        from: Team.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'team',
      },
    },
    { $unwind: '$team' },
    { $project: { _id: 0, teamName: '$team.name', totalPoints: 1 } },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);
  return teams.map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }

  const activity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const activityType = activity?.type.toLowerCase();
  const focus =
    activityType === 'strength'
      ? 'strength'
      : activityType === 'run' || activityType === 'cycle'
        ? 'endurance'
        : user.fitnessGoal;
  const workouts = await Workout.find({ focus }).sort({ title: 1 }).lean();
  const reason = activity
    ? `Based on your recent ${activity.type} activity and ${focus} focus.`
    : `Based on your ${focus} fitness goal.`;

  return workouts.map((workout) => ({ ...workout, reason }));
}

export { User };
