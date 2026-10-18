const prisma = require('../lib/prisma');

const STUDENT_APPROVER_SETTING = 'STUDENT_REGISTRATION_APPROVER_EMAIL';
const DEFAULT_STUDENT_APPROVER_EMAIL = 'shivamg9907@gmail.com';

async function getStudentApproverEmail() {
  const setting = await prisma.systemSetting.upsert({
    where: { key: STUDENT_APPROVER_SETTING },
    create: { key: STUDENT_APPROVER_SETTING, value: DEFAULT_STUDENT_APPROVER_EMAIL },
    update: {},
  });
  return setting.value.trim().toLowerCase();
}

module.exports = { getStudentApproverEmail };
