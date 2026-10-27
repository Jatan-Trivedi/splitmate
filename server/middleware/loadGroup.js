const mongoose = require('mongoose');
const Group = require('../models/Group');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { isMember } = require('../utils/helpers');

// Loads :groupId into req.group and makes sure the logged-in user belongs to it.
// This is the authorization check for everything under /api/groups/:groupId.
module.exports = asyncHandler(async (req, res, next) => {
  const { groupId } = req.params;
  if (!mongoose.isValidObjectId(groupId)) throw new HttpError(404, 'Group not found');

  const group = await Group.findById(groupId).populate('members', 'name email');
  if (!group) throw new HttpError(404, 'Group not found');
  if (!isMember(group, req.user._id)) {
    throw new HttpError(403, 'You are not a member of this group');
  }

  req.group = group;
  next();
});
