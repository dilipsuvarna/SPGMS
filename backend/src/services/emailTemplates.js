function baseTemplate({ title, bodyHtml, footerHtml }) {
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #333; background: #f7f7f7; margin:0; padding:0 }
        .container { max-width:600px; margin:32px auto; background:#fff; border-radius:6px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.08) }
        .header { background:#0b5ed7; color:#fff; padding:16px 20px; display:flex; align-items:center }
        .logo { width:48px; height:48px; background:#fff; border-radius:6px; display:inline-block; margin-right:12px; text-align:center; line-height:48px; font-weight:bold; color:#0b5ed7 }
        .title { font-size:18px; font-weight:700 }
        .content { padding:20px }
        .field { margin-bottom:8px }
        .field label { font-weight:600; display:block; color:#555 }
        .value { margin-top:4px; padding:8px 12px; background:#f2f6ff; border-radius:4px; color:#0b2f6b }
        .footer { padding:16px 20px; font-size:12px; color:#777; background:#fafafa; border-top:1px solid #eee }
        .muted { color:#888; font-size:13px }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">SP</div>
          <div>
            <div class="title">Smart Public Grievance Management System (SPGMS)</div>
            <div style="font-size:12px; opacity:0.9">Automated Notification</div>
          </div>
        </div>
        <div class="content">
          ${bodyHtml}
        </div>
        <div class="footer">
          ${footerHtml}
        </div>
      </div>
    </body>
  </html>
  `;
}

function complaintFieldsHtml(complaint) {
  const expected = complaint.expectedResolution || 'N/A';
  const remarks = complaint.officerRemarks || 'N/A';
  return `
    <div class="field"><label>Complaint ID</label><div class="value">${complaint.complaintId || complaint._id}</div></div>
    <div class="field"><label>Citizen</label><div class="value">${complaint.name || 'N/A'}</div></div>
    <div class="field"><label>Department</label><div class="value">${complaint.department || 'N/A'}</div></div>
    <div class="field"><label>Priority</label><div class="value">${complaint.priority || 'N/A'}</div></div>
    <div class="field"><label>Status</label><div class="value">${complaint.status || 'N/A'}</div></div>
    <div class="field"><label>Expected Resolution</label><div class="value">${expected}</div></div>
    <div class="field"><label>Officer Remarks</label><div class="value">${remarks}</div></div>
  `;
}

function footerHtml() {
  return `
    <div style="font-weight:600">SPGMS Team</div>
    <div class="muted">This is an automated message. Please do not reply to this email.</div>
    <div style="margin-top:8px" class="muted">For support contact: no-reply@spgms.local</div>
  `;
}

function registeredTemplate(complaint) {
  const body = `
    <p>Dear ${complaint.name || 'Citizen'},</p>
    <p>Your complaint has been successfully registered with SPGMS. Below are the details:</p>
    ${complaintFieldsHtml(complaint)}
    <p>We will notify you when the complaint is assigned to an officer.</p>
  `;
  return baseTemplate({ title: 'Complaint Registered - SPGMS', bodyHtml: body, footerHtml: footerHtml() });
}

function assignedTemplate(complaint) {
  const body = `
    <p>Dear ${complaint.name || 'Citizen'},</p>
    <p>Your complaint has been assigned to the ${complaint.department} department officer. Details:</p>
    ${complaintFieldsHtml(complaint)}
    <p>Assigned Officer: ${complaint.assignedOfficerName || 'Officer'}</p>
  `;
  return baseTemplate({ title: 'Complaint Assigned - SPGMS', bodyHtml: body, footerHtml: footerHtml() });
}

function workStartedTemplate(complaint) {
  const body = `
    <p>Dear ${complaint.name || 'Citizen'},</p>
    <p>The assigned officer has started work on your complaint. Details:</p>
    ${complaintFieldsHtml(complaint)}
    <p>Status: Work Started</p>
  `;
  return baseTemplate({ title: 'Work Started - SPGMS', bodyHtml: body, footerHtml: footerHtml() });
}

function underProgressTemplate(complaint) {
  const body = `
    <p>Dear ${complaint.name || 'Citizen'},</p>
    <p>The officer has updated the complaint status to "Work In Progress". Details:</p>
    ${complaintFieldsHtml(complaint)}
  `;
  return baseTemplate({ title: 'Work In Progress - SPGMS', bodyHtml: body, footerHtml: footerHtml() });
}

function resolvedTemplate(complaint) {
  const body = `
    <p>Dear ${complaint.name || 'Citizen'},</p>
    <p>The officer has marked the complaint as <strong>Resolved</strong>. Please review the completion and let us know if further work is needed.</p>
    ${complaintFieldsHtml(complaint)}
  `;
  return baseTemplate({ title: 'Complaint Resolved - SPGMS', bodyHtml: body, footerHtml: footerHtml() });
}

function closedTemplate(complaint) {
  const body = `
    <p>Dear ${complaint.name || 'Citizen'},</p>
    <p>Your complaint has been <strong>Closed</strong> after verification. Thank you for using SPGMS.</p>
    ${complaintFieldsHtml(complaint)}
  `;
  return baseTemplate({ title: 'Complaint Closed - SPGMS', bodyHtml: body, footerHtml: footerHtml() });
}

module.exports = {
  registeredTemplate,
  assignedTemplate,
  workStartedTemplate,
  underProgressTemplate,
  resolvedTemplate,
  closedTemplate
};
