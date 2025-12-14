import mongoose from 'mongoose';

const friendshipSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'blocked'],
    default: 'pending',
    index: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index to ensure no duplicate friendships
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Method to check if users are friends
friendshipSchema.statics.areFriends = async function(userId1, userId2) {
  const friendship = await this.findOne({
    $or: [
      { requester: userId1, recipient: userId2, status: 'accepted' },
      { requester: userId2, recipient: userId1, status: 'accepted' }
    ]
  });
  return !!friendship;
};

// Method to get all friends for a user
friendshipSchema.statics.getFriendsList = async function(userId) {
  const friendships = await this.find({
    $or: [
      { requester: userId, status: 'accepted' },
      { recipient: userId, status: 'accepted' }
    ]
  }).populate('requester recipient', 'name email');

  return friendships.map(f => {
    const friend = f.requester._id.toString() === userId.toString() ? f.recipient : f.requester;
    return {
      friendshipId: f._id,
      friendId: friend._id,
      name: friend.name,
      email: friend.email,
      since: f.respondedAt || f.createdAt
    };
  });
};

const Friendship = mongoose.model('Friendship', friendshipSchema);

export default Friendship;
