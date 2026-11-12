const BONYEON_SITE = 'https://bonyeon-control.cleaning-autopost-slack-relay.workers.dev';
const BONYEON_SENDER = 'bonyeon85@gmail.com';
const BONYEON_RUNNER_STATE = 'BONYEON_RUNNER_STATE';

// Run once in the Apps Script editor as the Bonyeon Gmail account.
function enableBonyeonReports() {
  withReportLock_(function () {
    const settings = reportSettings_();
    const check = callReportSite_('check', settings);
    if (check.sender !== BONYEON_SENDER) throw new Error('본연 사이트의 발신 Gmail이 일치하지 않습니다.');

    if (!settings.store.getProperty('BONYEON_TEST_SENT')) {
      if (MailApp.getRemainingDailyQuota() < 1) throw new Error('오늘 Gmail 발송 한도가 소진되었습니다.');
      MailApp.sendEmail({
        to: BONYEON_SENDER,
        subject: '[본연] Gmail 자동 발송 연결 확인',
        body: '본연 현장 관제와 Gmail이 연결되었습니다. 이 메일은 발신 계정으로 보낸 연결 확인입니다.',
        name: '본연',
      });
      settings.store.setProperty('BONYEON_TEST_SENT', '1');
    }

    const handler = 'runBonyeonReports';
    if (!ScriptApp.getProjectTriggers().some(trigger => trigger.getHandlerFunction() === handler)) {
      ScriptApp.newTrigger(handler).timeBased().everyMinutes(15).create();
    }
    callReportSite_('activate', settings);
    console.log('본연 Gmail 자동 발송을 활성화했습니다.');
  });
}

// The time-driven trigger runs under the account that created it.
function runBonyeonReports() {
  withReportLock_(function () {
    const settings = reportSettings_();
    finishPendingReport_(settings);
    let state = resumeReport_(settings);
    for (let count = 0; count < 10 && MailApp.getRemainingDailyQuota() > 0; count++) {
      if (!state) {
        state = { phase: 'requesting', requestId: Utilities.getUuid() };
        saveReportState_(settings, state);
      }
      const message = callReportSite_('claim', settings, { requestId: state.requestId }).message;
      if (!message) {
        settings.store.deleteProperty(BONYEON_RUNNER_STATE);
        return;
      }
      state = { ...state, phase: 'sending', id: message.id, claim: message.claim };
      saveReportState_(settings, state);
      try {
        deliverBonyeonMail_(message);
      } catch {
        holdReport_(settings, state);
        return;
      }
      saveReportState_(settings, { ...state, phase: 'ack' });
      acknowledgeReport_(settings, state);
      settings.store.deleteProperty(BONYEON_RUNNER_STATE);
      state = null;
    }
  });
}

function saveReportState_(settings, state) {
  settings.store.setProperty(BONYEON_RUNNER_STATE, JSON.stringify(state));
}

function resumeReport_(settings) {
  const saved = settings.store.getProperty(BONYEON_RUNNER_STATE);
  if (!saved) return null;
  const state = JSON.parse(saved);
  if (state.phase === 'requesting') return state;
  if (state.phase === 'sending') {
    holdReport_(settings, state);
    return null;
  }
  if (state.phase !== 'ack') throw new Error('자동 발송 복구 상태를 확인해 주세요.');
  acknowledgeReport_(settings, state);
  settings.store.deleteProperty(BONYEON_RUNNER_STATE);
  return null;
}

function holdReport_(settings, { id, claim }) {
  callReportSite_('hold', settings, { id, claim });
  settings.store.deleteProperty(BONYEON_RUNNER_STATE);
  console.warn('Gmail 발송 결과를 확인할 수 없어 이 건을 보류했습니다.');
}

function acknowledgeReport_(settings, { id, claim }) {
  try {
    callReportSite_('complete', settings, { id, claim });
  } catch (error) {
    if (error.httpStatus !== 404 && error.httpStatus !== 409) throw error;
    console.warn('이전 메일의 발송 확인을 저장할 수 없습니다. 관제에서 해당 발송 결과를 확인해 주세요.');
  }
}

