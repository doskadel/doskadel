// Unit-тест can(): роли owner/member/viewer.
// Запуск (в контейнере backend): node scripts/test-can.js
const { roleCan, canByMembership } = require('../src/utils/can');

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { pass++; console.log('  OK  ', name); } else { fail++; console.log('  FAIL', name); } };

// owner — всё
check('owner read', roleCan('owner', 'read'));
check('owner create', roleCan('owner', 'create'));
check('owner update', roleCan('owner', 'update'));
check('owner delete', roleCan('owner', 'delete'));
check('owner assign', roleCan('owner', 'assign'));

// member — read/create/update, но НЕ delete
check('member read', roleCan('member', 'read'));
check('member create', roleCan('member', 'create'));
check('member update', roleCan('member', 'update'));
check('member NO delete', !roleCan('member', 'delete'));
check('member NO assign', !roleCan('member', 'assign'));

// viewer — только read
check('viewer read', roleCan('viewer', 'read'));
check('viewer NO create', !roleCan('viewer', 'create'));
check('viewer NO update', !roleCan('viewer', 'update'));
check('viewer NO delete', !roleCan('viewer', 'delete'));

// canByMembership
check('membership owner delete', canByMembership({ role: 'owner' }, 'delete'));
check('membership viewer delete', !canByMembership({ role: 'viewer' }, 'delete'));
check('membership null -> false', !canByMembership(null, 'read'));
check('membership no role -> false', !canByMembership({}, 'read'));

console.log(`\nИТОГ can(): pass=${pass} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
