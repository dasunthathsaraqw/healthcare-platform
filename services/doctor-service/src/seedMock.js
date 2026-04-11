const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/../.env" });
const Doctor = require("./models/Doctor");
const PatientMock = require("./models/PatientMock");
const AppointmentMock = require("./models/AppointmentMock");
const Prescription = require("./models/Prescription");

async function seed() {
  console.log("Connecting to database...", process.env.DB_URL);
  await mongoose.connect(process.env.DB_URL);
  
  const doctorId = process.argv[2];
  if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
    console.error("Please provide a valid Doctor ID as the first argument.");
    console.error("Usage: node src/seedMock.js <doctorId>");
    process.exit(1);
  }

  console.log(`Clearing existing mock data for doctor ${doctorId}...`);
  await PatientMock.deleteMany({});
  await AppointmentMock.deleteMany({ doctorId });
  await Prescription.deleteMany({ doctorId });

  // 1. Create Patients
  console.log("Creating mock patients...");
  const pt1 = await PatientMock.create({
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "1234567890",
    dob: new Date("1985-05-15"),
    gender: "Male",
    bloodGroup: "O+",
    address: "123 Main St, Springfield",
    medicalHistory: ["Hypertension", "Diabetes Type 2"],
    allergies: ["Penicillin", "Peanuts"],
    emergencyContact: "Jane Doe (555-1234)",
  });

  const pt2 = await PatientMock.create({
    name: "Emily Smith",
    email: "emily.smith@example.com",
    phone: "0987654321",
    dob: new Date("1992-11-20"),
    gender: "Female",
    bloodGroup: "A-",
    address: "456 Elk Ave, Metropolis",
    medicalHistory: ["Anemia"],
    allergies: ["Dust Mites"],
    emergencyContact: "Robert Smith (555-9876)",
  });

  console.log(`Created Patients: ${pt1.name} (${pt1._id}), ${pt2.name} (${pt2._id})`);

  // 2. Create Appointments
  console.log("Creating mock appointments...");
  const today = new Date();
  
  // Future Pending Appointment
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  await AppointmentMock.create({
    doctorId,
    patientId: pt1._id,
    dateTime: nextWeek,
    status: "pending",
    type: "video",
    reason: "Routine checkup and blood pressure review",
  });

  // Today Confirmed Appointment (will show in Today's tab / start consultation window)
  await AppointmentMock.create({
    doctorId,
    patientId: pt2._id,
    dateTime: today, 
    status: "confirmed",
    type: "in-person",
    reason: "Feeling dizzy and fatigued lately",
  });

  // Past Completed Appointment
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(today.getDate() - 14);
  await AppointmentMock.create({
    doctorId,
    patientId: pt1._id,
    dateTime: twoWeeksAgo,
    status: "completed",
    type: "in-person",
    reason: "Diabetes follow-up",
    notes: "Patient doing well, blood sugar levels stable.",
  });

  // Past Rejected Appointment
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(today.getDate() - 3);
  await AppointmentMock.create({
    doctorId,
    patientId: pt2._id,
    dateTime: threeDaysAgo,
    status: "rejected",
    type: "video",
    reason: "Wanted to discuss lab results",
    rejectionReason: "Doc is out of office, please reschedule",
  });

  // 3. Create a Prescription (so Patient detail history populates)
  console.log("Creating mock prescriptions...");
  await Prescription.create({
    doctorId,
    patientId: pt1._id,
    diagnosis: "Hypertension (Routine Checkup)",
    medications: [
      { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", duration: "30 days" }
    ],
    notes: "Monitor blood pressure weekly",
    followUpDate: nextWeek,
  });

  console.log("✅ Seeding complete! You can start your application.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error seeding mock data:", err);
  process.exit(1);
});
