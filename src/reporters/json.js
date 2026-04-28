'use strict';

function renderJson(findings) {
  return JSON.stringify({ findings, version: 1 }, null, 2);
}

module.exports = { renderJson };