function deliverBonyeonMail_(message) {
  const mail = { to: message.to, subject: message.subject, body: message.body, name: '본연' };
  const plain = Utilities.newBlob(message.body, 'text/plain', '본연-리포트.txt');
  const html = typeof message.html === 'string' && message.html
    ? Utilities.newBlob(message.html, 'text/html', '본연-리포트.html') : null;
  const bodyBytes = plain.getBytes().length + (html ? html.getBytes().length : 0);
  if (bodyBytes > 180000) {
    mail.body = '보고 분량이 길어 전체 내용을 첨부했습니다.';
    mail.attachments = [plain, ...(html ? [html] : [])];
  } else if (html) {
    mail.htmlBody = message.html;
  }
  MailApp.sendEmail(mail);
}

function sendBonyeonTemplateTests() {
  withReportLock_(function () {
    const settings = reportSettings_();
    const { messages } = callReportSite_('template-tests', settings);
    for (const message of messages) {
      sendBonyeonSample_(message, settings, /^report-details-v1-(daily|settlement|contractor)$/);
    }
  });
}

function sendBonyeonCompletionTest() {
  withReportLock_(function () {
    const settings = reportSettings_();
    const { message } = callReportSite_('completion-test', settings);
    sendBonyeonSample_(message, settings, /^completion-example-v1$/);
  });
}

function sendBonyeonSample_(message, settings, idPattern) {
  if (message.to !== BONYEON_SENDER || !idPattern.test(message.id)) {
    throw new Error('본연 Gmail의 서식 테스트만 발송할 수 있습니다.');
  }
  const key = 'BONYEON_SENT_' + message.id;
  if (settings.store.getProperty(key)) return;
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('오늘 Gmail 발송 한도가 소진되었습니다.');
  deliverBonyeonMail_(message);
  settings.store.setProperty(key, '1');
  console.log('서식 테스트 발송 완료: ' + message.id);
}

function finishPendingReport_(settings) {
  const pending = settings.store.getProperty('BONYEON_PENDING_ACK');
  if (!pending) return;
  acknowledgeReport_(settings, JSON.parse(pending));
  settings.store.deleteProperty('BONYEON_PENDING_ACK');
}

function reportSettings_() {
  const email = Session.getEffectiveUser().getEmail().toLowerCase();
  if (email !== BONYEON_SENDER) throw new Error('본연 Gmail 계정으로 실행해 주세요.');
  const store = PropertiesService.getScriptProperties();
  const link = JSON.parse(store.getProperty('BONYEON_INDEPENDENT_LINK') || 'null');
  if (!link || typeof link.reportSecret !== 'string') {
    throw new Error('프로젝트 설정에서 본연 사이트 연결을 등록해 주세요.');
  }
  return { store, link };
}

function callReportSite_(action, settings, data) {
  const result = UrlFetchApp.fetch(BONYEON_SITE + '/api/control/gmail/' + action, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(data || {}),
    headers: {
      'Authorization': 'Bearer ' + settings.link.reportSecret,
      'Origin': BONYEON_SITE,
    },
    followRedirects: false,
    muteHttpExceptions: true,
  });
  const status = result.getResponseCode();
  if (status !== 200) {
    const error = new Error('본연 사이트 연결 요청에 실패했습니다 (' + status + ').');
    error.httpStatus = status;
    throw error;
  }
  return JSON.parse(result.getContentText());
}

function withReportLock_(action) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    action();
  } finally {
    lock.releaseLock();
  }
}

function prepareBonyeonIndependentReportKey() {
  const store = PropertiesService.getScriptProperties();
  const key = 'BONYEON_INDEPENDENT_LINK';
  let link = JSON.parse(store.getProperty(key) || 'null');
  if (!link) {
    const reportSecret = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').toLowerCase();
    link = { reportSecret };
    store.setProperty(key, JSON.stringify(link));
  }
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, link.reportSecret, Utilities.Charset.UTF_8);
  console.log('본연 독립 발송 검증값 ' + digest.map(value => ((value + 256) % 256).toString(16).padStart(2, '0')).join(''));
}
