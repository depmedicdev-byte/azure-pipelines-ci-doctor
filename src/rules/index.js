'use strict';

module.exports = [
  require('./expensive-vm-image'),
  require('./container-no-pin'),
  require('./missing-timeout-in-minutes'),
  require('./missing-cache'),
  require('./wide-trigger'),
  require('./inline-secret-leak'),
  require('./legacy-task-version'),
  require('./unbounded-parallelism'),
];
