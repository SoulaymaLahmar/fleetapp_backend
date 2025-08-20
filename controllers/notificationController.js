const Notification = require ('../models/Notification');

exports.getallnotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({user: req.user.userId}).sort({ createdAt: -1 });
    const plainNotifications = notifications.map(n => ({
      id: n._id.toString(),             
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }));

    res.json(plainNotifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
exports.markallread = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.userId }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
}

exports.addNotification = async (req, res) => {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


