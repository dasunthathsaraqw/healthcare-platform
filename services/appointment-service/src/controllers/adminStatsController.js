const Appointment = require("../models/Appointment");

exports.getAdminStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [appointmentsToday, upcomingAppointments, completedToday, monthBookings] = await Promise.all([
      Appointment.countDocuments({
        dateTime: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ["cancelled", "rejected"] },
      }),
      Appointment.countDocuments({
        dateTime: { $gte: now },
        status: { $in: ["confirmed", "pending", "cancellation_requested"] },
      }),
      Appointment.countDocuments({
        dateTime: { $gte: startOfDay, $lte: endOfDay },
        status: "completed",
      }),
      Appointment.countDocuments({
        createdAt: { $gte: startOfMonth },
        status: { $nin: ["cancelled", "rejected"] },
      }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        appointmentsToday,
        upcomingAppointments,
        completedToday,
        monthBookings,
      },
    });
  } catch (error) {
    console.error("getAdminStats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch appointment stats." });
  }
};
