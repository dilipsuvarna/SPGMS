function templateRegistered(complaintId) {
  const subject = `Complaint Registered: ${complaintId}`;
  const text = `Your complaint has been registered with ID ${complaintId}. We will notify you with updates.`;
  const html = `<p>${text}</p>`;
  return { subject, text, html };
}

function templateAssigned(complaintId, officerName) {
  const subject = `Complaint Assigned: ${complaintId}`;
  const text = `Your complaint ${complaintId} has been assigned to ${officerName}. They will contact you or update the status.`;
  const html = `<p>${text}</p>`;
  return { subject, text, html };
}

function templateWorkStarted(complaintId) {
  const subject = `Work Started: ${complaintId}`;
  const text = `Work has started for your complaint ${complaintId}.`;
  const html = `<p>${text}</p>`;
  return { subject, text, html };
}

function templateWorkInProgress(complaintId) {
  const subject = `Work In Progress: ${complaintId}`;
  const text = `Work is in progress for your complaint ${complaintId}.`;
  const html = `<p>${text}</p>`;
  return { subject, text, html };
}

function templateEstimatedCompletion(complaintId, date) {
  const subject = `Estimated Completion: ${complaintId}`;
  const text = `Estimated completion for your complaint ${complaintId} is ${date}.`;
  const html = `<p>${text}</p>`;
  return { subject, text, html };
}

function templateResolved(complaintId) {
  const subject = `Complaint Resolved: ${complaintId}`;
  const text = `The reported issue ${complaintId} has been marked as resolved. We will verify and close it if everything is satisfactory.`;
  const html = `<p>${text}</p>`;
  return { subject, text, html };
}

function templateClosed(complaintId) {
  const subject = `Complaint Closed: ${complaintId}`;
  const text = `Your complaint ${complaintId} has been closed. Thank you for reporting.`;
  const html = `<p>${text}</p>`;
  return { subject, text, html };
}

module.exports = {
  templateRegistered,
  templateAssigned,
  templateWorkStarted,
  templateWorkInProgress,
  templateEstimatedCompletion,
  templateResolved,
  templateClosed
};
