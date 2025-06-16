// utils/loggingHelper.js

/**
 * Creates a safe copy of data for logging
 * @param {*} data - The data to prepare for logging
 * @returns {*} - The prepared data safe for logging
 */
function prepareForLogging(data) {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle BigInt
  if (typeof data === "bigint") {
    return data.toString();
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(prepareForLogging);
  }

  // Handle Error objects
  if (data instanceof Error) {
    const error = {
      message: data.message,
      stack: data.stack,
      name: data.name,
    };
    // Copy enumerable properties
    for (const key in data) {
      error[key] = prepareForLogging(data[key]);
    }
    return error;
  }

  // Handle plain objects
  if (typeof data === "object") {
    const prepared = {};
    for (const [key, value] of Object.entries(data)) {
      prepared[key] = prepareForLogging(value);
    }
    return prepared;
  }

  return data;
}

module.exports = { prepareForLogging };
