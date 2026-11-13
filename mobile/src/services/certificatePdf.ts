import type { Certificate } from './api';

type CertificateDocument = {
  learnerName: string;
  certificate: Certificate;
  issuedDate: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function createCertificateHtml({ learnerName, certificate, issuedDate }: CertificateDocument) {
  const courseTitle = certificate.courseTitle ?? certificate.title ?? 'Course';
  const skills = certificate.skills?.length
    ? `<p class="skills">${certificate.skills.map(escapeHtml).join(' &nbsp; · &nbsp; ')}</p>`
    : '';
  const credentialId = certificate.credentialId ?? certificate.id;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4 landscape; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #183c2d; font-family: Georgia, 'Times New Roman', serif; }
      .page { width: 100%; min-height: 100vh; padding: 28px; background: #f7f5e9; }
      .frame { min-height: calc(100vh - 56px); border: 8px double #6f9c79; padding: 12px; }
      .inner { min-height: calc(100vh - 104px); border: 1px solid #d5bd79; padding: 46px 50px 28px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
      .brand { color: #14543e; font: 800 17px Arial, sans-serif; letter-spacing: 2px; }
      .mark { display: inline-flex; width: 42px; height: 42px; border-radius: 50%; align-items: center; justify-content: center; margin-bottom: 10px; background: #14543e; color: #fff; font: 700 20px Arial, sans-serif; }
      h1 { margin: 26px 0 12px; color: #99772e; font-size: 15px; letter-spacing: 4px; font-weight: normal; }
      .intro { margin: 0; color: #5e6f62; font-size: 15px; font-style: italic; }
      .name { margin: 13px 0; padding: 0 20px 8px; border-bottom: 1px solid #b89a50; color: #173d2c; font-size: 34px; }
      .statement { margin: 4px 0 10px; color: #5e6f62; font-size: 15px; }
      .course { max-width: 90%; margin: 0; color: #14543e; font-size: 27px; font-weight: bold; }
      .skills { max-width: 90%; margin: 15px 0 0; color: #52665a; font: 13px Arial, sans-serif; }
      .details { display: flex; justify-content: center; gap: 80px; margin-top: 32px; font: 12px Arial, sans-serif; }
      .detail { min-width: 150px; border-top: 1px solid #aeb8a8; padding-top: 8px; }
      .label { display: block; margin-bottom: 5px; color: #788579; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; }
      .disclaimer { margin: 22px 0 0; color: #798176; font: 10px Arial, sans-serif; }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="frame">
        <div class="inner">
          <div class="mark">A</div>
          <div class="brand">AGRILEARN</div>
          <h1>CERTIFICATE OF COMPLETION</h1>
          <p class="intro">This certificate is awarded to</p>
          <div class="name">${escapeHtml(learnerName || 'AgriLearn Learner')}</div>
          <p class="statement">for successfully completing</p>
          <p class="course">${escapeHtml(courseTitle)}</p>
          ${skills}
          <div class="details">
            <div class="detail"><span class="label">Date issued</span>${escapeHtml(issuedDate)}</div>
            <div class="detail"><span class="label">Credential ID</span>${escapeHtml(credentialId)}</div>
          </div>
          <p class="disclaimer">Issued by AgriLearn for course completion. This credential does not imply external accreditation.</p>
        </div>
      </section>
    </main>
  </body>
</html>`;
}
