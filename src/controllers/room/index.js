/**
 * Room Controller Index
 * Aggregates room operations and queries
 */

const roomOperations = require('./room-operations');
const roomQueries = require('./room-query');

module.exports = {
  ...roomOperations,
  ...roomQueries
};
