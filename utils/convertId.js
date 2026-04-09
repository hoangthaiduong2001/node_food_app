const mongoose = require("mongoose");

const convertMongoId = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(convertMongoId);
  }

  if (obj instanceof mongoose.Types.ObjectId) {
    return obj.toString();
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (obj !== null && typeof obj === "object") {
    const newObj = {};

    Object.keys(obj).forEach((key) => {
      if (key === "_id") {
        newObj.id = convertMongoId(obj[key]);
      } else {
        newObj[key] = convertMongoId(obj[key]);
      }
    });

    return newObj;
  }

  return obj;
};

module.exports = {
  convertMongoId,
};
