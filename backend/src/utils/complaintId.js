const Complaint = require('../models/Complaint');
const DeletedComplaint = require('../models/DeletedComplaint');

const departmentCodes = { Water: 'WTR', Waste: 'WST', Electricity: 'ELE', Road: 'ROD' };

async function generateComplaintId(department) {
  const code = departmentCodes[department] || 'OTH';
  const year = new Date().getFullYear();
  const prefix = `${code}-${year}-`;
  const pattern = new RegExp(`^${prefix}`);
  const [complaints, deletedComplaints] = await Promise.all([
    Complaint.find({ complaint_id: { $regex: pattern } }).select('complaint_id').lean().exec(),
    DeletedComplaint.find({ complaint_id: { $regex: pattern } }).select('complaint_id').lean().exec()
  ]);
  const usedNumbers = [...complaints, ...deletedComplaints]
    .map(({ complaint_id }) => Number(String(complaint_id).slice(prefix.length)))
    .filter(Number.isInteger);
  let sequence = usedNumbers.length ? Math.max(...usedNumbers) + 1 : 1;
  let complaintId = `${prefix}${String(sequence).padStart(6, '0')}`;
  while (await Complaint.exists({ complaint_id: complaintId }) || await DeletedComplaint.exists({ complaint_id: complaintId })) {
    sequence += 1;
    complaintId = `${prefix}${String(sequence).padStart(6, '0')}`;
  }
  return complaintId;
}

module.exports = { generateComplaintId };
