const { handleCms } = require('../lib/cms-core');

module.exports = async function cmsHandler(req, res) {
  return handleCms(req, res);
};
